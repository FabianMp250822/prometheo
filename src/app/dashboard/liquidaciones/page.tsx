import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function LiquidacionesPage() {
    return (
        <div className="p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <TrendingUp className="h-6 w-6" />
                        Liquidaciones
                    </CardTitle>
                     <CardDescription>
                        Seleccione una opción del submenú para comenzar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Esta es la sección principal de liquidaciones. Puede navegar a las sub-secciones como Poder Adquisitivo, Liquidador o Certificado desde el menú lateral.</p>
                </CardContent>
            </Card>
        </div>
    );
}
