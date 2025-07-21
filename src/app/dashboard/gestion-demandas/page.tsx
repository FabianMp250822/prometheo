'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileClock, Loader2, ServerCrash } from 'lucide-react';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';

type LoadingStep = 'idle' | 'fetchingProcesos' | 'fetchingDemandantes' | 'done' | 'error';

export default function GestionDemandasPage() {
  const [procesos, setProcesos] = useState([]);
  const [demandantes, setDemandantes] = useState({});
  const [error, setError] = useState<string | null>(null);
  
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingStep('fetchingProcesos');
      setError(null);

      try {
        // 1. Fetch all processes
        const procesosResponse = await axios.get('https://appdajusticia.com/procesos.php?all=true');
        if (procesosResponse.data.error) {
          setError(`API Error: ${procesosResponse.data.error}`);
          setLoadingStep('error');
          return;
        }
        const procesosData = procesosResponse.data;
        setProcesos(procesosData);

        // 2. Fetch demandantes for each process
        setLoadingStep('fetchingDemandantes');
        const registrosUnicos = [...new Set(procesosData.map((p: any) => p.num_registro))];
        const demandantesData: { [key: string]: any[] } = {};
        
        setProgress({ current: 0, total: registrosUnicos.length });

        for (let i = 0; i < registrosUnicos.length; i++) {
          const numRegistro = registrosUnicos[i];
          try {
            const res = await axios.get(`https://appdajusticia.com/procesos.php?num_registro=${numRegistro}`);
            if (res.data && !res.data.error) {
              demandantesData[numRegistro] = res.data;
            } else {
              demandantesData[numRegistro] = [];
            }
          } catch (e) {
            console.warn(`Could not fetch demandantes for ${numRegistro}`, e);
            demandantesData[numRegistro] = [];
          }
          setProgress(p => ({ ...p, current: i + 1 }));
        }

        setDemandantes(demandantesData);
        setLoadingStep('done');

      } catch (err: any) {
        console.error('Failed to fetch data from external API', err);
        setError('Error al cargar los datos desde el servicio externo. Por favor, verifique su conexión y que el servicio esté disponible.');
        setLoadingStep('error');
      }
    };
    
    fetchAllData();
  }, []);

  const renderContent = () => {
    switch(loadingStep) {
        case 'fetchingProcesos':
            return <div className="flex justify-center items-center p-10 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">Cargando lista de procesos...</p></div>;
        case 'fetchingDemandantes':
            return <div className="flex justify-center items-center p-10 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">Cargando detalles de demandantes ({progress.current} de {progress.total})...</p></div>;
        case 'error':
            return (
                <div className="flex flex-col items-center justify-center p-10 gap-2 text-center">
                    <ServerCrash className="h-12 w-12 text-destructive" />
                    <h3 className="text-lg font-semibold text-destructive">Error al Cargar Datos</h3>
                    <p className="text-muted-foreground max-w-md">{error}</p>
                </div>
            );
        case 'done':
            return <ExternalDemandsTable procesos={procesos} demandantes={demandantes} />;
        default:
             return <div className="flex justify-center items-center p-10 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">Iniciando carga de datos...</p></div>;
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <FileClock className="h-6 w-6" />
            Gestión de Demandas Externas
          </CardTitle>
           <CardDescription>
             Consulte, filtre y exporte los datos de procesos y demandantes externos. Los datos se cargan directamente desde el servicio externo.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {renderContent()}
    </div>
  );
}
