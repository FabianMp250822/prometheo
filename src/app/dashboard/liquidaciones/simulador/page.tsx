
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical, Calculator, Download, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/helpers';

// Datos consolidados SMLMV e IPC
const datosConsolidados: Record<number, { smlmv: number; reajusteSMLMV: number; ipc: number }> = {
  1982: { smlmv: 7410, reajusteSMLMV: 30.0, ipc: 26.36 },
  1983: { smlmv: 9261, reajusteSMLMV: 24.98, ipc: 24.03 },
  1984: { smlmv: 11298, reajusteSMLMV: 22.0, ipc: 16.64 },
  1985: { smlmv: 13558, reajusteSMLMV: 20.0, ipc: 18.28 },
  1986: { smlmv: 16811, reajusteSMLMV: 23.99, ipc: 22.45 },
  1987: { smlmv: 20510, reajusteSMLMV: 22.0, ipc: 20.95 },
  1988: { smlmv: 25637, reajusteSMLMV: 25.0, ipc: 24.02 },
  1989: { smlmv: 32556, reajusteSMLMV: 26.99, ipc: 28.12 },
  1990: { smlmv: 41025, reajusteSMLMV: 26.01, ipc: 26.12 },
  1991: { smlmv: 51720, reajusteSMLMV: 26.07, ipc: 32.36 },
  1992: { smlmv: 65190, reajusteSMLMV: 26.04, ipc: 26.82 },
  1993: { smlmv: 81510, reajusteSMLMV: 25.03, ipc: 25.13 },
  1994: { smlmv: 98700, reajusteSMLMV: 21.09, ipc: 22.6 },
  1995: { smlmv: 118934, reajusteSMLMV: 20.5, ipc: 19.47 },
  1996: { smlmv: 142125, reajusteSMLMV: 19.5, ipc: 19.47 },
  1997: { smlmv: 172005, reajusteSMLMV: 21.02, ipc: 21.64 },
  1998: { smlmv: 203825, reajusteSMLMV: 18.5, ipc: 17.68 },
  1999: { smlmv: 236460, reajusteSMLMV: 16.01, ipc: 16.7 },
  2000: { smlmv: 260100, reajusteSMLMV: 10.0, ipc: 9.23 },
  2001: { smlmv: 286000, reajusteSMLMV: 9.96, ipc: 8.75 },
  2002: { smlmv: 309000, reajusteSMLMV: 8.04, ipc: 7.65 },
  2003: { smlmv: 332000, reajusteSMLMV: 7.44, ipc: 6.99 },
  2004: { smlmv: 358000, reajusteSMLMV: 7.83, ipc: 6.49 },
  2005: { smlmv: 381500, reajusteSMLMV: 6.56, ipc: 5.5 },
  2006: { smlmv: 408000, reajusteSMLMV: 6.95, ipc: 4.85 },
  2007: { smlmv: 433700, reajusteSMLMV: 6.3, ipc: 4.48 },
  2008: { smlmv: 461500, reajusteSMLMV: 6.41, ipc: 5.69 },
  2009: { smlmv: 496900, reajusteSMLMV: 7.67, ipc: 7.67 },
  2010: { smlmv: 515000, reajusteSMLMV: 3.64, ipc: 2.0 },
  2011: { smlmv: 535600, reajusteSMLMV: 4.0, ipc: 3.17 },
  2012: { smlmv: 566000, reajusteSMLMV: 5.81, ipc: 3.73 },
  2013: { smlmv: 589500, reajusteSMLMV: 4.02, ipc: 2.44 },
  2014: { smlmv: 616000, reajusteSMLMV: 4.5, ipc: 1.94 },
  2015: { smlmv: 644350, reajusteSMLMV: 4.6, ipc: 3.66 },
  2016: { smlmv: 689455, reajusteSMLMV: 7.0, ipc: 6.77 },
  2017: { smlmv: 737717, reajusteSMLMV: 7.0, ipc: 5.75 },
  2018: { smlmv: 781242, reajusteSMLMV: 5.9, ipc: 4.09 },
  2019: { smlmv: 828116, reajusteSMLMV: 6.0, ipc: 3.18 },
  2020: { smlmv: 877803, reajusteSMLMV: 6.0, ipc: 3.8 },
  2021: { smlmv: 908526, reajusteSMLMV: 3.5, ipc: 1.61 },
  2022: { smlmv: 1000000, reajusteSMLMV: 10.07, ipc: 5.62 },
  2023: { smlmv: 1160000, reajusteSMLMV: 16.0, ipc: 13.12 },
  2024: { smlmv: 1300000, reajusteSMLMV: 12.0, ipc: 9.28 },
  2025: { smlmv: 1423500, reajusteSMLMV: 9.5, ipc: 5.2 }
};

