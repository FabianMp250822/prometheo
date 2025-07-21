'use client';

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
import { Users, FileText, Briefcase, Pencil, Info, Save } from 'lucide-react';
import { Textarea } from '../ui/textarea';

interface ProcessDetailsSheetProps {
  process: any | null;
  demandantes: any[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailItem = ({ label, value, fullWidth = false, isTextArea = false }: { label: string; value: React.ReactNode, fullWidth?: boolean, isTextArea?: boolean }) => (
  <div className={fullWidth ? "col-span-1 md:col-span-2" : ""}>
    <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
    {isTextArea ? (
        <Textarea
            readOnly
            value={value as string || 'No disponible'}
            className="mt-1 text-sm bg-muted/30 text-foreground"
            rows={4}
        />
    ) : (
        <div className="mt-1 p-2 bg-muted/30 rounded-md text-sm min-h-[36px] text-foreground flex items-center">
            {value || <span className="text-gray-400">No disponible</span>}
        </div>
    )}
  </div>
);

export function ProcessDetailsSheet({
  process,
  demandantes,
  isOpen,
  onOpenChange,
}: ProcessDetailsSheetProps) {
  if (!process) {
    return null;
  }

  return (
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
                 <h2 className="text-xl font-bold col-span-1 md:col-span-2 text-foreground mb-2 border-b pb-2">DATOS DEL PROCESO</h2>
                 
                 <DetailItem label="Nº REGISTRO" value={process.num_registro} />
                 <DetailItem label="FECHA DE CREACIÓN" value={process.fecha_creacion} />
                 
                 <DetailItem label="N° CARPETA 1" value={process.num_carpeta} />
                 <DetailItem label="No. CARPETA 2" value={process.num_carpeta2} />
                 
                 <DetailItem label="DESPACHO ORIGEN" value={process.despacho} />
                 <DetailItem label="NOMBRES DEL DEMANDANTE" value={process.nombres_demandante} />
                 
                 <DetailItem label="N° DEL RADICADO INICIAL" value={process.num_radicado_ini} />
                 <DetailItem label="N° DE DOCUMENTO DEMANDANTE" value={process.identidad_clientes} />
                 
                 <DetailItem label="FECHA DEL RADICADO INICIAL" value={process.fecha_radicado_ini} />
                 <DetailItem label="NOMBRES DEL DEMANDADO" value={process.nombres_demandado} />

                 <DetailItem label="N° DEL RADICADO DEL TRIBUNAL" value={process.radicado_tribunal} />
                 <DetailItem label="N° DE DOCUMENTO DEMANDADO O NIT" value={process.identidad_demandado} />
                 
                 <DetailItem label="MAGISTRADO DEL TRIBUNAL" value={process.magistrado} />
                 <DetailItem label="NOMBRES DEL APODERADO" value={process.nombres_apoderado} />

                 <DetailItem label="JURISDICCIÓN" value={process.jurisdiccion} />
                 <DetailItem label="N° DE DOCUMENTO DEL APODERADO" value={process.identidad_abogados} />

                 <DetailItem label="CLASE DE PROCESO" value={process.clase_proceso} />
                 <DetailItem label="NEGOCIO" value={process.negocio} />

                 <DetailItem label="ESTADO DE PROCESO" value={process.estado} />
                 <DetailItem label="NÚMERO RADICACIÓN (COMPLETO)" value={process.num_radicado_ult} />

                 <DetailItem label="SENTENCIA DEL JUZGADO" value={process.sentencia_juzgado} />
                 <DetailItem label="RADICADO DE LA CORTE" value={process.radicado_corte} />

                 <DetailItem label="SENTENCIA DEL TRIBUNAL" value={process.sentencia_tribunal} />
                 <DetailItem label="MAGISTRADO DE LA CORTE" value={process.magistrado_corte} />
                 
                 <div></div> {/* Placeholder for alignment */}
                 <DetailItem label="CASACIÓN" value={process.casacion} />

                 <DetailItem label="DESCRIPCIÓN" value={process.descripcion} fullWidth isTextArea />
            </div>
        </div>

        <SheetFooter className="p-4 bg-muted/50 border-t flex-col md:flex-row justify-center md:justify-start gap-2">
            <Button variant="outline" className="w-full md:w-auto">
                <Users className="mr-2 h-4 w-4" />
                Ver Demandantes
            </Button>
             <Button variant="outline" className="w-full md:w-auto">
                <FileText className="mr-2 h-4 w-4" />
                Anotaciones
            </Button>
             <Button variant="outline" className="w-full md:w-auto">
                <Briefcase className="mr-2 h-4 w-4" />
                Anexos
            </Button>
             <Button variant="default" className="bg-green-600 hover:bg-green-700 w-full md:w-auto">
                <Pencil className="mr-2 h-4 w-4" />
                Editar
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
