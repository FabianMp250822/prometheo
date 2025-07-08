import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import { Scale, LayoutGrid, TrendingUp, Banknote, FileText, Ribbon, Percent, Search, Users, User } from 'lucide-react';

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
              <SidebarMenuButton href="/dashboard" isActive tooltip="Dashboard">
                <LayoutGrid />
                <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Liquidaciones" disabled>
                <TrendingUp />
                <span className="group-data-[collapsible=icon]:hidden">Liquidaciones</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Pagos" disabled>
                <Banknote />
                <span className="group-data-[collapsible=icon]:hidden">Pagos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Detalles" disabled>
                <FileText />
                <span className="group-data-[collapsible=icon]:hidden">Detalles</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Certificado" disabled>
                <Ribbon />
                <span className="group-data-[collapsible=icon]:hidden">Certificado</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Adquisitivo" disabled>
                <Percent />
                <span className="group-data-[collapsible=icon]:hidden">Adquisitivo</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Procesos" disabled>
                <Search />
                <span className="group-data-[collapsible=icon]:hidden">Procesos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Listado Pensionados" disabled>
                <Users />
                <span className="group-data-[collapsible=icon]:hidden">Listado Pensionados</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" tooltip="Mi Perfil" disabled>
                <User />
                <span className="group-data-[collapsible=icon]:hidden">Mi Perfil</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
