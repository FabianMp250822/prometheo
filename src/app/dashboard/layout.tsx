

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { auth, db } from '@/lib/firebase';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter, SidebarSeparator, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { Scale, LayoutGrid, TrendingUp, Banknote, BarChart2, Settings, LogOut, User as UserIcon, Gavel, Database, FileUp, FileClock, BookUser, UserSquare, CalendarClock, ListTodo, CalendarPlus, CalendarSearch, Percent, Calculator, Ribbon, Wallet, Receipt, History, PlusCircle, UserCog, BarChartHorizontal, FileText, UserPlus, UserMinus, Landmark, BellRing, Network, Search as SearchIcon, ShieldQuestion, Users as UsersIcon, MailCheck, FlaskConical, TestTubeDiagonal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { GlobalHeader } from '@/components/dashboard/global-header';
import { usePensioner } from '@/context/pensioner-provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PushNotificationManager } from '@/components/dashboard/push-notification-manager';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth();
  const { selectedPensioner } = usePensioner();
  const router = useRouter();
  const { toast } = useToast();
  const sessionStartTimeRef = useRef<Date | null>(null);

  const logSession = async (startTime: Date | null, endTime: Date) => {
    if (!user || !startTime) return;
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    if (durationSeconds < 5) return; // Ignore very short sessions

    const sessionLog = {
      userId: user.uid,
      startTime: startTime,
      endTime: endTime,
      durationSeconds: durationSeconds,
    };
    
    try {
        await addDoc(collection(db, `users/${user.uid}/sessionLogs`), sessionLog);
    } catch (error) {
        console.error("Failed to log session:", error);
    }
  };

  useEffect(() => {
    if (user) {
      sessionStartTimeRef.current = new Date();

      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (sessionStartTimeRef.current) {
          logSession(sessionStartTimeRef.current, new Date());
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (sessionStartTimeRef.current) {
            logSession(sessionStartTimeRef.current, new Date());
        }
      };
    }
  }, [user]);


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      if (sessionStartTimeRef.current && user) {
        await logSession(sessionStartTimeRef.current, new Date());
        sessionStartTimeRef.current = null;
      }
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
          <div className="flex items-center justify-center p-2">
            <Image 
              src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Flogo-removebg-preview.png?alt=media&token=9a935e08-66dd-4edc-83f8-31320b0b2680"
              alt="Dajusticia Logo"
              width={150}
              height={40}
              className="h-12 w-auto"
            />
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
             <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Portal de Usuario">
                <Link href="/dashboard/portal-usuario">
                  <ShieldQuestion />
                  <span className="group-data-[collapsible=icon]:hidden">Portal de Usuario</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Búsquedas">
                <Link href="/dashboard/busquedas">
                  <SearchIcon />
                  <span className="group-data-[collapsible=icon]:hidden">Búsquedas</span>
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
                              <Link href="/dashboard/agenda/agregar-tareas">
                                <CalendarPlus />
                                <span>Agregar Tareas</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                           <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/agenda/ver-tareas">
                                <ListTodo />
                                <span>Ver Tareas</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/agenda/por-fecha">
                                <CalendarSearch />
                                <span>Búsqueda por Fecha</span>
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
                          <Link href="/dashboard/liquidaciones/anexo-ley-4">
                            <FileText />
                            <span>Anexo Ley 4</span>
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
                       <SidebarMenuButton tooltip="Análisis Pensional" className="w-full justify-between">
                         <div className="flex items-center gap-2">
                          <FlaskConical />
                          <span className="group-data-[collapsible=icon]:hidden">Análisis Pensional</span>
                        </div>
                        <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden group-data-[state=open]:rotate-180 transition-transform" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <SidebarMenuSub>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/analisis-pensional/analisis-de-liquidacion">
                                <TestTubeDiagonal />
                                <span>Análisis de Liquidación</span>
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
                              <Link href="/dashboard/contabilidad/historial-pagos">
                                <History />
                                <span>Historial de Clientes</span>
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
                                <span>Editar Cliente</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                           <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/contabilidad/morosos">
                                <UserMinus />
                                <span>Gestión de Morosos</span>
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
                              <Link href="/dashboard/contabilidad/estadisticas">
                                <BarChart2 />
                                <span>Estadísticas</span>
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
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Procesos en Línea" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <Network />
                        <span className="group-data-[collapsible=icon]:hidden">Procesos en Línea</span>
                      </div>
                      <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden group-data-[state=open]:rotate-180 transition-transform" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/dashboard/juzgados">
                            <Landmark />
                            <span>Juzgados</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/dashboard/notificaciones">
                            <BellRing />
                            <span>Notificaciones</span>
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
                <SidebarMenuButton asChild tooltip="Gestión de Demandas">
                  <Link href="/dashboard/gestion-demandas">
                    <FileClock />
                    <span className="group-data-[collapsible=icon]:hidden">Gestión de Demandas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Collapsible>
                    <CollapsibleTrigger asChild>
                       <SidebarMenuButton tooltip="Usuarios" className="w-full justify-between">
                         <div className="flex items-center gap-2">
                          <BookUser />
                          <span className="group-data-[collapsible=icon]:hidden">Usuarios</span>
                        </div>
                        <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden group-data-[state=open]:rotate-180 transition-transform" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <SidebarMenuSub>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/usuarios">
                                <UserCog />
                                <span>Gestionar Usuarios</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/usuarios/prospectos">
                                <UsersIcon />
                                <span>Prospectos</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                             <SidebarMenuSubButton asChild>
                              <Link href="/dashboard/usuarios/suscriptores">
                                <MailCheck />
                                <span>Suscriptores</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                       </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
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
        <PushNotificationManager />
        <GlobalHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
