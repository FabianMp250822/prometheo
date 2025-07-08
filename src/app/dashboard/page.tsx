import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Gavel, TrendingUp, Banknote } from "lucide-react";

export default async function DashboardPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-headline text-foreground mb-2">
          Bienvenido a Prometeo
        </h1>
        <p className="text-muted-foreground">
          Su asistente inteligente para el análisis y gestión de pagos judiciales.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-accent/20 p-3 rounded-full">
                <Gavel className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">Análisis de Sentencias</CardTitle>
                <CardDescription>Visualice, filtre y gestione todas las sentencias.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/sentencias">Ir a Sentencias</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">Liquidaciones</CardTitle>
                <CardDescription>Genere y consulte liquidaciones de pagos.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/liquidaciones">Ir a Liquidaciones</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
               <div className="bg-emerald-500/10 p-3 rounded-full">
                <Banknote className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">Gestión de Pagos</CardTitle>
                <CardDescription>Realice seguimiento al historial de pagos.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
             <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/pagos">Ir a Pagos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
