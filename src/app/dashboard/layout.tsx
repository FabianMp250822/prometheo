'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { auth } from '@/lib/firebase';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter, SidebarSeparator, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { Scale, LayoutGrid, TrendingUp, Banknote, BarChart2, Settings, LogOut, User as UserIcon, Gavel, Database, FileUp, FileClock, BookUser, UserSquare, CalendarClock, ListTodo, CalendarPlus, CalendarSearch, Percent, Calculator, Ribbon, Wallet, Receipt, History, PlusCircle, UserCog, BarChartHorizontal, FileText, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { GlobalHeader } from '@/components/dashboard/global-header';
import { usePensioner } from '@/context/pensioner-provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth();
  const { selectedPensioner } = usePensioner();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión exitosamente.' });
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cerrar la sesión.',
      });
    }
  };

  if (loading || !user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Scale className="text-accent h-8 w-8" />
            <h1 className="text-2xl font-headline text-white">Prometeo</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutGrid />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {selectedPensioner && (
               <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Hoja de Vida">
                  <Link href="/dashboard/pensionado">
                    <UserSquare />
                    <span className="group-data-[collapsible=icon]:hidden">Hoja de Vida</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
             <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Análisis de Sentencias" >
                  <Link href="/dashboard/sentencias">
                    <Gavel />
                    <span className="group-data-[collapsible=icon]:hidden">Análisis de Sentencias</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                       <SidebarMenuButton tooltip="Agenda" className="w-full justify-between">
                         <div className="flex items-center gap-2">
                          <CalendarClock />
                          <span className="group-data-[collapsible=icon]:hidden">Agenda</span>
                        </div>
                        <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden group-data-[state=open]:rotate-180 transition-transform" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <SidebarMenuSub>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/agenda/por-fecha">
                                <CalendarSearch />
                                <span>Por Fecha</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                           <SidebarMenuSubItem>
                             <Collapsible>
                                <CollapsibleTrigger asChild>
                                   <SidebarMenuSubButton className="w-full justify-between">
                                      <div className="flex items-center gap-2">
                                        <ListTodo />
                                        <span>Tareas</span>
                                      </div>
                                      <ChevronDown className="h-4 w-4 group-data-[state=open]:rotate-180 transition-transform" />
                                    </SidebarMenuSubButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pl-4">
                                   <SidebarMenuSub>
                                      <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild size="sm">
                                          <Link href="/dashboard/agenda/agregar-tareas">
                                            <CalendarPlus />
                                            <span>Agregar Tareas</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                      <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild size="sm">
                                          <Link href="/dashboard/agenda/ver-tareas">
                                            <CalendarSearch />
                                            <span>Ver Tareas</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                              </Collapsible>
                          </SidebarMenuSubItem>
                       </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Liquidaciones" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp />
                        <span className="group-data-[collapsible=icon]:hidden">Liquidaciones</span>
                      </div>
                      <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden group-data-[state=open]:rotate-180 transition-transform" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/dashboard/liquidaciones/adquisitivo">
                            <Percent />
                            <span>Poder Adquisitivo</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/dashboard/liquidaciones/liquidador">
                            <Calculator />
                            <span>Liquidador</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/dashboard/liquidaciones/certificado">
                            <Ribbon />
                            <span>Certificado</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                       <SidebarMenuButton tooltip="Pagos y Sentencias" className="w-full justify-between">
                         <div className="flex items-center gap-2">
                          <Banknote />
                          <span className="group-data-[collapsible=icon]:hidden">Pagos y Sentencias</span>
                        </div>
                        <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden group-data-[state=open]:rotate-180 transition-transform" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <SidebarMenuSub>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/pagos/consulta">
                                <Wallet />
                                <span>Consulta de Pagos</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/pagos/sentencias">
                                <Gavel />
                                <span>Pago de Sentencias</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                       </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                       <SidebarMenuButton tooltip="Contabilidad" className="w-full justify-between">
                         <div className="flex items-center gap-2">
                          <Receipt />
                          <span className="group-data-[collapsible=icon]:hidden">Contabilidad</span>
                        </div>
                        <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden group-data-[state=open]:rotate-180 transition-transform" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <SidebarMenuSub>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/ver-pagos-cliente">
                                <Wallet />
                                <span>Ver Pagos de Cliente</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/historial-pagos">
                                <History />
                                <span>Ver Historial de Pagos</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                           <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/agregar-pago">
                                <PlusCircle />
                                <span>Agregar Pago</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                           <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/agregar-cliente">
                                <UserPlus />
                                <span>Agregar Cliente</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                           <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/editar-usuario">
                                <UserCog />
                                <span>Editar Usuario</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                           <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/resumen-financiero">
                                <BarChartHorizontal />
                                <span>Resumen Financiero</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/documentos-soporte">
                                <FileText />
                                <span>Documentos Soporte</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                       </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Reportes">
                  <Link href="/dashboard/reportes">
                    <BarChart2 />
                    <span className="group-data-[collapsible=icon]:hidden">Reportes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Maestros">
                  <Link href="/dashboard/maestros">
                    <Database />
                    <span className="group-data-[collapsible=icon]:hidden">Maestros</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Historial de Cargas">
                  <Link href="/dashboard/historial-cargas">
                    <FileUp />
                    <span className="group-data-[collapsible=icon]:hidden">Historial de Cargas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Gestión de Demandas">
                  <Link href="/dashboard/gestion-demandas">
                    <FileClock />
                    <span className="group-data-[collapsible=icon]:hidden">Gestión de Demandas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Usuarios">
                  <Link href="/dashboard/usuarios">
                    <BookUser />
                    <span className="group-data-[collapsible=icon]:hidden">Usuarios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Mi Perfil">
                    <Link href="/dashboard/mi-perfil">
                      <UserIcon />
                      <span className="group-data-[collapsible=icon]:hidden">Mi Perfil</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Configuración">
                    <Link href="/dashboard/configuracion">
                      <Settings />
                      <span className="group-data-[collapsible=icon]:hidden">Configuración</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar Sesión">
                      <LogOut />
                      <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <GlobalHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

    