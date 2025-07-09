'use client';

import { useState, useEffect } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { getPensionerAdditionalDetails, type LastPaymentData } from '@/app/actions/get-pensioner-additional-details';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserSquare, ServerCrash, History, Landmark, Hash, Tag } from 'lucide-react';
import { formatCurrency, formatPeriodoToMonthYear, parseEmployeeName, parseDepartmentName } from '@/lib/helpers';
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
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    )
}

export default function PensionadoPage() {
    const { selectedPensioner } = usePensioner();
    const [details, setDetails] = useState<LastPaymentData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPensioner?.id) {
            setIsLoading(true);
            setError(null);
            setDetails(null);
            getPensionerAdditionalDetails(selectedPensioner.id)
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
    
    const { lastPayment } = details || {};

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

            {isLoading && (
                <DetailCardSkeleton />
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
                    {lastPayment ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <History className="h-5 w-5" /> Último Pago Recibido
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <p><strong>Periodo:</strong> {formatPeriodoToMonthYear(lastPayment.periodoPago)}</p>
                                    <p><strong>Fecha Liquidación:</strong> {lastPayment.fechaLiquidacion || 'N/A'}</p>
                                    <p><strong>Total:</strong> <span className="font-bold text-primary">{formatCurrency(lastPayment.detalles.find((d: any) => d.nombre.includes('Totales'))?.ingresos || 0)}</span></p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                         <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <History className="h-5 w-5" /> Último Pago Recibido
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">No se encontraron registros de pagos para este pensionado.</p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
