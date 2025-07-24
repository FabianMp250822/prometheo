'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, Users, TrendingUp, PieChart, BarChart2 } from 'lucide-react';
import { formatCurrency, parseEmployeeName } from '@/lib/helpers';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, Cell, Legend } from 'recharts';

interface ClientWithPayments extends DajusticiaClient {
  pagos: DajusticiaPayment[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

export default function EstadisticasPage() {
  const [clients, setClients] = useState<ClientWithPayments[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClientsWithPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsSnapshot = await getDocs(collection(db, 'nuevosclientes'));
      const clientsData = await Promise.all(
        clientsSnapshot.docs.map(async (clientDoc) => {
          const clientData = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;
          const paymentsSnapshot = await getDocs(collection(db, 'nuevosclientes', clientDoc.id, 'pagos'));
          const pagos = paymentsSnapshot.docs.map(pDoc => ({ id: pDoc.id, ...pDoc.data() } as DajusticiaPayment));
          return { ...clientData, pagos };
        })
      );
      setClients(clientsData.filter(c => c.estado !== 'inactivo'));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientsWithPayments();
  }, [fetchClientsWithPayments]);
  
  const parseSalario = (salario: number | string): number => {
    if (typeof salario === 'number') return salario;
    if (typeof salario === 'string') {
      const cleaned = salario.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const globalStats = useMemo(() => {
    const totalClients = clients.length;
    let totalCollected = 0;
    let totalContracted = 0;

    clients.forEach(client => {
      totalContracted += parseSalario(client.salario);
      client.pagos.forEach(pago => {
        totalCollected += parseSalario(pago.montoNeto);
      });
    });
    
    const totalPending = totalContracted - totalCollected;
    const averageTicket = totalClients > 0 ? totalCollected / totalClients : 0;

    return { totalClients, totalCollected, totalPending, averageTicket };
  }, [clients]);

  const monthlyCollectionData = useMemo(() => {
    const monthlyData: { [key: string]: number } = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    monthNames.forEach(m => monthlyData[m] = 0);
    
    const currentYear = new Date().getFullYear();

    clients.forEach(client => {
      client.pagos.forEach(pago => {
        const paymentDate = new Date(pago.fecha);
        if (paymentDate.getFullYear() === currentYear) {
          const monthName = monthNames[paymentDate.getMonth()];
          monthlyData[monthName] += parseSalario(pago.montoNeto);
        }
      });
    });
    
    return Object.entries(monthlyData).map(([name, value]) => ({ name, total: value }));
  }, [clients]);
  
  const groupDistributionData = useMemo(() => {
    const groupData: { [key: string]: number } = {};
    clients.forEach(client => {
        const group = client.grupo || 'Sin Grupo';
        if (!groupData[group]) groupData[group] = 0;
        groupData[group] += client.pagos.reduce((sum, p) => sum + parseSalario(p.montoNeto), 0);
    });
    return Object.entries(groupData).map(([name, value]) => ({ name, value }));
  }, [clients]);

  const topClients = useMemo(() => {
    const clientSummaries = clients.map(client => {
      const totalPaid = client.pagos.reduce((sum, pago) => sum + parseSalario(pago.montoNeto), 0);
      const totalDebt = parseSalario(client.salario) - totalPaid;
      return {
        name: parseEmployeeName(`${client.nombres} ${client.apellidos}`),
        totalPaid,
        totalDebt
      };
    });
    
    const topPayers = [...clientSummaries].sort((a,b) => b.totalPaid - a.totalPaid).slice(0,5);
    const topDebtors = [...clientSummaries].sort((a,b) => b.totalDebt - a.totalDebt).slice(0,5);

    return { topPayers, topDebtors };
  }, [clients]);


  if (isLoading) {
    return <div className="p-4 md:p-8"><DataTableSkeleton columnCount={4} rowCount={10} /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <BarChart2 className="h-6 w-6" />
            Estadísticas Financieras
          </CardTitle>
          <CardDescription>Visualización de los datos financieros clave de DAJUSTICIA.</CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Recaudado</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(globalStats.totalCollected)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(globalStats.totalPending)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Clientes</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{globalStats.totalClients}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(globalStats.averageTicket)}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recaudación del Año Actual</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyCollectionData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${new Intl.NumberFormat('es-CO', { notation: "compact", compactDisplay: "short" }).format(value as number)}`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Distribución de Recaudo por Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie data={groupDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                        return (percent as number) > 0.05 ? (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"> {`${(percent * 100).toFixed(0)}%`} </text>) : null;
                    }}>
                        {groupDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)}/>
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
          <Card>
              <CardHeader><CardTitle>Top 5 Clientes por Pagos Realizados</CardTitle></CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Total Pagado</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {topClients.topPayers.map((client, index) => (
                              <TableRow key={index}><TableCell>{client.name}</TableCell><TableCell className="text-right font-medium">{formatCurrency(client.totalPaid)}</TableCell></TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
           <Card>
              <CardHeader><CardTitle>Top 5 Clientes por Deuda</CardTitle></CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Deuda Actual</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {topClients.topDebtors.map((client, index) => (
                              <TableRow key={index}><TableCell>{client.name}</TableCell><TableCell className="text-right font-medium text-red-600">{formatCurrency(client.totalDebt)}</TableCell></TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>

    </div>
  );
}
