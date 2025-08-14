'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProcesoCancelado, Payment } from '@/lib/data';
import { formatCurrency, parseEmployeeName, parsePaymentDetailName } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Info, Hash, User, Banknote } from 'lucide-react';

interface SentenciaDetailsSheetProps {
    proceso: ProcesoCancelado | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-1">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value || 'N/A'}</p>
        </div>
    </div>
);


export function SentenciaDetailsSheet({ proceso, isOpen, onOpenChange }: SentenciaDetailsSheetProps) {
    if (!proceso) return null;

    const pagoOriginal = proceso.pagoOriginal;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-3xl flex flex-col p-0">
                <SheetHeader className="p-6 pb-4 border-b">
                    <SheetTitle className="text-2xl font-headline">Detalles del Pago de Sentencia</SheetTitle>
                    <SheetDescription>
                        Registro del pago para {proceso.pensionerInfo ? parseEmployeeName(proceso.pensionerInfo.name) : 'N/A'}.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="h-5 w-5 text-primary"/>
                                Información General
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                            <DetailItem icon={<User />} label="Pensionado" value={proceso.pensionerInfo ? parseEmployeeName(proceso.pensionerInfo.name) : 'N/A'} />
                            <DetailItem icon={<Hash />} label="Documento" value={proceso.pensionadoId} />
                            <div className="flex items-center gap-2">
                               <DetailItem icon={<Calendar />} label="Año Fiscal del Proceso" value={<Badge variant="secondary">{proceso.año}</Badge>} />
                            </div>
                            <div className="flex items-center gap-2">
                               <DetailItem icon={<Calendar />} label="Periodo de Pago" value={<Badge variant="outline">{proceso.periodoPago}</Badge>} />
                            </div>
                        </CardContent>
                    </Card>

                    {pagoOriginal ? (
                        <Card>
                             <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Banknote className="h-5 w-5 text-primary"/>
                                    Detalle del Pago Original (ID: {proceso.pagoId})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Concepto</TableHead>
                                            <TableHead className="text-right">Ingresos</TableHead>
                                            <TableHead className="text-right">Egresos</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pagoOriginal.detalles.map((detail, index) => (
                                            <TableRow key={index} className={detail.nombre?.includes('Totales') ? 'font-bold bg-muted/50' : ''}>
                                                <TableCell>{parsePaymentDetailName(detail.nombre)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(detail.ingresos)}</TableCell>
                                                <TableCell className="text-right text-destructive">{formatCurrency(detail.egresos)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                             <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary"/>
                                    Conceptos de la Sentencia
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Concepto</TableHead>
                                            <TableHead className="text-right">Ingreso</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {proceso.conceptos.map(c => (
                                            <TableRow key={c.codigo}>
                                                <TableCell>{parsePaymentDetailName(c.nombre)}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(c.ingresos)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
