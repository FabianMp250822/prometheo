'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileClock, Loader2, ServerCrash, CheckCircle } from 'lucide-react';
import { checkDbConnection, getAllExternalDemands, getDemandantesByRegistro } from '@/app/actions/get-external-demands';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';

type LoadingStep = 'idle' | 'checkingConnection' | 'fetchingProcesos' | 'fetchingDemandantes' | 'done' | 'error';

export default function GestionDemandasPage() {
  const [procesos, setProcesos] = useState([]);
  const [demandantes, setDemandantes] = useState({});
  const [error, setError] = useState<string | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const verifyConnectionAndFetch = async () => {
      // 1. Check connection status
      setLoadingStep('checkingConnection');
      setConnectionStatus('checking');
      const conn = await checkDbConnection();
      if (!conn.success) {
        setConnectionStatus('error');
        setConnectionError(conn.error || 'Error desconocido al verificar la conexión.');
        setLoadingStep('error');
        return;
      }
      setConnectionStatus('ok');
      
      // 2. Fetch all processes
      setLoadingStep('fetchingProcesos');
      setError(null);
      try {
        const { success, data: procesosData, error: procesosError } = await getAllExternalDemands();
        if (!success || !procesosData) {
          setError(procesosError || 'Error al cargar los datos de procesos.');
          setLoadingStep('error');
          return;
        }
        setProcesos(procesosData);

        // 3. Fetch demandantes for each process
        setLoadingStep('fetchingDemandantes');
        const registrosUnicos = [...new Set(procesosData.map((p: any) => p.num_registro))];
        const demandantesData: { [key: string]: any[] } = {};
        
        setProgress({ current: 0, total: registrosUnicos.length });

        for (let i = 0; i < registrosUnicos.length; i++) {
          const numRegistro = registrosUnicos[i];
          try {
            const res = await getDemandantesByRegistro(numRegistro);
            if (res.success && res.data) {
              demandantesData[numRegistro] = res.data;
            } else {
              demandantesData[numRegistro] = [];
            }
            setProgress(p => ({ ...p, current: i + 1 }));
          } catch {
            demandantesData[numRegistro] = [];
          }
        }
        setDemandantes(demandantesData);
        setLoadingStep('done');

      } catch (err: any) {
        setError('Error al cargar los datos: ' + err.message);
        setLoadingStep('error');
      }
    };
    
    verifyConnectionAndFetch();
  }, []);

  const renderLoadingState = () => {
    switch(loadingStep) {
        case 'checkingConnection':
            return <div className="flex justify-center items-center p-10 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">Verificando conexión con el servicio externo...</p></div>;
        case 'fetchingProcesos':
            return <div className="flex justify-center items-center p-10 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">Cargando lista de procesos...</p></div>;
        case 'fetchingDemandantes':
            return <div className="flex justify-center items-center p-10 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">Cargando demandantes ({progress.current} de {progress.total})...</p></div>;
        case 'error':
            return (
                <div className="flex flex-col items-center justify-center p-10 gap-2 text-center">
                    <ServerCrash className="h-12 w-12 text-destructive" />
                    <h3 className="text-lg font-semibold text-destructive">Error al Cargar Datos</h3>
                    <p className="text-muted-foreground max-w-md">{error}</p>
                </div>
            );
        case 'done':
            return <ExternalDemandsTable procesosOriginales={procesos} demandantesIniciales={demandantes} />;
        default:
            return null;
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
             Consulte, filtre y exporte los datos de procesos y demandantes externos.
          </CardDescription>
           <div className="pt-2">
            <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Estado del Servicio Externo:</span>
                {connectionStatus === 'checking' && <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Comprobando...</span>}
                {connectionStatus === 'ok' && <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-green-600 font-medium">Conexión Establecida</span></div>}
                {connectionStatus === 'error' && <div className="flex items-center gap-1.5"><ServerCrash className="h-4 w-4 text-red-500" /><span className="text-red-600 font-medium">Falló la Conexión</span></div>}
            </div>
            {connectionError && <p className="text-xs text-destructive mt-1">{connectionError}</p>}
          </div>
        </CardHeader>
      </Card>
      
      {connectionStatus === 'ok' && renderLoadingState()}
    </div>
  );
}
