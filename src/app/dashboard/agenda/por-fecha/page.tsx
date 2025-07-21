'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collectionGroup, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarSearch, Loader2, Search, CalendarOff, AlertTriangle } from 'lucide-react';
import type { Anotacion } from '@/lib/data';
import { format, addDays } from 'date-fns';
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
        const [day, month, year] = dateString.split('-').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
        const date = new Date(year, month - 1, day);
        return format(date, 'E', { locale: es });
    } catch {
        return '';
    }
};

export default function PorFechaPage() {
    const [tasks, setTasks] = useState<PendingTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(),
        to: addDays(new Date(), 7),
    });

    const fetchTasksByDate = useCallback(async (startDate: Date, endDate: Date) => {
        setIsLoading(true);
        setError(null);
        setTasks([]);

        try {
            const startStr = format(startDate, 'yyyy-MM-dd');
            const endStr = format(endDate, 'yyyy-MM-dd');
            
            const anotacionesQuery = query(
                collectionGroup(db, 'anotaciones'),
                where('fecha_limite_ordenable', '>=', startStr),
                where('fecha_limite_ordenable', '<=', endStr),
                orderBy('fecha_limite_ordenable'),
                orderBy('hora_limite')
            );
            
            const querySnapshot = await getDocs(anotacionesQuery);
            const pendingAnotaciones = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Anotacion));

            const tasksWithProcesos: PendingTask[] = await Promise.all(
                pendingAnotaciones.map(async (anotacion) => {
                    if (anotacion.num_registro) {
                        const procesoDocRef = doc(db, 'procesos', anotacion.num_registro);
                        const procesoDoc = await getDoc(procesoDocRef);
                        if (procesoDoc.exists()) {
                            return {
                                ...anotacion,
                                fecha_limite: transformarFecha(anotacion.fecha_limite),
                                proceso: procesoDoc.data()
                            };
                        }
                    }
                    return anotacion;
                })
            );
            
            setTasks(tasksWithProcesos);
        } catch (err: any) {
            console.error("Error fetching tasks by date:", err);
            setError('Error al buscar tareas. Es posible que el índice de Firebase aún se esté creando. Por favor, espere unos minutos e intente de nuevo.');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchTasksByDate(dateRange.from, dateRange.to);
    }, []); 

    const handleSearch = () => {
        if (!dateRange.from || !dateRange.to) {
            setError("Por favor seleccione un rango de fechas válido.");
            return;
        }
        fetchTasksByDate(dateRange.from, dateRange.to);
    };
    
    const filteredTasks = useMemo(() => {
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
                    <h3 className="text-lg font-semibold">Error de Consulta</h3>
                    <p className="text-sm">{error}</p>
                </div>
              ) : filteredTasks.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Día</TableHead>
                              <TableHead>Hora</TableHead>
                              <TableHead>Despacho</TableHead>
                              <TableHead>Radicado</TableHead>
                              <TableHead>Demandante</TableHead>
                              <TableHead>Demandado</TableHead>
                              <TableHead>Estado Procesal</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredTasks.map(task => (
                              <TableRow key={task.id}>
                                  <TableCell className="font-medium">{task.fecha_limite}</TableCell>
                                  <TableCell>{getDayOfWeek(task.fecha_limite)}</TableCell>
                                  <TableCell>{task.hora_limite || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.despacho || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.num_radicado_ult || task.proceso?.num_radicado_ini || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.nombres_demandante || 'N/A'}</TableCell>
                                  <TableCell>{task.proceso?.nombres_demandado || 'N/A'}</TableCell>
                                  <TableCell className="max-w-xs whitespace-pre-wrap">{task.detalle}</TableCell>
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
