'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tarea } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { CalendarPlus, ListTodo, Loader2, Trash2, Edit } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { convertirAFormatoOrdenable, transformarFecha } from '@/lib/anotaciones-helpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type FormInputs = {
  detalle: string;
  fecha_limite: Date;
  hora_limite: string;
  ubicacion: string;
};

export default function AgregarTareasPage() {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormInputs>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [isFetchingTasks, setIsFetchingTasks] = useState(true);
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);

  const fechaLimite = watch('fecha_limite');

  const fetchTasks = useCallback(async () => {
    setIsFetchingTasks(true);
    try {
      const q = query(collection(db, "tareas"), orderBy("fecha_limite_ordenable", "asc"));
      const querySnapshot = await getDocs(q);
      const tasksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tarea));
      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las tareas existentes.' });
    } finally {
      setIsFetchingTasks(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    try {
      const fechaLimiteStr = format(data.fecha_limite, 'dd-MM-yyyy');
      const fechaOrdenable = convertirAFormatoOrdenable(fechaLimiteStr);

      const taskData: Omit<Tarea, 'id' | 'creadoEn'> = {
        detalle: data.detalle,
        fecha_limite: fechaLimiteStr,
        fecha_limite_ordenable: fechaOrdenable,
        hora_limite: data.hora_limite,
        ubicacion: data.ubicacion,
        type: 'GENERAL',
      };
      
      if (editingTask?.id) {
        // Update existing task
        const taskRef = doc(db, 'tareas', editingTask.id);
        await updateDoc(taskRef, taskData);
        toast({ title: 'Tarea Actualizada', description: 'La tarea ha sido modificada exitosamente.' });
      } else {
        // Add new task
        await addDoc(collection(db, "tareas"), {
          ...taskData,
          creadoEn: serverTimestamp(),
        });
        toast({ title: 'Tarea Creada', description: 'La nueva tarea ha sido agregada a la agenda.' });
      }

      reset();
      setEditingTask(null);
      await fetchTasks(); // Refresh the list

    } catch (error) {
      console.error("Error saving task:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la tarea.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, "tareas", taskId));
      toast({ title: 'Tarea Eliminada', description: 'La tarea ha sido eliminada.' });
      await fetchTasks(); // Refresh list
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la tarea.' });
    }
  };

  const handleEdit = (task: Tarea) => {
    setEditingTask(task);
    setValue('detalle', task.detalle);
    setValue('fecha_limite', parse(task.fecha_limite, 'dd-MM-yyyy', new Date()));
    setValue('hora_limite', task.hora_limite);
    setValue('ubicacion', task.ubicacion || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <CalendarPlus className="h-6 w-6" />
            {editingTask ? 'Editar Tarea' : 'Agregar Nueva Tarea'}
          </CardTitle>
          <CardDescription>
            {editingTask ? 'Modifique los detalles de la tarea y guarde los cambios.' : 'Añada una nueva tarea o recordatorio a su agenda general.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="detalle">Detalle de la Tarea</Label>
              <Textarea id="detalle" {...register('detalle', { required: 'El detalle es obligatorio.' })} />
              {errors.detalle && <p className="text-red-500 text-xs mt-1">{errors.detalle.message}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fecha_limite">Fecha Límite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaLimite && "text-muted-foreground"
                      )}
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      {fechaLimite ? format(fechaLimite, "d 'de' LLLL, yyyy", { locale: es }) : <span>Seleccione una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaLimite}
                      onSelect={(date) => setValue('fecha_limite', date!)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                 {errors.fecha_limite && <p className="text-red-500 text-xs mt-1">{errors.fecha_limite.message}</p>}
              </div>
              <div>
                <Label htmlFor="hora_limite">Hora Límite (Opcional)</Label>
                <Input id="hora_limite" type="time" {...register('hora_limite')} />
              </div>
            </div>

            <div>
              <Label htmlFor="ubicacion">Ubicación o URL (Opcional)</Label>
              <Input id="ubicacion" placeholder="Ej: https://meet.google.com/xyz-abc-def" {...register('ubicacion')} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTask ? 'Guardar Cambios' : 'Agregar Tarea'}
              </Button>
              {editingTask && (
                <Button variant="outline" onClick={() => { setEditingTask(null); reset(); }}>
                  Cancelar Edición
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Tareas Agendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
           {isFetchingTasks ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>
           ) : tasks.length === 0 ? (
              <p className="text-muted-foreground text-center">No hay tareas generales agendadas.</p>
           ) : (
             <ul className="space-y-2">
              {tasks.map(task => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <p className="font-medium">{task.detalle}</p>
                    <p className="text-sm text-muted-foreground">
                      {transformarFecha(task.fecha_limite)} {task.hora_limite && `- ${task.hora_limite}`}
                    </p>
                    {task.ubicacion && <a href={task.ubicacion} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">{task.ubicacion}</a>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(task.id!)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
             </ul>
           )}
        </CardContent>
      </Card>
    </div>
  );
}