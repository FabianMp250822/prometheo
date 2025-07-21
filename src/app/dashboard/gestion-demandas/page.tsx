'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileClock, Loader2 } from 'lucide-react';
import { getAllExternalDemands, getDemandantesByRegistro } from '@/app/actions/get-external-demands';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';

export default function GestionDemandasPage() {
  const [procesos, setProcesos] = useState([]);
  const [demandantes, setDemandantes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProcesos = async () => {
      setLoading(true);
      setError(null);
      try {
        const { success, data, error } = await getAllExternalDemands();
        if (success && data) {
          setProcesos(data);
          
          const registrosUnicos = [...new Set(data.map((p: any) => p.num_registro))];
          const demandantesData: { [key: string]: any[] } = {};
          
          await Promise.all(
            registrosUnicos.map(async (numRegistro: any) => {
              try {
                const res = await getDemandantesByRegistro(numRegistro);
                if (res.success && res.data) {
                  demandantesData[numRegistro] = res.data;
                } else {
                  demandantesData[numRegistro] = [];
                }
              } catch {
                demandantesData[numRegistro] = [];
              }
            })
          );
          setDemandantes(demandantesData);

        } else {
          setError(error || 'Error al cargar los datos de procesos.');
        }
      } catch (err: any) {
        setError('Error al cargar los datos: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProcesos();
  }, []);

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
        </CardHeader>
      </Card>

      {loading && (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Cargando procesos y demandantes...</p>
        </div>
      )}
      {error && <p className="text-destructive p-4">{error}</p>}
      
      {!loading && !error && (
        <ExternalDemandsTable procesosOriginales={procesos} demandantesIniciales={demandantes} />
      )}
    </div>
  );
}
