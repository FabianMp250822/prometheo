'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, DollarSign, Users, TrendingUp, Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, parseDepartmentName } from '@/lib/helpers';
import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { getProcesosCanceladosConPensionados } from '@/services/pensioner-service';
import type { ProcesoCancelado } from '@/lib/data';

const chartConfig = {
  totalAmount: {
    label: 'Monto Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export default function ReportesPage() {
    const [procesos, setProcesos] = useState<ProcesoCancelado[]>([]);
    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
        const fetchReportData = async () => {
            setIsLoading(true);
            try {
                const data = await getProcesosCanceladosConPensionados();
                setProcesos(data);
            } catch (error) {
                console.error("Error fetching reports data from Firestore:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReportData();
    }, []);

    const totalStats = useMemo(() => {
        const totalAmount = procesos.reduce((acc, p) => {
            const procesoTotal = p.conceptos.reduce((sum, c) => sum + (c.ingresos || 0), 0);
            return acc + procesoTotal;
        }, 0);

        const uniqueUserIds = new Set(procesos.map(p => p.pensionadoId));
        const totalUsers = uniqueUserIds.size;
        
        return {
            totalAmount,
            totalUsers,
            avgAmount: totalUsers > 0 ? totalAmount / totalUsers : 0,
        }
    }, [procesos]);
    
    const dataByDepartment = useMemo(() => {
        const departments: { [key: string]: { totalAmount: number, userCount: number } } = {};
        
        procesos.forEach(p => {
            // Ensure we have pensioner info and a department to work with
            if (!p.pensionerInfo?.department) return;
            
            // Use the helper to clean up the department name for grouping
            const depName = parseDepartmentName(p.pensionerInfo.department);
            
            if (!departments[depName]) {
                departments[depName] = { totalAmount: 0, userCount: 0 };
            }

            const procesoTotal = p.conceptos.reduce((sum, c) => sum + (c.ingresos || 0), 0);
            departments[depName].totalAmount += procesoTotal;
        });

        // Map the aggregated data into the format expected by the chart
        return Object.entries(departments).map(([name, values]) => ({ 
            name, 
            totalAmount: values.totalAmount 
        })).sort((a,b) => b.totalAmount - a.totalAmount); // Sort to show largest bars first
    }, [procesos]);


    if (isLoading) {
      return (
        <div className="p-4 md:p-8 space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <BarChart2 className="h-6 w-6" />
                        Reportes y Estadísticas
                    </CardTitle>
                    <CardDescription>
                       Cargando datos para los reportes...
                    </CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monto Total en Sentencias</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-3/4" />
                </CardContent>
              </Card>
               <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios con Sentencias</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-8 w-1/4" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Promedio por Usuario</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-8 w-3/4" />
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Totales por Dependencia</CardTitle>
                    <CardDescription>Monto total sentenciado por cada dependencia.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[300px] flex justify-center items-center">
                   <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </CardContent>
            </Card>
        </div>
      )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <BarChart2 className="h-6 w-6" />
                        Reportes y Estadísticas
                    </CardTitle>
                    <CardDescription>
                        Visualice los datos clave de la operación a través de gráficos interactivos.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monto Total en Sentencias</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStats.totalAmount)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios con Sentencias</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStats.totalUsers}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Promedio por Usuario</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStats.avgAmount)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Totales por Dependencia</CardTitle>
                    <CardDescription>Monto total sentenciado por cada dependencia.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                        <BarChart accessibilityLayer data={dataByDepartment} layout="vertical">
                            <CartesianGrid horizontal={false} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                className="text-xs"
                                width={120}
                            />
                            <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `$${new Intl.NumberFormat('es-CO', { notation: "compact", compactDisplay: "short" }).format(Number(value))}`}
                            />
                            <ChartTooltip
                                cursor={true}
                                content={<ChartTooltipContent 
                                    formatter={(value) => formatCurrency(Number(value))}
                                />}
                            />
                            <Bar dataKey="totalAmount" fill="var(--color-totalAmount)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
