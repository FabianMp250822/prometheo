"use client";

import React, { useMemo, useState, useTransition } from 'react';
import { UserPayment } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, BarChart, CircleDollarSign, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { summarizeLegalConceptAnalysis } from '@/ai/flows/summarize-legal-concept-analysis';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface KpiCardsProps {
  data: UserPayment[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function KpiCards({ data }: KpiCardsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalUsers = data.length;
    const statusCounts = data.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const conceptTotals = data.reduce((acc, item) => {
      for (const concept in item.concepts) {
        const key = concept as keyof typeof item.concepts;
        acc[key] = (acc[key] || 0) + (item.concepts[key] || 0);
      }
      return acc;
    }, {} as Record<string, number>);

    return { totalUsers, statusCounts, conceptTotals };
  }, [data]);

  const handleGenerateSummary = () => {
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuarios con sentencias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Procesos</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statusCounts['Pendiente'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.statusCounts['Analizado'] || 0} analizados de {stats.totalUsers}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montos por Concepto</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(stats.conceptTotals).map(([concept, total]) => (
              <div key={concept}>
                <p className="text-xs text-muted-foreground">{concept}</p>
                <p className="text-lg font-bold">{formatCurrency(total)}</p>
              </div>
            ))}
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
            <Button onClick={handleGenerateSummary} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generar Resumen
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
