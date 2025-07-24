
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserSquare, ServerCrash, History, Landmark, Hash, Tag, Loader2, Banknote, FileText, Gavel, BookKey, Calendar, Building, MapPin, Phone, StickyNote, Sigma, TrendingUp, Users, ChevronsRight, Briefcase, FileDown, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPeriodoToMonthYear, parseEmployeeName, parsePaymentDetailName, formatFirebaseTimestamp, parsePeriodoPago, parseDepartmentName } from '@/lib/helpers';
import type { Payment, Parris1, LegalProcess, Causante, PagosHistoricoRecord, PensionerProfileData, DajusticiaClient, DajusticiaPayment } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, doc, getDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

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
    const [profileData, setProfileData] = useState<PensionerProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAllData = useCallback(async (pensionerId: string, document: string) => {
        setIsLoading(true);
        setError(null);
        setProfileData(null);
        try {
            // 1. Fetch Payments
            const paymentsQuery = query(collection(db, 'pensionados', pensionerId, 'pagos'));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            let payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            payments.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            // 2. Fetch Historical Payment if no recent payments
            let historicalPayment: PagosHistoricoRecord | null = null;
            if (payments.length === 0) {
                const historicalDocRef = doc(db, "pagosHistorico", document);
                const historicalDoc = await getDoc(historicalDocRef);
                if (historicalDoc.exists()) {
                    const data = historicalDoc.data();
                    if (data.records && Array.isArray(data.records) && data.records.length > 0) {
                        const sortedRecords = [...data.records].sort((a, b) => (b.ANO_RET || 0) - (a.ANO_RET || 0));
                        historicalPayment = sortedRecords[0] as PagosHistoricoRecord;
                    }
                }
            }
            
            // 3. Fetch Legal Processes
            const processesQuery = query(collection(db, 'procesos'), where("identidad_clientes", "==", document));
            const processesSnapshot = await getDocs(processesQuery);
            const legalProcesses = processesSnapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            } as LegalProcess));

            // 4. Fetch Parris1 Data
            const parris1DocRef = doc(db, "parris1", document);
            const parris1Doc = await getDoc(parris1DocRef);
            const parris1Data = parris1Doc.exists() ? { id: parris1Doc.id, ...parris1Doc.data() } as Parris1 : null;
            
            // 5. Fetch Causante Data
            const causanteQuery = query(collection(db, "causante"), where("cedula_causante", "==", document));
            const causanteSnapshot = await getDocs(causanteQuery);
            const causanteData = !causanteSnapshot.empty ? { id: causanteSnapshot.docs[0].id, ...causanteSnapshot.docs[0].data() } as Causante : null;
            
            // 6. Fetch DAJUSTICIA Client Data
            const clientQuery = query(collection(db, "nuevosclientes"), where("cedula", "==", document), limit(1));
            const clientSnapshot = await getDocs(clientQuery);
            let dajusticiaClientData: DajusticiaClient | null = null;
            let dajusticiaPayments: DajusticiaPayment[] = [];

            if (!clientSnapshot.empty) {
                const clientDoc = clientSnapshot.docs[0];
                dajusticiaClientData = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;
                
                // 7. Fetch DAJUSTICIA Payments Subcollection
                const clientPaymentsQuery = query(collection(db, "nuevosclientes", clientDoc.id, "pagos"));
                const clientPaymentsSnapshot = await getDocs(clientPaymentsQuery);
                dajusticiaPayments = clientPaymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DajusticiaPayment));
            }


            setProfileData({
                payments,
                legalProcesses,
                parris1Data,
                causanteData,
                historicalPayment,
                dajusticiaClientData,
                dajusticiaPayments
            });

        } catch (e) {
            console.error(e);
            setError('Ocurrió un error al buscar los datos del pensionado.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPensioner?.id) {
            fetchAllData(selectedPensioner.id, selectedPensioner.documento);
        } else {
            setProfileData(null);
            setIsLoading(false);
        }
    }, [selectedPensioner, fetchAllData]);

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

    const { parris1Data, causanteData, legalProcesses, payments, historicalPayment, dajusticiaClientData } = profileData || {};

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
                    {dajusticiaClientData && (
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
                    )}

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
                </>
            )}
        </div>
    );
}
