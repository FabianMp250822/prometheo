"use client";

import { UserPayment, LegalConcept } from '@/lib/data';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PaymentSuggestions } from './payment-suggestions';
import { formatCurrency } from '@/lib/helpers';
import { Button } from '../ui/button';
import { Check } from 'lucide-react';

interface UserDetailSheetProps {
  user: UserPayment | null;
  onOpenChange: (open: boolean) => void;
  onMarkAsAnalyzed: (userId: string) => void;
}
  
const getConceptColor = (concept: LegalConcept) => {
    switch (concept) {
      case 'Costas Procesales': return 'bg-rose-100 text-rose-800';
      case 'Retro Mesada Adicional': return 'bg-sky-100 text-sky-800';
      case 'Procesos y Sentencia Judiciales': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};

export function UserDetailSheet({ user, onOpenChange, onMarkAsAnalyzed }: UserDetailSheetProps) {
  if (!user) return null;

  const handleMarkAsAnalyzed = () => {
    onMarkAsAnalyzed(user.id);
    onOpenChange(false);
  }

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.user.avatarUrl} alt={user.user.name} data-ai-hint="person portrait" />
              <AvatarFallback>{user.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-3xl font-headline">{user.user.name}</SheetTitle>
              <SheetDescription>
                Documento: {user.user.document} | Dependencia: {user.department}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Resumen de Pago</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              {Object.entries(user.concepts).map(([key, value]) => (
                <div key={key} className={cn('p-3 rounded-lg', getConceptColor(key as LegalConcept))}>
                  <p className="text-sm font-medium">{key}</p>
                  <p className="text-2xl font-bold">{formatCurrency(value || 0)}</p>
                </div>
              ))}
               <div className="p-3 rounded-lg bg-gray-800 text-white">
                  <p className="text-sm font-medium">Monto Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(user.totalAmount)}</p>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Detalle de Sentencias</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.sentences.map(sentence => (
                    <TableRow key={sentence.id}>
                      <TableCell>{sentence.date}</TableCell>
                      <TableCell>{sentence.description}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(sentence.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <PaymentSuggestions user={user} />

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Documento Ref.</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.paymentHistory.length > 0 ? (
                    user.paymentHistory.map(payment => (
                        <TableRow key={payment.id}>
                        <TableCell>{payment.period}</TableCell>
                        <TableCell>{payment.documentRef}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No hay historial de pagos.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
         <SheetFooter className="pr-6">
            {!user.analyzedAt && (
              <Button onClick={handleMarkAsAnalyzed}>
                <Check className="mr-2 h-4 w-4" />
                Marcar como Analizado
              </Button>
            )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
