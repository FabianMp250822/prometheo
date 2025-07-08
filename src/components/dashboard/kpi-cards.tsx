"use client";

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, BarChart, CircleDollarSign, AlertCircle, Sparkles, Loader2, CheckCircle, Clock } from 'lucide-react';
import { summarizeLegalConceptAnalysis } from '@/ai/flows/summarize-legal-concept-analysis';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UserPayment } from '@/lib/data';
import { formatCurrency } from '@/lib/helpers';

interface KpiCardsProps {
  stats: {
    totalUsuarios: number;
    totalAnalizados: number;
    totalPendientes: number;
    montoTotalCostas: number;
    montoTotalRetro: number;
    montoTotalProcesos: number;
  } | null;
  data?: UserPayment[]; // Data is optional, only needed for AI summary
}

export function KpiCards({ stats, data }: KpiCardsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = () => {
    if (!data) {
        setError('No hay datos disponibles para generar el resumen.');
        return;
    }
    startTransition(async () => {
      setError(null);
      setSummary(null);
      try {
        const analysisData = data.map(item => ({
          status: item.status,
          totalAmount: item.totalAmount,
          concepts: item.concepts,
        }));
        const result = await summarizeLegalConceptAnalysis({ analysisResults: JSON.stringify(analysisData) });
        setSummary(result.summary);
      } catch (e) {
        console.error(e);
        setError('Error al generar el resumen. Por favor, intente de nuevo.');
        toast({
          variant: 'destructive',
          title: 'Error de IA',
          description: 'No se pudo generar el resumen.',
        });
      }
    });
  };

  if (!stats) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Card key={i}><CardHeader><CardTitle>Cargando...</CardTitle></CardHeader><CardContent><div className="h-10"></div></CardContent></Card>)}
        </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnalizados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monto Costas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.montoTotalCostas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monto Retroactivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.montoTotalRetro)}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monto Procesos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.montoTotalProcesos)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="text-accent" />
            Resumen con IA
          </CardTitle>
          <CardDescription>
            Obtenga un análisis rápido de los datos actuales para identificar tendencias y anomalías.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {isPending && (
             <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generando resumen...</span>
            </div>
          )}
          {summary && (
            <Alert variant="default" className="border-accent">
                <Sparkles className="h-4 w-4 text-accent" />
                <AlertTitle className="font-headline text-lg">Análisis de IA</AlertTitle>
                <AlertDescription className="prose prose-sm max-w-none">{summary}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleGenerateSummary} disabled={isPending || !data}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generar Resumen
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
