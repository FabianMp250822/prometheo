'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collectionGroup, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarSearch, Loader2, Search, CalendarOff, AlertTriangle } from 'lucide-react';
import type { Anotacion } from '@/lib/data';
import { format, addDays, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { transformarFecha } from '@/lib/anotaciones-helpers';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface PendingTask extends Anotacion {
  proceso?: any;
}

const getDayOfWeek = (dateString: string) => {
    if (!dateString) return '';
    try {
        // Assuming dateString is in DD-MM-YYYY format
        const date = parse(dateString, 'dd-MM-yyyy', new Date());
        if (isNaN(date.getTime())) return '';
        return format(date, 'E', { locale: es });
    } catch {
        return '';
    }
};

export default function PorFechaPage() {
    const [tasks, setTasks] = useState<PendingTask[]>([]);
    const [allAnotaciones, setAllAnotaciones] = useState<PendingTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(),
        to: addDays(new Date(), 7),
    });

    const fetchAllAnotaciones = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const anotacionesQuery = query(collectionGroup(db, 'anotaciones'));
            const querySnapshot = await getDocs(anotacionesQuery);
            const allData = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Anotacion));

            const tasksWithProcesos: PendingTask[] = await Promise.all(
                allData.map(async (anotacion) => {
                    if (anotacion.num_registro) {
                        try {
                            const procesoDocRef = doc(db, 'procesos', anotacion.num_registro);
                            const procesoDoc = await getDoc(procesoDocRef);
                            if (procesoDoc.exists()) {
                                return {
                                    ...anotacion,
                                    fecha_limite: transformarFecha(anotacion.fecha_limite),
                                    proceso: procesoDoc.data()
                                };
                            }
                        } catch (e) {
                             console.error(`Failed to fetch proceso ${anotacion.num_registro}`, e);
                        }
                    }
                    // Return anotacion even if proceso fetch fails to avoid losing data
                    return {
                        ...anotacion,
                        fecha_limite: transformarFecha(anotacion.fecha_limite),
                    };
                })
            );
            setAllAnotaciones(tasksWithProcesos);
            
        } catch (err: any) {
            console.error("Error fetching tasks:", err);
            setError('Ocurrió un error inesperado al buscar las tareas.');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchAllAnotaciones();
    }, [fetchAllAnotaciones]); 

    const filterAndSortTasks = useCallback(() => {
        if (!dateRange.from || !dateRange.to || allAnotaciones.length === 0) {
            setTasks([]);
            return;
        }

        const startDate = dateRange.from;
        startDate.setHours(0, 0, 0, 0);
        const endDate = dateRange.to;
        endDate.setHours(23, 59, 59, 999);

        const filtered = allAnotaciones.filter(anotacion => {
            if (!anotacion.fecha_limite) return false;
            try {
                const taskDate = parse(anotacion.fecha_limite, 'dd-MM-yyyy', new Date());
                return taskDate >= startDate && taskDate <= endDate;
            } catch (e) {
                console.warn("Invalid date format for annotation:", anotacion.id, anotacion.fecha_limite);
                return false;
            }
        });

        filtered.sort((a, b) => {
            const dateA = parse(a.fecha_limite, 'dd-MM-yyyy', new Date());
            const dateB = parse(b.fecha_limite, 'dd-MM-yyyy', new Date());

            if (dateA.getTime() !== dateB.getTime()) {
                return dateA.getTime() - dateB.getTime();
            }

            const timeA = a.hora_limite?.replace(/\s*(am|pm)/i, '') || '00:00';
            const timeB = b.hora_limite?.replace(/\s*(am|pm)/i, '') || '00:00';

            return timeA.localeCompare(timeB);
        });

        setTasks(filtered);

    }, [allAnotaciones, dateRange]);

    const handleSearch = () => {
        if (!dateRange.from || !dateRange.to) {
            setError("Por favor seleccione un rango de fechas válido.");
            return;
        }
        filterAndSortTasks();
    };
    
    useEffect(() => {
        if(allAnotaciones.length > 0) {
            filterAndSortTasks();
        }
    }, [allAnotaciones, filterAndSortTasks]);

    const filteredTasksBySearchTerm = useMemo(() => {
        if (!searchTerm) return tasks;
        const lowercasedFilter = searchTerm.toLowerCase();
        return tasks.filter(task =>
            task.proceso?.nombres_demandante?.toLowerCase().includes(lowercasedFilter) ||
            task.proceso?.nombres_demandado?.toLowerCase().includes(lowercasedFilter) ||
            task.detalle?.toLowerCase().includes(lowercasedFilter) ||
            task.proceso?.num_radicado_ult?.includes(lowercasedFilter)
        );
    }, [tasks, searchTerm]);


  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <CalendarSearch className="h-6 w-6" />
            Búsqueda por Fecha
          </CardTitle>
          <CardDescription>Seleccione un rango de fechas para encontrar actuaciones y audiencias con fecha límite.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col md:flex-row gap-4 items-center'>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-full md:w-[280px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        format(dateRange.from, "d 'de' LLLL, yyyy", { locale: es })
                    ) : (
                        <span>Seleccione fecha de inicio</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({...prev, from: date!}))}
                    initialFocus
                    />
                </PopoverContent>
            </Popover>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-full md:w-[280px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.to ? (
                        format(dateRange.to, "d 'de' LLLL, yyyy", { locale: es })
                    ) : (
                        <span>Seleccione fecha de fin</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({...prev, to: date!}))}
                    initialFocus
                    />
                </PopoverContent>
            </Popover>
            <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar
            </Button>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Filtrar resultados por demandante, detalle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      disabled={tasks.length === 0}
                  />
              </div>
          </CardHeader>
          <CardContent>
              {isLoading ? (
                  <div className="flex justify-center items-center p-10">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center p-10 text-center text-destructive">
                    <AlertTriangle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">Error de Carga</h3>
                    <p className="text-sm">{error}</p>
                </div>
              ) : filteredTasksBySearchTerm.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Día</TableHead>
                              <TableHead>Hora</TableHead>
                              <TableHead>Despacho</TableHead>
                              <TableHead>Ciudad</TableHead>
                              <TableHead>Radicado</TableHead>
                              <TableHead>Demandante</TableHead>
                              <TableHead>Demandado</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredTasksBySearchTerm.map(task => (
                              <TableRow key={task.id}>
                                  <TableCell className="font-medium">{task.fecha_limite}</TableCell>
                                  <TableCell>{getDayOfWeek(task.fecha_limite)}</TableCell>
                                  <TableCell>{task.hora_limite || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.despacho || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.jurisdiccion || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.num_radicado_ult || task.proceso?.num_radicado_ini || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.nombres_demandante || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.nombres_demandado || 'N/A'}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                      <CalendarOff className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No se encontraron tareas</h3>
                      <p className="text-muted-foreground">No hay actuaciones pendientes en el rango de fechas seleccionado.</p>
                  </div>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
