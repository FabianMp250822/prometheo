'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileClock, Loader2, Circle } from 'lucide-react';
import { checkDbConnection } from '@/app/actions/get-external-demands';

export default function GestionDemandasPage() {
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    checkDbConnection().then(result => {
      setConnectionStatus(result.success ? 'success' : 'error');
    });
  }, []);

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success':
        return <Circle className="h-4 w-4 fill-green-500 text-green-500" />;
      case 'error':
        return <Circle className="h-4 w-4 fill-red-500 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
     switch (connectionStatus) {
      case 'pending':
        return 'Verificando conexión...';
      case 'success':
        return 'Conexión exitosa a la base de datos de demandas.';
      case 'error':
        return 'Error al conectar a la base de datos de demandas.';
      default:
        return '';
    }
  }

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <FileClock className="h-6 w-6" />
            Gestión de Demandas
          </CardTitle>
           <CardDescription className="flex items-center gap-2 pt-2">
             {getStatusIndicator()}
            <span>{getStatusText()}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta sección está en construcción. Aquí podrá consultar los procesos de demandas externas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
