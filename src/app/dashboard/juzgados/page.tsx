'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Landmark, Loader2, ServerCrash, Building, University, Library, MapPin } from 'lucide-react';
import { getDepartments, getMunicipalitiesByDepartment, getCorporationsByMunicipality, getOfficesByCorporation } from '@/services/provired-api-service';
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
    id: string;
    municipio: string;
}
interface Corporation {
    id: string;
    corporacion: string;
}
interface Office {
    id: string;
    despacho: string;
}

type LoadingState = {
    departments: boolean;
    municipalities: boolean;
    corporations: boolean;
    offices: string | null; // corporationId that is loading
}

export default function JuzgadosPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [offices, setOffices] = useState<Record<string, Office[]>>({});

  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);

  const [loading, setLoading] = useState<LoadingState>({
    departments: true,
    municipalities: false,
    corporations: false,
    offices: null
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading({ departments: true, municipalities: false, corporations: false, offices: null });
      setError(null);
      const response = await getDepartments();
      if (response.success && Array.isArray(response.data)) {
        setDepartments(response.data);
      } else {
        setError(response.message || 'Error al conectar con la API de Provired.');
      }
      setLoading(prev => ({ ...prev, departments: false }));
    };
    fetchDepartments();
  }, []);

  const handleDepartmentChange = async (departmentId: string) => {
    setSelectedDepartment(departmentId);
    setSelectedMunicipality(null);
    setMunicipalities([]);
    setCorporations([]);
    setOffices({});

    setLoading(prev => ({ ...prev, municipalities: true }));
    setError(null);
    const response = await getMunicipalitiesByDepartment(departmentId);
    if (response.success && Array.isArray(response.data)) {
        setMunicipalities(response.data);
    } else {
        setError(`No se pudieron cargar municipios.`);
    }
    setLoading(prev => ({ ...prev, municipalities: false }));
  };
  
  const handleMunicipalityChange = async (municipalityId: string) => {
    setSelectedMunicipality(municipalityId);
    setCorporations([]);
    setOffices({});

    setLoading(prev => ({ ...prev, corporations: true }));
    setError(null);
    const response = await getCorporationsByMunicipality(municipalityId);
     if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        setCorporations(response.data);
    } else {
        setCorporations([]);
        setError(`No se encontraron corporaciones para este municipio.`);
    }
    setLoading(prev => ({ ...prev, corporations: false }));
  }

  const handleFetchOffices = async (corporationId: string) => {
    // Prevent re-fetching if data already exists
    if (offices[corporationId]) return;

    setLoading(prev => ({ ...prev, offices: corporationId }));
    const response = await getOfficesByCorporation(corporationId);
    if (response.success && Array.isArray(response.data)) {
        setOffices(prev => ({...prev, [corporationId]: response.data}));
    } else {
        // Store an empty array to indicate we've tried and failed, to prevent retries
        setOffices(prev => ({...prev, [corporationId]: []}));
    }
     setLoading(prev => ({ ...prev, offices: null }));
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Consulta de Juzgados
          </CardTitle>
          <CardDescription>
            Explore la jerarquía de juzgados desde la API de Provired seleccionando un departamento y municipio.
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="department-select">Departamento</Label>
                 {loading.departments ? (
                    <Skeleton className="h-10 w-full" />
                 ) : (
                    <Select onValueChange={handleDepartmentChange} disabled={loading.departments}>
                        <SelectTrigger id="department-select"><SelectValue placeholder="Seleccione un departamento..." /></SelectTrigger>
                        <SelectContent>
                            {departments.map(dep => <SelectItem key={dep.IdDep} value={dep.IdDep}>{dep.departamento}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 )}
            </div>
             <div>
                <Label htmlFor="municipality-select">Municipio</Label>
                {loading.municipalities ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select onValueChange={handleMunicipalityChange} disabled={!selectedDepartment || loading.municipalities}>
                        <SelectTrigger id="municipality-select">
                            <SelectValue placeholder={!selectedDepartment ? "Seleccione un departamento primero" : "Seleccione un municipio..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {municipalities.map(mun => <SelectItem key={mun.id} value={mun.id}>{mun.municipio}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </CardContent>
      </Card>

      {loading.corporations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
      ) : corporations.length > 0 ? (
        <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <University className="h-5 w-5" /> Corporaciones Encontradas
            </h3>
            <Accordion type="single" collapsible className="w-full space-y-2">
             {corporations.map(corp => (
                <AccordionItem value={corp.id} key={corp.id} className="border bg-card rounded-md">
                    <AccordionTrigger className="p-4 hover:no-underline" onClick={() => handleFetchOffices(corp.id)}>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-left">{corp.corporacion}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        {loading.offices === corp.id ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando despachos...</div>
                        ) : offices[corp.id] && offices[corp.id].length > 0 ? (
                             <div className="space-y-2 pl-6 border-l">
                                {offices[corp.id].map(office => (
                                    <div key={office.id} className="flex items-center gap-2 text-sm">
                                        <Library className="h-4 w-4 text-primary" />
                                        <span>{office.despacho}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className="text-sm text-muted-foreground pl-6">No se encontraron despachos para esta corporación.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>
             ))}
            </Accordion>
        </div>
      ) : selectedMunicipality && !loading.corporations ? (
         <Alert>
              <University className="h-4 w-4" />
              <AlertTitle>Sin Resultados</AlertTitle>
              <AlertDescription>No se encontraron corporaciones para el municipio seleccionado.</AlertDescription>
          </Alert>
      ) : null}

    </div>
  );
}
