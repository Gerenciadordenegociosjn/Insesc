import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMe, useLogout } from "@/lib/api";
import {
  LayoutDashboard,
  HeartHandshake,
  Receipt,
  Users,
  LogOut,
  Target,
  ShieldAlert,
  LayoutTemplate,
  Settings,
} from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: me, isLoading: meLoading, error: meError } = useMe();
  const logout = useLogout();
  useEffect(() => {
    if ((meError as { status?: number } | null)?.status === 401) setLocation("/admin/login");
  }, [meError, setLocation]);

  if (meLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (meError && (meError as { status?: number }).status === 401) {
    return null;
  }

  const staffRoles = ["administrator", "financial", "content", "transparency", "auditor", "support"];

  // Allow active staff only
  if (!me || !staffRoles.includes(me.role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h1 className="text-3xl font-black mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-8">
            Esta área é reservada para a equipe ativa do INCESC. Se você acredita que deveria ter acesso, contate o administrador.
          </p>
          <Button asChild className="rounded-xl">
            <Link href="/">Voltar ao portal público</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasRole = (roles: string[]) => roles.includes(me.role);

  const navItems = [
    ...(hasRole(["administrator", "financial", "auditor"]) ? [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] : []),
    ...(hasRole(["administrator", "content", "auditor"]) ? [{ href: "/admin/actions", label: "Ações e Campanhas", icon: Target }] : []),
    ...(hasRole(["administrator", "financial", "auditor"]) ? [{ href: "/admin/donations", label: "Doações", icon: HeartHandshake }] : []),
    ...(hasRole(["administrator", "financial", "transparency", "auditor"]) ? [{ href: "/admin/expenses", label: "Despesas", icon: Receipt }] : []),
    ...(hasRole(["administrator", "content", "auditor"]) ? [
      { href: "/admin/portal", label: "Páginas do Portal", icon: LayoutTemplate },
      { href: "/admin/portal/settings", label: "Configurações do Portal", icon: Settings },
    ] : []),
    ...(hasRole(["administrator"]) ? [{ href: "/admin/users", label: "Equipe e Usuários", icon: Users }] : []),
    ...(hasRole(["administrator", "auditor"]) ? [{ href: "/admin/audit-logs", label: "Auditoria", icon: ShieldAlert }] : []),
  ];

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if ((window as any).__hasUnsavedChanges) {
      if (!confirm("Você tem alterações não salvas. Deseja sair mesmo assim?")) {
        e.preventDefault();
        return;
      }
      (window as any).__hasUnsavedChanges = false;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center justify-between md:justify-start">
          <img src={logoUrl} alt="INCESC" className="h-8 w-auto object-contain" />
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Menu</div>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  onClick={(e) => handleNav(e, item.href)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive 
                      ? "bg-primary text-primary-foreground font-bold" 
                      : "text-foreground hover:bg-muted font-medium"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border mt-auto">
          <div className="px-2 mb-4">
             <p className="text-sm font-bold truncate">{me.username || me.email || me.name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{me.role}</p>
          </div>
           <Button variant="ghost" onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation("/admin/login") })} className="w-full justify-start text-muted-foreground hover:text-destructive rounded-xl px-2">
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 lg:px-8 shrink-0">
          <h2 className="text-lg font-bold truncate">Backoffice INCESC</h2>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link href="/">Ver Portal</Link>
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
