
'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { UserPayment } from '@/lib/data';

interface UserDetailSheetProps {
  user: UserPayment | null;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailSheet({ user, onOpenChange }: UserDetailSheetProps) {
  if (!user) {
    return null;
  }

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{user.user.name}</SheetTitle>
          <SheetDescription>
            Detalles del usuario y sus pagos.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <p>Contenido detallado del usuario aquí...</p>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
