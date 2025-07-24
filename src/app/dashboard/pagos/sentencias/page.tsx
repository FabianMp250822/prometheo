import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gavel } from 'lucide-react';

export default function PagoSentenciasPage() {
  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Gavel className="h-6 w-6" />
            Pago de Sentencias
          </CardTitle>
          <CardDescription>
            Gestión y seguimiento de los pagos derivados de sentencias judiciales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta sección está en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}
