import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { Scale, LayoutGrid, TrendingUp, Banknote, FileText, Ribbon, Percent, Search, Users, User, Gavel, Briefcase, BarChart2, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
              <SidebarMenuButton href="/dashboard/sentencias" tooltip="Sentencias">
                <Gavel />
                <span className="group-data-[collapsible=icon]:hidden">Sentencias</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/liquidaciones" tooltip="Liquidaciones">
                <TrendingUp />
                <span className="group-data-[collapsible=icon]:hidden">Liquidaciones</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/pagos" tooltip="Pagos">
                <Banknote />
                <span className="group-data-[collapsible=icon]:hidden">Pagos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/detalles" tooltip="Detalles">
                <FileText />
                <span className="group-data-[collapsible=icon]:hidden">Detalles</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/certificado" tooltip="Certificado">
                <Ribbon />
                <span className="group-data-[collapsible=icon]:hidden">Certificado</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/adquisitivo" tooltip="Adquisitivo">
                <Percent />
                <span className="group-data-[collapsible=icon]:hidden">Adquisitivo</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/procesos" tooltip="Procesos">
                <Search />
                <span className="group-data-[collapsible=icon]:hidden">Procesos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/honorarios" tooltip="Honorarios">
                <Briefcase />
                <span className="group-data-[collapsible=icon]:hidden">Honorarios</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/reportes" tooltip="Reportes">
                <BarChart2 />
                <span className="group-data-[collapsible=icon]:hidden">Reportes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard/listado-pensionados" tooltip="Listado Pensionados">
                <Users />
                <span className="group-data-[collapsible=icon]:hidden">Listado Pensionados</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
                <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard/mi-perfil" tooltip="Mi Perfil">
                    <User />
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
                <SidebarMenuButton href="#" tooltip="Cerrar Sesión">
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
