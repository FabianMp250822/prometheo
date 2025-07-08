"use client";

import React, { useState, useTransition } from 'react';
import { UserPayment } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generatePaymentSuggestions } from '@/ai/flows/generate-payment-suggestions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentSuggestionsProps {
    user: UserPayment;
}

export function PaymentSuggestions({ user }: PaymentSuggestionsProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [suggestion, setSuggestion] = useState<{ schedule: string; rationale: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateSuggestion = () => {
        startTransition(async () => {
            setError(null);
            setSuggestion(null);
            try {
                const legalConceptAnalysis = `Usuario con estatus ${user.status} y un monto total de ${user.totalAmount}. Conceptos: ${Object.keys(user.concepts).join(', ')}.`;
                const userFinancialHistory = `Historial de pagos: ${user.paymentHistory.length > 0 ? user.paymentHistory.map(p => `Periodo ${p.period}: ${p.amount}`).join('; ') : 'Sin pagos previos'}.`;
                const paymentTerms = `La deuda total es de ${user.totalAmount}. Fiscal year: ${user.fiscalYear}.`;
                
                const result = await generatePaymentSuggestions({
                    legalConceptAnalysis,
                    userFinancialHistory,
                    paymentTerms,
                });

                setSuggestion({ schedule: result.paymentScheduleSuggestion, rationale: result.rationale });
            } catch (e) {
                console.error(e);
                setError('Error al generar la sugerencia de pago.');
                toast({
                    variant: 'destructive',
                    title: 'Error de IA',
                    description: 'No se pudo generar la sugerencia de pago.',
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <Sparkles className="text-accent" />
                    Sugerencia de Pago con IA
                </CardTitle>
                <CardDescription>
                    Genere un cronograma de pago óptimo para este usuario basado en su historial.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleGenerateSuggestion} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generar Sugerencia
                </Button>
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {suggestion && (
                    <Alert variant="default" className="border-accent">
                        <Sparkles className="h-4 w-4 text-accent" />
                        <AlertTitle className="font-headline text-lg">Cronograma de Pago Sugerido</AlertTitle>
                        <AlertDescription className="prose prose-sm max-w-none">
                            <p className="font-semibold">Cronograma:</p>
                            <p>{suggestion.schedule}</p>
                            <p className="font-semibold mt-2">Justificación:</p>
                            <p>{suggestion.rationale}</p>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
