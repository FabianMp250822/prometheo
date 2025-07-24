
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Landmark, Loader2, ServerCrash, University, Building } from 'lucide-react';
import { getDepartments, getMunicipalitiesByDepartment, getCorporations, getOfficesByCorporation } from '@/services/provired-api-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

interface Department {
  IdDep: string;
  departamento: string;
}
interface Municipality {
    IdMun: string; 
    municipio: string;
    depto_IdDep: string;
}
interface Corporation {
    id: string;
    corporacion: string;
    offices?: Office[];
    isLoadingOffices?: boolean;
}
interface Office {
    id: string;
    despacho: string;
}

type LoadingState = {
    departments: boolean;
    municipalities: boolean;
}

export default function JuzgadosPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [corporations, setCorporations] = useState<{ [municipalityId: string]: Corporation[] }>({});
  
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const [loading, setLoading] = useState<LoadingState>({
    departments: true,
    municipalities: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading({ departments: true, municipalities: false });
      setError(null);
      const depResponse = await getDepartments();
      if (depResponse.success && Array.isArray(depResponse.data)) {
        const stringifiedData = depResponse.data.map(d => ({ ...d, IdDep: String(d.IdDep) }));
        setDepartments(stringifiedData);
      } else {
        setError(depResponse.message || 'Error al conectar con la API de Provired.');
      }
      setLoading(prev => ({ ...prev, departments: false }));

      console.log("--- Obteniendo TODAS las corporaciones ---");
      const corpResponse = await getCorporations();
      if (corpResponse.success) {
        console.log("--- TODAS las Corporaciones Recibidas de la API ---", corpResponse.data);
      } else {
        console.error("--- Error al obtener TODAS las corporaciones ---", corpResponse.message);
      }
    };
    fetchInitialData();
  }, []);

  const handleDepartmentChange = async (departmentId: string) => {
    const depIdStr = String(departmentId);
    setSelectedDepartment(depIdStr);
    setMunicipalities([]);
    setCorporations({});

    setLoading(prev => ({ ...prev, municipalities: true }));
    setError(null);
    const munResponse = await getMunicipalitiesByDepartment(depIdStr);
    
    if (munResponse.success && Array.isArray(munResponse.data)) {
        const stringifiedData = munResponse.data.map(m => ({ ...m, IdMun: String(m.IdMun) }));
        setMunicipalities(stringifiedData);
    } else {
        setMunicipalities([]);
        setError(`No se encontraron municipios para este departamento.`);
    }
    setLoading(prev => ({ ...prev, municipalities: false }));
  };
  
  const fetchCorporationsForMunicipality = async (municipalityId: string) => {
    // Avoid re-fetching if already loaded
    if (corporations[municipalityId]) return;

    // Set loading state for this specific municipality
    setCorporations(prev => ({ ...prev, [municipalityId]: [] })); // Show loading state

    const response = await getCorporationsByMunicipality(municipalityId);
    
    if (response.success && response.data) {
        const corpData = Array.isArray(response.data) ? response.data : [response.data];
        const stringifiedData = corpData.map(c => ({ ...c, id: String(c.id) }));
        setCorporations(prev => ({ ...prev, [municipalityId]: stringifiedData }));
    } else {
        setCorporations(prev => ({ ...prev, [municipalityId]: [] }));
    }
  };
  
  const fetchOfficesForCorporation = async (municipalityId: string, corporationId: string) => {
    const corpToUpdate = corporations[municipalityId]?.find(c => c.id === corporationId);
    if (!corpToUpdate || corpToUpdate.offices) return; // Avoid re-fetching

    // Set loading state for the specific corporation
    setCorporations(prev => ({
        ...prev,
        [municipalityId]: prev[municipalityId].map(c => 
            c.id === corporationId ? { ...c, isLoadingOffices: true } : c
        )
    }));

    const response = await getOfficesByCorporation(corporationId);

    setCorporations(prev => {
        const newMunCorps = prev[municipalityId].map(c => {
            if (c.id !== corporationId) return c;
            if (response.success && Array.isArray(response.data)) {
                return { ...c, offices: response.data.map(o => ({...o, id: String(o.id)})), isLoadingOffices: false };
            }
            return { ...c, offices: [], isLoadingOffices: false };
        });
        return { ...prev, [municipalityId]: newMunCorps };
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Consulta de Juzgados
          </CardTitle>
          <CardDescription>
            Explore la jerarquía de juzgados desde la API de Provired seleccionando un departamento.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {error && (
        <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Error de Conexión</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
            <CardTitle className="text-xl">Selección de Ubicación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="department-select">Departamento</Label>
                 {loading.departments ? (
                    <Skeleton className="h-10 w-full" />
                 ) : (
                    <Select onValueChange={handleDepartmentChange} disabled={loading.departments}>
                        <SelectTrigger id="department-select"><SelectValue placeholder="Seleccione un departamento..." /></SelectTrigger>
                        <SelectContent>
                            {departments.map((dep) => <SelectItem key={dep.IdDep} value={dep.IdDep}>{dep.departamento}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 )}
            </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Resultados</CardTitle>
          </CardHeader>
          <CardContent>
              {loading.municipalities ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Cargando municipios...</div>
              ) : municipalities.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Municipio</TableHead>
                              <TableHead>Corporaciones y Despachos</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {municipalities.map((mun) => (
                              <TableRow key={mun.IdMun}>
                                  <TableCell className="font-medium">{mun.municipio}</TableCell>
                                  <TableCell>
                                    <Accordion type="single" collapsible className="w-full" onValueChange={() => fetchCorporationsForMunicipality(mun.IdMun)}>
                                        <AccordionItem value={`mun-${mun.IdMun}`}>
                                            <AccordionTrigger>Ver Corporaciones</AccordionTrigger>
                                            <AccordionContent>
                                                {!corporations[mun.IdMun] ? (
                                                     <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Cargando...</div>
                                                ) : corporations[mun.IdMun].length > 0 ? (
                                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                                        {corporations[mun.IdMun].map((corp) => (
                                                            <AccordionItem value={`corp-${corp.id}`} key={corp.id} className="border bg-card rounded-md">
                                                                <AccordionTrigger className="p-3 hover:no-underline text-sm" onClick={() => fetchOfficesForCorporation(mun.IdMun, corp.id)}>
                                                                    <div className="flex items-center gap-2"><University className="h-4 w-4"/> {corp.corporacion}</div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="p-3 pt-0">
                                                                     {corp.isLoadingOffices ? (
                                                                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Cargando...</div>
                                                                    ) : corp.offices && corp.offices.length > 0 ? (
                                                                        <div className="space-y-2 pl-4 border-l">
                                                                            {corp.offices.map((office, index) => (
                                                                                <div key={office.id || index} className="flex items-center gap-2 text-xs">
                                                                                    <Building className="h-3 w-3 text-primary"/>
                                                                                    {office.despacho}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                         <p className="text-xs text-muted-foreground pl-4">No se encontraron despachos para esta corporación.</p>
                                                                    )}
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                ) : (
                                                     <p className="text-sm text-muted-foreground">No se encontraron corporaciones para este municipio.</p>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : selectedDepartment ? (
                  <p className="text-muted-foreground">No se encontraron municipios para este departamento.</p>
              ) : (
                 <p className="text-muted-foreground">Seleccione un departamento para ver los resultados.</p>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
