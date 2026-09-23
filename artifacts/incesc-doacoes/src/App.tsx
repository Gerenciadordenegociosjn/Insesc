import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Transparencia from '@/pages/transparencia';
import MinhaJornada from '@/pages/minha-jornada';
import AdminLogin from '@/pages/admin/login';
import ConfirmationPage from '@/pages/confirmation';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminActions from '@/pages/admin/actions';
import AdminDonations from '@/pages/admin/donations';
import AdminExpenses from '@/pages/admin/expenses';
import AdminUsers from '@/pages/admin/users';
import AdminAuditLogs from '@/pages/admin/audit';
import AdminPortalPages from '@/pages/admin/portal/pages';
import AdminPortalSettings from '@/pages/admin/portal/settings';
import AdminPortalEditor from '@/pages/admin/portal/editor';
import AdminPortalPreview from '@/pages/admin/portal/preview';
import PublicPage from '@/pages/public-page';
import AdminLayout from '@/components/admin-layout';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function Router() {
  const [location] = useLocation();

  useEffect(() => {
    const metadata: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'INCESC — Doe e Transforme Vidas',
        description: 'Apoie o INCESC e ajude a construir um futuro mais justo, inclusivo e sustentável através da educação, saúde, cultura e esporte.',
      },
      '/transparencia': {
        title: 'Portal da transparência | INCESC',
        description: 'Consulte os canais oficiais de transparência, documentos e privacidade do INCESC. Sem registros financeiros fictícios.',
      },
      '/minha-jornada': {
        title: 'Minha jornada | INCESC',
        description: 'Conheça a proposta de acompanhamento das contribuições ao INCESC e a disponibilidade atual da área pessoal.',
      },
    };
    const { title, description } = metadata[location] ?? {
      title: 'Página não encontrada | INCESC',
      description: 'Esta página não está disponível no site de doações do INCESC.',
    };
    document.title = title;
    for (const [selector, content] of [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ]) {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
    }
    if (window.location.hash !== '#doacao') window.scrollTo(0, 0);
  }, [location]);

  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/doacoes/confirmacao" component={ConfirmationPage} />
        <Route path="/" component={Home} />
        <Route path="/doacoes" component={Home} />
        <Route path="/transparencia" component={Transparencia} />
        <Route path="/minha-jornada" component={MinhaJornada} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/actions">
          <AdminLayout>
            <AdminActions />
          </AdminLayout>
        </Route>
        <Route path="/admin/donations">
          <AdminLayout>
            <AdminDonations />
          </AdminLayout>
        </Route>
        <Route path="/admin/expenses">
          <AdminLayout>
            <AdminExpenses />
          </AdminLayout>
        </Route>
        <Route path="/admin/users">
          <AdminLayout>
            <AdminUsers />
          </AdminLayout>
        </Route>
        <Route path="/admin/audit-logs">
          <AdminLayout>
            <AdminAuditLogs />
          </AdminLayout>
        </Route>
        <Route path="/admin/portal/settings">
          <AdminLayout>
            <AdminPortalSettings />
          </AdminLayout>
        </Route>
        <Route path="/admin/portal">
          <AdminLayout>
            <AdminPortalPages />
          </AdminLayout>
        </Route>
        <Route path="/admin/portal/:id/preview">
          <AdminPortalPreview />
        </Route>
        <Route path="/admin/portal/:id">
          <AdminLayout>
            <AdminPortalEditor />
          </AdminLayout>
        </Route>
        <Route path="/admin">
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </Route>
        <Route path="/paginas/:slug" component={PublicPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
