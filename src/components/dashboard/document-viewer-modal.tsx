'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentViewerModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function DocumentViewerModal({ url, title, onClose }: DocumentViewerModalProps) {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(url);

  const handleRotate = (degrees: number) => {
    setRotation(prev => prev + degrees);
  };
  
  const handleZoom = (direction: 'in' | 'out') => {
      setScale(prev => direction === 'in' ? prev * 1.2 : prev / 1.2);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2 sm:p-4">
        <DialogHeader className="p-4 pb-2 flex-row justify-between items-center">
          <DialogTitle className="truncate">{title}</DialogTitle>
           {isImage && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleZoom('in')}><ZoomIn /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleZoom('out')}><ZoomOut /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleRotate(-90)}><RotateCcw /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleRotate(90)}><RotateCw /></Button>
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 p-4">
           {isImage ? (
                <img
                    src={url}
                    alt={title}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${rotation}deg) scale(${scale})` }}
                />
            ) : (
                <iframe
                    src={url}
                    title={title}
                    className="w-full h-full border-0"
                    allow="fullscreen"
                />
           )}
        </div>
        <DialogFooter className="p-4 pt-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
