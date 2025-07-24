'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { History, Search, Calendar as CalendarIcon, Loader2, RefreshCw, Eye } from 'lucide-react';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DocumentViewerModal } from '@/components/dashboard/document-viewer-modal';
import Link from 'next/link';

type CombinedPayment = DajusticiaPayment & {
  clientInfo: DajusticiaClient;
};

const ITEMS_PER_PAGE = 20;

export default function HistorialPagosPage() {
  const [clients, setClients] = useState<DajusticiaClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();
  
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
        const clientsSnapshot = await getDocs(collection(db, "nuevosclientes"));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DajusticiaClient));
        
        // Sort clients by name for consistent display
        clientsData.sort((a, b) => a.nombres.localeCompare(b.nombres));

        setClients(clientsData);

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
    return clients.filter(client => {
      const searchTermLower = searchTerm.toLowerCase();
      
      const searchMatch = !searchTermLower ||
        client.nombres.toLowerCase().includes(searchTermLower) ||
        client.apellidos.toLowerCase().includes(searchTermLower) ||
        client.cedula.includes(searchTermLower) ||
        client.grupo.toLowerCase().includes(searchTermLower);
      
      if (!searchMatch) return false;

      // Date range filtering on payments is complex here, so we keep it simple.
      // A more advanced implementation might fetch payments if a date range is selected.

      return true;
    });
  }, [clients, searchTerm, dateRange]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-headline flex items-center gap-2">
                      <History className="h-6 w-6" />
                      Historial de Clientes
                  </CardTitle>
                  <CardDescription>
                      Consulte todos los clientes registrados en DAJUSTICIA.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchAllData} variant="outline" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Refrescar
                    </Button>
                </div>
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
                                  <TableHead>Cédula</TableHead>
                                  <TableHead>Grupo</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {paginatedData.map((client) => (
                                  <TableRow key={client.id}>
                                      <TableCell>
                                          <div className="font-medium">{client.nombres} {client.apellidos}</div>
                                      </TableCell>
                                      <TableCell>{client.cedula}</TableCell>
                                      <TableCell>{client.grupo}</TableCell>
                                      <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/dashboard/contabilidad/pagos-cliente/${client.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Ver Historial Completo
                                            </Link>
                                        </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                              {paginatedData.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={4} className="text-center h-24">No se encontraron clientes con los filtros aplicados.</TableCell>
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
    </>
  );
}
