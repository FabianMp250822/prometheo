
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Scale, FileText, Percent, ArrowRight, BarChart3, FlaskConical } from 'lucide-react';
import Link from 'next/link';

const liquidationTypes = [
    {
        title: 'Presedente Escolástica CSD 39783 (2013)',
        description: 'Calcula liquidaciones basadas en el precedente de la sentencia CSD 39783 del año 2013.',
        icon: <Scale className="h-8 w-8 text-primary" />,
        href: '/dashboard/liquidaciones/precedente-escolastica'
    },
    {
        title: 'Presedente 4555 SERP (2020)',
        description: 'Aplica la liquidación conforme al precedente de la sentencia 4555 de la SERP del año 2020.',
        icon: <Scale className="h-8 w-8 text-primary" />,
        href: '/dashboard/liquidaciones/precedente-serp'
    },
    {
        title: 'Unidad Prestacional 4-100 (IPCs)',
        description: 'Realiza cálculos de unidad prestacional basados en la Ley 4 y los Índices de Precios al Consumidor.',
        icon: <FileText className="h-8 w-8 text-primary" />,
        href: '/dashboard/liquidaciones/unidad-prestacional-ipc'
    },
    {
        title: 'Unidad Prestacional 4-71 (SMLMV)',
        description: 'Ejecuta liquidaciones de unidad prestacional según la Ley 4 y el Salario Mínimo Legal Mensual Vigente.',
        icon: <FileText className="h-8 w-8 text-primary" />,
        href: '/dashboard/liquidaciones/unidad-prestacional-smlmv'
    },
    {
        title: 'Solo Reajuste IPCs Ley 100',
        description: 'Calcula únicamente el reajuste pensional aplicando la variación del IPC conforme a la Ley 100.',
        icon: <Percent className="h-8 w-8 text-primary" />,
        href: '/dashboard/liquidaciones/reajuste-ipc'
    },
    {
        title: 'Evolución de la Mesada',
        description: 'Visualiza la evolución y el comportamiento de la mesada pensional a lo largo del tiempo.',
        icon: <BarChart3 className="h-8 w-8 text-primary" />,
        href: '/dashboard/liquidaciones/evolucion-mesada'
    },
    {
        title: 'Simulador de Liquidación',
        description: 'Crea escenarios y proyecciones de liquidación con diferentes variables.',
        icon: <FlaskConical className="h-8 w-8 text-primary" />,
        href: '/dashboard/liquidaciones/simulador'
    },
];

export default function LiquidadorPage() {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Calculator className="h-6 w-6" />
                        Liquidador
                    </CardTitle>
                    <CardDescription>
                        Seleccione el tipo de liquidación que desea realizar. Cada opción lo guiará a través del proceso específico.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liquidationTypes.map((liq) => (
                    <Card key={liq.title} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader className="flex-row items-center gap-4">
                            {liq.icon}
                            <CardTitle className="text-lg leading-tight">{liq.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between">
                            <p className="text-sm text-muted-foreground mb-4">{liq.description}</p>
                            <Button asChild className="w-full mt-auto">
                                <Link href={liq.href}>
                                    Iniciar Liquidación <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
