'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileClock, Loader2, ServerCrash, Download, Save } from 'lucide-react';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';
import { ProcessDetailsSheet } from '@/components/dashboard/process-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getExternalDemands } from '@/app/actions/get-external-demands';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { DemandantesModal } from '@/components/dashboard/demandantes-modal';


export default function GestionDemandasPage() {
  const [procesos, setProcesos] = useState<any[]>([]);
  const [demandantes, setDemandantes] = useState<{ [key: string]: any[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const [selectedProcessForDetails, setSelectedProcessForDetails] = useState<any | null>(null);
  const [selectedProcessForDemandantes, setSelectedProcessForDemandantes] = useState<any | null>(null);

  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFetchData = () => {
    startFetching(async () => {
      setError(null);
      setProcesos([]);
      setDemandantes({});
      setLoadingMessage('Obteniendo lista de procesos...');
      
      try {
        const result = await getExternalDemands();

        if (!result.success) {
          throw new Error(result.error || "Error desconocido al obtener datos externos.");
        }
        
        setProcesos(result.procesos || []);
        setDemandantes(result.demandantes || {});

        toast({
          title: 'Datos Obtenidos',
          description: `Se encontraron ${result.procesos?.length || 0} procesos.`,
        });

      } catch (err: any) {
        setError(`Error al conectar con el servicio externo: ${err.message}.`);
      } finally {
        setLoadingMessage(null);
      }
    });
  };

  const handleSaveData = () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'No Autenticado',
            description: 'Debe iniciar sesión para guardar datos.',
        });
        return;
    }

    if (procesos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay datos para guardar',
        description: 'Primero debes obtener los datos del servidor externo.',
      });
      return;
    }

    startSaving(async () => {
      try {
        const batch = writeBatch(db);
        const procesosCollection = collection(db, 'procesos');

        procesos.forEach(proceso => {
          const procesoDocRef = doc(procesosCollection, proceso.num_registro);
          
          const procesoData = Object.fromEntries(
            Object.entries(proceso).filter(([_, v]) => v != null)
          );
          batch.set(procesoDocRef, procesoData);

          const demandantesDeProceso = demandantes[proceso.num_registro];
          if (demandantesDeProceso && demandantesDeProceso.length > 0) {
            const demandantesSubCollection = collection(procesoDocRef, 'demandantes');
            demandantesDeProceso.forEach(demandante => {
              if (demandante.identidad_demandante) {
                const demandanteDocRef = doc(demandantesSubCollection, demandante.identidad_demandante);
                const demandanteData = Object.fromEntries(
                    Object.entries(demandante).filter(([_, v]) => v != null)
                );
                batch.set(demandanteDocRef, demandanteData);
              }
            });
          }
        });

        await batch.commit();

        toast({
            title: 'Guardado Exitoso',
            description: `${procesos.length} procesos han sido guardados en Firebase.`,
        });

      } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Error al Guardar',
            description: `Error de Firestore: ${error.message}`,
        });
      }
    });
  };

  const handleViewDetails = (process: any) => {
    setSelectedProcessForDetails(process);
  };
  
  const handleViewDemandantes = (process: any) => {
    setSelectedProcessForDemandantes(process);
    setSelectedProcessForDetails(null); // Cierra el otro modal si está abierto
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
          <p className="text-muted-foreground">{loadingMessage || 'Cargando...'}</p>
        </div>
      )}

      {error && (
         <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Error al Obtener Datos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {procesos.length > 0 && !isFetching && (
         <ExternalDemandsTable 
            procesos={procesos} 
            demandantes={demandantes}
            onViewDetails={handleViewDetails}
          />
      )}

      <ProcessDetailsSheet
        process={selectedProcessForDetails}
        isOpen={!!selectedProcessForDetails}
        onOpenChange={(isOpen) => {
            if (!isOpen) {
                setSelectedProcessForDetails(null);
            }
        }}
        onViewDemandantes={handleViewDemandantes}
       />
       
       <DemandantesModal
          proceso={selectedProcessForDemandantes}
          isOpen={!!selectedProcessForDemandantes}
          onClose={() => setSelectedProcessForDemandantes(null)}
        />
    </div>
  );
}
