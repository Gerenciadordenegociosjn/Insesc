import { Link, useLocation } from "wouter";
import logoUrl from "@/assets/logo.png";

const donationUrl = `${import.meta.env.BASE_URL}#doacoes`;

export function SiteHeader() {
  const [location] = useLocation();
  const navItems = [
    { href: "/transparencia", label: "Portal da transparência", testId: "link-transparency" },
    { href: "/minha-jornada", label: "Minha jornada", testId: "link-my-journey" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 lg:px-8">
        <Link href="/" aria-label="Voltar à página inicial do INCESC" data-testid="link-home-logo" className="flex shrink-0 items-center">
          <img src={logoUrl} alt="INCESC" className="h-8 w-auto object-contain sm:h-9" />
        </Link>
        <nav aria-label="Navegação principal" className="order-3 grid w-full grid-cols-2 gap-2 sm:order-none sm:ml-auto sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
          {navItems.map(({ href, label, testId }) => (
            <Link
              key={href}
              href={href}
              data-testid={testId}
              aria-current={location === href ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-bold leading-tight transition-colors sm:px-4 sm:text-sm ${
                location === href
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export { donationUrl };