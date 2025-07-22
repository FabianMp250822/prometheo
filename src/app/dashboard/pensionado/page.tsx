
'use client';

import React, { useState, useEffect } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserSquare, ServerCrash, History, Landmark, Hash, Tag, Loader2, Banknote, FileText, Gavel, BookKey, Calendar, Building, MapPin, Phone, StickyNote, Sigma, TrendingUp, Users, ChevronsRight } from 'lucide-react';
import { formatCurrency, formatPeriodoToMonthYear, parseEmployeeName, parseDepartmentName, parsePaymentDetailName, parsePeriodoPago, formatFirebaseTimestamp } from '@/lib/helpers';
import { Payment, Parris1, LegalProcess, Causante, PagosHistoricoRecord } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function InfoField({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-1">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value || 'N/A'}</p>
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


export default function PensionadoPage() {
    const { selectedPensioner } = usePensioner();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [legalProcesses, setLegalProcesses] = useState<LegalProcess[]>([]);
    const [parris1Data, setParris1Data] = useState<Parris1 | null>(null);
    const [causanteData, setCausanteData] = useState<Causante | null>(null);
    const [historicalPayment, setHistoricalPayment] = useState<PagosHistoricoRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPensioner?.id) {
            setIsLoading(true);
            setError(null);
            setPayments([]);
            setLegalProcesses([]);
            setParris1Data(null);
            setHistoricalPayment(null);
            setCausanteData(null);
            
            const fetchAllData = async () => {
                try {
                    // Fetch Payments from subcollection
                    const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
                    const paymentsSnapshot = await getDocs(paymentsQuery);
                    let paymentsData = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
                    
                    if (paymentsData.length > 0) {
                        paymentsData.sort((a, b) => {
                            const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                            const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                            return dateB.getTime() - dateA.getTime();
                        });
                        setPayments(paymentsData);
                    } else {
                        // Fallback to pagosHistorico collection
                        const historicalDocRef = doc(db, 'pagosHistorico', selectedPensioner.documento);
                        const historicalDoc = await getDoc(historicalDocRef);
                        if (historicalDoc.exists()) {
                            const data = historicalDoc.data();
                            if (data.records && Array.isArray(data.records) && data.records.length > 0) {
                                const sortedRecords = [...data.records].sort((a, b) => (b.ANO_RET || 0) - (a.ANO_RET || 0));
                                setHistoricalPayment(sortedRecords[0] as PagosHistoricoRecord);
                            }
                        }
                    }

                    // Fetch Legal Processes
                    const processesQuery = query(
                        collection(db, 'procesos'),
                        where("identidad_clientes", "==", selectedPensioner.documento)
                    );
                    const processesSnapshot = await getDocs(processesQuery);
                    const processesData = processesSnapshot.docs.map(doc => ({
                        id: doc.id,
                        num_radicado_ini: doc.data().num_radicado_ini,
                        clase_proceso: doc.data().clase_proceso,
                        estado: doc.data().estado
                    } as LegalProcess));
                    setLegalProcesses(processesData);
                    
                    // Fetch Parris1 Data
                    const parris1DocRef = doc(db, 'parris1', selectedPensioner.documento);
                    const parris1Doc = await getDoc(parris1DocRef);
                    if (parris1Doc.exists()) {
                         setParris1Data({ id: parris1Doc.id, ...parris1Doc.data() } as Parris1);
                    }

                    // Fetch Causante Data
                    const causanteQuery = query(
                        collection(db, 'causante'),
                        where("cedula_causante", "==", selectedPensioner.documento)
                    );
                    const causanteSnapshot = await getDocs(causanteQuery);
                    if (!causanteSnapshot.empty) {
                        const doc = causanteSnapshot.docs[0];
                        setCausanteData({ id: doc.id, ...doc.data() } as Causante);
                    }


                } catch (e) {
                    console.error(e);
                    setError('Ocurrió un error al buscar los datos del pensionado.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAllData();
        } else {
            setPayments([]);
            setLegalProcesses([]);
            setParris1Data(null);
            setHistoricalPayment(null);
            setCausanteData(null);
            setIsLoading(false);
        }
    }, [selectedPensioner]);

    const sentencePayments = React.useMemo((): SentencePayment[] => {
        if (!payments.length) return [];
        const foundPayments: SentencePayment[] = [];
        payments.forEach(payment => {
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
    }, [payments]);

    if (isLoading) {
         return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-bold">Cargando Hoja de Vida...</h2>
                <p className="text-muted-foreground max-w-md">
                    Estamos consolidando toda la información del pensionado seleccionado.
                </p>
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

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <UserSquare className="h-6 w-6" />
                        Hoja de Vida del Pensionado
                    </CardTitle>
                    <CardDescription>Resumen de la información de {parseEmployeeName(selectedPensioner.empleado)}.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoField icon={<Hash />} label="Documento" value={selectedPensioner.documento} />
                    <InfoField icon={<Landmark />} label="Dependencia" value={parseDepartmentName(selectedPensioner.dependencia1)} />
                    <InfoField icon={<Tag />} label="Centro de Costo" value={selectedPensioner.centroCosto} />
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <BookKey className="h-5 w-5" /> Datos de Pensión COLPENSIONES
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {parris1Data ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <InfoField icon={<Calendar />} label="Fecha Adquisición" value={formatFirebaseTimestamp(parris1Data.fe_adquiere)} />
                                    <InfoField icon={<Calendar />} label="Fecha Causación" value={formatFirebaseTimestamp(parris1Data.fe_causa)} />
                                    <InfoField icon={<Calendar />} label="Fecha Ingreso" value={formatFirebaseTimestamp(parris1Data.fe_ingreso)} />
                                    <InfoField icon={<Calendar />} label="Fecha Nacimiento" value={formatFirebaseTimestamp(parris1Data.fe_nacido)} />
                                    <InfoField icon={<Calendar />} label="Fecha Vinculación" value={formatFirebaseTimestamp(parris1Data.fe_vinculado)} />
                                    <InfoField icon={<History />} label="Semanas" value={parris1Data.semanas} />
                                    <InfoField icon={<FileText />} label="Resolución" value={`${parris1Data.res_nro} (${parris1Data.res_ano})`} />
                                    <InfoField icon={<Banknote />} label="Mesada" value={formatCurrency(parris1Data.mesada)} />
                                    <InfoField icon={<Building />} label="Ciudad ISS" value={parris1Data.ciudad_iss} />
                                    <InfoField icon={<MapPin />} label="Dirección ISS" value={parris1Data.dir_iss} />
                                    <InfoField icon={<Phone />} label="Teléfono ISS" value={parris1Data.telefono_iss} />
                                    <InfoField icon={<Users />} label="Régimen" value={parris1Data.regimen} />
                                    <InfoField icon={<Sigma />} label="Riesgo" value={parris1Data.riesgo} />
                                    <InfoField icon={<TrendingUp />} label="Seguro" value={parris1Data.seguro} />
                                    <InfoField icon={<StickyNote />} label="Tranci" value={parris1Data.tranci ? 'Sí' : 'No'} />
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">
                                    No se encontraron datos de pensión en COLPENSIONES para este usuario.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ChevronsRight className="h-5 w-5" /> Historial del Causante
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {causanteData && causanteData.records.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Periodo</TableHead>
                                            <TableHead>Tipo Aumento</TableHead>
                                            <TableHead className="text-right">Valor Empresa</TableHead>
                                            <TableHead className="text-right">Valor ISS</TableHead>
                                            <TableHead>Observación</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {causanteData.records.map((record, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{`${formatFirebaseTimestamp(record.fecha_desde, 'dd/MM/yy')} - ${formatFirebaseTimestamp(record.fecha_hasta, 'dd/MM/yy')}`}</TableCell>
                                                <TableCell>{record.tipo_aum}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(record.valor_empresa || 0)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(record.valor_iss || 0)}</TableCell>
                                                <TableCell>{record.observacion || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">
                                    No se encontró información del causante.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Gavel className="h-5 w-5" /> Procesos Legales Asociados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {legalProcesses.length > 0 ? (
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

                    {sentencePayments.length > 0 && (
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
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <History className="h-5 w-5" /> Historial de Pagos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             {payments.length > 0 ? (
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
                </>
            )}
        </div>
    );
}
