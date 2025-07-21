'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileClock, Loader2, ServerCrash, Download, Save } from 'lucide-react';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';
import { getExternalDemands } from '@/app/actions/get-external-demands';
import { saveProcessesToFirebase } from '@/app/actions/save-processes-to-firebase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GestionDemandasPage() {
  const [procesos, setProcesos] = useState<any[]>([]);
  const [demandantes, setDemandantes] = useState<{ [key: string]: any[] }>({});
  const [error, setError] = useState<string | null>(null);

  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();

  const handleFetchData = () => {
    startFetching(async () => {
      setError(null);
      setProcesos([]);
      setDemandantes({});
      const result = await getExternalDemands();
      if (result.success) {
        setProcesos(result.procesos || []);
        setDemandantes(result.demandantes || {});
        toast({
          title: 'Datos Obtenidos',
          description: `Se encontraron ${result.procesos?.length || 0} procesos.`,
        });
      } else {
        setError(result.error || 'Ocurrió un error desconocido.');
      }
    });
  };

  const handleSaveData = () => {
    if (procesos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay datos para guardar',
        description: 'Primero debes obtener los datos del servidor externo.',
      });
      return;
    }
    startSaving(async () => {
      const result = await saveProcessesToFirebase(procesos, demandantes);
      if (result.success) {
        toast({
          title: 'Guardado Exitoso',
          description: `${result.count} procesos han sido guardados en Firebase.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al Guardar',
          description: result.error || 'Ocurrió un error al guardar en Firebase.',
        });
      }
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <FileClock className="h-6 w-6" />
                Gestión de Demandas Externas
              </CardTitle>
              <CardDescription>
                Obtenga y guarde los datos de procesos y demandantes externos.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleFetchData} disabled={isFetching}>
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Obtener Datos Externos
              </Button>
              {procesos.length > 0 && (
                 <Button onClick={handleSaveData} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar en Firebase
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {isFetching && (
        <div className="flex justify-center items-center p-10 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando datos del servicio externo...</p>
        </div>
      )}

      {error && (
         <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Error al Obtener Datos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {procesos.length > 0 && (
         <ExternalDemandsTable procesos={procesos} demandantes={demandantes} />
      )}
    </div>
  );
}
