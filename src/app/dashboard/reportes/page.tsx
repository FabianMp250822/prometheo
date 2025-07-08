'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, DollarSign, Users, TrendingUp } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { payments } from '@/lib/data';
import { formatCurrency } from '@/lib/helpers';
import type { ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  totalAmount: {
    label: 'Monto Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export default function ReportesPage() {

    const dataByDepartment = useMemo(() => {
        const departments: { [key: string]: { totalAmount: number, userCount: number } } = {};
        payments.forEach(p => {
            if (!departments[p.department]) {
                departments[p.department] = { totalAmount: 0, userCount: 0 };
            }
            departments[p.department].totalAmount += p.totalAmount;
            departments[p.department].userCount += 1;
        });
        return Object.entries(departments).map(([name, values]) => ({ name, ...values }));
    }, []);
    
    const totalStats = useMemo(() => {
        const totalAmount = payments.reduce((acc, p) => acc + p.totalAmount, 0);
        const totalUsers = payments.length;
        return {
            totalAmount,
            totalUsers,
            avgAmount: totalUsers > 0 ? totalAmount / totalUsers : 0,
        }
    }, []);

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
                    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                        <BarChart accessibilityLayer data={dataByDepartment}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={(value) => formatCurrency(Number(value)).slice(0, -4) + 'M'}
                                axisLine={false}
                                tickLine={false}
                            />
                            <ChartTooltip
                                cursor={false}
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
