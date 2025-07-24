'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { History, Search, Download, Calendar as CalendarIcon, Loader2, FileDown } from 'lucide-react';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { formatCurrency, formatFirebaseTimestamp } from '@/lib/helpers';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { DocumentViewerModal } from '@/components/dashboard/document-viewer-modal';

type CombinedPayment = DajusticiaPayment & {
  clientInfo: DajusticiaClient;
};

type GroupedClientPayments = {
    clientInfo: DajusticiaClient;
    payments: DajusticiaPayment[];
}

const ITEMS_PER_PAGE = 10;

export default function HistorialPagosPage() {
  const [groupedPayments, setGroupedPayments] = useState<GroupedClientPayments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();
  
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
        const clientsSnapshot = await getDocs(collection(db, "nuevosclientes"));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DajusticiaClient));

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
        
        allPayments.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        
        // Group payments by client
        const groupedData = allPayments.reduce((acc, payment) => {
            const clientId = payment.clientInfo.id;
            if (!acc[clientId]) {
                acc[clientId] = {
                    clientInfo: payment.clientInfo,
                    payments: []
                };
            }
            acc[clientId].payments.push(payment);
            return acc;
        }, {} as Record<string, GroupedClientPayments>);

        setGroupedPayments(Object.values(groupedData));

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

  const filteredData = useMemo(() => {
    setCurrentPage(1);
    return groupedPayments.filter(group => {
      const searchTermLower = searchTerm.toLowerCase();
      const client = group.clientInfo;
      
      const searchMatch = !searchTermLower ||
        client.nombres.toLowerCase().includes(searchTermLower) ||
        client.apellidos.toLowerCase().includes(searchTermLower) ||
        client.cedula.includes(searchTermLower) ||
        client.grupo.toLowerCase().includes(searchTermLower);
      
      if (!searchMatch) return false;

      if (dateRange?.from && dateRange?.to) {
        return group.payments.some(p => {
          const paymentDate = new Date(p.fecha);
          return paymentDate >= dateRange.from! && paymentDate <= dateRange.to!;
        });
      }

      return true;
    });
  }, [groupedPayments, searchTerm, dateRange]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  
  const exportToExcel = () => {
      const dataToExport = filteredData.flatMap(group => 
        group.payments.map(p => ({
          'Nombre Cliente': `${group.clientInfo.nombres} ${group.clientInfo.apellidos}`,
          'Cédula': group.clientInfo.cedula,
          'Grupo': group.clientInfo.grupo,
          'Fecha de Pago': formatFirebaseTimestamp(p.fecha, 'dd/MM/yyyy'),
          'Monto': p.monto,
          'Monto Neto': p.montoNeto,
          'Descuento': p.descuento,
          'Empresa': p.empresa,
          'Vendedor': p.vendedor,
          'URL Soporte': p.soporteURL
        }))
      );

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de Pagos");
      XLSX.writeFile(workbook, `Historial_Pagos_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: 'Éxito', description: 'El archivo de Excel ha sido generado.' });
  };
  
  const handleViewDocument = (url: string, title: string) => {
    setDocumentUrl(url);
    setDocumentTitle(title);
  };


  return (
    <>
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
                <Button onClick={exportToExcel} disabled={isLoading || filteredData.length === 0}>
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
                  <DataTableSkeleton columnCount={5} rowCount={5} />
                ) : (
                  <>
                  <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Cliente</TableHead>
                                  <TableHead>Grupo</TableHead>
                                  <TableHead>Detalle de Pagos</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {paginatedData.map(({ clientInfo, payments }) => (
                                  <TableRow key={clientInfo.id}>
                                      <TableCell className="align-top py-3">
                                          <div className="font-medium">{clientInfo.nombres} {clientInfo.apellidos}</div>
                                          <div className="text-xs text-muted-foreground">{clientInfo.cedula}</div>
                                      </TableCell>
                                      <TableCell className="align-top py-3">{clientInfo.grupo}</TableCell>
                                      <TableCell className="p-0">
                                          <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-1/4">Fecha</TableHead>
                                                    <TableHead className="text-right w-1/4">Monto</TableHead>
                                                    <TableHead className="text-right w-1/4">Vendedor</TableHead>
                                                    <TableHead className="text-center w-1/4">Soporte</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{formatFirebaseTimestamp(p.fecha, 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(p.monto)}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(p.vendedor)}</TableCell>
                                                        <TableCell className="text-center">
                                                           <Button
                                                                variant="outline" size="sm"
                                                                disabled={!p.soporteURL}
                                                                onClick={() => handleViewDocument(p.soporteURL, `Soporte de ${clientInfo.nombres}`)}>
                                                                <FileDown className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                          </Table>
                                      </TableCell>
                                  </TableRow>
                              ))}
                              {paginatedData.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={3} className="text-center h-24">No se encontraron pagos con los filtros aplicados.</TableCell>
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

      {documentUrl && (
        <DocumentViewerModal
          url={documentUrl}
          title={documentTitle || "Visor de Documento"}
          onClose={() => setDocumentUrl(null)}
        />
      )}
    </>
  );
}
