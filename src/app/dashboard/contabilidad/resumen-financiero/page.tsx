'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { BarChartHorizontal, DollarSign, Target, TrendingUp, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { parseEmployeeName } from '@/lib/helpers';

interface ClientWithPayments extends DajusticiaClient {
  pagos: DajusticiaPayment[];
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear -2 + i).toString());

export default function ResumenFinancieroPage() {
  const [clients, setClients] = useState<ClientWithPayments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [displayYear, setDisplayYear] = useState<string>(currentYear.toString());

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
  
  const financialSummary = useMemo(() => {
    let totalContractAmount = 0;
    let totalCollectedGlobal = 0;
    let monthlyProjection = 0;
    let monthlyCollected = 0;
  
    clients.forEach(client => {
      const salary = parseSalario(client.salario);
      const cuotaMensual = parseSalario(client.cuotaMensual);
      
      totalContractAmount += salary;
  
      let clientTotalPaid = 0;
      client.pagos.forEach(pago => {
        const montoNeto = parseSalario(pago.montoNeto);
        totalCollectedGlobal += montoNeto;
        clientTotalPaid += montoNeto;
  
        if (selectedMonth && selectedYear) {
          const paymentDate = new Date(pago.fecha);
          if (paymentDate.getFullYear() === parseInt(selectedYear, 10) && (paymentDate.getMonth() + 1) === parseInt(selectedMonth, 10)) {
            monthlyCollected += montoNeto;
          }
        }
      });
  
      // Calculate monthly projection only if there's a remaining balance
      if (selectedMonth && selectedYear && salary > clientTotalPaid) {
          const remainingBalance = salary - clientTotalPaid;
          // The projection is the monthly payment, but not more than the remaining balance
          monthlyProjection += Math.min(cuotaMensual, remainingBalance);
      }
    });
  
    return {
      totalContractAmount,
      totalCollectedGlobal,
      globalPending: totalContractAmount - totalCollectedGlobal,
      globalProgress: totalContractAmount > 0 ? (totalCollectedGlobal / totalContractAmount) * 100 : 0,
      monthlyProjection,
      monthlyCollected,
    };
  }, [clients, selectedMonth, selectedYear]);

  
  const paymentStatusByClient = useMemo(() => {
    return clients.map(client => {
      const salary = parseSalario(client.salario);
      const monthlyPayments: (number | string)[] = Array(12).fill('No Pago');
      let totalPaidInYear = 0;
      
      let cumulativePaid = client.pagos
          .filter(p => new Date(p.fecha).getFullYear() < parseInt(displayYear, 10))
          .reduce((sum, p) => sum + parseSalario(p.montoNeto), 0);

      for (let i = 0; i < 12; i++) {
        const month = i + 1;
        const paymentsInMonth = client.pagos.filter(p => {
          const d = new Date(p.fecha);
          return d.getFullYear() === parseInt(displayYear, 10) && d.getMonth() + 1 === month;
        });

        const monthTotal = paymentsInMonth.reduce((sum, p) => sum + parseSalario(p.montoNeto), 0);
        
        cumulativePaid += monthTotal;
        totalPaidInYear += monthTotal;

        if (cumulativePaid >= salary) {
          monthlyPayments[i] = 'Completado';
          for (let j = i + 1; j < 12; j++) monthlyPayments[j] = 'Completado';
          break;
        } else if(monthTotal > 0) {
          monthlyPayments[i] = monthTotal;
        }
      }
      
      return { client, monthlyPayments, totalPaidInYear };
    });
  }, [clients, displayYear]);

  const monthlyTotals = useMemo(() => {
    const totals = Array(12).fill(0);
    paymentStatusByClient.forEach(({ monthlyPayments }) => {
        monthlyPayments.forEach((payment, index) => {
            if (typeof payment === 'number') {
                totals[index] += payment;
            }
        });
    });
    return totals;
  }, [paymentStatusByClient]);
  

  if (isLoading) {
    return <div className="p-4 md:p-8"><DataTableSkeleton columnCount={5} rowCount={10} /></div>
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <BarChartHorizontal className="h-6 w-6" />
            Resumen Financiero
          </CardTitle>
          <CardDescription>Análisis global y mensual de los contratos y recaudos.</CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalContractAmount)}</div>
                <p className="text-xs text-muted-foreground">Valor total de todos los acuerdos.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recaudado</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary.totalCollectedGlobal)}</div>
                <p className="text-xs text-muted-foreground">Suma de todos los pagos netos recibidos.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Pendiente Global</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.globalPending)}</div>
                <Progress value={financialSummary.globalProgress} className="mt-2 h-2" />
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Resumen Mensual</CardTitle>
              <CardDescription>Filtre por mes y año para ver el rendimiento.</CardDescription>
            </div>
            <div className='flex gap-2 w-full md:w-auto'>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger><SelectValue placeholder="Mes" /></SelectTrigger>
                    <SelectContent>
                        {monthNames.map((m,i) => <SelectItem key={m} value={(i+1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger><SelectValue placeholder="Año" /></SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className="flex items-center space-x-4 rounded-md border p-4">
                <Target className="h-10 w-10 text-primary"/>
                <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Proyección de Recaudo</p>
                <p className="text-sm text-muted-foreground">Suma de cuotas esperadas para {monthNames[parseInt(selectedMonth,10)-1]} {selectedYear}.</p>
                </div>
                <div className="text-xl font-bold">{formatCurrency(financialSummary.monthlyProjection)}</div>
            </div>
             <div className="flex items-center space-x-4 rounded-md border p-4">
                <DollarSign className="h-10 w-10 text-green-600"/>
                <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Total Recaudado en el Mes</p>
                <p className="text-sm text-muted-foreground">Pagos netos recibidos en el periodo.</p>
                </div>
                <div className="text-xl font-bold text-green-600">{formatCurrency(financialSummary.monthlyCollected)}</div>
            </div>
        </CardContent>
       </Card>

        <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>Estado de Pagos Anual por Cliente</CardTitle>
                  <CardDescription>Trazabilidad de pagos para el año seleccionado.</CardDescription>
                </div>
                <Select value={displayYear} onValueChange={setDisplayYear}>
                    <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Año" /></SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Cliente</TableHead>
                            {monthNames.map(m => <TableHead key={m} className="text-center">{m.substring(0,3)}</TableHead>)}
                            <TableHead className="text-right font-bold">Total Año</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentStatusByClient.map(({ client, monthlyPayments, totalPaidInYear }) => (
                            <TableRow key={client.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium sticky left-0 bg-card z-10">{parseEmployeeName(client.nombres)}</TableCell>
                                {monthlyPayments.map((status, index) => (
                                    <TableCell key={index} className="text-center text-xs p-2">
                                        {status === 'Completado' ? (
                                             <span className="font-semibold text-green-600">{status}</span>
                                        ) : status === 'No Pago' ? (
                                            <span className="text-red-500">{status}</span>
                                        ) : (
                                            formatCurrency(status as number)
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right font-bold">{formatCurrency(totalPaidInYear)}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="bg-muted font-bold">
                            <TableCell className="sticky left-0 bg-muted z-10">TOTAL MENSUAL</TableCell>
                            {monthlyTotals.map((total, index) => (
                                <TableCell key={index} className="text-center text-sm p-2">
                                    {formatCurrency(total)}
                                </TableCell>
                            ))}
                            <TableCell className="text-right">
                                {formatCurrency(monthlyTotals.reduce((a,b) => a+b, 0))}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            </CardContent>
        </Card>
    </div>
  );
}
