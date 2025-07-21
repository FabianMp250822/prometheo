'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Eye, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const ExternalDemandsTable = ({ 
    procesos, 
    onViewDetails
}: { 
    procesos: any[], 
    onViewDetails: (process: any) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredProcesos = useMemo(() => {
        let results = procesos;
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            results = results.filter((p) =>
                Object.values(p).some(val => 
                    String(val).toLowerCase().includes(lowercasedFilter)
                )
            );
        }
        return results;
    }, [procesos, searchTerm]);
    

    return (
    <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Buscar en los procesos cargados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>NO. RADICADO</TableHead>
                        <TableHead>DEMANDANTE</TableHead>
                        <TableHead>DEMANDADO</TableHead>
                        <TableHead>ESTADO</TableHead>
                        <TableHead>DESPACHO</TableHead>
                        <TableHead className="text-right">ACCIONES</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProcesos.map((proceso) => (
                      <TableRow key={proceso.id} className="hover:bg-muted/50">
                        <TableCell>{proceso.num_radicado_ult || proceso.num_radicado_ini}</TableCell>
                        <TableCell>{proceso.nombres_demandante}</TableCell>
                        <TableCell>{proceso.nombres_demandado}</TableCell>
                        <TableCell>{proceso.estado}</TableCell>
                        <TableCell>{proceso.despacho}</TableCell>
                        <TableCell className="text-right">
                           <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => onViewDetails(proceso)}
                           >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProcesos.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                No se encontraron procesos.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </div>
  );
};
