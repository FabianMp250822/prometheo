import { payments, UserPayment } from '@/lib/data';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { PaymentDataTable } from '@/components/dashboard/data-table';
import { Download, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default async function DashboardPage() {
  // In a real app, you'd fetch this data from an API
  const data: UserPayment[] = payments;

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
       <header className="bg-background border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between container mx-auto">
          <h1 className="text-2xl md:text-3xl font-headline text-foreground">
            Análisis de Pagos Judiciales
          </h1>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2">
                <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Vista
                </Button>
                <Button size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Todo
                </Button>
            </div>
            <div className="sm:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                            <span className="sr-only">Más opciones</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            <span>Exportar Vista</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            <span>Exportar Todo</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 overflow-y-auto">
        <div className="container mx-auto">
          <KpiCards data={data} />
          <PaymentDataTable data={data} />
        </div>
      </main>
    </div>
  );
}
