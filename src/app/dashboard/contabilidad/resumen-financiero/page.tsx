'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment, Pensioner } from '@/lib/data';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { BarChartHorizontal, DollarSign, Target, TrendingUp, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { parseEmployeeName } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { usePensioner } from '@/context/pensioner-provider';

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
  const router = useRouter();
  const { setSelectedPensioner } = usePensioner();
  
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
  
      if (selectedMonth && selectedYear && salary > clientTotalPaid) {
          const remainingBalance = salary - clientTotalPaid;
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
  
  const handleViewClientHistory = (client: DajusticiaClient) => {
    const pensionerForContext: Pensioner = {
      id: client.id,
      documento: client.cedula,
      empleado: `${client.nombres} ${client.apellidos}`,
      dependencia1: client.grupo,
      centroCosto: 'N/A'
    };
    setSelectedPensioner(pensionerForContext);
    router.push(`/dashboard/contabilidad/pagos-cliente/${client.id}`);
  };
  

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
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-20">
                        <TableRow>
                            <TableHead className="min-w-[200px] sticky left-0 bg-card z-30">Cliente</TableHead>
                            {monthNames.map(m => <TableHead key={m} className="text-center">{m.substring(0,3)}</TableHead>)}
                            <TableHead className="text-right font-bold sticky right-0 bg-card z-30">Total Año</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentStatusByClient.map(({ client, monthlyPayments, totalPaidInYear }) => (
                            <TableRow key={client.id} className="hover:bg-muted/50">
                                <TableCell 
                                    className="font-medium sticky left-0 bg-card z-10 cursor-pointer hover:underline"
                                    onClick={() => handleViewClientHistory(client)}
                                >
                                    {parseEmployeeName(client.nombres)}
                                </TableCell>
                                {monthlyPayments.map((status, index) => (
                                    <TableCell key={index} className="text-center text-xs p-2">
                                        {status === 'Completado' ? (
                                             <Badge variant="secondary" className="bg-green-100 text-green-800">Completado</Badge>
                                        ) : status === 'No Pago' ? (
                                            <Badge variant="destructive" className="bg-red-100 text-red-800">No Pago</Badge>
                                        ) : (
                                            formatCurrency(status as number)
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right font-bold sticky right-0 bg-card z-10">{formatCurrency(totalPaidInYear)}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="bg-muted font-bold sticky bottom-0 z-20">
                            <TableCell className="sticky left-0 bg-muted z-30">TOTAL MENSUAL</TableCell>
                            {monthlyTotals.map((total, index) => (
                                <TableCell key={index} className="text-center text-sm p-2">
                                    {formatCurrency(total)}
                                </TableCell>
                            ))}
                            <TableCell className="text-right sticky right-0 bg-muted z-30">
                                {formatCurrency(monthlyTotals.reduce((a,b) => a+b, 0))}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
             {/* Mobile Cards */}
             <div className="md:hidden grid grid-cols-1 gap-4">
                {paymentStatusByClient.map(({ client, monthlyPayments, totalPaidInYear }) => (
                    <Card key={client.id} onClick={() => handleViewClientHistory(client)}>
                        <CardHeader>
                            <CardTitle>{parseEmployeeName(client.nombres)}</CardTitle>
                            <CardDescription>Total Año: <span className="font-bold text-primary">{formatCurrency(totalPaidInYear)}</span></CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                {monthlyPayments.map((status, index) => (
                                    <div key={index} className="flex flex-col items-center p-1 rounded-md">
                                        <span className="font-semibold">{monthNames[index].substring(0,3)}</span>
                                        {status === 'Completado' ? (
                                             <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">OK</Badge>
                                        ) : status === 'No Pago' ? (
                                            <Badge variant="destructive" className="mt-1 bg-red-100 text-red-800">NO</Badge>
                                        ) : (
                                            <span className="text-green-700 font-medium">{formatCurrency(status as number)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            </CardContent>
        </Card>
    </div>
  );
}

