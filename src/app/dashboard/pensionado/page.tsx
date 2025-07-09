'use client';

import { useState, useEffect } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { getPensionerAdditionalDetails, type PensionerAdditionalData } from '@/app/actions/get-pensioner-additional-details';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserSquare, ServerCrash, FileText, Landmark, History, Calendar, Hash, Tag, Scale } from 'lucide-react';
import { formatCurrency, formatFirebaseTimestamp, parseEmployeeName, parsePaymentDetailName, formatPeriodoToMonthYear, parseDepartmentName } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

function DetailCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-20 w-full" />
            </CardContent>
        </Card>
    )
}

export default function PensionadoPage() {
    const { selectedPensioner } = usePensioner();
    const [details, setDetails] = useState<PensionerAdditionalData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPensioner?.documento && selectedPensioner.id) {
            setIsLoading(true);
            setError(null);
            setDetails(null);
            getPensionerAdditionalDetails(selectedPensioner.documento, selectedPensioner.id)
                .then(data => {
                    if (data) {
                        setDetails(data);
                    } else {
                        setError('No se pudieron cargar los detalles adicionales del pensionado.');
                    }
                })
                .catch((e) => {
                    console.error(e);
                    setError('Ocurrió un error al buscar los datos adicionales del pensionado.');
                })
                .finally(() => setIsLoading(false));
        } else {
            setDetails(null);
            setIsLoading(false);
        }
    }, [selectedPensioner]);

    if (!selectedPensioner) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <UserSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Seleccione un Pensionado</h2>
                <p className="text-muted-foreground max-w-md">
                    Utilice la barra de búsqueda en el encabezado para encontrar y seleccionar un pensionado. Una vez seleccionado, su hoja de vida completa aparecerá aquí.
                </p>
            </div>
        );
    }
    
    const { lastPayment, procesosCancelados, parris1Data, causanteData } = details || {};

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <UserSquare className="h-6 w-6" />
                        Hoja de Vida del Pensionado
                    </CardTitle>
                    <CardDescription>Resumen completo de la información de {parseEmployeeName(selectedPensioner.empleado)}.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoField icon={<Hash />} label="Documento" value={selectedPensioner.documento} />
                    <InfoField icon={<Landmark />} label="Dependencia" value={parseDepartmentName(selectedPensioner.dependencia1)} />
                    <InfoField icon={<Tag />} label="Centro de Costo" value={selectedPensioner.centroCosto} />
                </CardContent>
            </Card>

            {isLoading && (
                <>
                    <DetailCardSkeleton />
                    <DetailCardSkeleton />
                    <DetailCardSkeleton />
                    <DetailCardSkeleton />
                </>
            )}

            {error && (
                 <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Error al Cargar Detalles Adicionales</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && details && (
                <>
                    {lastPayment && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <History className="h-5 w-5" /> Último Pago Recibido
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <p><strong>Periodo:</strong> {formatPeriodoToMonthYear(lastPayment.periodoPago)}</p>
                                    <p><strong>Fecha:</strong> {formatFirebaseTimestamp(lastPayment.fechaProcesado)}</p>
                                    <p><strong>Total:</strong> <span className="font-bold text-primary">{formatCurrency(lastPayment.detalles.find((d: any) => d.nombre.includes('Totales'))?.ingresos || 0)}</span></p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {procesosCancelados && procesosCancelados.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                   <Scale className="h-5 w-5" /> Procesos Judiciales Cancelados
                                </CardTitle>
                                <CardDescription>Pagos relacionados con sentencias y costas procesales.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Periodo</TableHead>
                                            <TableHead>Conceptos</TableHead>
                                            <TableHead className="text-right">Total Proceso</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {procesosCancelados.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{formatPeriodoToMonthYear(p.periodoPago)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        {p.conceptos.map(c => <span key={c.codigo}>{parsePaymentDetailName(c.nombre)}</span>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(p.conceptos.reduce((acc, cur) => acc + cur.ingresos, 0))}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {parris1Data && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                   <FileText className="h-5 w-5" /> Información Parris1
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <InfoField icon={<Calendar />} label="Fecha de Adquisición" value={formatFirebaseTimestamp(parris1Data.fe_adquiere)} />
                                <InfoField icon={<Calendar />} label="Fecha de Causa" value={formatFirebaseTimestamp(parris1Data.fe_causa)} />
                                <InfoField icon={<Calendar />} label="Fecha de Ingreso" value={formatFirebaseTimestamp(parris1Data.fe_ingreso)} />
                                <InfoField icon={<Calendar />} label="Fecha de Nacimiento" value={formatFirebaseTimestamp(parris1Data.fe_nacido)} />
                                <InfoField icon={<Calendar />} label="Fecha de Vinculación" value={formatFirebaseTimestamp(parris1Data.fe_vinculado)} />
                                <InfoField icon={<Hash />} label="Semanas Cotizadas" value={parris1Data.semanas} />
                                <InfoField icon={<FileText />} label="Resolución" value={`${parris1Data.res_nro} (${parris1Data.res_ano})`} />
                            </CardContent>
                        </Card>
                    )}

                    {causanteData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                   <FileText className="h-5 w-5" /> Información del Causante
                                </CardTitle>
                                <CardDescription>Cédula del causante: {causanteData.cedula_causante}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Beneficiario</TableHead>
                                            <TableHead>Desde</TableHead>
                                            <TableHead>Hasta</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Observación</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {causanteData.records.map((r, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{r.cedula_beneficiario}</TableCell>
                                                <TableCell>{formatFirebaseTimestamp(r.fecha_desde)}</TableCell>
                                                <TableCell>{formatFirebaseTimestamp(r.fecha_hasta)}</TableCell>
                                                <TableCell><Badge variant="outline">{r.tipo_aum}</Badge></TableCell>
                                                <TableCell>{r.observacion || '-'}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(r.valor_empresa + r.valor_iss)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

        </div>
    );
}