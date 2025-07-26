import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search } from 'lucide-react';

export default function BusquedasPage() {
    return (
        <div className="p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Search className="h-6 w-6" />
                        Búsquedas
                    </CardTitle>
                     <CardDescription>
                        Esta sección está en construcción.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Próximamente podrá realizar búsquedas avanzadas aquí.</p>
                </CardContent>
            </Card>
        </div>
    );
}
