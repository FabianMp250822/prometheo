

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserSquare, ServerCrash, History, Landmark, Hash, Tag, Loader2, Banknote, FileText, Gavel, BookKey, Calendar, Building, MapPin, Phone, StickyNote, Sigma, TrendingUp, Users, ChevronsRight, Briefcase, FileDown, TrendingDown, BellRing, Info, Handshake, Target, MinusSquare, BarChart3, Sparkles, RefreshCw, FolderOpen, Pencil, Save, XCircle } from 'lucide-react';
import { formatCurrency, formatPeriodoToMonthYear, parseEmployeeName, parsePaymentDetailName, formatFirebaseTimestamp, parsePeriodoPago, parseDepartmentName } from '@/lib/helpers';
import type { Payment, Parris1, LegalProcess, Causante, PagosHistoricoRecord, PensionerProfileData, DajusticiaClient, DajusticiaPayment, ProviredNotification, CausanteRecord } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, doc, getDoc, getDocs, query, where, limit, orderBy, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/context/auth-provider';
import { getLifeExpectancyInfo } from '@/lib/life-expectancy';
import { datosConsolidados, datosIPC } from '../liquidaciones/anexo-ley-4/page';
import { analizarPerfilPensionado } from '@/ai/flows/analizar-perfil-pensionado';
import { useToast } from '@/hooks/use-toast';
import { SoportesDriveModal } from '@/components/dashboard/soportes-drive-modal';
import { EditablePensionMap } from '@/components/dashboard/editable-pension-map';
import { Input } from '@/components/ui/input';


function InfoField({ icon, label, value, isEditing = false, name, onChange }: { icon: React.ReactNode, label: string, value: React.ReactNode, isEditing?: boolean, name?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-muted-foreground">{icon}</div>
            <div className="w-full">
                <p className="text-sm text-muted-foreground">{label}</p>
                 {isEditing ? (
                    <Input
                        name={name}
                        value={value as string || ''}
                        onChange={onChange}
                        className="mt-1 h-8 text-sm bg-background"
                    />
                ) : (
                    <p className="font-medium">{value || 'N/A'}</p>
                )}
            </div>
        </div>
    );
}

const SENTENCE_CONCEPTS: Record<string, string> = {
    '470': 'Costas Procesales',
    '785': 'Retro Mesada Adicional M1',
    '475': 'Procesos y Sentencia Judiciales',
};
const SENTENCE_CODES = Object.keys(SENTENCE_CONCEPTS);

interface SentencePayment {
    paymentId: string;
    concept: string;
    periodoPago: string;
    amount: number;
}

