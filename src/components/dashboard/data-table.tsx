"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPayment } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getLatestPeriod, getLatestYear } from '@/lib/helpers';

type SortConfig = {
  key: keyof UserPayment | `user.${'name' | 'document'}` | 'paymentPeriod.end' | 'fiscalYear';
  direction: 'ascending' | 'descending';
};

interface PaymentDataTableProps {
    data: UserPayment[];
    onRowClick: (user: UserPayment) => void;
    sortDescriptor: SortConfig;
    onSortChange: (key: SortConfig['key']) => void;
}

const getStatusClass = (analyzedAt: string | null) => {
    return analyzedAt
    ? 'bg-blue-500/80 border-blue-500 text-white'
    : 'bg-amber-500/80 border-amber-500 text-white';
};
  
const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

export function PaymentDataTable({ data, onRowClick, sortDescriptor, onSortChange }: PaymentDataTableProps) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return data.slice(start, start + pagination.pageSize);
  }, [data, pagination]);
  
  const totalPages = Math.ceil(data.length / pagination.pageSize);

  const SortableHeader = ({ sortKey, children }: { sortKey: SortConfig['key']; children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => onSortChange(sortKey)} className="px-2 py-1 h-auto">
        {children}
        {sortDescriptor?.key === sortKey && (
          sortDescriptor.direction === 'ascending' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
        )}
      </Button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sortKey="user.name">Usuario</SortableHeader>
              <SortableHeader sortKey="department">Dependencia</SortableHeader>
              <TableHead>Conceptos</TableHead>
              <SortableHeader sortKey="paymentPeriod.end">Último Periodo</SortableHeader>
              <SortableHeader sortKey="fiscalYear">Año Fiscal</SortableHeader>
              <TableHead>Estado</TableHead>
              <SortableHeader sortKey="totalAmount">Monto Total</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map(item => (
              <TableRow
                key={item.id}
                onClick={() => onRowClick(item)}
                className={cn("cursor-pointer", currentYear && getLatestYear(item.sentences) === currentYear ? 'bg-amber-100/50 hover:bg-amber-100' : '')}
              >
                <TableCell>
                  <div className="font-medium">{item.user.name}</div>
                  <div className="text-xs text-muted-foreground">{item.user.document}</div>
                </TableCell>
                <TableCell>{item.department}</TableCell>
                <TableCell>
                    <div className="flex flex-col gap-1">
                        {Object.entries(item.concepts).map(([key, value]) => (
                            <div key={key} className="text-xs">
                                <span className="font-semibold">{key}: </span>
                                <span className="text-muted-foreground">{formatCurrency(value || 0)}</span>
                            </div>
                        ))}
                    </div>
                </TableCell>
                <TableCell>{getLatestPeriod(item.sentences)}</TableCell>
                <TableCell>{getLatestYear(item.sentences)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', getStatusClass(item.analyzedAt))}>
                    {item.analyzedAt ? 'Analizado' : 'Pendiente'}
                    </Badge>
                </TableCell>
                <TableCell className="font-bold">{formatCurrency(item.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-4 md:hidden">
          {paginatedData.map(item => (
              <Card key={item.id} onClick={() => onRowClick(item)} className={cn("cursor-pointer", currentYear && getLatestYear(item.sentences) === currentYear ? 'bg-amber-100/50' : '')}>
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <div>
                              <CardTitle className="text-lg">{item.user.name}</CardTitle>
                              <CardDescription>{item.user.document}</CardDescription>
                          </div>
                          <Badge variant="outline" className={cn('text-xs', getStatusClass(item.analyzedAt))}>
                            {item.analyzedAt ? 'Analizado' : 'Pendiente'}
                          </Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Dependencia:</span>
                          <span className="font-medium">{item.department}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Periodo:</span>
                          <span className="font-medium">{getLatestPeriod(item.sentences)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Monto Total:</span>
                          <span className="font-bold text-primary">{formatCurrency(item.totalAmount)}</span>
                      </div>
                        <div className="pt-2">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1">Conceptos</h4>
                          <div className="flex flex-col gap-1">
                              {Object.entries(item.concepts).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-xs">
                                      <span>{key}: </span>
                                      <span className="font-medium">{formatCurrency(value || 0)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>

       <div className="flex items-center justify-between p-2">
        <div className="text-sm text-muted-foreground">
            Página {pagination.pageIndex + 1} de {totalPages}
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}>
                <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPagination(p => ({ ...p, pageIndex: totalPages - 1 }))} disabled={pagination.pageIndex >= totalPages - 1}>
                <ChevronsRight className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
}
