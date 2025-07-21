'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DocumentViewerModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function DocumentViewerModal({ url, title, onClose }: DocumentViewerModalProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2 sm:p-4">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="truncate">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
        <DialogFooter className="p-4 pt-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
