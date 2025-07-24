'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, query, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { History, Search, Download, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { formatCurrency, formatFirebaseTimestamp } from '@/lib/helpers';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

type CombinedPayment = DajusticiaPayment & {
  clientInfo: DajusticiaClient;
};

const ITEMS_PER_PAGE = 15;

export default function HistorialPagosPage() {
  const [payments, setPayments] = useState<CombinedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
        // Step 1: Fetch all clients
        const clientsSnapshot = await getDocs(collection(db, "nuevosclientes"));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DajusticiaClient));

        // Step 2: For each client, fetch their payments
        const allPayments: CombinedPayment[] = [];
        for (const client of clientsData) {
            const paymentsCollectionRef = collection(db, "nuevosclientes", client.id, "pagos");
            const paymentsSnapshot = await getDocs(paymentsCollectionRef);
            
            paymentsSnapshot.forEach(doc => {
                allPayments.push({
                    ...(doc.data() as DajusticiaPayment),
                    id: doc.id,
                    clientInfo: client
                });
            });
        }
        
        // Sort by date descending
        allPayments.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setPayments(allPayments);
    } catch (error) {
        console.error("Error fetching payment history:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial de pagos.' });
    } finally {
        setIsLoading(false);
    }
}, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const filteredPayments = useMemo(() => {
    setCurrentPage(1);
    return payments.filter(p => {
      const searchTermLower = searchTerm.toLowerCase();
      const searchMatch = !searchTermLower ||
        p.clientInfo.nombres.toLowerCase().includes(searchTermLower) ||
        p.clientInfo.apellidos.toLowerCase().includes(searchTermLower) ||
        p.clientInfo.cedula.includes(searchTermLower) ||
        p.clientInfo.grupo.toLowerCase().includes(searchTermLower);
      
      const dateMatch = !dateRange?.from || !dateRange?.to || 
        (new Date(p.fecha) >= dateRange.from && new Date(p.fecha) <= dateRange.to);

      return searchMatch && dateMatch;
    });
  }, [payments, searchTerm, dateRange]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  
  const exportToExcel = () => {
      const dataToExport = filteredPayments.map(p => ({
          'Nombre Cliente': `${p.clientInfo.nombres} ${p.clientInfo.apellidos}`,
          'Cédula': p.clientInfo.cedula,
          'Grupo': p.clientInfo.grupo,
          'Fecha de Pago': formatFirebaseTimestamp(p.fecha, 'dd/MM/yyyy'),
          'Monto': p.monto,
          'Monto Neto': p.montoNeto,
          'Descuento': p.descuento,
          'Empresa': p.empresa,
          'Vendedor': p.vendedor,
          'URL Soporte': p.soporteURL
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de Pagos");
      XLSX.writeFile(workbook, `Historial_Pagos_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: 'Éxito', description: 'El archivo de Excel ha sido generado.' });
  };


  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                    <History className="h-6 w-6" />
                    Historial de Pagos de Clientes
                </CardTitle>
                 <CardDescription>
                    Consulte todos los pagos realizados por los clientes de DAJUSTICIA.
                </CardDescription>
              </div>
              <Button onClick={exportToExcel} disabled={isLoading || filteredPayments.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar a Excel
              </Button>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, cédula o grupo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                    />
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className="w-full md:w-[300px] justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                            {format(dateRange.to, "LLL dd, y", { locale: es })}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y", { locale: es })
                        )
                        ) : (
                        <span>Seleccione un rango</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={es}
                    />
                    </PopoverContent>
                </Popover>
            </div>
          </CardHeader>
          <CardContent>
              {isLoading ? (
                <DataTableSkeleton columnCount={6} rowCount={10} />
              ) : (
                <>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead>Fecha de Pago</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-right">Vendedor</TableHead>
                                <TableHead className="text-right">Soporte</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPayments.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        <div className="font-medium">{p.clientInfo.nombres} {p.clientInfo.apellidos}</div>
                                        <div className="text-xs text-muted-foreground">{p.clientInfo.cedula}</div>
                                    </TableCell>
                                    <TableCell>{p.clientInfo.grupo}</TableCell>
                                    <TableCell>{formatFirebaseTimestamp(p.fecha, 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(p.monto)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.vendedor)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm" disabled={!p.soporteURL}>
                                            <a href={p.soporteURL} target="_blank" rel="noopener noreferrer">Ver</a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginatedPayments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No se encontraron pagos con los filtros aplicados.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-between items-center p-4">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Siguiente
                        </Button>
                    </div>
                )}
                </>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
