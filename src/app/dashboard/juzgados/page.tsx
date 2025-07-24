
'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Landmark, Loader2, University, Building, Bell, Download, ServerCrash } from 'lucide-react';
import { syncAllProviredDataToFirebase } from '@/services/provired-api-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotificationsModal } from '@/components/dashboard/notifications-modal';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

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
    IdCorp: string;
    IdMun: string;
    corporacion: string;
    offices?: Office[];
    isLoadingOffices?: boolean;
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

type LoadingState = {
    departments: boolean;
    municipalities: boolean;
}

export default function JuzgadosPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [corporations, setCorporations] = useState<{ [municipalityId: string]: { data: Corporation[], isLoading: boolean } }>({});
  
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const [loading, setLoading] = useState<LoadingState>({ departments: true, municipalities: false });
  const [error, setError] = useState<string | null>(null);

  // Sync state
  const [isSyncing, startSyncTransition] = useTransition();
  const [syncProgress, setSyncProgress] = useState({ value: 0, text: '' });
  const { toast } = useToast();

  // State for notifications
  const [notificationDespachoIds, setNotificationDespachoIds] = useState<Set<string>>(new Set());
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  
  const notificationsForSelectedOffice = useMemo(() => {
    if (!selectedOffice || !allNotifications.length) return [];
    return allNotifications.filter(n => n.despacho === selectedOffice.IdDes);
  }, [selectedOffice, allNotifications]);

  const fetchInitialDataFromFirebase = useCallback(async () => {
      setLoading({ departments: true, municipalities: false });
      setIsLoadingNotifications(true);
      setError(null);

      try {
          const departmentsQuery = query(collection(db, "provired_departments"), orderBy("departamento"));
          const notificationsQuery = query(collection(db, "provired_notifications"));
          
          const [depSnapshot, notificationsSnapshot] = await Promise.all([
              getDocs(departmentsQuery),
              getDocs(notificationsQuery)
          ]);

          const depsData = depSnapshot.docs.map(doc => doc.data() as Department);
          setDepartments(depsData);
          
          const notifsData = notificationsSnapshot.docs.map(doc => doc.data() as Notification);
          setAllNotifications(notifsData);
          const idsWithNotifications = new Set(notifsData.map(n => n.despacho));
          setNotificationDespachoIds(idsWithNotifications);

      } catch (err: any) {
          setError(`Error al leer desde Firebase: ${err.message}. Intente sincronizar los datos.`);
      } finally {
          setLoading(prev => ({ ...prev, departments: false }));
          setIsLoadingNotifications(false);
      }
  }, []);

  useEffect(() => {
    fetchInitialDataFromFirebase();
  }, [fetchInitialDataFromFirebase]);

  const handleDepartmentChange = async (departmentId: string) => {
    const depIdStr = String(departmentId);
    setSelectedDepartment(depIdStr);
    setMunicipalities([]);
    setCorporations({});

    setLoading(prev => ({ ...prev, municipalities: true }));
    setError(null);
    try {
        const municipalitiesQuery = query(
            collection(db, "provired_municipalities"),
            where("depto_IdDep", "==", depIdStr),
            orderBy("municipio")
        );
        const munSnapshot = await getDocs(municipalitiesQuery);
        const munData = munSnapshot.docs.map(doc => doc.data() as Municipality);

        if (munData.length > 0) {
            setMunicipalities(munData);
        } else {
            setMunicipalities([]);
            setError(`No se encontraron municipios para este departamento en Firebase.`);
        }
    } catch(err: any) {
        setError(`Error al leer municipios desde Firebase: ${err.message}`);
    } finally {
        setLoading(prev => ({ ...prev, municipalities: false }));
    }
  };
  
  const fetchCorporationsForMunicipality = useCallback(async (municipalityId: string) => {
    if (corporations[municipalityId]?.data?.length > 0) return;

    setCorporations(prev => ({ ...prev, [municipalityId]: { data: [], isLoading: true } })); 

    try {
      const q = query(
        collection(db, "provired_corporations"),
        where("IdMun", "==", municipalityId)
      );
      const snapshot = await getDocs(q);
      const corpData = snapshot.docs.map(doc => doc.data() as Corporation);
      setCorporations(prev => ({ ...prev, [municipalityId]: { data: corpData, isLoading: false } }));
    } catch(err: any) {
        setCorporations(prev => ({ ...prev, [municipalityId]: { data: [], isLoading: false } }));
        setError(`Error al leer corporaciones: ${err.message}`);
    }
  }, [corporations]);
  
  const fetchOfficesForCorporation = async (municipalityId: string, corporationId: string) => {
    const munCorpsData = corporations[municipalityId]?.data || [];
    const corpToUpdate = munCorpsData.find(c => c.IdCorp === corporationId);
    
    if (!corpToUpdate || corpToUpdate.offices) return;

    setCorporations(prev => ({
        ...prev,
        [municipalityId]: {
            ...prev[municipalityId],
            data: prev[municipalityId].data.map(c => 
                c.IdCorp === corporationId ? { ...c, isLoadingOffices: true } : c
            )
        }
    }));
    
    try {
        const q = query(collection(db, "provired_offices"), where("IdCorp", "==", corporationId));
        const snapshot = await getDocs(q);
        const officeData = snapshot.docs.map(doc => ({
          ...doc.data(),
          hasNotifications: notificationDespachoIds.has(doc.data().IdDes)
        })).sort((a,b) => (b.hasNotifications ? 1 : 0) - (a.hasNotifications ? 1 : 0)) as Office[];
        
        setCorporations(prev => {
            const newMunCorps = (prev[municipalityId]?.data || []).map(c => 
                c.IdCorp === corporationId ? { ...c, offices: officeData, isLoadingOffices: false } : c
            );
            return { ...prev, [municipalityId]: { ...prev[municipalityId], data: newMunCorps } };
        });

    } catch (err: any) {
        setError(`Error al leer despachos: ${err.message}`);
        setCorporations(prev => ({
            ...prev,
            [municipalityId]: {
                ...prev[municipalityId],
                data: prev[municipalityId].data.map(c => 
                    c.IdCorp === corporationId ? { ...c, offices: [], isLoadingOffices: false } : c
                )
            }
        }));
    }
  };

  const handleSyncData = () => {
    startSyncTransition(async () => {
        setSyncProgress({ value: 5, text: 'Iniciando sincronización...' });
        const result = await syncAllProviredDataToFirebase();
        if (result.success) {
            setSyncProgress({ value: 100, text: 'Sincronización completada.' });
            toast({ title: 'Sincronización Completa', description: 'Los datos de Provired han sido guardados en Firebase.' });
            await fetchInitialDataFromFirebase();
        } else {
            setSyncProgress({ value: 100, text: 'Error en la sincronización.' });
            toast({ variant: 'destructive', title: 'Error de Sincronización', description: result.message });
        }
        setTimeout(() => setSyncProgress({ value: 0, text: '' }), 2000);
    });
  };

  const handleOpenNotifications = (office: Office) => {
    setSelectedOffice(office);
    setIsNotificationsModalOpen(true);
  };


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
                        <p className="text-sm font-medium leading-none">{syncProgress.text}</p>
                        <Progress value={syncProgress.value} />
                    </div>
                </div>
            </CardContent>
        )}
      </Card>
      
      {error && (
        <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
            <CardTitle className="text-xl">Selección de Ubicación</CardTitle>
        </CardHeader>
        <CardContent>
            <div>
                <Label htmlFor="department-select">Departamento</Label>
                 {loading.departments ? (
                    <Skeleton className="h-10 w-full md:w-1/3" />
                 ) : (
                    <Select onValueChange={handleDepartmentChange} disabled={loading.departments}>
                        <SelectTrigger id="department-select" className="w-full md:w-1/3"><SelectValue placeholder="Seleccione un departamento..." /></SelectTrigger>
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
                                  <TableCell className="font-medium align-top pt-4">{mun.municipio}</TableCell>
                                  <TableCell>
                                    <Accordion type="single" collapsible className="w-full" onValueChange={() => fetchCorporationsForMunicipality(mun.IdMun)}>
                                        <AccordionItem value={`mun-${mun.IdMun}`} className="border-b-0">
                                            <AccordionTrigger>Ver Corporaciones</AccordionTrigger>
                                            <AccordionContent>
                                                {corporations[mun.IdMun]?.isLoading ? (
                                                     <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Cargando...</div>
                                                ) : corporations[mun.IdMun]?.data?.length > 0 ? (
                                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                                        {corporations[mun.IdMun].data.map((corp) => (
                                                            <AccordionItem value={corp.IdCorp} key={corp.IdCorp} className="border bg-card rounded-md">
                                                                <AccordionTrigger className="p-3 hover:no-underline text-sm" onClick={() => fetchOfficesForCorporation(mun.IdMun, corp.IdCorp)}>
                                                                    <div className="flex items-center gap-2"><University className="h-4 w-4"/> {corp.corporacion}</div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="p-3 pt-0">
                                                                     {corp.isLoadingOffices ? (
                                                                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Cargando...</div>
                                                                    ) : corp.offices && corp.offices.length > 0 ? (
                                                                        <div className="space-y-2 pl-4 border-l">
                                                                            {corp.offices.map((office) => (
                                                                                <div key={office.IdDes} className="flex items-center justify-between gap-2 text-xs py-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                      <Building className="h-3 w-3 text-primary"/>
                                                                                      {office.despacho}
                                                                                    </div>
                                                                                    {office.hasNotifications && (
                                                                                        <Button variant="ghost" size="sm" onClick={() => handleOpenNotifications(office)}>
                                                                                            <Bell className="h-3 w-3 mr-1 text-accent" /> Notificaciones
                                                                                        </Button>
                                                                                    )}
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
