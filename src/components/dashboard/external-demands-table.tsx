'use client';

import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { utils, write } from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';

export const ExternalDemandsTable = ({ 
    procesos, 
    demandantes,
    onViewDetails
}: { 
    procesos: any[], 
    demandantes: { [key: string]: any[] },
    onViewDetails: (process: any) => void;
}) => {
    const { toast } = useToast();
    const [negocioSearch, setNegocioSearch] = useState('');
    const [selectedEstados, setSelectedEstados] = useState<string[]>([]);
    
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    
    const filteredProcesos = useMemo(() => {
        let results = procesos;
        if (negocioSearch) {
            results = results.filter((p) =>
                p.negocio?.toLowerCase().includes(negocioSearch.toLowerCase())
            );
        }
        if (selectedEstados.length > 0) {
            results = results.filter((p) => selectedEstados.includes(p.estado));
        }
        return results;
    }, [procesos, negocioSearch, selectedEstados]);
    
    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredProcesos.slice(start, start + pagination.pageSize);
    }, [filteredProcesos, pagination]);

    const totalPages = Math.ceil(filteredProcesos.length / pagination.pageSize);

    const estadoOptions = useMemo(() => {
        const estadosUnicos = [...new Set(procesos.map((proceso) => proceso.estado))].filter(Boolean);
        return estadosUnicos.map((estado) => ({ value: estado, label: estado }));
    }, [procesos]);
    
    const handleEstadoChange = (selectedOptions: any) => {
        const values = selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [];
        setSelectedEstados(values);
        setPagination(p => ({ ...p, pageIndex: 0 })); // Reset to first page on filter change
    };
        
    const exportarAExcel = () => {
        const wb = utils.book_new();
        const data = [];

        filteredProcesos.forEach((proceso) => {
            const demandantesData = demandantes[proceso.num_registro] || [];
            const baseProceso = {
                '# Registro': proceso.num_registro,
                'Fecha Creación': proceso.fecha_creacion,
                '# Carpeta': proceso.num_carpeta,
                'Despacho': proceso.despacho,
                '# Radicado Inicial': proceso.num_radicado_ini,
                'Fecha Radicado Inicial': proceso.fecha_radicado_ini,
                'Radicado Tribunal': proceso.radicado_tribunal,
                'Magistrado': proceso.magistrado,
                'Jurisdicción': proceso.jurisdiccion,
                'Clase Proceso': proceso.clase_proceso,
                'Estado': proceso.estado,
                'Identidad Clientes': proceso.identidad_clientes,
                'Nombres Demandante': proceso.nombres_demandante,
                'Nombres Demandado': proceso.nombres_demandado,
                'Negocio': proceso.negocio,
                'Identidad Abogados': proceso.identidad_abogados,
                'Nombres Apoderado': proceso.nombres_apoderado,
                '# Radicado Último': proceso.num_radicado_ult,
                'Radicado Corte': proceso.radicado_corte,
                'Magistrado Corte': proceso.magistrado_corte,
                'Casación': proceso.casacion,
            };

            if (demandantesData.length > 0) {
                demandantesData.forEach((demandante) => {
                    data.push({
                        ...baseProceso,
                        'Nombre Demandante (Detalle)': demandante.nombre_demandante,
                        'Documento Demandante': demandante.identidad_demandante,
                        'Teléfonos Demandante': demandante.telefonos,
                        'Dirección Demandante': demandante.direccion,
                        'Correo Demandante': demandante.correo,
                    });
                });
            } else {
                data.push({
                    ...baseProceso,
                    'Nombre Demandante (Detalle)': '',
                    'Documento Demandante': '',
                    'Teléfonos Demandante': '',
                    'Dirección Demandante': '',
                    'Correo Demandante': '',
                });
            }
        });

        const ws = utils.json_to_sheet(data);
        utils.book_append_sheet(wb, ws, 'Procesos');
        const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
        
        const blob = new Blob([wbout], {type: 'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Procesos_Demandas.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Input
                type="text"
                placeholder="Buscar por negocio..."
                value={negocioSearch}
                onChange={(e) => {
                    setNegocioSearch(e.target.value);
                    setPagination(p => ({...p, pageIndex: 0}));
                }}
                className="md:col-span-1"
            />
            <div className="md:col-span-1 react-select-container">
                 <Select
                    isMulti
                    options={estadoOptions}
                    onChange={handleEstadoChange}
                    placeholder="Filtrar por estado"
                    classNamePrefix="react-select"
                 />
            </div>
            <div className="flex justify-end">
                <Button onClick={exportarAExcel} disabled={filteredProcesos.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar a Excel
                </Button>
            </div>
        </div>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead># Registro</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Negocio</TableHead>
                        <TableHead>Apoderado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map((proceso) => (
                      <TableRow key={proceso.num_registro}>
                        <TableCell>{proceso.num_registro}</TableCell>
                        <TableCell><Badge variant="outline">{proceso.estado}</Badge></TableCell>
                        <TableCell>{proceso.negocio}</TableCell>
                        <TableCell>{proceso.nombres_apoderado}</TableCell>
                        <TableCell className="text-right">
                           <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => onViewDetails(proceso)}
                           >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProcesos.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                No se encontraron procesos con los filtros aplicados.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        <div className="flex items-center justify-between p-2">
            <div className="text-sm text-muted-foreground">
                Página {pagination.pageIndex + 1} de {totalPages}
            </div>
             <div className="flex items-center space-x-1">
                 <Select
                    className="w-24 text-sm"
                    classNamePrefix="react-select-sm"
                    options={[
                        {value: 10, label: '10 / pág'},
                        {value: 20, label: '20 / pág'},
                        {value: 50, label: '50 / pág'},
                        {value: 100, label: '100 / pág'},
                    ]}
                    defaultValue={{value: 10, label: '10 / pág'}}
                    onChange={(option: any) => setPagination(p => ({...p, pageSize: option.value, pageIndex: 0}))}
                 />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= totalPages - 1}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: totalPages - 1 }))} disabled={pagination.pageIndex >= totalPages - 1}>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
      </div>
      </CardContent>
    </Card>
  );
};
