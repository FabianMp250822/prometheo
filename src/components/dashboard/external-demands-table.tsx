'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Select from 'react-select';
import { utils, write } from 'xlsx';
import { saveAs } from 'file-saver';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const ProcesosTabla = ({ procesos, demandantes }: { procesos: any[], demandantes: { [key: string]: any[] } }) => (
  <div className="tabla-procesos-scroll">
    <table className="tabla-procesos">
      <thead>
        <tr>
          <th># Registro</th>
          <th>Fecha Creación</th>
          <th># Carpeta</th>
          <th>Despacho</th>
          <th># Radicado Inicial</th>
          <th>Fecha Radicado Inicial</th>
          <th>Radicado Tribunal</th>
          <th>Magistrado</th>
          <th>Jurisdicción</th>
          <th>Clase Proceso</th>
          <th>Estado</th>
          <th>Identidad Clientes</th>
          <th>Nombres Demandante</th>
          <th>Nombres Demandado</th>
          <th>Negocio</th>
          <th>Identidad Abogados</th>
          <th>Nombres Apoderado</th>
          <th># Radicado Último</th>
          <th>Radicado Corte</th>
          <th>Magistrado Corte</th>
          <th>Casación</th>
          <th>Demandantes</th>
        </tr>
      </thead>
      <tbody>
        {procesos.map((proceso) => (
          <tr key={proceso.num_registro}>
            <td>{proceso.num_registro}</td>
            <td>{proceso.fecha_creacion}</td>
            <td>{proceso.num_carpeta}</td>
            <td>{proceso.despacho}</td>
            <td>{proceso.num_radicado_ini}</td>
            <td>{proceso.fecha_radicado_ini}</td>
            <td>{proceso.radicado_tribunal}</td>
            <td>{proceso.magistrado}</td>
            <td>{proceso.jurisdiccion}</td>
            <td>{proceso.clase_proceso}</td>
            <td>{proceso.estado}</td>
            <td>{proceso.identidad_clientes}</td>
            <td>{proceso.nombres_demandante}</td>
            <td>{proceso.nombres_demandado}</td>
            <td>{proceso.negocio}</td>
            <td>{proceso.identidad_abogados}</td>
            <td>{proceso.nombres_apoderado}</td>
            <td>{proceso.num_radicado_ult}</td>
            <td>{proceso.radicado_corte}</td>
            <td>{proceso.magistrado_corte}</td>
            <td>{proceso.casacion}</td>
            <td>
              {demandantes[proceso.num_registro] ? (
                <DemandantesTabla demandantes={demandantes[proceso.num_registro]} />
              ) : (
                <span className="text-xs text-muted-foreground">Cargando...</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DemandantesTabla = ({ demandantes }: { demandantes: any[] }) => (
  <table className="tabla-demandantes">
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Documento</th>
        <th>Teléfonos</th>
        <th>Dirección</th>
        <th>Correo</th>
      </tr>
    </thead>
    <tbody>
      {demandantes.map((demandante) => (
        <tr key={demandante.identidad_demandante}>
          <td>{demandante.nombre_demandante}</td>
          <td>{demandante.identidad_demandante}</td>
          <td>{demandante.telefonos}</td>
          <td>{demandante.direccion}</td>
          <td>{demandante.correo}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const ExternalDemandsTable = ({ procesosOriginales, demandantesIniciales }: { procesosOriginales: any[], demandantesIniciales: { [key: string]: any[] } }) => {
  const [procesos, setProcesos] = useState(procesosOriginales);
  const [negocioSearch, setNegocioSearch] = useState('');
  
  const estadoOptions = useMemo(() => {
    const estadosUnicos = [
      ...new Set(procesosOriginales.map((proceso) => proceso.estado)),
    ].filter(Boolean);
    return estadosUnicos.map((estado) => ({ value: estado, label: estado }));
  }, [procesosOriginales]);

  useEffect(() => {
    setProcesos(procesosOriginales);
  }, [procesosOriginales]);


  const handleFilter = (negocio: string, estados: string[]) => {
    let filtered = procesosOriginales;
    if (negocio) {
        filtered = filtered.filter((p) =>
            p.negocio?.toLowerCase().includes(negocio.toLowerCase())
        );
    }
    if (estados.length > 0) {
        filtered = filtered.filter((p) => estados.includes(p.estado));
    }
    setProcesos(filtered);
  };

  const handleNegocioSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setNegocioSearch(newSearch);
    const selectedEstados = (document.querySelector('.react-select-container') as any)?.props?.value?.map((opt: any) => opt.value) || [];
    handleFilter(newSearch, selectedEstados);
  };

  const handleEstadoChange = (selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [];
    handleFilter(negocioSearch, values);
  };

  const exportarAExcel = () => {
    const wb = utils.book_new();
    const data = [];

    procesos.forEach((proceso) => {
        const demandantesData = demandantesIniciales[proceso.num_registro] || [];
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
    saveAs(new Blob([wbout]), 'Procesos_Demandas.xlsx');
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Input
                type="text"
                placeholder="Buscar por negocio..."
                value={negocioSearch}
                onChange={handleNegocioSearchChange}
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
                <Button onClick={exportarAExcel} disabled={procesos.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar a Excel
                </Button>
            </div>
        </div>
        <ProcesosTabla procesos={procesos} demandantes={demandantesIniciales} />
      </CardContent>
    </Card>
  );
};
