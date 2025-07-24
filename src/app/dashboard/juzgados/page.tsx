'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Landmark, Loader2, ServerCrash, ChevronsRight, Building, Map, University, Library } from 'lucide-react';
import { getDepartments, getMunicipalitiesByDepartment, getCorporationsByMunicipality, getOfficesByCorporation } from '@/services/provired-api-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
    municipalities: boolean;
    corporations: boolean;
    offices: boolean;
}

export default function JuzgadosPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [selectedCorporation, setSelectedCorporation] = useState<Corporation | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState<LoadingState>({ municipalities: false, corporations: false, offices: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoading(true);
      setError(null);
      const response = await getDepartments();
      if (response.success && Array.isArray(response.data)) {
        setDepartments(response.data);
      } else {
        setError(response.message || 'Error al conectar con la API de Provired.');
      }
      setIsLoading(false);
    };
    fetchDepartments();
  }, []);

  const handleSelectDepartment = useCallback(async (department: Department) => {
    setSelectedDepartment(department);
    setSelectedMunicipality(null);
    setSelectedCorporation(null);
    setMunicipalities([]);
    setCorporations([]);
    setOffices([]);

    setLoading(prev => ({ ...prev, municipalities: true }));
    const response = await getMunicipalitiesByDepartment(department.IdDep);
    if (response.success && Array.isArray(response.data)) {
        setMunicipalities(response.data);
    } else {
        setError(`No se pudieron cargar municipios para ${department.departamento}.`);
    }
    setLoading(prev => ({ ...prev, municipalities: false }));
  }, []);

  const handleSelectMunicipality = useCallback(async (municipality: Municipality) => {
    setSelectedMunicipality(municipality);
    setSelectedCorporation(null);
    setCorporations([]);
    setOffices([]);

    setLoading(prev => ({ ...prev, corporations: true }));
    const response = await getCorporationsByMunicipality(municipality.id);
    if (response.success && Array.isArray(response.data)) {
        setCorporations(response.data);
    } else {
         setError(`No se pudieron cargar corporaciones para ${municipality.municipio}.`);
    }
    setLoading(prev => ({ ...prev, corporations: false }));
  }, []);

  const handleSelectCorporation = useCallback(async (corporation: Corporation) => {
    setSelectedCorporation(corporation);
    setOffices([]);
    
    setLoading(prev => ({ ...prev, offices: true }));
    const response = await getOfficesByCorporation(corporation.id);
    if (response.success && Array.isArray(response.data)) {
        setOffices(response.data);
    } else {
        setError(`No se pudieron cargar despachos para ${corporation.corporacion}.`);
    }
    setLoading(prev => ({ ...prev, offices: false }));
  }, []);

  const renderColumn = (
        title: string,
        icon: React.ReactNode,
        items: any[],
        selectedItem: any,
        onSelect: (item: any) => void,
        loading: boolean,
        keyField: string,
        valueField: string,
        noDataMessage: string
    ) => (
    <div className="flex-1 min-w-[200px] border-r">
        <div className="p-3 border-b flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <ScrollArea className="h-[400px]">
            {loading ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : items.length === 0 ? (
                 <div className="text-center text-xs text-muted-foreground p-4">{noDataMessage}</div>
            ) : (
                items.map(item => (
                    <button
                        key={item[keyField]}
                        onClick={() => onSelect(item)}
                        className={cn(
                            "w-full text-left p-3 text-sm hover:bg-muted/50 flex justify-between items-center",
                            selectedItem && selectedItem[keyField] === item[keyField] ? "bg-accent text-accent-foreground" : ""
                        )}
                    >
                        <span>{item[valueField]}</span>
                        <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                ))
            )}
        </ScrollArea>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Consulta de Juzgados
          </CardTitle>
          <CardDescription>
            Explore la jerarquía de juzgados desde la API de Provired. Seleccione un elemento para ver sus dependencias.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {isLoading ? (
          <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-4">Conectando con la API de Provired...</p>
          </div>
      ) : error ? (
           <Alert variant="destructive">
              <ServerCrash className="h-4 w-4" />
              <AlertTitle>Error de Conexión</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
          </Alert>
      ) : (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row border rounded-lg overflow-hidden">
                    {renderColumn("Departamentos", <Map className="h-4 w-4"/>, departments, selectedDepartment, handleSelectDepartment, false, 'IdDep', 'departamento', 'No hay departamentos.')}
                    
                    {selectedDepartment && renderColumn("Municipios", <Building className="h-4 w-4"/>, municipalities, selectedMunicipality, handleSelectMunicipality, loading.municipalities, 'id', 'municipio', 'No se encontraron municipios.')}

                    {selectedMunicipality && renderColumn("Corporaciones", <University className="h-4 w-4"/>, corporations, selectedCorporation, handleSelectCorporation, loading.corporations, 'id', 'corporacion', 'No se encontraron corporaciones.')}
                    
                    {selectedCorporation && renderColumn("Despachos", <Library className="h-4 w-4"/>, offices, null, ()=>{}, loading.offices, 'id', 'despacho', 'No se encontraron despachos.')}
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