export default function PensionadoPage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const { selectedPensioner } = usePensioner();
    const [profileData, setProfileData] = useState<PensionerProfileData | null>(null);
    const [isDajusticiaClient, setIsDajusticiaClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('');
    
    const { toast } = useToast();
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

    const [isEditingParris1, setIsEditingParris1] = useState(false);
    const [editedParris1Data, setEditedParris1Data] = useState<Parris1 | null>(null);
    const [isSavingParris1, setIsSavingParris1] = useState(false);
    
    // Estado para manejar la dirección actualizada
    const [currentAddress, setCurrentAddress] = useState<string | null>(null);
    const [currentCity, setCurrentCity] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            user.getIdTokenResult().then(idTokenResult => {
                const role = idTokenResult.claims.role as string | undefined;
                setUserRole(role || 'Usuario');
            });
        }
    }, [user]);

    const fetchAllData = useCallback(async (pensionerId: string, document: string, name: string) => {
        setIsLoading(true);
        setError(null);
        setProfileData(null);
        
        try {
            const clientQuery = query(collection(db, "nuevosclientes"), where("cedula", "==", document), limit(1));
            const clientSnapshot = await getDocs(clientQuery);
            const isClient = !clientSnapshot.empty;
            setIsDajusticiaClient(isClient);
            
            if (userRole !== 'Administrador' && !isClient) {
                setIsLoading(false);
                return;
            }

            // Fetch pensioner document to check for cached analysis
            const pensionerDocRef = doc(db, 'pensionados', pensionerId);
            const pensionerDocSnap = await getDoc(pensionerDocRef);
            if (pensionerDocSnap.exists()) {
                const pensionerData = pensionerDocSnap.data();
                if (pensionerData.analisisIA) {
                    setAnalysis(pensionerData.analisisIA);
                } else {
                    setAnalysis(null);
                }
            } else {
                 setAnalysis(null);
            }
            
            const paymentsQuery = query(collection(db, 'pensionados', pensionerId, 'pagos'));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            let payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            payments.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            const historicalDocRef = doc(db, 'pagosHistorico', document);
            const historicalDoc = await getDoc(historicalDocRef);
            const historicalPayments = historicalDoc.exists() && Array.isArray(historicalDoc.data().records) ? historicalDoc.data().records as PagosHistoricoRecord[] : [];
            const historicalPayment = historicalPayments.length > 0 ? [...historicalPayments].sort((a,b) => (b.ANO_RET || 0) - (a.ANO_RET || 0))[0] : null;

            
            const processesQuery = query(collection(db, 'procesos'), where("identidad_clientes", "==", document));
            const processesSnapshot = await getDocs(processesQuery);
            const legalProcesses = processesSnapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            } as LegalProcess));

            const parris1DocRef = doc(db, "parris1", document);
            const parris1Doc = await getDoc(parris1DocRef);
            const parris1Data = parris1Doc.exists() ? { id: parris1Doc.id, ...parris1Doc.data() } as Parris1 : null;
            
            const causanteQuery = query(collection(db, "causante"), where("cedula_causante", "==", document));
            const causanteSnapshot = await getDocs(causanteQuery);
            const causanteData = !causanteSnapshot.empty ? { id: causanteSnapshot.docs[0].id, ...causanteSnapshot.docs[0].data() } as Causante : null;
            
            let dajusticiaClientData: DajusticiaClient | null = null;
            let dajusticiaPayments: DajusticiaPayment[] = [];

            if(isClient){
                const clientDoc = clientSnapshot.docs[0];
                dajusticiaClientData = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;
                const clientPaymentsQuery = query(collection(db, "nuevosclientes", clientDoc.id, "pagos"));
                const clientPaymentsSnapshot = await getDocs(clientPaymentsQuery);
                dajusticiaPayments = clientPaymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DajusticiaPayment));
            }
            
            const nameToSearch = parseEmployeeName(name).toUpperCase();
            const notificationsQuery = query(
                collection(db, 'provired_notifications'),
                where('demandante_lower', '==', nameToSearch.toLowerCase()),
                orderBy('fechaPublicacion', 'desc'),
                limit(1)
            );
            const notificationsSnapshot = await getDocs(notificationsQuery);
            const lastNotification = !notificationsSnapshot.empty
                ? { id: notificationsSnapshot.docs[0].id, ...notificationsSnapshot.docs[0].data() } as ProviredNotification
                : null;

            setProfileData({
                payments,
                legalProcesses,
                parris1Data,
                causanteData,
                historicalPayment,
                historicalPayments, 
                dajusticiaClientData,
                dajusticiaPayments,
                lastNotification,
            });
            setEditedParris1Data(parris1Data);
            
            // Inicializar dirección actual
            setCurrentAddress(parris1Data?.dir_iss || null);
            setCurrentCity(parris1Data?.ciudad_iss || null);

        } catch (e) {
            console.error(e);
            setError('Ocurrió un error al buscar los datos del pensionado.');
        } finally {
            setIsLoading(false);
        }
    }, [userRole]);

    const handleEditParris1 = () => {
        setIsEditingParris1(true);
        // Ensure edited data is initialized with profile data
        if (profileData?.parris1Data) {
            setEditedParris1Data(profileData.parris1Data);
        } else {
             setEditedParris1Data({} as Parris1); // Start with empty object if no data
        }
    };
    
    const handleCancelEditParris1 = () => {
        setIsEditingParris1(false);
        setEditedParris1Data(profileData?.parris1Data || null);
    };

    // Function to handle address updates from the editable map
    const handleAddressUpdate = (newAddress: string, newCity: string) => {
        setCurrentAddress(newAddress);
        setCurrentCity(newCity);
        
        // Also update the profileData to reflect the changes immediately
        if (profileData) {
            setProfileData(prev => prev ? {
                ...prev,
                direccion: newAddress,
                ciudad: newCity
            } : null);
        }
    };

    const handleParris1InputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setEditedParris1Data(prev => ({
            ...prev!,
            [name]: type === 'number' ? Number(value) : value,
        }));
    };

    const handleSaveParris1 = async () => {
        if (!selectedPensioner || !editedParris1Data) return;
        setIsSavingParris1(true);
        try {
            const docRef = doc(db, 'parris1', selectedPensioner.documento);
            // Convert any string numbers to actual numbers before saving
            const dataToSave = {
                ...editedParris1Data,
                semanas: Number(editedParris1Data.semanas) || 0,
                res_ano: Number(editedParris1Data.res_ano) || 0,
                mesada: Number(editedParris1Data.mesada) || 0,
                telefono_iss: Number(editedParris1Data.telefono_iss) || 0,
                regimen: Number(editedParris1Data.regimen) || 0,
                seguro: Number(editedParris1Data.seguro) || 0
            };
            await setDoc(docRef, dataToSave, { merge: true });
            toast({ title: "Guardado", description: "Los datos de COLPENSIONES han sido actualizados." });
            // Update local state after saving
            setProfileData(prev => ({...prev!, parris1Data: dataToSave}));
            setIsEditingParris1(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: `No se pudo guardar: ${error.message}` });
        } finally {
            setIsSavingParris1(false);
        }
    };
    
    const handleAnalysis = useCallback(async (forceRefresh = false) => {
        if (!profileData || !selectedPensioner) return;

        setIsAnalyzing(true);
        setAnalysisError(null);
        
        if (!forceRefresh && analysis) {
            toast({ title: "Análisis Cargado", description: "Se está mostrando un análisis guardado previamente." });
            setIsAnalyzing(false);
            return;
        }

        try {
            toast({ title: "Generando Análisis con IA", description: "Esto puede tardar un momento..." });
            const result = await analizarPerfilPensionado({
                perfilCompletoPensionado: JSON.stringify({pensioner: selectedPensioner, ...profileData}, null, 2)
            });

            if (!result.summary) {
                throw new Error("La IA no generó un resumen válido.");
            }
            
            setAnalysis(result.summary);
            
            // Save result to pensioner's document
            const pensionerDocRef = doc(db, 'pensionados', selectedPensioner.id);
            await updateDoc(pensionerDocRef, {
                analisisIA: result.summary,
                analisisFecha: serverTimestamp(),
            });

        } catch (err: any) {
            console.error("Error during analysis:", err);
            let errorMessage = "Ocurrió un error al generar el análisis. Si el problema persiste, contacte a soporte.";
            if (typeof err.message === 'string' && err.message.includes('503')) {
                errorMessage = "El servicio de IA está sobrecargado. Por favor, inténtelo de nuevo en unos minutos.";
            }
            setAnalysisError(errorMessage);
            toast({ variant: 'destructive', title: 'Error de Análisis', description: errorMessage });
        } finally {
            setIsAnalyzing(false);
        }
    }, [profileData, selectedPensioner, toast, analysis]);


    useEffect(() => {
        if (selectedPensioner && userRole) {
            fetchAllData(selectedPensioner.id, selectedPensioner.documento, selectedPensioner.empleado);
        } else if (!selectedPensioner) {
            setIsLoading(false);
            setAnalysis(null);
            setProfileData(null);
        }
    }, [selectedPensioner, userRole, fetchAllData]);

    const sentencePayments = React.useMemo((): SentencePayment[] => {
        if (!profileData?.payments.length) return [];
        const foundPayments: SentencePayment[] = [];
        profileData.payments.forEach(payment => {
            payment.detalles.forEach(detail => {
                const matchedCode = SENTENCE_CODES.find(code => detail.nombre?.startsWith(`${code}-`));
                if (matchedCode && detail.ingresos > 0) {
                    foundPayments.push({
                        paymentId: payment.id,
                        concept: parsePaymentDetailName(detail.nombre),
                        periodoPago: payment.periodoPago,
                        amount: detail.ingresos,
                    });
                }
            });
        });
        return foundPayments;
    }, [profileData?.payments]);

    const dajusticiaAccountSummary = useMemo(() => {
        if (!profileData?.dajusticiaClientData || !profileData.dajusticiaPayments) {
            return null;
        }

        const totalPagado = profileData.dajusticiaPayments.reduce((acc, pago) => acc + pago.monto, 0);
        const saldoPendiente = profileData.dajusticiaClientData.salario - totalPagado;

        return {
            totalPagado,
            saldoPendiente,
        };

    }, [profileData?.dajusticiaClientData, profileData?.dajusticiaPayments]);
    
    const totalMesada = useMemo(() => {
        if (!profileData?.payments.length) return 0;
        
        return profileData.payments.reduce((total, payment) => {
            const mesadaAmount = payment.detalles
                .filter(d => (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD' || d.codigo === 'MESAD14'))
                .reduce((sum, d) => sum + (d.ingresos || 0), 0);
            return total + mesadaAmount;
        }, 0);
    }, [profileData?.payments]);
    
    const demographicInfo = useMemo(() => {
        if (!profileData?.parris1Data?.fe_nacido) return null;
        
        const birthDate = new Date(formatFirebaseTimestamp(profileData.parris1Data.fe_nacido, 'yyyy-MM-dd'));
        if (isNaN(birthDate.getTime())) return null;

        const name = parseEmployeeName(selectedPensioner?.empleado || '').toLowerCase();
        const gender = name.endsWith('a') ? 'female' : 'male';

        return getLifeExpectancyInfo(birthDate, gender);

    }, [profileData?.parris1Data, selectedPensioner]);
    
     const adquisitivoData = useMemo(() => {
        const { payments, historicalPayments, causanteData } = profileData || {};
        if (!payments || !historicalPayments || !causanteData) return null;

        const allYears = Array.from({ length: new Date().getFullYear() - 1998 + 1 }, (_, i) => 1998 + i);

        let initialData = allYears.map(year => {
            let paidByCompany = 0;
            const paymentsInYear = payments.filter(p => parsePeriodoPago(p.periodoPago)?.startDate?.getFullYear() === year);
            if (paymentsInYear.length > 0) {
                const firstPaymentMonth = parsePeriodoPago(paymentsInYear[0].periodoPago)?.startDate?.getMonth();
                if (firstPaymentMonth !== undefined) {
                    const paymentsInFirstMonth = paymentsInYear.filter(p => parsePeriodoPago(p.periodoPago)?.startDate?.getMonth() === firstPaymentMonth);
                    paidByCompany = paymentsInFirstMonth.reduce((acc, p) => acc + (p.detalles.find(d => (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD') && d.ingresos > 0)?.ingresos || 0), 0);
                }
            } else {
                 const historicalRecord = historicalPayments.find(rec => rec.ANO_RET === year);
                 if (historicalRecord?.VALOR_ACT) {
                    paidByCompany = parseFloat(historicalRecord.VALOR_ACT.replace(',', '.')) || 0;
                 }
            }

            let pensionDeVejez = 0;
            const causanteRecordForYear = causanteData.records.find(rec => rec.fecha_desde && new Date(formatFirebaseTimestamp(rec.fecha_desde, 'yyyy-MM-dd')).getFullYear() + 1 === year);
            if (causanteRecordForYear?.valor_iss) {
                pensionDeVejez = causanteRecordForYear.valor_iss;
            }

            return { year, smlmv: datosConsolidados[year]?.smlmv || 0, paidByCompany, pensionDeVejez, unidadPensional: 0, numSmlmv: 0, isProjected: false };
        });

        for (let i = 1; i < initialData.length; i++) {
            if (initialData[i].pensionDeVejez === 0 && initialData[i - 1].pensionDeVejez > 0) {
                const prevIpc = datosIPC[initialData[i-1].year];
                if (prevIpc !== undefined) {
                    initialData[i].pensionDeVejez = initialData[i - 1].pensionDeVejez * (1 + prevIpc / 100);
                    initialData[i].isProjected = true;
                }
            }
        }
        
        const calculatedData = initialData.map(data => ({
            ...data,
            unidadPensional: data.paidByCompany + data.pensionDeVejez,
            numSmlmv: data.smlmv > 0 ? (data.paidByCompany + data.pensionDeVejez) / data.smlmv : 0,
        })).filter(d => d.unidadPensional > 0 || d.pensionDeVejez > 0);

        if (calculatedData.length < 1) return null;

        const firstRecord = calculatedData[0];
        const lastRecord = calculatedData[calculatedData.length - 1];
        const smlmvLoss = (firstRecord.numSmlmv - lastRecord.numSmlmv).toFixed(2);
        
        const sharingYearRecord = calculatedData.find(d => d.pensionDeVejez > 0 && !d.isProjected);
        let sharingInfo = null;
        if (sharingYearRecord && causanteData.records.length > 0) {
            const getTimestamp = (fecha: any) => {
                if (!fecha) return 0;
                try {
                    if (typeof fecha === 'object' && fecha.toDate) {
                        return fecha.toDate().getTime();
                    }
                    return new Date(fecha).getTime();
                } catch {
                    return 0;
                }
            };
            const firstCausanteRecord = causanteData.records.filter(r => r.fecha_desde).sort((a,b) => getTimestamp(a.fecha_desde) - getTimestamp(b.fecha_desde))[0];
            const preSharingYearData = calculatedData.find(d => d.year === sharingYearRecord.year - 1);
            
            sharingInfo = {
                sharingDate: firstCausanteRecord ? formatFirebaseTimestamp(firstCausanteRecord.fecha_desde, 'dd/MM/yyyy') : 'N/A',
                mesadaAntes: preSharingYearData ? preSharingYearData.paidByCompany : 0,
                aCargoColpensiones: sharingYearRecord.pensionDeVejez,
                porcentajeColpensiones: sharingYearRecord.unidadPensional > 0 ? (sharingYearRecord.pensionDeVejez / sharingYearRecord.unidadPensional) * 100 : 0,
                aCargoEmpresa: sharingYearRecord.paidByCompany,
                porcentajeEmpresa: sharingYearRecord.unidadPensional > 0 ? (sharingYearRecord.paidByCompany / sharingYearRecord.unidadPensional) * 100 : 0,
            };
        }

        return {
            primeraMesada: { fecha: firstRecord.year, valor: firstRecord.unidadPensional },
            ultimaMesada: { fecha: lastRecord.year, valor: lastRecord.unidadPensional },
            smlmvLoss,
            sharingInfo,
        };

    }, [profileData]);


    if (isLoading) {
         return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-bold">Cargando Hoja de Vida...</h2>
                <p className="text-muted-foreground max-w-md">
                    Estamos consolidando toda la información. Esto puede tardar un momento.
                </p>
            </div>
        );
    }
    
    if (userRole !== 'Administrador' && !isDajusticiaClient) {
        return (
            <div className="p-8">
                 <Alert>
                    <Handshake className="h-4 w-4" />
                    <AlertTitle className="font-bold">¡Bienvenido a DAJUSTICIA!</AlertTitle>
                    <AlertDescription>
                        Aún no eres un cliente formal. Para ver el estado de tus procesos y acceder a tu hoja de vida completa, necesitamos que formalices tu caso con nosotros.
                        <div className="mt-4">
                            <Button asChild>
                                <Link href="/registro">Inscribirme ahora</Link>
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!selectedPensioner) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <UserSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Seleccione un Pensionado</h2>
                <p className="text-muted-foreground max-w-md">
                    Utilice el buscador en el encabezado para encontrar y seleccionar un pensionado. Una vez seleccionado, su hoja de vida completa aparecerá aquí.
                </p>
            </div>
        );
    }

    const { parris1Data, causanteData, legalProcesses, payments, historicalPayment, dajusticiaClientData, lastNotification } = profileData || {};

    return (
        <>
            <div className="p-4 md:p-8 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-headline flex items-center gap-2">
                                <UserSquare className="h-6 w-6" />
                                Hoja de Vida del Pensionado
                            </CardTitle>
                            <CardDescription>Resumen de la información de {parseEmployeeName(selectedPensioner.empleado)}.</CardDescription>
                        </div>
                         <Button onClick={() => setIsDriveModalOpen(true)}>
                            <FolderOpen className="mr-2 h-4 w-4"/>
                            Ver Soportes de Drive
                        </Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <InfoField icon={<Hash />} label="Documento" value={selectedPensioner.documento} />
                        <InfoField icon={<Landmark />} label="Dependencia" value={parseDepartmentName(selectedPensioner.dependencia1)} />
                        <InfoField icon={<Tag />} label="Centro de Costo" value={selectedPensioner.centroCosto} />
                        <InfoField icon={<Sigma />} label="Total Mesada Pensional" value={<span className="font-bold text-primary">{formatCurrency(totalMesada)}</span>} />
                    </CardContent>
                </Card>

                {error && (
                     <Alert variant="destructive">
                        <ServerCrash className="h-4 w-4" />
                        <AlertTitle>Error al Cargar Detalles Adicionales</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {!isLoading && !error && (
                    <>
                        <React.Fragment key="analysis-card">
                          <Card>
                              <CardHeader>
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <CardTitle className="text-xl flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent"/> Análisis con IA</CardTitle>
                                          <CardDescription>Resumen ejecutivo y puntos clave del perfil.</CardDescription>
                                      </div>
                                      <Button onClick={() => handleAnalysis(true)} disabled={isAnalyzing || !profileData} variant="outline" size="sm">
                                          <RefreshCw className="mr-2 h-4 w-4" /> Forzar Re-Análisis
                                      </Button>
                                  </div>
                              </CardHeader>
                              <CardContent>
                                  {!analysis && !isAnalyzing && !analysisError && (
                                      <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg">
                                          <p className="text-muted-foreground mb-4">Obtenga un resumen y análisis completo de este perfil.</p>
                                          <Button onClick={() => handleAnalysis(false)} disabled={isAnalyzing || !profileData}>
                                              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                              Analizar Perfil con IA
                                          </Button>
                                      </div>
                                  )}
                                  {isAnalyzing && (
                                      <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-md">
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                          <span>Analizando perfil completo. Esto puede tardar unos segundos...</span>
                                      </div>
                                  )}
                                  {analysisError && <Alert variant="destructive"><AlertTitle>Error de Análisis</AlertTitle><AlertDescription>{analysisError}</AlertDescription></Alert>}
                                  {analysis && (
                                      <div className="prose prose-sm max-w-none p-4 border rounded-lg bg-background">
                                          <div dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />') }} />
                                      </div>
                                  )}
                              </CardContent>
                          </Card>
                        </React.Fragment>

                        {demographicInfo && (
                            <React.Fragment key="demographic-card">
                              <Card>
                                  <CardHeader>
                                      <CardTitle className="text-xl flex items-center gap-2">
                                          <Target className="h-5 w-5" /> Datos Demográficos Clave
                                      </CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                                      <InfoField icon={<Calendar />} label="Edad Actual" value={`${demographicInfo.age} años`} />
                                      <InfoField icon={<TrendingUp />} label="Expectativa de Vida Restante" value={demographicInfo.expectancy ? `${demographicInfo.expectancy} años` : 'Dato no disponible'} />
                                  </CardContent>
                              </Card>
                            </React.Fragment>
                        )}
                        
                         {adquisitivoData && (
                            <React.Fragment key="adquisitivo-card">
                              <Card>
                                  <CardHeader>
                                      <CardTitle className="text-xl flex items-center gap-2"><BarChart3 className="h-5 w-5"/>Resumen de Poder Adquisitivo</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                                          <InfoField icon={<Calendar />} label="Primera Mesada" value={`${formatCurrency(adquisitivoData.primeraMesada.valor)} (${adquisitivoData.primeraMesada.fecha})`} />
                                          <InfoField icon={<Calendar />} label="Última Mesada" value={`${formatCurrency(adquisitivoData.ultimaMesada.valor)} (${adquisitivoData.ultimaMesada.fecha})`} />
                                          <InfoField icon={<MinusSquare className="text-destructive"/>} label="Pérdida de SMLMV" value={<span className="font-bold text-destructive">{adquisitivoData.smlmvLoss}</span>} />
                                      </div>
                                      {adquisitivoData.sharingInfo && (
                                          <div>
                                              <h4 className="font-semibold text-foreground mb-2">Resumen de Compartición Pensional</h4>
                                               <div className="border rounded-lg overflow-hidden">
                                                  <Table>
                                                      <TableBody>
                                                          <TableRow>
                                                              <TableCell className="font-semibold bg-muted/50">FECHA DE COMPARTICIÓN</TableCell>
                                                              <TableCell className='text-center'>{adquisitivoData.sharingInfo.sharingDate}</TableCell>
                                                          </TableRow>
                                                          <TableRow>
                                                              <TableCell className="font-semibold bg-muted/50">MESADA PLENA ANTES DE COMPARTIR</TableCell>
                                                              <TableCell className='text-center font-medium'>{formatCurrency(adquisitivoData.sharingInfo.mesadaAntes)}</TableCell>
                                                          </TableRow>
                                                           <TableRow className="bg-muted/30">
                                                              <TableCell colSpan={2} className="text-center font-bold text-muted-foreground text-xs">DISTRIBUCIÓN POST-COMPARTICIÓN</TableCell>
                                                           </TableRow>
                                                           <TableRow>
                                                              <TableCell className="font-semibold">A CARGO DE COLPENSIONES</TableCell>
                                                              <TableCell className='text-center'>{adquisitivoData.sharingInfo.porcentajeColpensiones.toFixed(2)}% ({formatCurrency(adquisitivoData.sharingInfo.aCargoColpensiones)})</TableCell>
                                                           </TableRow>
                                                           <TableRow>
                                                              <TableCell className="font-semibold">MAYOR VALOR A CARGO DE LA EMPRESA</TableCell>
                                                              <TableCell className='text-center'>{adquisitivoData.sharingInfo.porcentajeEmpresa.toFixed(2)}% ({formatCurrency(adquisitivoData.sharingInfo.aCargoEmpresa)})</TableCell>
                                                           </TableRow>
                                                      </TableBody>
                                                  </Table>
                                              </div>
                                          </div>
                                      )}
                                  </CardContent>
                              </Card>
                            </React.Fragment>
                        )}

                        {lastNotification && (
                             <React.Fragment key="notification-card">
                              <Card>
                                   <CardHeader>
                                      <CardTitle className="text-xl flex items-center gap-2">
                                          <BellRing className="h-5 w-5" /> Última Actuación
                                      </CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                      <InfoField icon={<FileText />} label="Descripción" value={lastNotification.descripcion} />
                                      <InfoField icon={<Calendar />} label="Fecha Publicación" value={formatFirebaseTimestamp(lastNotification.fechaPublicacion)} />
                                      <InfoField icon={<Gavel />} label="Proceso" value={lastNotification.proceso} />
                                      <InfoField icon={<Hash />} label="Radicación" value={lastNotification.radicacion} />
                                  </CardContent>
                              </Card>
                            </React.Fragment>
                        )}

                        {dajusticiaClientData && (
                             <React.Fragment key="dajusticia-card">
                              <Card className="border-accent">
                                  <CardHeader>
                                      <CardTitle className="text-xl flex items-center gap-2 text-accent">
                                          <Briefcase className="h-5 w-5" /> Cliente DAJUSTICIA
                                      </CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                                      <InfoField icon={<Users />} label="Grupo" value={dajusticiaClientData.grupo} />
                                      <InfoField icon={<Banknote />} label="Salario a Cancelar" value={formatCurrency(dajusticiaClientData.salario)} />
                                      <InfoField icon={<Calendar />} label="Plazo" value={`${dajusticiaClientData.plazoMeses} meses`} />
                                      <InfoField icon={<Sigma />} label="Cuota Mensual" value={formatCurrency(parseFloat(dajusticiaClientData.cuotaMensual))} />
                                      {dajusticiaAccountSummary && (
                                          <>
                                              <InfoField icon={<TrendingUp className="text-green-600" />} label="Total Pagado" value={<span className="text-green-600 font-bold">{formatCurrency(dajusticiaAccountSummary.totalPagado)}</span>} />
                                              <InfoField icon={<TrendingDown className="text-red-600" />} label="Saldo Pendiente" value={<span className="text-red-600 font-bold">{formatCurrency(dajusticiaAccountSummary.saldoPendiente)}</span>} />
                                          </>
                                      )}
                                  </CardContent>
                              </Card>
                            </React.Fragment>
                        )}
                        
                         <React.Fragment key="abogado-info">
                          <InfoField icon={<Handshake className="text-primary" />} label="Abogado Asignado" value="Dr. Robinson Rada Gonzalez" />
                        </React.Fragment>

                        <React.Fragment key="colpensiones-card">
                            <Card>
                                <CardHeader className='flex-row items-center justify-between'>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <BookKey className="h-5 w-5" /> Datos de Pensión COLPENSIONES
                                    </CardTitle>
                                     {isEditingParris1 ? (
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleSaveParris1} disabled={isSavingParris1}>
                                                {isSavingParris1 ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}
                                                Guardar
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={handleCancelEditParris1} disabled={isSavingParris1}>
                                                <XCircle className='mr-2 h-4 w-4'/>
                                                Cancelar
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={handleEditParris1}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Actualizar Datos
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {parris1Data || isEditingParris1 ? (
                                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                            <InfoField icon={<Calendar />} label="Fecha Adquisición" value={isEditingParris1 ? editedParris1Data?.fe_adquiere : formatFirebaseTimestamp(parris1Data?.fe_adquiere)} isEditing={isEditingParris1} name="fe_adquiere" onChange={handleParris1InputChange} />
                                            <InfoField icon={<Calendar />} label="Fecha Causación" value={isEditingParris1 ? editedParris1Data?.fe_causa : formatFirebaseTimestamp(parris1Data?.fe_causa)} isEditing={isEditingParris1} name="fe_causa" onChange={handleParris1InputChange} />
                                            <InfoField icon={<Calendar />} label="Fecha Ingreso" value={isEditingParris1 ? editedParris1Data?.fe_ingreso : formatFirebaseTimestamp(parris1Data?.fe_ingreso)} isEditing={isEditingParris1} name="fe_ingreso" onChange={handleParris1InputChange} />
                                            <InfoField icon={<Calendar />} label="Fecha Nacimiento" value={isEditingParris1 ? editedParris1Data?.fe_nacido : formatFirebaseTimestamp(parris1Data?.fe_nacido)} isEditing={isEditingParris1} name="fe_nacido" onChange={handleParris1InputChange} />
                                            <InfoField icon={<Calendar />} label="Fecha Vinculación" value={isEditingParris1 ? editedParris1Data?.fe_vinculado : formatFirebaseTimestamp(parris1Data?.fe_vinculado)} isEditing={isEditingParris1} name="fe_vinculado" onChange={handleParris1InputChange} />
                                            <InfoField icon={<History />} label="Semanas" value={isEditingParris1 ? editedParris1Data?.semanas : parris1Data?.semanas} isEditing={isEditingParris1} name="semanas" onChange={handleParris1InputChange}/>
                                            <InfoField icon={<FileText />} label="Resolución" value={parris1Data ? `${parris1Data.res_nro} (${parris1Data.res_ano})` : ''} />
                                            <InfoField icon={<Banknote />} label="Mesada" value={isEditingParris1 ? editedParris1Data?.mesada : formatCurrency(parris1Data?.mesada || 0)} isEditing={isEditingParris1} name="mesada" onChange={handleParris1InputChange}/>
                                            <InfoField icon={<Building />} label="Ciudad ISS" value={isEditingParris1 ? editedParris1Data?.ciudad_iss : parris1Data?.ciudad_iss} isEditing={isEditingParris1} name="ciudad_iss" onChange={handleParris1InputChange} />
                                            <InfoField icon={<MapPin />} label="Dirección ISS" value={isEditingParris1 ? editedParris1Data?.dir_iss : parris1Data?.dir_iss} isEditing={isEditingParris1} name="dir_iss" onChange={handleParris1InputChange} />
                                            <InfoField icon={<Phone />} label="Teléfono ISS" value={isEditingParris1 ? editedParris1Data?.telefono_iss : parris1Data?.telefono_iss} isEditing={isEditingParris1} name="telefono_iss" onChange={handleParris1InputChange}/>
                                            <InfoField icon={<Users />} label="Régimen" value={isEditingParris1 ? editedParris1Data?.regimen : parris1Data?.regimen} isEditing={isEditingParris1} name="regimen" onChange={handleParris1InputChange}/>
                                            <InfoField icon={<Sigma />} label="Riesgo" value={isEditingParris1 ? editedParris1Data?.riesgo : parris1Data?.riesgo} isEditing={isEditingParris1} name="riesgo" onChange={handleParris1InputChange}/>
                                            <InfoField icon={<TrendingUp />} label="Seguro" value={isEditingParris1 ? editedParris1Data?.seguro : parris1Data?.seguro} isEditing={isEditingParris1} name="seguro" onChange={handleParris1InputChange}/>
                                            <InfoField icon={<StickyNote />} label="Tranci" value={isEditingParris1 ? (editedParris1Data?.tranci ? 'Sí' : 'No') : (parris1Data?.tranci ? 'Sí' : 'No')} />
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-4">
                                            No se encontraron datos de pensión en COLPENSIONES para este usuario.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </React.Fragment>

                        {(parris1Data?.dir_iss || userRole === 'admin') && (
                            <React.Fragment key="map-card">
                                <EditablePensionMap 
                                    pensionerId={params.id}
                                    currentAddress={currentAddress}
                                    currentCity={currentCity}
                                    onAddressUpdate={handleAddressUpdate}
                                />
                            </React.Fragment>
                        )}

                        <React.Fragment key="legal-processes-card">
                          <Card>
                              <CardHeader>
                                  <CardTitle className="text-xl flex items-center gap-2">
                                      <Gavel className="h-5 w-5" /> Procesos Legales Asociados
                                  </CardTitle>
                              </CardHeader>
                              <CardContent>
                                  {legalProcesses && legalProcesses.length > 0 ? (
                                      <Table>
                                          <TableHeader>
                                              <TableRow>
                                                  <TableHead>Radicado</TableHead>
                                                  <TableHead>Clase de Proceso</TableHead>
                                                  <TableHead>Estado</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              {legalProcesses.map((p) => (
                                                  <TableRow key={p.id}>
                                                      <TableCell className="font-medium">{p.num_radicado_ini || 'N/A'}</TableCell>
                                                      <TableCell>{p.clase_proceso || 'N/A'}</TableCell>
                                                      <TableCell>{p.estado || 'N/A'}</TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                      </Table>
                                  ) : (
                                      <p className="text-muted-foreground text-center py-4">
                                          No se encontraron procesos legales asociados actualmente.
                                      </p>
                                  )}
                              </CardContent>
                          </Card>
                        </React.Fragment>

                        {sentencePayments.length > 0 && (
                            <React.Fragment key="sentence-payments-card">
                              <Card>
                                  <CardHeader>
                                      <CardTitle className="text-xl flex items-center gap-2">
                                          <FileText className="h-5 w-5" /> Resumen de Pagos por Sentencia
                                      </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                      <Table>
                                          <TableHeader>
                                              <TableRow>
                                                  <TableHead>Concepto</TableHead>
                                                  <TableHead>Periodo de Pago</TableHead>
                                                  <TableHead className="text-right">Valor</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              {sentencePayments.map((p, index) => (
                                                  <TableRow key={index}>
                                                      <TableCell className="font-medium">{p.concept}</TableCell>
                                                      <TableCell>{formatPeriodoToMonthYear(p.periodoPago)}</TableCell>
                                                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(p.amount)}</TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                      </Table>
                                  </CardContent>
                              </Card>
                            </React.Fragment>
                        )}

                        <React.Fragment key="payment-history-card">
                          <Card>
                              <CardHeader>
                                  <CardTitle className="text-xl flex items-center gap-2">
                                      <History className="h-5 w-5" /> Historial de Pagos
                                  </CardTitle>
                              </CardHeader>
                              <CardContent>
                                   {payments && payments.length > 0 ? (
                                      <Table>
                                          <TableHeader>
                                              <TableRow>
                                                  <TableHead>Periodo</TableHead>
                                                  <TableHead>Concepto</TableHead>
                                                  <TableHead className="text-right">Valor</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              {payments.slice(0, 2).map(payment => {
                                                  const mesada = payment.detalles.find(d => 
                                                      d.nombre === 'Mesada Pensional' || 
                                                      d.codigo === 'MESAD' ||
                                                      d.codigo === 'MESAD14'
                                                  );
                                                  const concepto = mesada?.codigo === 'MESAD14' ? 'Mesada Adicional' : 'Mesada Pensional';
                                                  return (
                                                      <TableRow key={payment.id}>
                                                          <TableCell>{payment.periodoPago}</TableCell>
                                                          <TableCell>{concepto}</TableCell>
                                                          <TableCell className="text-right font-medium text-green-600">
                                                              {mesada ? formatCurrency(mesada.ingresos) : 'N/A'}
                                                          </TableCell>
                                                      </TableRow>
                                                  )
                                              })}
                                          </TableBody>
                                      </Table>
                                  ) : historicalPayment ? (
                                       <Table>
                                          <TableHeader>
                                              <TableRow>
                                                  <TableHead>Año</TableHead>
                                                  <TableHead className="text-right">Valor Anterior</TableHead>
                                                  <TableHead className="text-right">Valor Actual</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              <TableRow>
                                                  <TableCell>{historicalPayment.ANO_RET || 'N/A'}</TableCell>
                                                  <TableCell className="text-right text-muted-foreground">
                                                      {formatCurrency(parseFloat(historicalPayment.VALOR_ANT?.replace(',', '.') || '0'))}
                                                  </TableCell>
                                                  <TableCell className="text-right font-medium text-green-600">
                                                      {formatCurrency(parseFloat(historicalPayment.VALOR_ACT?.replace(',', '.') || '0'))}
                                                  </TableCell>
                                              </TableRow>
                                          </TableBody>
                                      </Table>
                                  ) : (
                                      <p className="text-muted-foreground text-center py-4">No se encontraron registros de pagos para este pensionado.</p>
                                  )}
                              </CardContent>
                          </Card>
                        </React.Fragment>
                    </>
                )}
            </div>
            {selectedPensioner && (
              <SoportesDriveModal
                isOpen={isDriveModalOpen}
                onClose={() => setIsDriveModalOpen(false)}
                documento={selectedPensioner.documento}
                nombre={parseEmployeeName(selectedPensioner.empleado)}
              />
            )}
        </>
    );
}
