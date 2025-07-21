'use client';

import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ListTodo, Loader2, Search, CalendarOff } from 'lucide-react';
import type { Anotacion } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { convertirAFormatoOrdenable, transformarFecha, convertirHoraLimite } from '@/lib/anotaciones-helpers';

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

export default function PendientesPage() {
    const [tasks, setTasks] = useState<PendingTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPendingTasks = async () => {
            setIsLoading(true);
            try {
                // Step 1: Query all annotations that have a non-empty `fecha_limite`.
                const anotacionesQuery = query(
                    collectionGroup(db, 'anotaciones'),
                    where('fecha_limite', '!=', '')
                );

                const querySnapshot = await getDocs(anotacionesQuery);
                const allAnotaciones = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Anotacion));
                
                const today = format(new Date(), 'yyyy-MM-dd');

                // Step 2: Filter in the client-side.
                const pendingAnotaciones = allAnotaciones.filter(anotacion => {
                    const formattedDate = convertirAFormatoOrdenable(transformarFecha(anotacion.fecha_limite));
                    return formattedDate >= today;
                });
                
                // Step 3: Fetch process data for each pending annotation.
                const tasksWithProcesos: PendingTask[] = await Promise.all(
                    pendingAnotaciones.map(async (anotacion) => {
                        if (anotacion.num_registro) {
                            const procesoDocRef = doc(db, 'procesos', anotacion.num_registro);
                            const procesoDoc = await getDoc(procesoDocRef);
                            if (procesoDoc.exists()) {
                                return { 
                                  ...anotacion,
                                  // Ensure dates are standardized for sorting
                                  fecha_limite: transformarFecha(anotacion.fecha_limite),
                                  proceso: procesoDoc.data() 
                                };
                            }
                        }
                        return anotacion;
                    })
                );

                // Step 4: Sort client-side
                tasksWithProcesos.sort((a, b) => {
                    const dateA = convertirAFormatoOrdenable(a.fecha_limite);
                    const dateB = convertirAFormatoOrdenable(b.fecha_limite);
                    if (dateA < dateB) return -1;
                    if (dateA > dateB) return 1;

                    const timeA = convertirHoraLimite(a.hora_limite);
                    const timeB = convertirHoraLimite(b.hora_limite);
                    if (timeA < timeB) return -1;
                    if (timeA > timeB) return 1;

                    return 0;
                });
                
                setTasks(tasksWithProcesos);
            } catch (error) {
                console.error("Error fetching pending tasks:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPendingTasks();
    }, []);

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
                        <ListTodo className="h-6 w-6" />
                        Pendientes de Agenda
                    </CardTitle>
                    <CardDescription>
                        Visualice las actuaciones y audiencias con fecha límite a partir de hoy.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por demandante, detalle, radicado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center p-10">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
                            <h3 className="text-lg font-semibold">No hay tareas pendientes</h3>
                            <p className="text-muted-foreground">No se encontraron actuaciones con fecha límite futura.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
