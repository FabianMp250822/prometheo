'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { auth } from '@/lib/firebase';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { Scale, LayoutGrid, TrendingUp, Banknote, BarChart2, Settings, LogOut, User as UserIcon, Gavel, Database, FileUp, FileClock, BookUser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth();
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
              <SidebarMenuButton href="/dashboard" tooltip="Dashboard">
                <LayoutGrid />
                <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/sentencias" tooltip="Análisis de Sentencias" >
                  <Gavel />
                  <span className="group-data-[collapsible=icon]:hidden">Análisis de Sentencias</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/liquidaciones" tooltip="Liquidaciones" >
                  <TrendingUp />
                  <span className="group-data-[collapsible=icon]:hidden">Liquidaciones</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/pagos" tooltip="Pagos" >
                  <Banknote />
                  <span className="group-data-[collapsible=icon]:hidden">Pagos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/reportes" tooltip="Reportes">
                  <BarChart2 />
                  <span className="group-data-[collapsible=icon]:hidden">Reportes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/maestros" tooltip="Maestros">
                  <Database />
                  <span className="group-data-[collapsible=icon]:hidden">Maestros</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/historial-cargas" tooltip="Historial de Cargas">
                  <FileUp />
                  <span className="group-data-[collapsible=icon]:hidden">Historial de Cargas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/gestion-demandas" tooltip="Gestión de Demandas">
                  <FileClock />
                  <span className="group-data-[collapsible=icon]:hidden">Gestión de Demandas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/usuarios" tooltip="Usuarios">
                  <BookUser />
                  <span className="group-data-[collapsible=icon]:hidden">Usuarios</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
                <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/mi-perfil" tooltip="Mi Perfil">
                    <UserIcon />
                    <span className="group-data-[collapsible=icon]:hidden">Mi Perfil</span>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/configuracion" tooltip="Configuración">
                    <Settings />
                    <span className="group-data-[collapsible=icon]:hidden">Configuración</span>
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
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
