'use client';

import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { utils, write } from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Pencil, Ban, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';

const DemandantesTabla = ({ demandantes }: { demandantes: any[] }) => (
    <div className="max-h-[60vh] overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-secondary z-10">
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Teléfonos</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>Correo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {demandantes.map((demandante, index) => (
            <TableRow key={demandante.identidad_demandante || index}>
              <TableCell>{demandante.nombre_demandante}</TableCell>
              <TableCell>{demandante.identidad_demandante}</TableCell>
              <TableCell>{demandante.telefonos}</TableCell>
              <TableCell>{demandante.direccion}</TableCell>
              <TableCell>{demandante.correo}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
);

export const ExternalDemandsTable = ({ procesos, demandantes }: { procesos: any[], demandantes: { [key: string]: any[] } }) => {
    const { toast } = useToast();
    const [negocioSearch, setNegocioSearch] = useState('');
    const [selectedEstados, setSelectedEstados] = useState<string[]>([]);
    
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [editableApoderado, setEditableApoderado] = useState<{ [key: string]: string }>({});

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
    
    const handleApoderadoChange = (numRegistro: string, value: string) => {
        setEditableApoderado(prev => ({ ...prev, [numRegistro]: value }));
    };

    const handleSaveApoderado = (numRegistro: string) => {
        toast({
            variant: "destructive",
            title: "Función Deshabilitada",
            description: "La edición de apoderados no está permitida en este modo. Las actualizaciones deben realizarse en el sistema de origen.",
        });
        // Note: We don't actually save, just revert the UI state
        handleCancelEdit(numRegistro);
    };

    const handleCancelEdit = (numRegistro: string) => {
        setEditableApoderado(prev => {
            const newState = { ...prev };
            delete newState[numRegistro];
            return newState;
        });
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
                        <TableHead>Demandantes</TableHead>
                        <TableHead>Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map((proceso) => (
                      <TableRow key={proceso.num_registro}>
                        <TableCell>{proceso.num_registro}</TableCell>
                        <TableCell><Badge variant="outline">{proceso.estado}</Badge></TableCell>
                        <TableCell>{proceso.negocio}</TableCell>
                        <TableCell>
                            {editableApoderado.hasOwnProperty(proceso.num_registro) ? (
                                <Input
                                    type="text"
                                    value={editableApoderado[proceso.num_registro]}
                                    onChange={(e) => handleApoderadoChange(proceso.num_registro, e.target.value)}
                                    className="h-8"
                                />
                            ) : (
                                proceso.nombres_apoderado
                            )}
                        </TableCell>
                        <TableCell>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={!demandantes[proceso.num_registro] || demandantes[proceso.num_registro].length === 0}>
                                        Ver ({demandantes[proceso.num_registro]?.length || 0})
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[800px]">
                                    <DialogHeader>
                                        <DialogTitle>Demandantes para el Proceso #{proceso.num_registro}</DialogTitle>
                                    </DialogHeader>
                                    <DemandantesTabla demandantes={demandantes[proceso.num_registro] || []} />
                                </DialogContent>
                            </Dialog>
                        </TableCell>
                         <TableCell>
                            {editableApoderado.hasOwnProperty(proceso.num_registro) ? (
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleSaveApoderado(proceso.num_registro)}><Check className="h-4 w-4" /> Guardar</Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(proceso.num_registro)}><Ban className="h-4 w-4" /> Cancelar</Button>
                                </div>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => handleApoderadoChange(proceso.num_registro, proceso.nombres_apoderado)}><Pencil className="h-4 w-4" /> Editar</Button>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProcesos.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
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
