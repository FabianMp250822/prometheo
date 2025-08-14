'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Briefcase, Pencil, Info, Save, XCircle, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ProcessDetailsSheetProps {
  process: any | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onViewDemandantes: (process: any) => void;
  onViewAnotaciones: (process: any) => void;
  onViewAnexos: (process: any) => void;
  onDataSaved: () => void;
}

const DetailItem = ({ label, value, fullWidth = false, isEditing = false, onChange, name }: { label: string; value: React.ReactNode, fullWidth?: boolean, isEditing?: boolean, onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, name?: string }) => {
  const isTextarea = label === "DESCRIPCIÓN";
  const readOnlyFields = ['Nº REGISTRO', 'FECHA DE CREACIÓN'];

  if (isEditing && !readOnlyFields.includes(label)) {
    return (
      <div className={fullWidth ? "col-span-1 md:col-span-2" : ""}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        {isTextarea ? (
          <Textarea
            name={name}
            value={value as string || ''}
            onChange={onChange}
            className="mt-1 text-sm bg-background"
            rows={4}
          />
        ) : (
          <Input
            name={name}
            value={value as string || ''}
            onChange={onChange}
            className="bg-background"
          />
        )}
      </div>
    );
  }

  return (
    <div className={fullWidth ? "col-span-1 md:col-span-2" : ""}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      {isTextarea ? (
          <Textarea
              readOnly
              value={value as string || 'No disponible'}
              className="mt-1 text-sm bg-muted/50 text-foreground cursor-default"
              rows={4}
          />
      ) : (
          <div className="mt-1 p-2 bg-muted/50 rounded-md text-sm min-h-[40px] text-foreground flex items-center border border-transparent">
              {value || <span className="text-muted-foreground/80">No disponible</span>}
          </div>
      )}
    </div>
  );
};


export function ProcessDetailsSheet({
  process,
  isOpen,
  onOpenChange,
  onViewDemandantes,
  onViewAnotaciones,
  onViewAnexos,
  onDataSaved
}: ProcessDetailsSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (process) {
      setEditedData(process);
    }
    setIsEditing(false); 
  }, [process, isOpen]);
  
  if (!process) {
    return null;
  }

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedData(process);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
      if (!editedData?.num_registro) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se puede guardar sin un número de registro.' });
        return;
      }
      setIsSaving(true);
      try {
        const processDocRef = doc(db, 'procesos', editedData.num_registro);
        
        // Create a copy of the data and remove the ID field to avoid saving it in the document
        const dataToSave = { ...editedData };
        delete dataToSave.id;

        await updateDoc(processDocRef, dataToSave);

        toast({
            title: 'Guardado Exitoso',
            description: 'El proceso ha sido actualizado en Firebase.',
        });
        
        setIsEditing(false);
        onDataSaved();

      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Error al Guardar',
              description: error.message || 'Ocurrió un error inesperado.',
          });
      } finally {
          setIsSaving(false);
      }
  };

  const fields = [
    { label: 'Nº REGISTRO', name: 'num_registro' },
    { label: 'FECHA DE CREACIÓN', name: 'fecha_creacion' },
    { label: 'N° CARPETA', name: 'num_carpeta' },
    { label: 'NO. CARPETA 2', name: 'num_carpeta2' },
    { label: 'DESPACHO ORIGEN', name: 'despacho' },
    { label: 'NOMBRES DEL DEMANDANTE', name: 'nombres_demandante' },
    { label: 'N° DEL RADICADO INICIAL', name: 'num_radicado_ini' },
    { label: 'N° DE DOCUMENTO DEMANDANTE', name: 'identidad_clientes' },
    { label: 'FECHA DEL RADICADO INICIAL', name: 'fecha_radicado_ini' },
    { label: 'NOMBRES DEL DEMANDADO', name: 'nombres_demandado' },
    { label: 'N° DEL RADICADO DEL TRIBUNAL', name: 'radicado_tribunal' },
    { label: 'N° DE DOCUMENTO DEMANDADO O NIT', name: 'identidad_demandado' },
    { label: 'MAGISTRADO DEL TRIBUNAL', name: 'magistrado' },
    { label: 'NOMBRES DEL APODERADO', name: 'nombres_apoderado' },
    { label: 'JURISDICCIÓN', name: 'jurisdiccion' },
    { label: 'N° DE DOCUMENTO DEL APODERADO', name: 'identidad_abogados' },
    { label: 'CLASE DE PROCESO', name: 'clase_proceso' },
    { label: 'NEGOCIO', name: 'negocio' },
    { label: 'ESTADO DE PROCESO', name: 'estado' },
    { label: 'NÚMERO RADICACIÓN (COMPLETO)', name: 'num_radicado_ult' },
    { label: 'SENTENCIA DEL JUZGADO', name: 'sentencia_juzgado' },
    { label: 'RADICADO DE LA CORTE', name: 'radicado_corte' },
    { label: 'SENTENCIA DEL TRIBUNAL', name: 'sentencia_tribunal' },
    { label: 'MAGISTRADO DE LA CORTE', name: 'magistrado_corte' },
    { label: 'CASACIÓN', name: 'casacion' },
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl flex flex-col p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="text-2xl font-headline flex items-center gap-2">
              <Info />
              Detalles del Proceso
            </SheetTitle>
            <SheetDescription>
              Registro #{process.num_registro} - <Badge variant="outline">{process.estado}</Badge>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <h2 className="text-lg font-bold col-span-1 md:col-span-2 text-foreground mb-2 border-b pb-2">DATOS DEL PROCESO</h2>
                  
                  {fields.map(field => (
                    <DetailItem 
                      key={field.name}
                      label={field.label}
                      name={field.name}
                      value={editedData?.[field.name]}
                      isEditing={isEditing}
                      onChange={handleInputChange}
                    />
                  ))}
                  
                  <DetailItem label="DESCRIPCIÓN" name="descripcion" value={editedData?.descripcion} fullWidth isEditing={isEditing} onChange={handleInputChange} />
              </div>
          </div>

          <SheetFooter className="p-4 bg-muted/50 border-t flex-col sm:flex-row sm:justify-start gap-2">
              {isEditing ? (
                  <>
                      <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full sm:w-auto">
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                          Guardar Cambios
                      </Button>
                      <Button variant="outline" onClick={handleCancelClick} disabled={isSaving} className="w-full sm:w-auto">
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar
                      </Button>
                  </>
              ) : (
                  <>
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => onViewDemandantes(process)}>
                          <Users className="mr-2 h-4 w-4" />
                          Ver Demandantes
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => onViewAnotaciones(process)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Anotaciones
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => onViewAnexos(process)}>
                          <Briefcase className="mr-2 h-4 w-4" />
                          Anexos
                      </Button>
                      <Button onClick={handleEditClick} className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                      </Button>
                  </>
              )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
