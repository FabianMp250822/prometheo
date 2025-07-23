'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, collectionGroup, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarSearch, Loader2, Search, Printer, AlertTriangle, CalendarOff, Link as LinkIcon, Users } from 'lucide-react';
import type { Anotacion, Tarea } from '@/lib/data';
import { format, addDays, parse, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { transformarFecha, convertirAFormatoOrdenable } from '@/lib/anotaciones-helpers';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';

// Extend the jsPDF type to include the autoTable method
declare module 'jspdf' {
    interface jsPDF {
      autoTable: (options: any) => jsPDF;
    }
}

type CombinedTask = (Anotacion | Tarea) & {
  proceso?: any;
  type: 'PROCESO' | 'GENERAL';
};

export default function VerTareasPage() {
  const [tasks, setTasks] = useState<CombinedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });

  const fetchTasksByDateRange = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor seleccione un rango de fechas válido.' });
      return;
    }
    setIsLoading(true);
    setError(null);
    setTasks([]);

    try {
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

      const filteredByDate = allTasksRaw.filter(task => {
        const dateString = task.fecha_limite_ordenable || convertirAFormatoOrdenable(task.fecha_limite);
        if (!dateString || dateString === '9999-12-31') return false;
        try {
          const taskDate = parse(dateString, 'yyyy-MM-dd', new Date());
          return !isNaN(taskDate.getTime()) && isWithinInterval(taskDate, { start: dateRange.from!, end: dateRange.to! });
        } catch {
          return false;
        }
      });

      if (filteredByDate.length === 0) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      const uniqueProcesoIds = [...new Set(filteredByDate.filter(t => t.type === 'PROCESO').map(t => (t as Anotacion).num_registro).filter(Boolean))];
      const procesosData: { [key: string]: any } = {};

      if (uniqueProcesoIds.length > 0) {
        const procesosChunks = [];
        for (let i = 0; i < uniqueProcesoIds.length; i += 30) {
          procesosChunks.push(uniqueProcesoIds.slice(i, i + 30));
        }
        await Promise.all(procesosChunks.map(async chunk => {
          const procesosQuery = query(collection(db, 'procesos'), where('num_registro', 'in', chunk));
          const procesosSnapshots = await getDocs(procesosQuery);
          procesosSnapshots.forEach(pSnap => {
            if (pSnap.exists()) procesosData[pSnap.id] = pSnap.data();
          });
        }));
      }

      const tasksWithProcesos = filteredByDate.map(task => ({
        ...task,
        fecha_limite: transformarFecha(task.fecha_limite!),
        proceso: task.type === 'PROCESO' ? procesosData[(task as Anotacion).num_registro] : undefined,
      } as CombinedTask)).sort((a, b) => {
        const dateA = a.fecha_limite_ordenable || convertirAFormatoOrdenable(a.fecha_limite);
        const dateB = b.fecha_limite_ordenable || convertirAFormatoOrdenable(b.fecha_limite);
        return dateA.localeCompare(dateB);
      });
      
      setTasks(tasksWithProcesos);
      
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError('Ocurrió un error inesperado al buscar las tareas.');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchTasksByDateRange();
  }, [fetchTasksByDateRange]);

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
  
  const handlePrint = () => {
    if (filteredTasksBySearchTerm.length === 0) {
      toast({ variant: 'destructive', title: 'Sin Datos', description: 'No hay tareas para exportar en el rango seleccionado.' });
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text('Reporte de Agenda de Tareas', 14, 22);
    doc.setFontSize(11);
    const dateStr = `Rango: ${format(dateRange.from!, "d 'de' LLLL, yyyy", { locale: es })} - ${format(dateRange.to!, "d 'de' LLLL, yyyy", { locale: es })}`;
    doc.text(dateStr, 14, 30);

    const tableColumn = ["Fecha", "Hora", "Detalle", "Tipo", "Demandante", "Demandado", "Radicado"];
    const tableRows: any[][] = [];

    filteredTasksBySearchTerm.forEach(task => {
        const dateString = task.fecha_limite_ordenable || convertirAFormatoOrdenable(task.fecha_limite);
        const formattedDate = dateString !== '9999-12-31' 
            ? format(parse(dateString, 'yyyy-MM-dd', new Date()), "d MMM, yyyy", { locale: es })
            : 'N/A';
        const taskData = [
            formattedDate,
            task.hora_limite || 'N/A',
            task.detalle || 'N/A',
            task.type === 'PROCESO' ? 'Proceso' : 'General',
            task.proceso?.nombres_demandante || 'N/A',
            task.proceso?.nombres_demandado || 'N/A',
            task.proceso?.num_radicado_ult || task.proceso?.num_radicado_ini || 'N/A'
        ];
        tableRows.push(taskData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
    });

    doc.save(`reporte_agenda_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <CalendarSearch className="h-6 w-6" />
            Ver y Exportar Tareas
          </CardTitle>
          <CardDescription>Seleccione un rango de fechas para visualizar tareas y exportarlas a PDF.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col md:flex-row gap-4 items-center'>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full md:w-[280px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? format(dateRange.from, "d 'de' LLLL, yyyy", { locale: es }) : <span>Seleccione fecha de inicio</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))} initialFocus /></PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full md:w-[280px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? format(dateRange.to, "d 'de' LLLL, yyyy", { locale: es }) : <span>Seleccione fecha de fin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))} initialFocus /></PopoverContent>
          </Popover>
          <Button onClick={fetchTasksByDateRange} disabled={isLoading}>
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
            <div className='flex items-center gap-2'>
              <Input
                placeholder="Filtrar resultados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-auto"
                disabled={tasks.length === 0 && !isLoading}
              />
               <Button onClick={handlePrint} disabled={isLoading || filteredTasksBySearchTerm.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Exportar a PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
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
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Demandante/Demandado</TableHead>
                  <TableHead>Radicado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasksBySearchTerm.map(task => {
                    const dateString = task.fecha_limite_ordenable || convertirAFormatoOrdenable(task.fecha_limite);
                    const formattedDate = dateString !== '9999-12-31' 
                        ? format(parse(dateString, 'yyyy-MM-dd', new Date()), "d 'de' LLLL, yyyy", { locale: es })
                        : 'N/A';
                  return (
                    <TableRow key={task.id}>
                        <TableCell className="font-medium">{formattedDate}</TableCell>
                        <TableCell>{task.hora_limite || 'N/A'}</TableCell>
                        <TableCell><Badge variant={task.type === 'PROCESO' ? 'secondary' : 'default'}>{task.type === 'PROCESO' ? 'Proceso' : 'General'}</Badge></TableCell>
                        <TableCell>
                        {task.proceso ? (
                            <div>
                            <div className="font-medium flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground"/> {task.proceso.nombres_demandante || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/> {task.proceso.nombres_demandado || 'N/A'}</div>
                            </div>
                        ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                        {task.proceso ? (
                            <div>
                            <div className="text-xs">{task.proceso.despacho || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{task.proceso.num_radicado_ult || task.proceso.num_radicado_ini || 'N/A'}</div>
                            </div>
                        ) : 'N/A'}
                        </TableCell>
                    </TableRow>
                  )
                })}
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
