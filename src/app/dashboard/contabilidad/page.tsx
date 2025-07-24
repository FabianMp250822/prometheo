import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

export default function ContabilidadPage() {
    return (
        <div className="p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Receipt className="h-6 w-6" />
                        Contabilidad
                    </CardTitle>
                     <CardDescription>
                        Seleccione una opción del submenú para comenzar a gestionar la contabilidad.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Esta es la sección principal de contabilidad. Puede navegar a las sub-secciones desde el menú lateral.</p>
                </CardContent>
            </Card>
        </div>
    );
}
