import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Banknote } from 'lucide-react';

export default function PagosPage() {
    return (
        <div className="p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Banknote className="h-6 w-6" />
                        Pagos y Sentencias
                    </CardTitle>
                     <CardDescription>
                        Seleccione una opción del submenú para comenzar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Esta es la sección principal de pagos. Puede navegar a las sub-secciones como Consulta de Pagos o Pago de Sentencias desde el menú lateral.</p>
                </CardContent>
            </Card>
        </div>
    );
}
