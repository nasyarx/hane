import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  ArrowLeftRight,
  LayoutDashboard,
  BellRing,
  CalendarClock,
  Gem,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Landmark,
  ListChecks,
  Receipt,
  Settings2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { CSSProperties, useState } from "react";
import { useLocation } from "wouter";

export const menuItems = [
  { icon: LayoutDashboard, label: "Genel Bakış", path: "/" },
  { icon: ArrowLeftRight, label: "İşlemler", path: "/islemler" },
  { icon: Receipt, label: "Faturalar", path: "/faturalar" },
  { icon: HandCoins, label: "Borç & Alacak", path: "/borclar" },
  { icon: CalendarClock, label: "Taksitler", path: "/taksitler" },
  { icon: ShieldCheck, label: "Sigorta & Araç", path: "/sigortalar" },
  { icon: HeartHandshake, label: "Zekat", path: "/zekat" },
  { icon: Landmark, label: "Banka Promosyon", path: "/promosyonlar" },
  { icon: Gem, label: "Birikim & Varlıklar", path: "/birikimler" },
  { icon: GraduationCap, label: "Kurslar", path: "/kurslar" },
  { icon: BellRing, label: "Görevler & Hatırlatma", path: "/gorevler" },
  { icon: Settings2, label: "Tanımlar", path: "/tanimlar" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "270px" } as CSSProperties}
    >
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find(item => item.path === location);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="h-16 justify-center">
          <div className="flex items-center gap-2.5 px-2 w-full">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-sm">
              <Wallet className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="font-display font-semibold text-[15px] leading-tight text-sidebar-foreground truncate">
                  Aile Bütçesi
                </p>
                <p className="text-[11px] text-sidebar-foreground/60 leading-tight">
                  Ev ekonomisi defteri
                </p>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarMenu className="px-2 py-1">
            {menuItems.map(item => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className="h-9.5 font-normal"
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : ""}`} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="flex items-center gap-3 rounded-lg px-1 py-1 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
              <AvatarFallback className="text-xs font-semibold bg-sidebar-accent text-sidebar-accent-foreground">
                AB
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                  Aile Hesabı
                </p>
                <p className="text-[11px] text-sidebar-foreground/60 mt-1.5">
                  Tek hesap, tüm kayıtlar
                </p>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-transparent">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-card/95 px-2 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight font-display font-semibold text-foreground">
                {activeMenuItem?.label ?? "Aile Bütçesi"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-[28px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}
