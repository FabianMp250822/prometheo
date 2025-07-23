'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collectionGroup, query, getDocs, doc, getDoc, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarSearch, Loader2, Search, CalendarOff, AlertTriangle, Link as LinkIcon, Users } from 'lucide-react';
import type { Anotacion, Tarea } from '@/lib/data';
import { format, addDays, parse, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { transformarFecha, convertirAFormatoOrdenable } from '@/lib/anotaciones-helpers';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


type CombinedTask = (Anotacion | Tarea) & {
  proceso?: any;
  type: 'PROCESO' | 'GENERAL';
};


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
    const [tasks, setTasks] = useState<CombinedTask[]>([]);
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
            // Step 1: Fetch all annotations and general tasks.
            const anotacionesQuery = query(collectionGroup(db, 'anotaciones'));
            const tareasQuery = query(collection(db, 'tareas'));
            
            const [anotacionesSnapshot, tareasSnapshot] = await Promise.all([
                getDocs(anotacionesQuery),
                getDocs(tareasQuery)
            ]);

            const allAnotaciones = anotacionesSnapshot.docs.map(d => {
                const data = d.data();
                const parentPath = d.ref.parent.parent?.path;
                return { 
                    ...data,
                    id: d.id,
                    num_registro: parentPath ? parentPath.split('/').pop() : null,
                    type: 'PROCESO'
                } as Anotacion & { type: 'PROCESO' };
            });

            const allTareas = tareasSnapshot.docs.map(d => ({
                ...d.data(),
                id: d.id,
                type: 'GENERAL'
            } as Tarea & { type: 'GENERAL' }));

            const allTasksRaw = [...allAnotaciones, ...allTareas];

            // Step 2: Filter all tasks by date range on the client side.
            const filteredTasks = allTasksRaw.filter(task => {
                const dateStringToParse = task.fecha_limite_ordenable || convertirAFormatoOrdenable(task.fecha_limite);
                if (!dateStringToParse || dateStringToParse === '9999-12-31') {
                    return false;
                }
                const taskDate = parse(dateStringToParse, 'yyyy-MM-dd', new Date());
                return !isNaN(taskDate.getTime()) && isWithinInterval(taskDate, { start: dateRange.from, end: dateRange.to });
            });

            if (filteredTasks.length === 0) {
                 setTasks([]);
                 setIsLoading(false);
                 return;
            }

            // Step 3: Fetch all unique parent processes efficiently for annotations.
            const uniqueProcesoIds = [...new Set(filteredTasks.map(t => (t as Anotacion).num_registro).filter(Boolean))];
            const procesosData: { [key: string]: any } = {};

            if (uniqueProcesoIds.length > 0) {
                 const procesosChunks = [];
                for (let i = 0; i < uniqueProcesoIds.length; i += 30) {
                    procesosChunks.push(uniqueProcesoIds.slice(i, i + 30));
                }

                await Promise.all(procesosChunks.map(async (chunk) => {
                    const procesosQuery = query(collection(db, 'procesos'), where('num_registro', 'in', chunk));
                    const procesosSnapshots = await getDocs(procesosQuery);
                    procesosSnapshots.forEach(pSnap => {
                        if (pSnap.exists()) {
                            procesosData[pSnap.id] = pSnap.data();
                        }
                    });
                }));
            }

            // Step 4: Combine tasks with their parent process data.
            const tasksWithProcesos = filteredTasks.map(task => ({
                ...task,
                fecha_limite: transformarFecha(task.fecha_limite!),
                proceso: task.type === 'PROCESO' ? procesosData[(task as Anotacion).num_registro] : undefined,
            } as CombinedTask));
            
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
          <CardDescription>Seleccione un rango de fechas para encontrar actuaciones y tareas con fecha límite.</CardDescription>
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
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Resultados de la Agenda</CardTitle>
                    <CardDescription>{filteredTasksBySearchTerm.length} tareas encontradas en el rango seleccionado.</CardDescription>
                  </div>
                  <div className="relative w-full md:w-1/3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Filtrar por demandante, detalle..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          disabled={tasks.length === 0 && !isLoading}
                      />
                  </div>
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
                              <TableHead>Fecha / Hora</TableHead>
                              <TableHead>Día</TableHead>
                              <TableHead>Detalle / Ubicación</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Demandante / Demandado</TableHead>
                              <TableHead>Despacho / Radicado</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredTasksBySearchTerm.map(task => (
                              <TableRow key={task.id}>
                                  <TableCell className="font-medium">
                                    <div>{task.fecha_limite}</div>
                                    <div className="text-xs text-muted-foreground">{task.hora_limite || 'N/A'}</div>
                                  </TableCell>
                                  <TableCell>{getDayOfWeek(task.fecha_limite!)}</TableCell>
                                  <TableCell className="max-w-xs">
                                     <p className="truncate">{task.detalle}</p>
                                     {(task as Tarea).ubicacion && (
                                        <a href={(task as Tarea).ubicacion} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                            <LinkIcon className="h-3 w-3" />
                                            Enlace de la reunión
                                        </a>
                                     )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={task.type === 'PROCESO' ? 'secondary' : 'default'}>
                                        {task.type === 'PROCESO' ? 'Proceso' : 'General'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {task.proceso ? (
                                        <div>
                                            <div className="font-medium flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground"/> {task.proceso.nombres_demandante || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/> {task.proceso.nombres_demandado || 'N/A'}</div>
                                        </div>
                                    ) : (
                                        'N/A'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                     {task.proceso ? (
                                        <div>
                                            <div>{task.proceso.despacho || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{task.proceso.num_radicado_ult || task.proceso.num_radicado_ini || 'N/A'}</div>
                                        </div>
                                     ) : (
                                        'N/A'
                                     )}
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                      <CalendarOff className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No se encontraron tareas</h3>
                      <p className="text-muted-foreground">No hay actuaciones ni tareas generales en el rango de fechas seleccionado.</p>
                  </div>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
