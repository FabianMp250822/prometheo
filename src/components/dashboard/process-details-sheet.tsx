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
import { Users, FileText, Briefcase, Pencil, Info } from 'lucide-react';

interface ProcessDetailsSheetProps {
  process: any | null;
  demandantes: any[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-base text-foreground">{value || 'No disponible'}</p>
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
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="text-2xl font-headline flex items-center gap-2">
            <Info />
            Detalles del Proceso
          </SheetTitle>
          <SheetDescription>
            Proceso #{process.num_registro} - <Badge variant="outline">{process.estado}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <DetailItem label="Negocio" value={process.negocio} />
            <DetailItem label="Clase de Proceso" value={process.clase_proceso} />
            <DetailItem label="Despacho" value={process.despacho} />
            <DetailItem label="Jurisdicción" value={process.jurisdiccion} />
            <DetailItem label="Magistrado" value={process.magistrado} />
            <DetailItem label="# Radicado Inicial" value={process.num_radicado_ini} />
            <DetailItem label="Fecha Radicado" value={process.fecha_radicado_ini} />
            <DetailItem label="Nombres Demandado" value={process.nombres_demandado} />
            <DetailItem label="Apoderado" value={process.nombres_apoderado} />
             <DetailItem label="# Carpeta" value={process.num_carpeta} />
            <DetailItem label="Radicado Tribunal" value={process.radicado_tribunal} />
            <DetailItem label="Radicado Corte" value={process.radicado_corte} />
            <DetailItem label="Magistrado Corte" value={process.magistrado_corte} />
            <DetailItem label="Casación" value={process.casacion} />
          </div>
        </div>

        <SheetFooter className="p-4 bg-muted/50 border-t">
          <div className="flex w-full items-center justify-start gap-2">
             <Button variant="secondary">
                <Users className="mr-2" />
                Ver Demandantes ({demandantes?.length || 0})
            </Button>
            <Button variant="secondary">
                <FileText className="mr-2" />
                Anotaciones
            </Button>
            <Button variant="secondary">
                <Briefcase className="mr-2" />
                Anexos
            </Button>
             <Button>
                <Pencil className="mr-2" />
                Editar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
