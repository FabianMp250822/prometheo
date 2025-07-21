'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const ExternalDemandsTable = ({ 
    procesos, 
    onViewDetails,
    searchTerm,
    onSearchTermChange,
    isSearching,
}: { 
    procesos: any[], 
    onViewDetails: (process: any) => void;
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    isSearching: boolean;
}) => {
    
    return (
    <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Buscar por radicado o nombre (mín. 3 caracteres)..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10"
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
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
                    {procesos.map((proceso) => (
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
                    {procesos.length === 0 && !isSearching && (
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
