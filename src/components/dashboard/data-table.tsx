"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPayment, dependencies, fiscalYears, legalConcepts, statuses } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserDetailSheet } from './user-detail-sheet';
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

type SortConfig = {
  key: keyof UserPayment | `user.${'name' | 'document'}` | `paymentPeriod.${'start' | 'end'}`;
  direction: 'ascending' | 'descending';
};

const getStatusClass = (status: UserPayment['status']) => {
  switch (status) {
    case 'Pagado': return 'bg-emerald-500/80 border-emerald-500 text-white';
    case 'Analizado': return 'bg-blue-500/80 border-blue-500 text-white';
    case 'Pendiente': return 'bg-amber-500/80 border-amber-500 text-white';
    default: return 'bg-gray-500/80 border-gray-500 text-white';
  }
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};
  
const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

export function PaymentDataTable({ data }: { data: UserPayment[] }) {
  const [filters, setFilters] = useState({
    search: '',
    dependency: 'all',
    concept: 'all',
    year: 'all',
    status: 'all',
    period: undefined as DateRange | undefined,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'paymentPeriod.end', direction: 'descending' });
  const [selectedUser, setSelectedUser] = useState<UserPayment | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filteredData = useMemo(() => {
    return data.filter(item => {
        const searchLower = filters.search.toLowerCase();
        return (
          (item.user.name.toLowerCase().includes(searchLower) || item.user.document.toLowerCase().includes(searchLower)) &&
          (filters.dependency === 'all' || item.department === filters.dependency) &&
          (filters.concept === 'all' || Object.keys(item.concepts).includes(filters.concept)) &&
          (filters.year === 'all' || item.fiscalYear === parseInt(filters.year)) &&
          (filters.status === 'all' || item.status === filters.status) &&
          (!filters.period?.from || new Date(item.paymentPeriod.end) >= filters.period.from) &&
          (!filters.period?.to || new Date(item.paymentPeriod.end) <= filters.period.to)
        );
      });
  }, [data, filters]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination]);

  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const totalPages = Math.ceil(sortedData.length / pagination.pageSize);

  const SortableHeader = ({ sortKey, children }: { sortKey: SortConfig['key']; children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(sortKey)} className="px-2 py-1 h-auto">
        {children}
        {sortConfig?.key === sortKey && (
          sortConfig.direction === 'ascending' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
        )}
      </Button>
    </TableHead>
  );

  return (
    <div className="space-y-4 mt-8">
      <div className="p-4 bg-card rounded-lg border">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Input
            placeholder="Buscar por nombre/documento..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="lg:col-span-2"
          />
          <Select value={filters.dependency} onValueChange={v => setFilters(f => ({ ...f, dependency: v }))}>
            <SelectTrigger><SelectValue placeholder="Dependencia" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todas las Dependencias</SelectItem>
                {dependencies.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.year} onValueChange={v => setFilters(f => ({ ...f, year: v }))}>
            <SelectTrigger><SelectValue placeholder="Año Fiscal" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Años</SelectItem>
                {fiscalYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !filters.period && "text-muted-foreground")}>
                    {filters.period?.from ? (
                        filters.period.to ? (
                        <>
                            {format(filters.period.from, "LLL dd, y")} - {format(filters.period.to, "LLL dd, y")}
                        </>
                        ) : (
                        format(filters.period.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Seleccionar periodo</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={filters.period} onSelect={p => setFilters(f => ({ ...f, period: p }))} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sortKey="user.name">Usuario</SortableHeader>
              <SortableHeader sortKey="department">Dependencia</SortableHeader>
              <TableHead>Conceptos</TableHead>
              <SortableHeader sortKey="paymentPeriod.end">Periodo de Pago</SortableHeader>
              <SortableHeader sortKey="status">Estado</SortableHeader>
              <SortableHeader sortKey="totalAmount">Monto Total</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map(item => (
              <TableRow
                key={item.id}
                onClick={() => setSelectedUser(item)}
                className={cn("cursor-pointer", item.fiscalYear === new Date().getFullYear() ? 'bg-amber-100/50 hover:bg-amber-100' : '')}
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
                <TableCell>{format(new Date(item.paymentPeriod.start), 'dd/MM/yy')} - {format(new Date(item.paymentPeriod.end), 'dd/MM/yy')}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', getStatusClass(item.status))}>{item.status}</Badge>
                </TableCell>
                <TableCell className="font-bold">{formatCurrency(item.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
      <UserDetailSheet user={selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} />
    </div>
  );
}
