
'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Landmark, University, Building, Bell, Download, ServerCrash, Loader2 } from 'lucide-react';
import { syncAllProviredDataToFirebase } from '@/services/provired-api-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { NotificationsModal } from '@/components/dashboard/notifications-modal';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';


interface Department {
  IdDep: string;
  departamento: string;
}
interface Municipality {
    IdMun: string; 
    municipio: string;
    IdDep: string;
}
interface Corporation {
    IdCorp: string;
    IdMun: string;
    corporacion: string;
}
interface Office {
    IdDes: string;
    IdCorp: string;
    despacho: string;
    hasNotifications?: boolean;
}
interface Notification {
    notificacion: string;
    despacho: string;
    [key: string]: any;
}

export default function JuzgadosPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [selectedCorporation, setSelectedCorporation] = useState<Corporation | null>(null);

  const [loading, setLoading] = useState({ deps: true, muns: false, corps: false, offices: false });
  const [error, setError] = useState<string | null>(null);

  const [isSyncing, startSyncTransition] = useTransition();
  const [syncProgress, setSyncProgress] = useState(0);
  const { toast } = useToast();

  const [notificationDespachoIds, setNotificationDespachoIds] = useState<Set<string>>(new Set());
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  
  const notificationsForSelectedOffice = useMemo(() => {
    if (!selectedOffice || !allNotifications.length) return [];
    return allNotifications.filter(n => n.despacho === selectedOffice.IdDes);
  }, [selectedOffice, allNotifications]);

  const fetchInitialData = useCallback(async () => {
      setLoading({ deps: true, muns: false, corps: false, offices: false });
      setIsLoadingNotifications(true);
      setError(null);
      try {
          const departmentsQuery = query(collection(db, "provired_departments"), orderBy("departamento"));
          const notificationsQuery = query(collection(db, "provired_notifications"));
          
          const [depSnapshot, notificationsSnapshot] = await Promise.all([
              getDocs(departmentsQuery),
              getDocs(notificationsQuery)
          ]);

          setDepartments(depSnapshot.docs.map(doc => doc.data() as Department));
          
          const notifsData = notificationsSnapshot.docs.map(doc => doc.data() as Notification);
          setAllNotifications(notifsData);
          setNotificationDespachoIds(new Set(notifsData.map(n => n.despacho)));

      } catch (err: any) {
          setError(`Error al leer desde Firebase: ${err.message}. Intente sincronizar los datos.`);
      } finally {
          setLoading(prev => ({ ...prev, deps: false }));
          setIsLoadingNotifications(false);
      }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleDepartmentChange = async (departmentId: string) => {
    setSelectedDepartment(departmentId);
    setSelectedMunicipality(null);
    setSelectedCorporation(null);
    setMunicipalities([]);
    setCorporations([]);
    setOffices([]);
    setLoading(prev => ({ ...prev, muns: true }));
    setError(null);
    try {
        const q = query(collection(db, "provired_municipalities"), where("IdDep", "==", departmentId), orderBy("municipio"));
        const snapshot = await getDocs(q);
        const municipalitiesData = snapshot.docs.map(doc => doc.data() as Municipality);
        console.log("Municipios recibidos de Firebase:", municipalitiesData);
        setMunicipalities(municipalitiesData);
    } catch (err: any) {
        setError(`Error al cargar municipios: ${err.message}`);
    } finally {
        setLoading(prev => ({ ...prev, muns: false }));
    }
  };

  const handleMunicipalitySelect = async (municipality: Municipality) => {
    setSelectedMunicipality(municipality);
    setSelectedCorporation(null);
    setCorporations([]);
    setOffices([]);
    setLoading(prev => ({ ...prev, corps: true }));
    try {
        const q = query(collection(db, "provired_corporations"), where("IdMun", "==", municipality.IdMun), orderBy("corporacion"));
        const snapshot = await getDocs(q);
        setCorporations(snapshot.docs.map(doc => doc.data() as Corporation));
    } catch (err: any) {
        setError(`Error al cargar corporaciones: ${err.message}`);
    } finally {
        setLoading(prev => ({ ...prev, corps: false }));
    }
  };

  const handleCorporationSelect = async (corporation: Corporation) => {
      setSelectedCorporation(corporation);
      setOffices([]);
      setLoading(prev => ({ ...prev, offices: true }));
      try {
          const q = query(collection(db, "provired_offices"), where("IdCorp", "==", corporation.IdCorp), orderBy("despacho"));
          const snapshot = await getDocs(q);
          const officeData = snapshot.docs.map(doc => ({
              ...doc.data(),
              hasNotifications: notificationDespachoIds.has(doc.data().IdDes)
          }) as Office);
          setOffices(officeData.sort((a,b) => (b.hasNotifications ? 1 : 0) - (a.hasNotifications ? 1 : 0)));
      } catch (err: any) {
          setError(`Error al cargar despachos: ${err.message}`);
      } finally {
        setLoading(prev => ({ ...prev, offices: false }));
      }
  };

  const handleSyncData = () => {
    startSyncTransition(async () => {
        setSyncProgress(0);
        toast({ title: "Iniciando sincronización...", description: "Este proceso puede tardar varios minutos."});
        const result = await syncAllProviredDataToFirebase();
        if (result.success) {
            setSyncProgress(100);
            toast({ title: 'Sincronización Completa', description: 'Los datos de Provired han sido guardados en Firebase.' });
            await fetchInitialData();
        } else {
            setSyncProgress(0);
            toast({ variant: 'destructive', title: 'Error de Sincronización', description: result.message });
            setError(result.message || 'Ocurrió un error desconocido durante la sincronización.');
        }
        setTimeout(() => setSyncProgress(0), 2000);
    });
  };

  const handleOpenNotifications = (office: Office) => {
    setSelectedOffice(office);
    setIsNotificationsModalOpen(true);
  };
  
  const Column = ({ title, isLoading, children }: { title: string, isLoading: boolean, children: React.ReactNode }) => (
    <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b mb-2">{title}</h3>
        <ScrollArea className="h-96">
            {isLoading ? <div className="p-4 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Cargando...</div> : children}
        </ScrollArea>
    </div>
  );

  return (
    <>
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Landmark className="h-6 w-6" />
                Consulta de Juzgados
              </CardTitle>
              <CardDescription>
                Explore la jerarquía de juzgados desde la base de datos de Firebase.
              </CardDescription>
            </div>
            <Button onClick={handleSyncData} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                Sincronizar Datos de Provired
            </Button>
        </CardHeader>
        {isSyncing && (
            <CardContent>
                <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Sincronizando... por favor espere.</p>
                        <Progress value={syncProgress} />
                    </div>
                </div>
            </CardContent>
        )}
      </Card>
      
      {error && <Alert variant="destructive"><ServerCrash className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
            <Label htmlFor="department-select">1. Seleccione un Departamento</Label>
                 {loading.deps ? (
                    <Skeleton className="h-10 w-full md:w-1/3" />
                 ) : (
                    <Select onValueChange={handleDepartmentChange} disabled={loading.deps}>
                        <SelectTrigger id="department-select" className="w-full md:w-1/3"><SelectValue placeholder="Seleccione un departamento..." /></SelectTrigger>
                        <SelectContent>
                            {departments.map((dep) => <SelectItem key={dep.IdDep} value={dep.IdDep}>{dep.departamento}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 )}
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row gap-4 border-t pt-4">
                {selectedDepartment && (
                    <Column title="2. Municipios" isLoading={loading.muns}>
                        <div className="space-y-1 pr-4">
                            {municipalities.map(mun => (
                                <Button 
                                    key={mun.IdMun} 
                                    variant="ghost" 
                                    onClick={() => handleMunicipalitySelect(mun)}
                                    className={cn("w-full justify-start", selectedMunicipality?.IdMun === mun.IdMun && "bg-accent text-accent-foreground")}
                                >
                                    {mun.municipio}
                                </Button>
                            ))}
                        </div>
                    </Column>
                )}

                 {selectedMunicipality && (
                    <Column title="3. Corporaciones" isLoading={loading.corps}>
                        <div className="space-y-1 pr-4">
                             {corporations.map(corp => (
                                <Button 
                                    key={corp.IdCorp} 
                                    variant="ghost" 
                                    onClick={() => handleCorporationSelect(corp)}
                                    className={cn("w-full justify-start text-left h-auto", selectedCorporation?.IdCorp === corp.IdCorp && "bg-accent text-accent-foreground")}
                                >
                                    <University className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate whitespace-normal">{corp.corporacion}</span>
                                </Button>
                            ))}
                        </div>
                    </Column>
                )}

                 {selectedCorporation && (
                    <Column title="4. Despachos" isLoading={loading.offices}>
                        <div className="space-y-1 pr-4">
                            {offices.map(office => (
                                <div key={office.IdDes} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted">
                                    <div className="flex items-center gap-2 text-sm truncate">
                                        <Building className="mr-2 h-4 w-4 shrink-0 text-primary" />
                                        <span className="truncate">{office.despacho}</span>
                                    </div>
                                    {office.hasNotifications && (
                                        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handleOpenNotifications(office)}>
                                            <Bell className="h-3 w-3 mr-1 text-accent" /> Notificaciones
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Column>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
    
    <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        office={selectedOffice}
        notifications={notificationsForSelectedOffice}
        isLoading={isLoadingNotifications}
    />
    </>
  );
}
