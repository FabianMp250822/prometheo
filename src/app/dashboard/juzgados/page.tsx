'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, Loader2, ServerCrash } from 'lucide-react';
import { getDepartments } from '@/services/provired-api-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Department {
  IdDep: string;
  departamento: string;
}

export default function JuzgadosPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getDepartments();
        if (response.success && Array.isArray(response.data)) {
          setDepartments(response.data);
        } else {
          throw new Error(response.message || 'La respuesta de la API no fue exitosa.');
        }
      } catch (err: any) {
        setError(err.message || 'Ocurrió un error al conectar con la API.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Consulta de Juzgados
          </CardTitle>
          <CardDescription>
            Información de departamentos, municipios, corporaciones y despachos desde la API de Provired.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Departamentos</CardTitle>
            <CardDescription>Lista de departamentos obtenidos desde la API.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading && (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="ml-4">Conectando con la API de Provired...</p>
                </div>
            )}
            {error && (
                <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Error de Conexión</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {!isLoading && !error && (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nombre del Departamento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departments.map(dep => (
                            <TableRow key={dep.IdDep}>
                                <TableCell>{dep.IdDep}</TableCell>
                                <TableCell className="font-medium">{dep.departamento}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
