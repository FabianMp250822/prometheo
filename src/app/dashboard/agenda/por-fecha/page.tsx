'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collectionGroup, query, getDocs, doc, getDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarSearch, Loader2, Search, CalendarOff, AlertTriangle } from 'lucide-react';
import type { Anotacion } from '@/lib/data';
import { format, addDays, parse, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { transformarFecha, convertirAFormatoOrdenable } from '@/lib/anotaciones-helpers';
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
        const date = parse(dateString, 'dd-MM-yyyy', new Date());
        if (isNaN(date.getTime())) return '';
        return format(date, 'E', { locale: es });
    } catch {
        return '';
    }
};

export default function PorFechaPage() {
    const [tasks, setTasks] = useState<PendingTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(),
        to: addDays(new Date(), 7),
    });

    const fetchTasksByDateRange = useCallback(async () => {
        if (!dateRange.from || !dateRange.to) {
            setError("Por favor seleccione un rango de fechas válido.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setTasks([]);

        try {
            // Step 1: Fetch all annotations using a collection group query.
            const anotacionesQuery = query(collectionGroup(db, 'anotaciones'));
            const querySnapshot = await getDocs(anotacionesQuery);

            const allAnotaciones = querySnapshot.docs.map(d => {
                const data = d.data();
                const parentPath = d.ref.parent.parent?.path; // processos/{id}
                const parentId = parentPath ? parentPath.split('/').pop() : null;
                return { 
                    ...data,
                    id: d.id,
                    num_registro: parentId, // Ensure num_registro is the parent ID
                } as Anotacion;
            });
            
            // Step 2: Filter annotations by date range on the client side.
            const filteredAnotaciones = allAnotaciones.filter(anotacion => {
                const dateStringToParse = anotacion.fecha_limite_ordenable || convertirAFormatoOrdenable(anotacion.fecha_limite);
                if (!dateStringToParse || dateStringToParse === '9999-12-31') {
                    return false;
                }
                const taskDate = parse(dateStringToParse, 'yyyy-MM-dd', new Date());
                return !isNaN(taskDate.getTime()) && isWithinInterval(taskDate, { start: dateRange.from, end: dateRange.to });
            });

            if (filteredAnotaciones.length === 0) {
                 setTasks([]);
                 setIsLoading(false);
                 return;
            }

            // Step 3: Fetch all unique parent processes efficiently.
            const uniqueProcesoIds = [...new Set(filteredAnotaciones.map(a => a.num_registro).filter(Boolean))];
            const procesosData: { [key: string]: any } = {};

            if (uniqueProcesoIds.length > 0) {
                const procesosPromises = uniqueProcesoIds.map(id => getDoc(doc(db, 'procesos', id!)));
                const procesosSnapshots = await Promise.all(procesosPromises);
                procesosSnapshots.forEach(pSnap => {
                    if (pSnap.exists()) {
                        procesosData[pSnap.id] = pSnap.data();
                    }
                });
            }

            // Step 4: Combine annotations with their parent process data.
            const tasksWithProcesos = filteredAnotaciones.map(anotacion => ({
                ...anotacion,
                fecha_limite: transformarFecha(anotacion.fecha_limite),
                proceso: anotacion.num_registro ? procesosData[anotacion.num_registro] : undefined,
            }));
            
            // Step 5: Sort tasks
            tasksWithProcesos.sort((a, b) => {
                const dateA = parse(a.fecha_limite!, 'dd-MM-yyyy', new Date());
                const dateB = parse(b.fecha_limite!, 'dd-MM-yyyy', new Date());
    
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                }
    
                const timeA = a.hora_limite?.replace(/\s*(am|pm)/i, '') || '00:00';
                const timeB = b.hora_limite?.replace(/\s*(am|pm)/i, '') || '00:00';
    
                return timeA.localeCompare(timeB);
            });
            
            setTasks(tasksWithProcesos);
            
        } catch (err: any) {
            console.error("Error fetching tasks:", err);
            setError('Ocurrió un error inesperado al buscar las tareas.');
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);
    
    // Initial fetch
    useEffect(() => {
        fetchTasksByDateRange();
    }, []); 

    const handleSearch = () => {
        fetchTasksByDateRange();
    };

    const filteredTasksBySearchTerm = useMemo(() => {
        if (!searchTerm) return tasks;
        const lowercasedFilter = searchTerm.toLowerCase();
        return tasks.filter(task =>
            task.proceso?.nombres_demandante?.toLowerCase().includes(lowercasedFilter) ||
            task.proceso?.nombres_demandado?.toLowerCase().includes(lowercasedFilter) ||
            task.detalle?.toLowerCase().includes(lowercasedFilter) ||
            task.proceso?.num_radicado_ult?.includes(lowercasedFilter) ||
            task.proceso?.num_radicado_ini?.includes(lowercasedFilter)
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
                      disabled={tasks.length === 0 && !isLoading}
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
                                  <TableCell>{getDayOfWeek(task.fecha_limite!)}</TableCell>
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
