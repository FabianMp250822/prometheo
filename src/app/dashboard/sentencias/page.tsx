
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { dependencies, legalConcepts, UserPayment } from '@/lib/data';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { PaymentDataTable } from '@/components/dashboard/data-table';
import { UserDetailSheet } from '@/components/dashboard/user-detail-sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, RotateCw, Scale, Search, SlidersHorizontal, ChevronDown, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getLatestYear, formatCurrency, getLatestPeriod, parsePeriodoPago } from '@/lib/helpers';
import * as XLSX from 'xlsx';
import { useIsMobile } from '@/hooks/use-mobile';


type SortByType = 'totalAmount' | 'user.name' | 'paymentPeriod.end' | 'fiscalYear';

type Stats = {
    totalUsuarios: number;
    totalAnalizados: number;
    totalPendientes: number;
    montoTotalCostas: number;
    montoTotalRetro: number;
    montoTotalProcesos: number;
};

const USUARIOS_SENTENCIAS_COLLECTION = "USUARIOS_SENTENCIAS_COLLECTION";

export default function SentenciasPage() {
  const isMobile = useIsMobile();
  // Estados de Carga y Control
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Datos
  const [usuarios, setUsuarios] = useState<UserPayment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // Estados del Modal
  const [selectedUsuario, setSelectedUsuario] = useState<UserPayment | null>(null);
  
  // Estados de Filtros
  const [filterNombre, setFilterNombre] = useState('');
  const [filterDependencia, setFilterDependencia] = useState('all');
  const [filterConcepto, setFilterConcepto] = useState<keyof UserPayment['concepts'] | 'all'>('all');
  const [filterAnalyzed, setFilterAnalyzed] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('totalAmount');

  const { toast } = useToast();

  const loadSentenciasData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const q = query(collection(db, USUARIOS_SENTENCIAS_COLLECTION), orderBy("totalAmount", "desc"));
        const querySnapshot = await getDocs(q);
        const usuariosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserPayment));
        setUsuarios(usuariosData);
        toast({ title: "Datos cargados", description: `${usuariosData.length} registros de sentencias encontrados desde Firebase.` });
    } catch (e) {
        console.error("Error fetching from Firebase: ", e);
        setError("Error al cargar los datos de sentencias desde Firebase. Verifique la conexión y la configuración.");
        toast({ variant: 'destructive', title: "Error de Conexión", description: "No se pudieron cargar los datos." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSentenciasData();
  }, [loadSentenciasData]);

  // Funciones de Estadísticas
  const calculateStats = useCallback((data: UserPayment[]): Stats => {
    return data.reduce((acc, user) => {
      acc.totalUsuarios += 1;
      if (user.analyzedAt) acc.totalAnalizados += 1;
      else acc.totalPendientes += 1;
      acc.montoTotalCostas += user.concepts["Costas Procesales"] || 0;
      acc.montoTotalRetro += user.concepts["Retro Mesada Adicional"] || 0;
      acc.montoTotalProcesos += user.concepts["Procesos y Sentencia Judiciales"] || 0;
      return acc;
    }, {
      totalUsuarios: 0,
      totalAnalizados: 0,
      totalPendientes: 0,
      montoTotalCostas: 0,
      montoTotalRetro: 0,
      montoTotalProcesos: 0
    });
  }, []);

  useEffect(() => {
    if (usuarios.length > 0) {
      setStats(calculateStats(usuarios));
    }
  }, [usuarios, calculateStats]);


  // Hooks de Optimización para filtros
  const uniqueDependencias = useMemo(() => dependencies, []);
  const uniqueYears = useMemo(() => {
      const years = new Set(usuarios.map(u => getLatestYear(u.sentences)));
      return Array.from(years).sort((a, b) => b - a);
  }, [usuarios]);

  // Sistema de Filtrado y Ordenamiento
  const filteredUsuarios = useMemo(() => {
    let filtered = usuarios
      .filter(u => {
        const nombreMatch = filterNombre ? u.user.name.toLowerCase().includes(filterNombre.toLowerCase()) || u.user.document.includes(filterNombre) : true;
        const dependenciaMatch = filterDependencia === 'all' || u.department === filterDependencia;
        const conceptoMatch = filterConcepto === 'all' || (u.concepts[filterConcepto] ?? 0) > 0;
        const analyzedMatch = filterAnalyzed === 'all' || (filterAnalyzed === 'ANALYZED' ? !!u.analyzedAt : !u.analyzedAt);
        const yearMatch = filterYear === 'all' || u.sentences.some(s => getLatestYear([s]) === parseInt(filterYear));
        const periodoMatch = filterPeriodo ? getLatestPeriod(u.sentences).toLowerCase().includes(filterPeriodo.toLowerCase()) : true;

        return nombreMatch && dependenciaMatch && conceptoMatch && analyzedMatch && yearMatch && periodoMatch;
      });

    filtered.sort((a, b) => {
      if (sortBy === 'totalAmount') return b.totalAmount - a.totalAmount;
      if (sortBy === 'user.name') return a.user.name.localeCompare(b.user.name);
      if (sortBy === 'paymentPeriod.end') {
         const dateA = parsePeriodoPago(getLatestPeriod(a.sentences))?.endDate || new Date(0);
         const dateB = parsePeriodoPago(getLatestPeriod(b.sentences))?.endDate || new Date(0);
         return dateB.getTime() - dateA.getTime();
      }
      if (sortBy === 'fiscalYear') return getLatestYear(b.sentences) - getLatestYear(a.sentences);
      return 0;
    });
    
    return filtered;
  }, [usuarios, filterNombre, filterDependencia, filterConcepto, filterAnalyzed, filterYear, filterPeriodo, sortBy]);
  
  const markAsAnalyzed = useCallback(async (usuarioId: string) => {
    try {
        const userDocRef = doc(db, USUARIOS_SENTENCIAS_COLLECTION, usuarioId);
        await updateDoc(userDocRef, {
            analyzedAt: serverTimestamp(),
            status: 'Analizado' // Keep status consistent if used elsewhere
        });
        
        // Optimistically update UI
        const now = new Date();
        setUsuarios(prev => prev.map(u => u.id === usuarioId ? { ...u, analyzedAt: now.toISOString(), status: 'Analizado' } : u));
        
        toast({ title: "Usuario actualizado", description: "El usuario ha sido marcado como analizado en Firebase." });
    } catch (e) {
        console.error("Error updating document: ", e);
        toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar el usuario en la base de datos." });
    }
  }, [toast]);
  
  // TODO: Implement analyzePagosForSentencias based on full DB schema
  const handleReanalyze = () => {
    setIsAnalyzing(true);
    toast({ title: "Iniciando análisis...", description: "Esta función requiere una implementación completa con la estructura de la base de datos." });
    setTimeout(() => {
        setIsAnalyzing(false);
        toast({ variant: 'destructive', title: "Análisis no implementado", description: "La lógica de re-análisis masivo aún no está conectada." });
    }, 3000); // Simulación
  }

  const exportToExcel = (filtered: boolean) => {
    const dataToExport = filtered ? filteredUsuarios : usuarios;
    if(dataToExport.length === 0) {
        toast({ variant: 'destructive', title: "Error", description: "No hay datos para exportar." });
        return;
    }

    const formatDate = (date: Timestamp | string | null): string => {
        if (!date) return 'N/A';
        if (typeof date === 'string') return new Date(date).toLocaleString();
        if (date.toDate) return date.toDate().toLocaleString();
        return 'Fecha inválida';
    }

    const summaryData = dataToExport.map(u => ({
        "ID Usuario": u.id,
        "Nombre": u.user.name,
        "Documento": u.user.document,
        "Dependencia": u.department,
        "Año Fiscal Reciente": getLatestYear(u.sentences),
        "Último Periodo": getLatestPeriod(u.sentences),
        "Monto Total": u.totalAmount,
        "Estado": u.analyzedAt ? 'Analizado' : 'Pendiente',
        "Fecha Análisis": formatDate(u.analyzedAt)
    }));
    const detailData = dataToExport.flatMap(u => u.sentences.map(s => ({
        "ID Usuario": u.id,
        "Nombre Usuario": u.user.name,
        "ID Sentencia": s.id,
        "Descripción": s.description,
        "Fecha Sentencia": s.date,
        "Monto Sentencia": s.amount
    })));

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen Sentencias");
    if (!filtered) {
        XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle Sentencias");
    }

    const fitToColumn = (data: any[]) => {
        const columnWidths = [];
        for (const row of data) {
            for (const key in row) {
                const colIndex = Object.keys(row).indexOf(key);
                if (!columnWidths[colIndex]) columnWidths[colIndex] = { wch: 0 };
                const value = row[key];
                const len = value === null || value === undefined ? 4 : value.toString().length;
                if (columnWidths[colIndex].wch < len) columnWidths[colIndex].wch = len;
            }
        }
        return columnWidths;
    }
    summarySheet['!cols'] = fitToColumn(summaryData);
    detailSheet['!cols'] = fitToColumn(detailData);

    XLSX.writeFile(workbook, `Reporte_Sentencias_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Exportación exitosa", description: "El archivo de Excel ha sido generado." });
  }

  const ExportButtons = () => (
    <>
      <Button variant="outline" size="sm" onClick={() => exportToExcel(true)} disabled={filteredUsuarios.length === 0}>
        <Download className="mr-2 h-4 w-4" />
        Exportar Vista
      </Button>
      <Button size="sm" onClick={() => exportToExcel(false)} disabled={usuarios.length === 0}>
        <Download className="mr-2 h-4 w-4" />
        Exportar Todo
      </Button>
    </>
  )

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl md:text-3xl font-headline text-foreground">
                  Análisis de Sentencias Judiciales
                </CardTitle>
                <CardDescription>
                  Gestione, analice y exporte los datos de sentencias.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadSentenciasData} disabled={isLoading}>
                <RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Recargar
              </Button>
               <Button size="sm" onClick={handleReanalyze} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SlidersHorizontal className="mr-2 h-4 w-4" />}
                Re-Analizar Todo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="bg-destructive/10 border-destructive">
            <CardHeader><CardTitle>Error de Conexión a Firebase</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
        </Card>
      ) : (
        <>
          {stats && <KpiCards stats={stats} data={usuarios} />}

          <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Search className="h-6 w-6" />
                    <CardTitle>Filtros de Búsqueda</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <Input 
                    placeholder="Buscar por nombre/documento..." 
                    value={filterNombre}
                    onChange={(e) => setFilterNombre(e.target.value)}
                    className="lg:col-span-2"
                />
                <Select value={filterDependencia} onValueChange={setFilterDependencia}>
                    <SelectTrigger><SelectValue placeholder="Dependencia" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Dependencias</SelectItem>
                        {uniqueDependencias.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={filterConcepto} onValueChange={v => setFilterConcepto(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Concepto" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Conceptos</SelectItem>
                        {legalConcepts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={filterAnalyzed} onValueChange={setFilterAnalyzed}>
                    <SelectTrigger><SelectValue placeholder="Estado Análisis" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Estados</SelectItem>
                        <SelectItem value="ANALYZED">Analizado</SelectItem>
                        <SelectItem value="PENDING">Pendiente</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger><SelectValue placeholder="Año Fiscal" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Años</SelectItem>
                        {uniqueYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Resultados</CardTitle>
                    <CardDescription>
                      {filteredUsuarios.length} de {usuarios.length} sentencias encontradas.
                    </CardDescription>
                  </div>
                  {isMobile ? (
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                          <MoreHorizontal className="mr-2 h-4 w-4" /> Exportar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportToExcel(true)} disabled={filteredUsuarios.length === 0}>
                           <Download className="mr-2 h-4 w-4" /> Exportar Vista
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportToExcel(false)} disabled={usuarios.length === 0}>
                           <Download className="mr-2 h-4 w-4" /> Exportar Todo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="flex items-center gap-2">
                       <ExportButtons />
                    </div>
                  )}
                </div>
            </CardHeader>
            <CardContent>
                <PaymentDataTable 
                    data={filteredUsuarios} 
                    onRowClick={setSelectedUsuario}
                    sortDescriptor={{ key: sortBy, direction: 'descending' }}
                    onSortChange={(key) => setSortBy(key as SortByType)}
                />
            </CardContent>
          </Card>
        </>
      )}
       <UserDetailSheet 
          user={selectedUsuario} 
          onOpenChange={(open) => !open && setSelectedUsuario(null)} 
          onMarkAsAnalyzed={markAsAnalyzed}
        />
    </div>
  );
}
