import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp } from 'lucide-react';

export default function HistorialCargasPage() {
  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <FileUp className="h-6 w-6" />
            Historial de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta sección está en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}
