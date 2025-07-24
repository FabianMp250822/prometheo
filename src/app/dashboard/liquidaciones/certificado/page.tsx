'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ribbon, Loader2, UserX, Printer } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PagosHistoricoRecord, CausanteRecord } from '@/lib/data';
import { formatCurrency, parsePeriodoPago, formatFirebaseTimestamp, parseEmployeeName } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';

interface CertificateData {
    year: number;
    mesadaPrimerPago: number;
    mesadaUltimoPago: number;
    variacionCOP: number;
    variacionPorcentaje: number;
}

export default function CertificadoPage() {
    const { selectedPensioner } = usePensioner();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [historicalPayments, setHistoricalPayments] = useState<PagosHistoricoRecord[]>([]);
    const [causanteRecords, setCausanteRecords] = useState<CausanteRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedPensioner) {
            setPayments([]);
            setHistoricalPayments([]);
            setCausanteRecords([]);
            return;
        }

        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                // Fetch recent payments
                const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
                const querySnapshot = await getDocs(paymentsQuery);
                const paymentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment))
                    .filter((payment, index, self) => index === self.findIndex(p => p.periodoPago === payment.periodoPago));
                setPayments(paymentsData);
                
                // Fetch historical payments
                const historicalDocRef = doc(db, 'pagosHistorico', selectedPensioner.documento);
                const historicalDocSnap = await getDoc(historicalDocRef);
                setHistoricalPayments(historicalDocSnap.exists() && Array.isArray(historicalDocSnap.data().records) ? historicalDocSnap.data().records : []);
                
                // Fetch causante records
                const causanteDocRef = doc(db, 'causante', selectedPensioner.documento);
                const causanteSnap = await getDoc(causanteDocRef);
                setCausanteRecords(causanteSnap.exists() && Array.isArray(causanteSnap.data().records) ? causanteSnap.data().records : []);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [selectedPensioner]);
    
    const tableData = useMemo((): CertificateData[] => {
        if (!selectedPensioner) return [];
        const startYear = 2003;
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);

        const data: CertificateData[] = [];

        years.forEach(year => {
            const paymentsInYear = payments.filter(p => {
                const paymentDate = parsePeriodoPago(p.periodoPago)?.startDate;
                return paymentDate?.getFullYear() === year;
            }).sort((a,b) => (parsePeriodoPago(a.periodoPago)?.startDate?.getTime() || 0) - (parsePeriodoPago(b.periodoPago)?.startDate?.getTime() || 0));

            let mesadaPrimerPago = 0;
            let mesadaUltimoPago = 0;

            if (paymentsInYear.length > 0) {
                const firstPaymentWithMesada = paymentsInYear.find(p => p.detalles.some(d => (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD') && d.ingresos > 0));
                mesadaPrimerPago = firstPaymentWithMesada?.detalles.find(d => (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD') && d.ingresos > 0)?.ingresos || 0;
                
                const lastPaymentWithMesada = [...paymentsInYear].reverse().find(p => p.detalles.some(d => (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD') && d.ingresos > 0));
                mesadaUltimoPago = lastPaymentWithMesada?.detalles.find(d => (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD') && d.ingresos > 0)?.ingresos || 0;
            }
            
            // Fallback to historical data if no recent payments for the year
            if (mesadaPrimerPago === 0 || mesadaUltimoPago === 0) {
                const historicalRecord = historicalPayments.find(rec => rec.ANO_RET === year && rec.VALOR_ACT);
                 if (historicalRecord) {
                    const valorAct = parseFloat(historicalRecord.VALOR_ACT!.replace(',', '.'));
                    if (mesadaPrimerPago === 0) mesadaPrimerPago = !isNaN(valorAct) ? valorAct : 0;
                    if (mesadaUltimoPago === 0) mesadaUltimoPago = !isNaN(valorAct) ? valorAct : 0;
                 }
            }
            
            data.push({ year, mesadaPrimerPago, mesadaUltimoPago, variacionCOP: 0, variacionPorcentaje: 0 });
        });

        // Calculate variations based on the last payment of the year
        for (let i = 1; i < data.length; i++) {
            const prevMesadaUltimoPago = data[i - 1].mesadaUltimoPago;
            if (prevMesadaUltimoPago > 0) {
                data[i].variacionCOP = data[i].mesadaUltimoPago - prevMesadaUltimoPago;
                data[i].variacionPorcentaje = (data[i].variacionCOP / prevMesadaUltimoPago) * 100;
            }
        }

        return data;
    }, [payments, historicalPayments, selectedPensioner]);
    
    const { recognitionDate, sharingDate } = useMemo(() => {
        if (causanteRecords.length === 0) return { recognitionDate: 'N/A', sharingDate: 'N/A' };
        
        const sortedRecords = [...causanteRecords]
            .filter(r => r.fecha_desde)
            .sort((a,b) => formatFirebaseTimestamp(a.fecha_desde!, 't') - formatFirebaseTimestamp(b.fecha_desde!, 't'));

        const recognitionDateStr = sortedRecords.length > 0 ? formatFirebaseTimestamp(sortedRecords[0].fecha_desde, 'MMMM \'de\' yyyy') : 'N/A';

        const sharingRecord = sortedRecords.find(r => r.tipo_aum === 'ISS');
        const sharingDateStr = sharingRecord ? formatFirebaseTimestamp(sharingRecord.fecha_desde, 'd \'de\' MMMM \'de\' yyyy') : 'N/A';

        return { recognitionDate: recognitionDateStr, sharingDate: sharingDateStr };
    }, [causanteRecords]);


    const handlePrint = useReactToPrint({
        content: () => certificateRef.current,
        documentTitle: `Certificado-${selectedPensioner?.documento || 'pensionado'}`,
        pageStyle: `@page { size: A4; margin: 2cm; } body { -webkit-print-color-adjust: exact; }`
    });

    if (isLoading) {
      return <div className="p-8 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!selectedPensioner) {
      return (
        <div className="p-8 flex flex-col items-center justify-center text-center">
            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay un pensionado seleccionado</h3>
            <p className="text-muted-foreground">Por favor, use el buscador global para seleccionar un pensionado.</p>
        </div>
      );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <Ribbon className="h-6 w-6" />
                            Certificado de Ingresos Pensionales
                        </CardTitle>
                        <CardDescription>Genera y previsualiza el certificado para {parseEmployeeName(selectedPensioner.empleado)}.</CardDescription>
                    </div>
                     <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Certificado
                    </Button>
                </CardHeader>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div ref={certificateRef} className="prose prose-sm max-w-none">
                        <h2 className="text-center font-bold uppercase text-lg">Certificado de Ingresos y/o Mesada Pensional</h2>
                        <p className="text-justify leading-relaxed">
                            Se certifica que, de acuerdo con la información y documentación suministrada y verificada, la persona <strong>{parseEmployeeName(selectedPensioner.empleado)}</strong>, 
                            identificada con cédula de ciudadanía N° <strong>{selectedPensioner.documento}</strong>, se encuentra reconocida como pensionado(a) de ELECTRICARIBE S.A. E.S.P. 
                            (sustituida procesalmente por FIDUPREVISORA S.A., como administradora y vocera del Patrimonio Autónomo Fondo Nacional del Pasivo Pensional y Prestacional de la Electrificadora del Caribe S.A. E.S.P. - FONECA). 
                            Su pensión fue reconocida en <strong>{recognitionDate}</strong>. A continuación, se detallan los valores anuales de su mesada pensional registrados desde 2003:
                        </p>
                        
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Año</TableHead>
                                    <TableHead>Mesada (Primer pago del año)</TableHead>
                                    <TableHead>Mesada (Último pago del año)</TableHead>
                                    <TableHead>Variación vs Año Anterior (COP)</TableHead>
                                    <TableHead>Variación vs Año Anterior (%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row) => (
                                    <TableRow key={row.year}>
                                        <TableCell className="font-medium">{row.year}</TableCell>
                                        <TableCell>{formatCurrency(row.mesadaPrimerPago)}</TableCell>
                                        <TableCell>{formatCurrency(row.mesadaUltimoPago)}</TableCell>
                                        <TableCell>{formatCurrency(row.variacionCOP)}</TableCell>
                                        <TableCell>{row.variacionPorcentaje > 0 ? `${row.variacionPorcentaje.toFixed(2)}%` : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        
                        <p className="text-justify leading-relaxed mt-4">
                            Que, de conformidad con las normas vigentes y Convención Colectiva de Trabajo, la pensión de jubilación se compartió 
                            con el Instituto de Seguros Sociales (hoy Colpensiones) a partir del <strong>{sharingDate}</strong>.
                        </p>
                        <p className="mt-4">
                            Este certificado se expide a solicitud de la parte interesada para los fines legales y administrativos a los que haya lugar.
                        </p>

                         <div className="pt-24">
                            <hr className="border-t border-gray-400 w-1/3" />
                            <p className="text-sm">Firma Autorizada</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
