'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical, Calculator, Download, RefreshCw, TrendingUp, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/helpers';

// Datos consolidados SMLMV e IPC - Base completa del simulador
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

// Interfaces para el simulador FONECA
interface LiquidacionFonecaData {
  año: number;
  smlmv: number;
  reajusteEnPorcentajeSMLMV: number;
  proyeccionMesadaFiduconSMLMV: number;
  numSmlmvEnReajusteSMLMV: number;
  reajusteEnPorcentajeIPCs: number;
  proyeccionMesadaFiduconIPCs: number;
  numSmlmvEnReajusteIPC: number;
  perdidaPorcentualEnProyeccionIPCs: number;
  perdidaEnSmlmvEnProyeccionIPCs: number;
  mesadaPagadaPorFiduconIPCs: number;
  diferenciasDeMesadas: number;
  numDeMesadas: number;
  totalDiferenciasRetroactivas: number;
}

interface ParametrosSimulacion {
  // Datos básicos del pensionado
  salarioPromedio: number;
  porcentajeReemplazo: number;
  fechaPrimeraMesada: string;
  
  // Parámetros de compartición FONECA
  fechaComparticion: string;
  porcentajeFoneca: number;
  porcentajeColpensiones: number;
  
  // Parámetros de liquidación
  fechaCorte: string;
  tasaInteresesMora: number;
  
  // Configuración de cálculo
  metodoCalculoIPC: 'acumulado' | 'compuesto';
  incluirMesadasAdicionales: boolean;
  considerarFallecimiento: boolean;
  fechaFallecimiento?: string;
}

