
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, DollarSign, Users, TrendingUp, Loader2, Gavel, Briefcase, FileClock } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell } from 'recharts';
import { formatCurrency, parseDepartmentName } from '@/lib/helpers';
import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { getProcesosCanceladosConPensionados } from '@/services/pensioner-service';
import type { ProcesoCancelado, DajusticiaClient, DajusticiaPayment, LegalProcess } from '@/lib/data';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

const chartConfigSentencias = {
  totalAmount: {
    label: 'Monto Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const chartConfigContabilidad = {
    monto: {
        label: 'Monto',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

const chartConfigProcesos = {
    count: {
        label: 'Cantidad',
        color: 'hsl(var(--chart-3))'
    }
} satisfies ChartConfig;


export default function ReportesPage() {
    const [procesosCancelados, setProcesosCancelados] = useState<ProcesoCancelado[]>([]);
    const [clientesContabilidad, setClientesContabilidad] = useState<(DajusticiaClient & { pagos: DajusticiaPayment[] })[]>([]);
    const [procesosLegales, setProcesosLegales] = useState<LegalProcess[]>([]);

    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const [sentenciasData, clientesSnapshot, procesosSnapshot] = await Promise.all([
                    getProcesosCanceladosConPensionados(),
                    getDocs(query(collection(db, 'nuevosclientes'))),
                    getDocs(query(collection(db, 'procesos')))
                ]);

                setProcesosCancelados(sentenciasData);

                const clientesData = await Promise.all(clientesSnapshot.docs.map(async (clientDoc) => {
                    const clientData = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;
                    const paymentsSnapshot = await getDocs(collection(db, 'nuevosclientes', clientDoc.id, 'pagos'));
                    const pagos = paymentsSnapshot.docs.map(pDoc => pDoc.data() as DajusticiaPayment);
                    return { ...clientData, pagos };
                }));
                setClientesContabilidad(clientesData);
                
                const procesosData = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalProcess));
                setProcesosLegales(procesosData);

            } catch (error) {
                console.error("Error fetching reports data from Firestore:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const sentenciasStats = useMemo(() => {
        const totalAmount = procesosCancelados.reduce((acc, p) => {
            const procesoTotal = p.conceptos.reduce((sum, c) => sum + (c.ingresos || 0), 0);
            return acc + procesoTotal;
        }, 0);
        const uniqueUserIds = new Set(procesosCancelados.map(p => p.pensionadoId));
        const totalUsers = uniqueUserIds.size;
        return { totalAmount, totalUsers, avgAmount: totalUsers > 0 ? totalAmount / totalUsers : 0 };
    }, [procesosCancelados]);
    
    const sentenciasByDepartment = useMemo(() => {
        const departments: { [key: string]: { totalAmount: number } } = {};
        procesosCancelados.forEach(p => {
            if (!p.pensionerInfo?.department) return;
            const depName = parseDepartmentName(p.pensionerInfo.department);
            if (!departments[depName]) departments[depName] = { totalAmount: 0 };
            const procesoTotal = p.conceptos.reduce((sum, c) => sum + (c.ingresos || 0), 0);
            departments[depName].totalAmount += procesoTotal;
        });
        return Object.entries(departments).map(([name, values]) => ({ name, totalAmount: values.totalAmount }))
            .sort((a,b) => b.totalAmount - a.totalAmount);
    }, [procesosCancelados]);

    const contabilidadStats = useMemo(() => {
        const totalContracted = clientesContabilidad.reduce((sum, c) => sum + (c.salario || 0), 0);
        const totalCollected = clientesContabilidad.reduce((sum, c) => sum + c.pagos.reduce((pSum, p) => pSum + (p.montoNeto || 0), 0), 0);
        return {
            totalClients: clientesContabilidad.length,
            totalContracted,
            totalCollected,
            totalPending: totalContracted - totalCollected
        };
    }, [clientesContabilidad]);

    const procesosStats = useMemo(() => {
        const statusCount: { [key: string]: number } = {};
        procesosLegales.forEach(p => {
            const status = p.estado || 'Sin Estado';
            if (!statusCount[status]) statusCount[status] = 0;
            statusCount[status]++;
        });
        return {
            totalProcesos: procesosLegales.length,
            byStatus: Object.entries(statusCount).map(([name, value]) => ({ name, value }))
        };
    }, [procesosLegales]);

    if (isLoading) {
      return (
        <div className="p-4 md:p-8 space-y-6">
           <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_,i) => 
                <Card key={i}>
                    <CardHeader className="pb-2"><Skeleton className="h-5 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-8 w-3/4" /></CardContent>
                </Card>
              )}
            </div>
             <Card>
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
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
                        Reportes y Estadísticas Globales
                    </CardTitle>
                    <CardDescription>
                        Visualice los datos clave de la operación a través de gráficos interactivos.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Resumen de Sentencias */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Gavel className="h-5 w-5 text-primary"/>Resumen de Sentencias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Monto Total en Sentencias</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{formatCurrency(sentenciasStats.totalAmount)}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Usuarios con Sentencias</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{sentenciasStats.totalUsers}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Promedio por Usuario</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{formatCurrency(sentenciasStats.avgAmount)}</div></CardContent>
                        </Card>
                    </div>
                     <Card>
                        <CardHeader>
                            <CardTitle>Totales por Dependencia</CardTitle>
                            <CardDescription>Monto total sentenciado por cada dependencia.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfigSentencias} className="min-h-[400px] w-full">
                                <BarChart accessibilityLayer data={sentenciasByDepartment} layout="vertical">
                                    <CartesianGrid horizontal={false} />
                                    <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" width={120} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `$${new Intl.NumberFormat('es-CO', { notation: "compact", compactDisplay: "short" }).format(Number(value))}`} />
                                    <ChartTooltip cursor={true} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                                    <Bar dataKey="totalAmount" fill="var(--color-totalAmount)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

             {/* Resumen de Contabilidad */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/>Resumen de Contabilidad (Nuevos Clientes)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total de Clientes</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{contabilidadStats.totalClients}</div></CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monto Total Contratado</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{formatCurrency(contabilidadStats.totalContracted)}</div></CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Recaudado</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(contabilidadStats.totalCollected)}</div></CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(contabilidadStats.totalPending)}</div></CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

             {/* Resumen de Procesos Legales */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><FileClock className="h-5 w-5 text-primary"/>Resumen de Procesos Legales</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col justify-center">
                        <p className="text-sm text-muted-foreground">Total de Procesos</p>
                        <p className="text-5xl font-bold">{procesosStats.totalProcesos}</p>
                    </div>
                     <ChartContainer config={chartConfigProcesos} className="min-h-[250px] w-full">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
                            <Pie data={procesosStats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label >
                                {procesosStats.byStatus.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
