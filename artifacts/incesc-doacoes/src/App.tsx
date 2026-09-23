import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Transparencia from '@/pages/transparencia';
import MinhaJornada from '@/pages/minha-jornada';
import SignInPage from '@/pages/sign-in';
import SignUpPage from '@/pages/sign-up';
import ConfirmationPage from '@/pages/confirmation';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminActions from '@/pages/admin/actions';
import AdminDonations from '@/pages/admin/donations';
import AdminExpenses from '@/pages/admin/expenses';
import AdminUsers from '@/pages/admin/users';
import AdminAuditLogs from '@/pages/admin/audit';
import AdminLayout from '@/components/admin-layout';
import { ClerkProvider } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import logoUrl from '@/assets/logo.png';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

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
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
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
        <Route path="/admin">
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </Route>
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
          <ClerkRouterBridge />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function ClerkRouterBridge() {
  const [, navigate] = useLocation();

  if (!clerkPubKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Clerk não configurado</h1>
          <p>A chave pública do Clerk (VITE_CLERK_PUBLISHABLE_KEY) está ausente.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}
      appearance={{
        options: {
          logoPlacement: 'inside',
          logoLinkUrl: basePath || '/',
          logoImageUrl: new URL(logoUrl, window.location.origin).toString(),
        },
        variables: {
          colorPrimary: '#087d69',
          colorForeground: '#1f3440',
          colorBackground: '#ffffff',
          colorInput: '#ffffff',
          colorInputForeground: '#1f3440',
          colorNeutral: '#cdd9dd',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '0.75rem',
        },
        elements: {
          socialButtonsBlockButtonText: { color: '#1f3440' },
          socialButtonsBlockButton: { backgroundColor: '#ffffff', borderColor: '#cdd9dd' },
          formFieldInput: { backgroundColor: '#ffffff', color: '#1f3440', borderColor: '#cdd9dd' },
          formFieldLabel: { color: '#1f3440' },
          footerActionText: { color: '#516775' },
          footerActionLink: { color: '#087d69' },
          dividerText: { color: '#516775' },
        },
      }}
      localization={{
        signIn: { start: { title: 'Acesse sua conta INCESC', subtitle: 'Entre para acompanhar suas contribuições.' } },
        signUp: { start: { title: 'Crie sua conta INCESC', subtitle: 'Acompanhe sua participação nas ações do instituto.' } },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => navigate(stripBase(to))}
      routerReplace={(to) => navigate(stripBase(to), { replace: true })}
    >
      <Router />
    </ClerkProvider>
  );
}

export default App;