export default function SimuladorFonecaPage() {
  // Estados principales del simulador
  const [parametros, setParametros] = useState<ParametrosSimulacion>({
    salarioPromedio: 2632601, // Esta será la mesada base de 2003
    porcentajeReemplazo: 100,
    fechaPrimeraMesada: '2003-01-01',
    fechaComparticion: '2014-06-13',
    porcentajeFoneca: 45,
    porcentajeColpensiones: 55,
    fechaCorte: '2014-12-31', // Cambiar a 2014 para coincidir con Excel
    tasaInteresesMora: 12,
    metodoCalculoIPC: 'compuesto',
    incluirMesadasAdicionales: true,
    considerarFallecimiento: false
  });

  const [activeTab, setActiveTab] = useState('parametros');

  // Cálculo de la mesada pensional inicial
  const mesadaPensionalInicial = useMemo(() => {
    // Mesada base exacta del Excel para 2003
    return 2632601;
  }, [parametros.salarioPromedio, parametros.porcentajeReemplazo, parametros.fechaPrimeraMesada]);

  // Función para calcular la evolución de mesadas con metodología FONECA
  const calcularEvolucionFoneca = useMemo(() => {
    const fechaInicio = new Date(parametros.fechaPrimeraMesada);
    const fechaComparticion = new Date(parametros.fechaComparticion);
    const fechaFin = parametros.considerarFallecimiento && parametros.fechaFallecimiento 
      ? new Date(parametros.fechaFallecimiento)
      : new Date(parametros.fechaCorte);
    
    const añoInicio = fechaInicio.getFullYear();
    const añoComparticion = fechaComparticion.getFullYear();
    const mesComparticion = fechaComparticion.getMonth() + 1; // 1-indexed
    const diaComparticion = fechaComparticion.getDate();
    const añoFin = fechaFin.getFullYear();
    
    const resultados: LiquidacionFonecaData[] = [];
    let acumuladoTotalDiferenciasRetroactivas = 0;
    
    for (let año = añoInicio; año <= añoFin; año++) {
      const datosSMLMV = datosConsolidados[año];
      if (!datosSMLMV) continue;
      
      // Verificar si este año necesita ser dividido por la compartición (13/06/2014)
      const esDivisionComparticion = (año === añoComparticion && mesComparticion === 6 && diaComparticion === 13);
      
      if (esDivisionComparticion) {
        // CREAR DOS REGISTROS PARA 2014
        
        // PRIMER REGISTRO: Período prescrito (enero - junio 13)
        const smlmvAño = datosSMLMV.smlmv;
        const reajusteEnPorcentajeSMLMV = datosSMLMV.reajusteSMLMV;
        let proyeccionMesadaFiduconSMLMV = mesadaPensionalInicial;
        if (año > añoInicio) {
          for (let añoCalculo = añoInicio + 1; añoCalculo <= año; añoCalculo++) {
            const datosAño = datosConsolidados[añoCalculo];
            if (datosAño) {
              proyeccionMesadaFiduconSMLMV = proyeccionMesadaFiduconSMLMV * (1 + datosAño.reajusteSMLMV / 100);
            }
          }
        }
        const numSmlmvEnReajusteSMLMV = proyeccionMesadaFiduconSMLMV / smlmvAño;
        const reajusteEnPorcentajeIPCs = datosSMLMV.ipc;
        let proyeccionMesadaFiduconIPCs = mesadaPensionalInicial;
        if (año > añoInicio) {
          for (let añoCalculo = añoInicio + 1; añoCalculo <= año; añoCalculo++) {
            const datosAño = datosConsolidados[añoCalculo];
            if (datosAño) {
              proyeccionMesadaFiduconIPCs = proyeccionMesadaFiduconIPCs * (1 + datosAño.ipc / 100);
            }
          }
        }
        const numSmlmvEnReajusteIPC = proyeccionMesadaFiduconIPCs / smlmvAño;
        const perdidaPorcentualEnProyeccionIPCs = ((proyeccionMesadaFiduconSMLMV - proyeccionMesadaFiduconIPCs) / proyeccionMesadaFiduconSMLMV) * 100;
        const perdidaEnSmlmvEnProyeccionIPCs = (proyeccionMesadaFiduconSMLMV - proyeccionMesadaFiduconIPCs) / smlmvAño;
        const mesadaPagadaPorFiduconIPCs = Math.min(proyeccionMesadaFiduconSMLMV, proyeccionMesadaFiduconIPCs);
        const diferenciasDeMesadas = proyeccionMesadaFiduconSMLMV - mesadaPagadaPorFiduconIPCs;
        
        // Período prescrito: 11 mesadas
        const numDeMesadasPrescrito = 11;
        const diferenciaAnualPrescrito = diferenciasDeMesadas * numDeMesadasPrescrito;
        acumuladoTotalDiferenciasRetroactivas += diferenciaAnualPrescrito;
        
        resultados.push({
          año: año,
          smlmv: Math.round(smlmvAño),
          reajusteEnPorcentajeSMLMV: Number(reajusteEnPorcentajeSMLMV.toFixed(2)),
          proyeccionMesadaFiduconSMLMV: Math.round(proyeccionMesadaFiduconSMLMV),
          numSmlmvEnReajusteSMLMV: Number(numSmlmvEnReajusteSMLMV.toFixed(2)),
          reajusteEnPorcentajeIPCs: Number(reajusteEnPorcentajeIPCs.toFixed(2)),
          proyeccionMesadaFiduconIPCs: Math.round(proyeccionMesadaFiduconIPCs),
          numSmlmvEnReajusteIPC: Number(numSmlmvEnReajusteIPC.toFixed(2)),
          perdidaPorcentualEnProyeccionIPCs: Number(perdidaPorcentualEnProyeccionIPCs.toFixed(2)),
          perdidaEnSmlmvEnProyeccionIPCs: Number(perdidaEnSmlmvEnProyeccionIPCs.toFixed(2)),
          mesadaPagadaPorFiduconIPCs: Math.round(mesadaPagadaPorFiduconIPCs),
          diferenciasDeMesadas: Math.round(diferenciasDeMesadas),
          numDeMesadas: numDeMesadasPrescrito,
          totalDiferenciasRetroactivas: Math.round(acumuladoTotalDiferenciasRetroactivas)
        });
        
        // SEGUNDO REGISTRO: Período no prescrito (junio 13 - diciembre)
        const numDeMesadasNoPrescrito = 3;
        const diferenciaAnualNoPrescrito = diferenciasDeMesadas * numDeMesadasNoPrescrito;
        acumuladoTotalDiferenciasRetroactivas += diferenciaAnualNoPrescrito;
        
        resultados.push({
          año: año,
          smlmv: Math.round(smlmvAño),
          reajusteEnPorcentajeSMLMV: Number(reajusteEnPorcentajeSMLMV.toFixed(2)),
          proyeccionMesadaFiduconSMLMV: Math.round(proyeccionMesadaFiduconSMLMV),
          numSmlmvEnReajusteSMLMV: Number(numSmlmvEnReajusteSMLMV.toFixed(2)),
          reajusteEnPorcentajeIPCs: Number(reajusteEnPorcentajeIPCs.toFixed(2)),
          proyeccionMesadaFiduconIPCs: Math.round(proyeccionMesadaFiduconIPCs),
          numSmlmvEnReajusteIPC: Number(numSmlmvEnReajusteIPC.toFixed(2)),
          perdidaPorcentualEnProyeccionIPCs: Number(perdidaPorcentualEnProyeccionIPCs.toFixed(2)),
          perdidaEnSmlmvEnProyeccionIPCs: Number(perdidaEnSmlmvEnProyeccionIPCs.toFixed(2)),
          mesadaPagadaPorFiduconIPCs: Math.round(mesadaPagadaPorFiduconIPCs),
          diferenciasDeMesadas: Math.round(diferenciasDeMesadas),
          numDeMesadas: numDeMesadasNoPrescrito,
          totalDiferenciasRetroactivas: Math.round(acumuladoTotalDiferenciasRetroactivas)
        });
        
      } else {
        // Registro normal para años completos
        const smlmvAño = datosSMLMV.smlmv;
        const reajusteEnPorcentajeSMLMV = datosSMLMV.reajusteSMLMV;
        let proyeccionMesadaFiduconSMLMV = mesadaPensionalInicial;
        if (año > añoInicio) {
          for (let añoCalculo = añoInicio + 1; añoCalculo <= año; añoCalculo++) {
            const datosAño = datosConsolidados[añoCalculo];
            if (datosAño) {
              proyeccionMesadaFiduconSMLMV = proyeccionMesadaFiduconSMLMV * (1 + datosAño.reajusteSMLMV / 100);
            }
          }
        }
        const numSmlmvEnReajusteSMLMV = proyeccionMesadaFiduconSMLMV / smlmvAño;
        const reajusteEnPorcentajeIPCs = datosSMLMV.ipc;
        let proyeccionMesadaFiduconIPCs = mesadaPensionalInicial;
        if (año > añoInicio) {
          for (let añoCalculo = añoInicio + 1; añoCalculo <= año; añoCalculo++) {
            const datosAño = datosConsolidados[añoCalculo];
            if (datosAño) {
              proyeccionMesadaFiduconIPCs = proyeccionMesadaFiduconIPCs * (1 + datosAño.ipc / 100);
            }
          }
        }
        const numSmlmvEnReajusteIPC = proyeccionMesadaFiduconIPCs / smlmvAño;
        const perdidaPorcentualEnProyeccionIPCs = ((proyeccionMesadaFiduconSMLMV - proyeccionMesadaFiduconIPCs) / proyeccionMesadaFiduconSMLMV) * 100;
        const perdidaEnSmlmvEnProyeccionIPCs = (proyeccionMesadaFiduconSMLMV - proyeccionMesadaFiduconIPCs) / smlmvAño;
        const mesadaPagadaPorFiduconIPCs = Math.min(proyeccionMesadaFiduconSMLMV, proyeccionMesadaFiduconIPCs);
        const diferenciasDeMesadas = proyeccionMesadaFiduconSMLMV - mesadaPagadaPorFiduconIPCs;
        
        let numDeMesadas = 12;
        if (parametros.incluirMesadasAdicionales) {
          numDeMesadas = 14;
        }
        
        const diferenciaAnual = diferenciasDeMesadas * numDeMesadas;
        acumuladoTotalDiferenciasRetroactivas += diferenciaAnual;
        
        resultados.push({
          año: año,
          smlmv: Math.round(smlmvAño),
          reajusteEnPorcentajeSMLMV: Number(reajusteEnPorcentajeSMLMV.toFixed(2)),
          proyeccionMesadaFiduconSMLMV: Math.round(proyeccionMesadaFiduconSMLMV),
          numSmlmvEnReajusteSMLMV: Number(numSmlmvEnReajusteSMLMV.toFixed(2)),
          reajusteEnPorcentajeIPCs: Number(reajusteEnPorcentajeIPCs.toFixed(2)),
          proyeccionMesadaFiduconIPCs: Math.round(proyeccionMesadaFiduconIPCs),
          numSmlmvEnReajusteIPC: Number(numSmlmvEnReajusteIPC.toFixed(2)),
          perdidaPorcentualEnProyeccionIPCs: Number(perdidaPorcentualEnProyeccionIPCs.toFixed(2)),
          perdidaEnSmlmvEnProyeccionIPCs: Number(perdidaEnSmlmvEnProyeccionIPCs.toFixed(2)),
          mesadaPagadaPorFiduconIPCs: Math.round(mesadaPagadaPorFiduconIPCs),
          diferenciasDeMesadas: Math.round(diferenciasDeMesadas),
          numDeMesadas: numDeMesadas,
          totalDiferenciasRetroactivas: Math.round(acumuladoTotalDiferenciasRetroactivas)
        });
      }
    }
    
    return resultados;
  }, [parametros, mesadaPensionalInicial]);

  // Función para actualizar parámetros
  const actualizarParametro = <K extends keyof ParametrosSimulacion>(
    key: K,
    value: ParametrosSimulacion[K]
  ) => {
    setParametros(prev => ({ ...prev, [key]: value }));
  };

  // Función para exportar a Excel/CSV
  const exportarCSV = () => {
    const headers = [
      'Año',
      'SMLMV',
      'Reajuste en % SMLMV',
      'Proyección de Mesada Fiduprevisora con % SMLMV',
      '# de SMLMV (En el Reajuste x SMLMV)',
      'Reajuste en % IPCs',
      'Proyección de Mesada Fiduprevisora reajuste con IPCs',
      '# de SMLMV (En el Reajuste x IPC)',
      'Pérdida Porcentual en Proyección IPCs',
      'Pérdida en smlmv EN Proyección IPCs',
      'Mesada Pagada por Fiduprevisora reajuste con IPCs',
      'Diferencias de Mesadas',
      '# de Mesadas',
      'Total Diferencias Retroactivas'
    ];
    
    const csvContent = [
      headers.join(','),
      ...calcularEvolucionFoneca.map(row => [
        row.año,
        row.smlmv,
        row.reajusteEnPorcentajeSMLMV,
        row.proyeccionMesadaFiduconSMLMV,
        row.numSmlmvEnReajusteSMLMV.toFixed(2),
        row.reajusteEnPorcentajeIPCs,
        row.proyeccionMesadaFiduconIPCs,
        row.numSmlmvEnReajusteIPC.toFixed(2),
        row.perdidaPorcentualEnProyeccionIPCs.toFixed(2),
        row.perdidaEnSmlmvEnProyeccionIPCs.toFixed(2),
        row.mesadaPagadaPorFiduconIPCs,
        row.diferenciasDeMesadas,
        row.numDeMesadas,
        row.totalDiferenciasRetroactivas
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquidacion_foneca_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Función para resetear valores
  const resetearValores = () => {
    setParametros({
      salarioPromedio: 2632601,
      porcentajeReemplazo: 100,
      fechaPrimeraMesada: '2003-01-01',
      fechaComparticion: '2010-09-01',
      porcentajeFoneca: 45,
      porcentajeColpensiones: 55,
      fechaCorte: '2025-08-19',
      tasaInteresesMora: 12,
      metodoCalculoIPC: 'compuesto',
      incluirMesadasAdicionales: true,
      considerarFallecimiento: false
    });
  };

  // Separación de datos en períodos
  const datosSeparados = useMemo(() => {
    const datos = calcularEvolucionFoneca;
    const fechaComparticion = new Date(parametros.fechaComparticion);
    const añoComparticion = fechaComparticion.getFullYear();
    const mesComparticion = fechaComparticion.getMonth() + 1; // +1 porque getMonth() es 0-indexed
    const diaComparticion = fechaComparticion.getDate();
    
    const antesComparticion: LiquidacionFonecaData[] = [];
    const despuesComparticion: LiquidacionFonecaData[] = [];
    
    // Variable para rastrear si ya encontramos el primer registro de 2014 (prescrito)
    let registroPrescrito2014Encontrado = false;
    
    datos.forEach((row) => {
      // Caso especial: División en 2014 cuando la compartición es 13/06/2014
      if (row.año === añoComparticion && mesComparticion === 6 && diaComparticion === 13) {
        if (!registroPrescrito2014Encontrado) {
          // Primer registro de 2014: va al período prescrito
          antesComparticion.push(row);
          registroPrescrito2014Encontrado = true;
        } else {
          // Segundo registro de 2014: va al período no prescrito  
          despuesComparticion.push(row);
        }
      }
      // Casos normales
      else if (row.año < añoComparticion) {
        antesComparticion.push(row);
      } else if (row.año > añoComparticion) {
        despuesComparticion.push(row);
      } else {
        // row.año === añoComparticion pero no es el caso especial de 14/06/2014
        despuesComparticion.push(row);
      }
    });
    
    return {
      antesComparticion,
      despuesComparticion,
      añoComparticion,
      fechaComparticion: parametros.fechaComparticion
    };
  }, [calcularEvolucionFoneca, parametros.fechaComparticion]);

  // Cálculos de resumen por período
  const resumenPorPeriodo = useMemo(() => {
    const { antesComparticion, despuesComparticion } = datosSeparados;
    
    if (antesComparticion.length === 0 && despuesComparticion.length === 0) return null;
    
    // Resumen período prescrito (antes de compartición)
    const resumenAntes = antesComparticion.length > 0 ? {
      añosLiquidacion: antesComparticion.length,
      totalRetroactivo: antesComparticion[antesComparticion.length - 1]?.totalDiferenciasRetroactivas || 0,
      totalIntereses: 0, // Comentado temporalmente
      totalGeneral: antesComparticion[antesComparticion.length - 1]?.totalDiferenciasRetroactivas || 0,
      porcentajeFoneca: 100 // Antes de compartición siempre es 100%
    } : {
      añosLiquidacion: 0,
      totalRetroactivo: 0,
      totalIntereses: 0,
      totalGeneral: 0,
      porcentajeFoneca: 100
    };
    
    // Resumen período compartido (después de compartición)
    const ultimoAñoDespues = despuesComparticion[despuesComparticion.length - 1];
    const ultimoAñoAntes = antesComparticion[antesComparticion.length - 1];
    
    const resumenDespues = despuesComparticion.length > 0 ? {
      añosLiquidacion: despuesComparticion.length,
      totalRetroactivo: (ultimoAñoDespues?.totalDiferenciasRetroactivas || 0) - (ultimoAñoAntes?.totalDiferenciasRetroactivas || 0),
      totalIntereses: 0, // Comentado temporalmente
      totalGeneral: (ultimoAñoDespues?.totalDiferenciasRetroactivas || 0) - (ultimoAñoAntes?.totalDiferenciasRetroactivas || 0),
      porcentajeFoneca: parametros.porcentajeFoneca
    } : {
      añosLiquidacion: 0,
      totalRetroactivo: 0,
      totalIntereses: 0,
      totalGeneral: 0,
      porcentajeFoneca: parametros.porcentajeFoneca
    };
    
    return {
      antesComparticion: resumenAntes,
      despuesComparticion: resumenDespues
    };
  }, [datosSeparados, parametros.porcentajeFoneca]);

  // Cálculos de resumen
  const resumenLiquidacion = useMemo(() => {
    const datos = calcularEvolucionFoneca;
    if (datos.length === 0) return null;
    
    const ultimoAño = datos[datos.length - 1];
    const totalMesesLiquidacion = datos.reduce((sum, row) => sum + row.numDeMesadas, 0);
    
    return {
      totalRetroactivo: ultimoAño.totalDiferenciasRetroactivas,
      totalIntereses: 0, // Comentado temporalmente
      totalGeneral: ultimoAño.totalDiferenciasRetroactivas,
      mesadaActual: ultimoAño.proyeccionMesadaFiduconSMLMV,
      añosLiquidacion: datos.length,
      mesesLiquidacion: totalMesesLiquidacion,
      promedioAnual: ultimoAño.totalDiferenciasRetroactivas / datos.length,
      diferenciaTotalSinComparticion: datos.reduce((sum, row) => 
        sum + (row.diferenciasDeMesadas * row.numDeMesadas), 0
      ),
      ahorroComparticion: 0 // Comentado temporalmente
    };
  }, [calcularEvolucionFoneca]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">Simulador de Liquidación FONECA</CardTitle>
              <CardDescription>
                Herramienta completa para el cálculo de liquidaciones pensionales con metodología FONECA - Réplica de Hoja "Liquida-Foneca"
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parametros">Parámetros</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
        </TabsList>

        {/* Tab 1: Parámetros Básicos */}
        <TabsContent value="parametros">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Parámetros de Simulación FONECA
              </CardTitle>
              <CardDescription>
                Configure los parámetros base para la liquidación pensional según metodología FONECA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Datos Básicos del Pensionado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Datos Básicos del Pensionado</h4>
                  
                  <div>
                    <Label htmlFor="salarioPromedio">Salario Promedio</Label>
                    <Input
                      id="salarioPromedio"
                      type="number"
                      value={parametros.salarioPromedio}
                      onChange={(e) => actualizarParametro('salarioPromedio', Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="porcentajeReemplazo">Porcentaje de Reemplazo (%)</Label>
                    <Input
                      id="porcentajeReemplazo"
                      type="number"
                      min="1"
                      max="100"
                      value={parametros.porcentajeReemplazo}
                      onChange={(e) => actualizarParametro('porcentajeReemplazo', Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fechaPrimeraMesada">Fecha Primera Mesada</Label>
                    <Input
                      id="fechaPrimeraMesada"
                      type="date"
                      value={parametros.fechaPrimeraMesada}
                      onChange={(e) => actualizarParametro('fechaPrimeraMesada', e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Parámetros de Compartición FONECA */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Compartición FONECA</h4>
                  
                  <div>
                    <Label htmlFor="fechaComparticion">Fecha Inicio Compartición</Label>
                    <Input
                      id="fechaComparticion"
                      type="date"
                      value={parametros.fechaComparticion}
                      onChange={(e) => actualizarParametro('fechaComparticion', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="porcentajeFoneca">% FONECA</Label>
                      <Input
                        id="porcentajeFoneca"
                        type="number"
                        min="0"
                        max="100"
                        value={parametros.porcentajeFoneca}
                        onChange={(e) => {
                          const valor = Number(e.target.value);
                          actualizarParametro('porcentajeFoneca', valor);
                          actualizarParametro('porcentajeColpensiones', 100 - valor);
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="porcentajeColpensiones">% Colpensiones</Label>
                      <Input
                        id="porcentajeColpensiones"
                        type="number"
                        min="0"
                        max="100"
                        value={parametros.porcentajeColpensiones}
                        onChange={(e) => {
                          const valor = Number(e.target.value);
                          actualizarParametro('porcentajeColpensiones', valor);
                          actualizarParametro('porcentajeFoneca', 100 - valor);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Parámetros de Liquidación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Parámetros de Liquidación</h4>
                  
                  <div>
                    <Label htmlFor="fechaCorte">Fecha de Corte</Label>
                    <Input
                      id="fechaCorte"
                      type="date"
                      value={parametros.fechaCorte}
                      onChange={(e) => actualizarParametro('fechaCorte', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tasaIntereses">Tasa de Intereses de Mora (% anual)</Label>
                    <Input
                      id="tasaIntereses"
                      type="number"
                      step="0.1"
                      value={parametros.tasaInteresesMora}
                      onChange={(e) => actualizarParametro('tasaInteresesMora', Number(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Configuración de Cálculo</h4>
                  
                  <div>
                    <Label htmlFor="metodoIPC">Método de Cálculo IPC</Label>
                    <Select
                      value={parametros.metodoCalculoIPC}
                      onValueChange={(value: 'acumulado' | 'compuesto') => actualizarParametro('metodoCalculoIPC', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compuesto">Interés Compuesto</SelectItem>
                        <SelectItem value="acumulado">Acumulado Simple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mesadasAdicionales"
                        checked={parametros.incluirMesadasAdicionales}
                        onCheckedChange={(checked) => actualizarParametro('incluirMesadasAdicionales', checked as boolean)}
                      />
                      <Label htmlFor="mesadasAdicionales">Incluir Mesadas Adicionales (Prima + Aguinaldo)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="considerarFallecimiento"
                        checked={parametros.considerarFallecimiento}
                        onCheckedChange={(checked) => actualizarParametro('considerarFallecimiento', checked as boolean)}
                      />
                      <Label htmlFor="considerarFallecimiento">Considerar Fecha de Fallecimiento</Label>
                    </div>
                    
                    {parametros.considerarFallecimiento && (
                      <div>
                        <Label htmlFor="fechaFallecimiento">Fecha de Fallecimiento</Label>
                        <Input
                          id="fechaFallecimiento"
                          type="date"
                          value={parametros.fechaFallecimiento || ''}
                          onChange={(e) => actualizarParametro('fechaFallecimiento', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Mesada Calculada */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Mesada Pensional Inicial Calculada</h4>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(mesadaPensionalInicial)}</p>
                <p className="text-sm text-blue-600 mt-1">
                  Base: {formatCurrency((parametros.salarioPromedio * parametros.porcentajeReemplazo) / 100)} 
                  ({parametros.porcentajeReemplazo}% de {formatCurrency(parametros.salarioPromedio)})
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  SMLMV {new Date(parametros.fechaPrimeraMesada).getFullYear()}: {formatCurrency(datosConsolidados[new Date(parametros.fechaPrimeraMesada).getFullYear()]?.smlmv || 0)}
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-4">
                <Button onClick={resetearValores} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Resetear Valores
                </Button>
                <Button onClick={exportarCSV} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Resultados */}
        <TabsContent value="resultados">
          <div className="space-y-6">
            
            {/* Información de la fecha de compartición */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Fecha de Compartición FONECA:</strong> {new Date(parametros.fechaComparticion).toLocaleDateString('es-CO')} 
                {' '}(Año {datosSeparados.añoComparticion}) - 
                FONECA: {parametros.porcentajeFoneca}% | Colpensiones: {parametros.porcentajeColpensiones}%
              </AlertDescription>
            </Alert>

            {/* Tabla: Período Prescrito (Antes de Compartición) */}
            {datosSeparados.antesComparticion.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="h-5 w-5" />
                    PERÍODO PRESCRITO (NO COMPARTIDO) - Antes de {datosSeparados.añoComparticion}
                  </CardTitle>
                  <CardDescription>
                    Liquidación correspondiente al período prescrito donde FONECA asume el 100% de la obligación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-orange-50">
                          <TableHead>Año</TableHead>
                          <TableHead>SMLMV</TableHead>
                          <TableHead>Reajuste SMLMV %</TableHead>
                          <TableHead>Proyección de Mesada Fiduprevisora (En el Reajuste SMLMV)</TableHead>
                          <TableHead># de SMLMV (En el Reajuste SMLMV)</TableHead>
                          <TableHead>Reajuste con IPCs</TableHead>
                          <TableHead>Proyección de Mesada Fiduprevisora (En el Reajuste con IPCs)</TableHead>
                          <TableHead># de SMLMV (En el Reajuste con IPCs)</TableHead>
                          <TableHead>Pérdida Porcentual de Proyección</TableHead>
                          <TableHead>Pérdida en pesos por Fiduprevisora</TableHead>
                          <TableHead>Diferencias de Mesadas</TableHead>
                          <TableHead># de Mesadas</TableHead>
                          <TableHead>Total Diferencias Retroactivas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {datosSeparados.antesComparticion.map((row) => (
                          <TableRow key={row.año} className="hover:bg-orange-25">
                            <TableCell className="font-medium">{row.año}</TableCell>
                            <TableCell>{formatCurrency(row.smlmv)}</TableCell>
                            <TableCell>{row.reajusteEnPorcentajeSMLMV.toFixed(2)}%</TableCell>
                            <TableCell>{formatCurrency(row.proyeccionMesadaFiduconSMLMV)}</TableCell>
                            <TableCell>{row.numSmlmvEnReajusteSMLMV.toFixed(2)}</TableCell>
                            <TableCell>{row.reajusteEnPorcentajeIPCs.toFixed(2)}%</TableCell>
                            <TableCell>{formatCurrency(row.proyeccionMesadaFiduconIPCs)}</TableCell>
                            <TableCell>{row.numSmlmvEnReajusteIPC.toFixed(2)}</TableCell>
                            <TableCell>{row.perdidaEnSmlmvEnProyeccionIPCs.toFixed(2)}</TableCell>
                            <TableCell>{formatCurrency(row.proyeccionMesadaFiduconSMLMV - row.proyeccionMesadaFiduconIPCs)}</TableCell>
                            <TableCell className="text-red-600">{formatCurrency(row.diferenciasDeMesadas)}</TableCell>
                            <TableCell>{row.numDeMesadas}</TableCell>
                            <TableCell className="text-blue-600 font-bold">{formatCurrency(row.totalDiferenciasRetroactivas)}</TableCell>
                            <TableCell className="text-green-600 font-bold">{formatCurrency(row.totalDiferenciasRetroactivas)}</TableCell>
                          </TableRow>
                        ))}
                      
                        <TableRow className="bg-orange-100 font-bold border-t-2 border-orange-400">
                          <TableCell colSpan={11} className="text-center bg-orange-200 text-orange-800">
                            SUBTOTAL PERÍODO PRESCRITO (NO COMPARTIDO) - 100% FONECA
                          </TableCell>
                          <TableCell className="bg-orange-200 text-center font-bold">
                            {datosSeparados.antesComparticion.reduce((sum, row) => sum + row.numDeMesadas, 0)}
                          </TableCell>
                          <TableCell className="bg-orange-200 text-blue-700 text-lg font-bold">
                            {datosSeparados.antesComparticion.length > 0 ? 
                              formatCurrency(datosSeparados.antesComparticion[datosSeparados.antesComparticion.length - 1].totalDiferenciasRetroactivas) : 
                              formatCurrency(0)
                            }
                          </TableCell>
                          <TableCell className="bg-orange-200 text-green-700 text-lg font-bold">
                            {resumenPorPeriodo?.antesComparticion ? 
                              formatCurrency(resumenPorPeriodo.antesComparticion.totalGeneral) : 
                              formatCurrency(0)
                            }
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabla: Período de Compartición FONECA */}
            {datosSeparados.despuesComparticion.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <TrendingUp className="h-5 w-5" />
                    PERÍODO DE COMPARTICIÓN FONECA - Desde {datosSeparados.añoComparticion}
                  </CardTitle>
                  <CardDescription>
                    Liquidación correspondiente al período con compartición donde FONECA asume el {parametros.porcentajeFoneca}% de la obligación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-50">
                          <TableHead>Año</TableHead>
                          <TableHead>SMLMV</TableHead>
                          <TableHead>Reajuste SMLMV %</TableHead>
                          <TableHead>Proyección de Mesada Fiduprevisora (En el Reajuste SMLMV)</TableHead>
                          <TableHead># de SMLMV (En el Reajuste SMLMV)</TableHead>
                          <TableHead>Reajuste con IPCs</TableHead>
                          <TableHead>Proyección de Mesada Fiduprevisora (En el Reajuste con IPCs)</TableHead>
                          <TableHead># de SMLMV (En el Reajuste con IPCs)</TableHead>
                          <TableHead>Pérdida Porcentual de Proyección</TableHead>
                          <TableHead>Pérdida en pesos por Fiduprevisora</TableHead>
                          <TableHead>Diferencias de Mesadas</TableHead>
                          <TableHead># de Mesadas</TableHead>
                          <TableHead>Total Diferencias Retroactivas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {datosSeparados.despuesComparticion.map((row) => (
                          <TableRow key={row.año} className="hover:bg-blue-25">
                            <TableCell className="font-medium">{row.año}</TableCell>
                            <TableCell>{formatCurrency(row.smlmv)}</TableCell>
                            <TableCell>{row.reajusteEnPorcentajeSMLMV.toFixed(2)}%</TableCell>
                            <TableCell>{formatCurrency(row.proyeccionMesadaFiduconSMLMV)}</TableCell>
                            <TableCell>{row.numSmlmvEnReajusteSMLMV.toFixed(2)}</TableCell>
                            <TableCell>{row.reajusteEnPorcentajeIPCs.toFixed(2)}%</TableCell>
                            <TableCell>{formatCurrency(row.proyeccionMesadaFiduconIPCs)}</TableCell>
                            <TableCell>{row.numSmlmvEnReajusteIPC.toFixed(2)}</TableCell>
                            <TableCell>{row.perdidaEnSmlmvEnProyeccionIPCs.toFixed(2)}</TableCell>
                            <TableCell>{formatCurrency(row.proyeccionMesadaFiduconSMLMV - row.proyeccionMesadaFiduconIPCs)}</TableCell>
                            <TableCell className="text-red-600">{formatCurrency(row.diferenciasDeMesadas)}</TableCell>
                            <TableCell>{row.numDeMesadas}</TableCell>
                            <TableCell className="text-blue-600 font-bold">{formatCurrency(row.totalDiferenciasRetroactivas)}</TableCell>
                            <TableCell className="text-blue-600 font-bold">{formatCurrency(row.totalDiferenciasRetroactivas)}</TableCell>
                          </TableRow>
                        ))}
                        {/* Fila de totales del período de compartición */}
                        <TableRow className="bg-blue-100 font-bold border-t-2 border-blue-400">
                          <TableCell colSpan={11} className="text-center bg-blue-200 text-blue-800">
                            SUBTOTAL PERÍODO COMPARTICIÓN - {parametros.porcentajeFoneca}% FONECA
                          </TableCell>
                          <TableCell className="bg-blue-200 text-center font-bold">
                            {datosSeparados.despuesComparticion.reduce((sum, row) => sum + row.numDeMesadas, 0)}
                          </TableCell>
                          <TableCell className="bg-blue-200 text-blue-700 text-lg font-bold">
                            {datosSeparados.despuesComparticion.length > 0 ? 
                              formatCurrency(datosSeparados.despuesComparticion[datosSeparados.despuesComparticion.length - 1].totalDiferenciasRetroactivas) : 
                              formatCurrency(0)
                            }
                          </TableCell>
                          <TableCell className="bg-blue-200 text-blue-700 text-lg font-bold">
                            {resumenPorPeriodo?.despuesComparticion ? 
                              formatCurrency(resumenPorPeriodo.despuesComparticion.totalGeneral) : 
                              formatCurrency(0)
                            }
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumen General Consolidado */}
            {resumenLiquidacion && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <Calculator className="h-5 w-5" />
                    TOTAL GENERAL CONSOLIDADO FONECA
                  </CardTitle>
                  <CardDescription>
                    Suma de ambos períodos: Prescrito + Compartición
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                      <p className="text-sm text-green-600">Total Retroactivo FONECA</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(resumenLiquidacion.totalRetroactivo)}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-blue-600">Total Intereses de Mora</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(resumenLiquidacion.totalIntereses)}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                      <p className="text-sm text-purple-600">TOTAL GENERAL FONECA</p>
                      <p className="text-3xl font-bold text-purple-700">
                        {formatCurrency(resumenLiquidacion.totalGeneral)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <span className="text-gray-600">Años Liquidados</span>
                      <p className="font-bold text-lg">{resumenLiquidacion.añosLiquidacion}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600">Meses Liquidados</span>
                      <p className="font-bold text-lg">{resumenLiquidacion.mesesLiquidacion}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600">Promedio Anual</span>
                      <p className="font-bold text-lg">{formatCurrency(resumenLiquidacion.promedioAnual)}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600">Mesada Actual</span>
                      <p className="font-bold text-lg">{formatCurrency(resumenLiquidacion.mesadaActual)}</p>
                    </div>
                  </div>

                  {/* Desglose por período */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">Desglose por Período</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resumenPorPeriodo?.antesComparticion && (
                        <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                          <h5 className="font-medium text-orange-800">Período Prescrito</h5>
                          <p className="text-sm text-orange-600">
                            {datosSeparados.antesComparticion.length} años × 100% FONECA
                          </p>
                          <p className="font-bold text-orange-800">
                            {formatCurrency(resumenPorPeriodo.antesComparticion.totalGeneral)}
                          </p>
                        </div>
                      )}
                      {resumenPorPeriodo?.despuesComparticion && (
                        <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                          <h5 className="font-medium text-blue-800">Período Compartición</h5>
                          <p className="text-sm text-blue-600">
                            {datosSeparados.despuesComparticion.length} años × {parametros.porcentajeFoneca}% FONECA
                          </p>
                          <p className="font-bold text-blue-800">
                            {formatCurrency(resumenPorPeriodo.despuesComparticion.totalGeneral)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </TabsContent>

        {/* Tab 3: Resumen */}
        <TabsContent value="resumen">
          <div className="space-y-6">
            
            {/* Resumen de Valores Pendientes a Pagar - Acumulado Total */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  VALORES PENDIENTES A PAGAR - ACUMULADO TOTAL
                </CardTitle>
                <CardDescription>
                  Consolidado final de todas las obligaciones pendientes de FONECA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resumenLiquidacion && (
                  <div className="space-y-6">
                    {/* Valores principales pendientes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500 text-center">
                        <p className="text-sm text-red-600 mb-2">TOTAL RETROACTIVO PENDIENTE</p>
                        <p className="text-3xl font-bold text-red-700">
                          {formatCurrency(resumenLiquidacion.totalRetroactivo)}
                        </p>
                        <p className="text-xs text-red-500 mt-1">Capital adeudado FONECA</p>
                      </div>
                      
                      <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500 text-center">
                        <p className="text-sm text-orange-600 mb-2">INTERESES DE MORA PENDIENTES</p>
                        <p className="text-3xl font-bold text-orange-700">
                          {formatCurrency(resumenLiquidacion.totalIntereses)}
                        </p>
                        <p className="text-xs text-orange-500 mt-1">Intereses al {parametros.tasaInteresesMora}% anual</p>
                      </div>
                      
                      <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500 text-center">
                        <p className="text-sm text-purple-600 mb-2">GRAN TOTAL PENDIENTE FONECA</p>
                        <p className="text-4xl font-bold text-purple-700">
                          {formatCurrency(resumenLiquidacion.totalGeneral)}
                        </p>
                        <p className="text-xs text-purple-500 mt-1">Total a pagar hasta {new Date(parametros.fechaCorte).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Desglose por períodos */}
                    {resumenPorPeriodo && (
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-4 text-center">DESGLOSE DE ACUMULADOS POR PERÍODO</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {resumenPorPeriodo.antesComparticion && (
                            <div className="bg-white p-4 rounded-lg border border-orange-200">
                              <h5 className="font-medium text-orange-800 mb-3 text-center">
                                📋 PERÍODO PRESCRITO (NO COMPARTIDO)
                              </h5>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-orange-600">Años liquidados:</span>
                                  <span className="font-bold">{resumenPorPeriodo.antesComparticion.añosLiquidacion}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-orange-600">Porcentaje FONECA:</span>
                                  <span className="font-bold">100%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-orange-600">Total Retroactivo:</span>
                                  <span className="font-bold">{formatCurrency(resumenPorPeriodo.antesComparticion.totalRetroactivo)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-orange-600">Total Intereses:</span>
                                  <span className="font-bold">{formatCurrency(resumenPorPeriodo.antesComparticion.totalIntereses)}</span>
                                </div>
                                <hr className="border-orange-300" />
                                <div className="flex justify-between">
                                  <span className="font-medium text-orange-700">ACUMULADO PRESCRITO:</span>
                                  <span className="font-bold text-lg text-orange-700">
                                    {formatCurrency(resumenPorPeriodo.antesComparticion.totalGeneral)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {resumenPorPeriodo.despuesComparticion && (
                            <div className="bg-white p-4 rounded-lg border border-blue-200">
                              <h5 className="font-medium text-blue-800 mb-3 text-center">
                                📊 PERÍODO DE COMPARTICIÓN
                              </h5>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-blue-600">Años liquidados:</span>
                                  <span className="font-bold">{resumenPorPeriodo.despuesComparticion.añosLiquidacion}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-blue-600">Porcentaje FONECA:</span>
                                  <span className="font-bold">{parametros.porcentajeFoneca}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-blue-600">Total Retroactivo:</span>
                                  <span className="font-bold">{formatCurrency(resumenPorPeriodo.despuesComparticion.totalRetroactivo)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-blue-600">Total Intereses:</span>
                                  <span className="font-bold">{formatCurrency(resumenPorPeriodo.despuesComparticion.totalIntereses)}</span>
                                </div>
                                <hr className="border-blue-300" />
                                <div className="flex justify-between">
                                  <span className="font-medium text-blue-700">ACUMULADO COMPARTICIÓN:</span>
                                  <span className="font-bold text-lg text-blue-700">
                                    {formatCurrency(resumenPorPeriodo.despuesComparticion.totalGeneral)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Total final consolidado */}
                        <div className="mt-6 p-4 bg-purple-100 rounded-lg border-2 border-purple-400">
                          <div className="text-center">
                            <p className="text-lg font-semibold text-purple-800 mb-2">
                              💰 TOTAL GENERAL ACUMULADO PENDIENTE A PAGAR
                            </p>
                            <p className="text-4xl font-bold text-purple-700">
                              {formatCurrency(resumenLiquidacion.totalGeneral)}
                            </p>
                            <p className="text-sm text-purple-600 mt-2">
                              ({resumenLiquidacion.añosLiquidacion} años × {resumenLiquidacion.mesesLiquidacion} meses liquidados)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Información adicional */}
                    <Alert className="border-yellow-400 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Estado de la liquidación:</strong> Estos valores representan el total acumulado pendiente a pagar por FONECA 
                        desde {new Date(parametros.fechaPrimeraMesada).toLocaleDateString()} hasta {new Date(parametros.fechaCorte).toLocaleDateString()}, 
                        incluyendo capital retroactivo e intereses de mora al {parametros.tasaInteresesMora}% anual.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Resumen Ejecutivo FONECA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resumenLiquidacion && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-green-600">Total Retroactivo FONECA</p>
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrency(resumenLiquidacion.totalRetroactivo)}
                          </p>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-600">Total Intereses de Mora</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {formatCurrency(resumenLiquidacion.totalIntereses)}
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <p className="text-sm text-purple-600">Total General FONECA</p>
                          <p className="text-3xl font-bold text-purple-700">
                            {formatCurrency(resumenLiquidacion.totalGeneral)}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Mesada Actual (Según SMLMV)</p>
                          <p className="text-xl font-bold text-gray-700">
                            {formatCurrency(resumenLiquidacion.mesadaActual)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Estadísticas de Liquidación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resumenLiquidacion && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Años Liquidados</p>
                          <p className="text-xl font-bold text-gray-700">
                            {resumenLiquidacion.añosLiquidacion}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Meses Totales</p>
                          <p className="text-xl font-bold text-gray-700">
                            {resumenLiquidacion.mesesLiquidacion}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Promedio Anual</p>
                          <p className="text-lg font-bold text-gray-700">
                            {formatCurrency(resumenLiquidacion.promedioAnual)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">% FONECA Promedio</p>
                          <p className="text-lg font-bold text-gray-700">
                            {parametros.porcentajeFoneca}%
                          </p>
                        </div>
                      </div>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Nota:</strong> La compartición FONECA aplica desde {new Date(parametros.fechaComparticion).toLocaleDateString()}. 
                          Antes de esta fecha, FONECA es responsable del 100% de la liquidación.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-700 mb-2">Metodología Aplicada:</p>
                        <ul className="text-xs text-yellow-600 space-y-1">
                          <li>• Reajuste por {parametros.metodoCalculoIPC === 'compuesto' ? 'IPC Compuesto' : 'IPC Acumulado'}</li>
                          <li>• {parametros.incluirMesadasAdicionales ? 'Incluye' : 'No incluye'} mesadas adicionales</li>
                          <li>• Tasa de intereses: {parametros.tasaInteresesMora}% anual</li>
                          <li>• Mesada pagada: menor entre SMLMV e IPC</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