interface EvolucionData {
  año: number;
  smlmv: number;
  reajusteSMLMV: number;
  proyeccionMesadaSMLMV: number;
  numSmlmvSMLMV: number;
  reajusteIPC: number;
  proyeccionMesadaIPC: number;
  numSmlmvIPC: number;
  perdidaPorcentual: number;
  perdidaSmlmv: number;
  mesadaPagada: number;
  diferenciaMesadas: number;
  numMesadas: number;
  totalDiferenciasRetroactivas: number;
}

interface ComparticionData {
  habilitarComparticion: boolean;
  fechaComparticion: string;
  valorEmpresa: number;
  valorISS: number;
}

export default function SimuladorPage() {
  // Entradas base (Excel: F6, F7, F9 y C4)
  const [salarioPromedio, setSalarioPromedio] = useState<number>(2632601); // F6
  const [porcentajeReemplazo, setPorcentajeReemplazo] = useState<number>(100); // F7 (%)
  const [fechaPrimeraMesada, setFechaPrimeraMesada] = useState<string>('2003-01-01'); // F9
  const [distrito, setDistrito] = useState<'BOLIVAR' | 'OTRO'>('OTRO'); // C4

  // Compartición (opcional)
  const [comparticion, setComparticion] = useState<ComparticionData>({
    habilitarComparticion: false,
    fechaComparticion: '2010-09-01',
    valorEmpresa: 116460,
    valorISS: 3879018
  });

  const mesadaPensional = useMemo(() => {
    if (distrito === 'BOLIVAR') return salarioPromedio;
    return salarioPromedio * (porcentajeReemplazo / 100);
  }, [salarioPromedio, porcentajeReemplazo, distrito]);

  const yearInicial = useMemo(() => {
    const date = new Date(fechaPrimeraMesada);
    if (isNaN(date.getTime())) return 0;
    const y = date.getFullYear();
    const m = date.getMonth();
    return m === 0 ? y - 1 : y;
  }, [fechaPrimeraMesada]);

  const sharingInfo = useMemo(() => {
    if (!comparticion.habilitarComparticion) return null;
    const sharingDate = new Date(comparticion.fechaComparticion);
    return {
      year: sharingDate.getFullYear(),
      month: sharingDate.getMonth() + 1,
      valorEmpresa: comparticion.valorEmpresa,
      valorISS: comparticion.valorISS
    };
  }, [comparticion]);

  const { tablaAntes, tablaDespues } = useMemo(() => {
    const endYear = Math.max(...Object.keys(datosConsolidados).map(Number));

    const years = Object.keys(datosConsolidados)
      .map(Number)
      .filter((year) => year >= yearInicial && year <= endYear)
      .sort((a, b) => a - b);
  
    let proyeccionSMLMVAnterior = 0;
    let proyeccionIPCAnterior = 0;
  
    const allData = years.map((year, index) => {
      const smlmv = datosConsolidados[year]?.smlmv || 0;
      const reajusteSMLMV = datosConsolidados[year]?.reajusteSMLMV || 0;
      const reajusteIPC = datosConsolidados[year]?.ipc || 0;
  
      let proyeccionMesadaSMLMV = 0;
      let proyeccionMesadaIPC = 0;
      let mesadaPagada = 0;
  
      if (index === 0) {
        proyeccionMesadaSMLMV = mesadaPensional;
        proyeccionMesadaIPC = mesadaPensional;
        mesadaPagada = mesadaPensional;
      } else {
        proyeccionMesadaSMLMV = proyeccionSMLMVAnterior * (1 + reajusteSMLMV / 100);
        proyeccionMesadaIPC = proyeccionIPCAnterior * (1 + reajusteIPC / 100);
        mesadaPagada = proyeccionMesadaIPC;
      }
  
      proyeccionSMLMVAnterior = proyeccionMesadaSMLMV;
      proyeccionIPCAnterior = proyeccionMesadaIPC;
  
      const numSmlmvSMLMV = smlmv > 0 ? proyeccionMesadaSMLMV / smlmv : 0;
      const numSmlmvIPC = smlmv > 0 ? proyeccionMesadaIPC / smlmv : 0;
  
      const perdidaPorcentual =
        proyeccionMesadaSMLMV > 0
          ? 100 - (proyeccionMesadaIPC * 100) / proyeccionMesadaSMLMV
          : 0;
  
      const perdidaSmlmv = numSmlmvSMLMV - numSmlmvIPC;
      const diferenciaMesadas = proyeccionMesadaSMLMV - proyeccionMesadaIPC;
  
      let numMesadas = 14;
      if (sharingInfo && year === sharingInfo.year) {
        numMesadas = sharingInfo.month - 1;
      }
  
      const totalDiferenciasRetroactivas = diferenciaMesadas * numMesadas;
  
      return {
        año: year,
        smlmv,
        reajusteSMLMV,
        proyeccionMesadaSMLMV,
        numSmlmvSMLMV,
        reajusteIPC,
        proyeccionMesadaIPC,
        numSmlmvIPC,
        perdidaPorcentual,
        perdidaSmlmv,
        mesadaPagada,
        diferenciaMesadas,
        numMesadas,
        totalDiferenciasRetroactivas,
      };
    });
  
    const tablaAntes = sharingInfo ? allData.filter((d) => d.año < sharingInfo.year) : allData;
    const tablaDespues = sharingInfo ? allData.filter((d) => d.año >= sharingInfo.year) : [];
  
    if (sharingInfo && tablaDespues.length > 0) {
      const porcentajeEmpresa =
        sharingInfo.valorEmpresa / (sharingInfo.valorEmpresa + sharingInfo.valorISS);
  
      tablaDespues.forEach((row) => {
        const mesadaProyectadaEmpresa = row.proyeccionMesadaSMLMV * porcentajeEmpresa;
        const mesadaPagadaEmpresa = row.proyeccionMesadaIPC * porcentajeEmpresa;
  
        row.mesadaPagada = mesadaPagadaEmpresa;
        row.diferenciaMesadas = mesadaProyectadaEmpresa - mesadaPagadaEmpresa;
  
        if (row.año === sharingInfo.year) {
          row.numMesadas = 14 - sharingInfo.month + 1;
        } else {
          row.numMesadas = 14;
        }
  
        row.totalDiferenciasRetroactivas = row.diferenciaMesadas * row.numMesadas;
      });
    }
  
    return { tablaAntes, tablaDespues };
  }, [yearInicial, mesadaPensional, sharingInfo]);

  const handleReset = () => {
    setSalarioPromedio(2632601);
    setPorcentajeReemplazo(100);
    setFechaPrimeraMesada('2003-01-01');
    setDistrito('OTRO');
    setComparticion({
      habilitarComparticion: false,
      fechaComparticion: '2010-09-01',
      valorEmpresa: 116460,
      valorISS: 3879018
    });
  };

  const handleExport = () => {
    const allData = [...tablaAntes, ...tablaDespues];
    const headers = [
      'Año', 'SMLMV', 'Reajuste % SMLMV', 'Proyección Mesada SMLMV', '# SMLMV',
      'Reajuste % IPC', 'Proyección Mesada IPC', '# SMLMV IPC', 'Pérdida %',
      'Pérdida SMLMV', 'Mesada Pagada', 'Diferencias', '# Mesadas', 'Total Retroactivas'
    ];

    const csvContent = [
      headers.join(','),
      ...allData.map((row) =>
        [
          row.año, row.smlmv, row.reajusteSMLMV.toFixed(2), Math.round(row.proyeccionMesadaSMLMV),
          row.numSmlmvSMLMV.toFixed(2), row.reajusteIPC.toFixed(2), Math.round(row.proyeccionMesadaIPC),
          row.numSmlmvIPC.toFixed(2), row.perdidaPorcentual.toFixed(2), row.perdidaSmlmv.toFixed(2),
          Math.round(row.mesadaPagada), Math.round(row.diferenciaMesadas), row.numMesadas,
          Math.round(row.totalDiferenciasRetroactivas)
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_evolucion_mesada_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderTable = (data: EvolucionData[], title: string) => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Año</TableHead>
              <TableHead className="text-right">SMLMV</TableHead>
              <TableHead className="text-center">Reajuste<br />% SMLMV</TableHead>
              <TableHead className="text-right">Proyección<br />Mesada<br />(SMLMV)</TableHead>
              <TableHead className="text-center"># de<br />SMLMV</TableHead>
              <TableHead className="text-center">Reajuste<br />% IPC</TableHead>
              <TableHead className="text-right">Proyección<br />Mesada<br />(IPC)</TableHead>
              <TableHead className="text-center"># de<br />SMLMV<br />(IPC)</TableHead>
              <TableHead className="text-center">Pérdida<br />%</TableHead>
              <TableHead className="text-center">Pérdida<br />SMLMV</TableHead>
              <TableHead className="text-right">Mesada<br />Pagada</TableHead>
              <TableHead className="text-right">Diferencias</TableHead>
              <TableHead className="text-center"># Mesadas</TableHead>
              <TableHead className="text-right font-semibold">Total<br />Retroactivas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.año}>
                <TableCell className="text-center font-medium">{row.año}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.smlmv)}</TableCell>
                <TableCell className="text-center">{row.reajusteSMLMV.toFixed(2)}%</TableCell>
                <TableCell className="text-right">{formatCurrency(row.proyeccionMesadaSMLMV)}</TableCell>
                <TableCell className="text-center">{row.numSmlmvSMLMV.toFixed(2)}</TableCell>
                <TableCell className="text-center">{row.reajusteIPC.toFixed(2)}%</TableCell>
                <TableCell className="text-right">{formatCurrency(row.proyeccionMesadaIPC)}</TableCell>
                <TableCell className="text-center">{row.numSmlmvIPC.toFixed(2)}</TableCell>
                <TableCell className="text-center">{row.perdidaPorcentual.toFixed(2)}%</TableCell>
                <TableCell className="text-center">{row.perdidaSmlmv.toFixed(2)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.mesadaPagada)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.diferenciaMesadas)}</TableCell>
                <TableCell className="text-center">{row.numMesadas}</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {formatCurrency(row.totalDiferenciasRetroactivas)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted">
              <TableCell colSpan={13} className="text-right">
                TOTAL GENERAL RETROACTIVAS
              </TableCell>
              <TableCell className="text-right text-lg text-primary">
                {formatCurrency(data.reduce((sum, row) => sum + row.totalDiferenciasRetroactivas, 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            Simulador de Evolución de Mesada
          </CardTitle>
          <CardDescription>
            Calcule la evolución de la mesada pensional comparando reajustes por SMLMV vs. IPC
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Datos de Entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salario">Último Salario Promedio / Mesada Inicial</Label>
              <Input
                id="salario"
                type="number"
                value={salarioPromedio}
                onChange={(e) => setSalarioPromedio(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="porcentaje">Porcentaje de Reemplazo (%)</Label>
              <Input
                id="porcentaje"
                type="number"
                value={porcentajeReemplazo}
                onChange={(e) => setPorcentajeReemplazo(Number(e.target.value))}
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha Primera Mesada</Label>
              <Input
                id="fecha"
                type="date"
                value={fechaPrimeraMesada}
                onChange={(e) => setFechaPrimeraMesada(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distrito">Distrito</Label>
              <select
                id="distrito"
                className="border rounded-md h-10 px-3 w-full"
                value={distrito}
                onChange={(e) => setDistrito(e.target.value as 'BOLIVAR' | 'OTRO')}
              >
                <option value="OTRO">OTRO</option>
                <option value="BOLIVAR">BOLIVAR</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="comparticion"
                checked={comparticion.habilitarComparticion}
                onChange={(e) =>
                  setComparticion({ ...comparticion, habilitarComparticion: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="comparticion" className="font-semibold">
                Habilitar Compartición de Pensión
              </Label>
            </div>

            {comparticion.habilitarComparticion && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="fechaComp">Fecha de Compartición</Label>
                  <Input
                    id="fechaComp"
                    type="date"
                    value={comparticion.fechaComparticion}
                    onChange={(e) =>
                      setComparticion({ ...comparticion, fechaComparticion: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorEmpresa">Valor Empresa</Label>
                  <Input
                    id="valorEmpresa"
                    type="number"
                    value={comparticion.valorEmpresa}
                    onChange={(e) =>
                      setComparticion({ ...comparticion, valorEmpresa: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorISS">Valor ISS</Label>
                  <Input
                    id="valorISS"
                    type="number"
                    value={comparticion.valorISS}
                    onChange={(e) =>
                      setComparticion({ ...comparticion, valorISS: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button onClick={handleReset} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Resetear Valores
            </Button>
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {tablaAntes.length > 0 && renderTable(tablaAntes, 'Liquidación Antes de Compartir')}
      {tablaDespues.length > 0 && renderTable(tablaDespues, 'Liquidación Después de Compartir')}

    </div>
  );
}

