import { Link } from "wouter";
import { usePublicPortalPages, usePublicPortalSettings } from "@/lib/api";
import logoUrl from "@/assets/logo.png";

export function SiteFooter() {
  const { data: settings } = usePublicPortalSettings();
  const { data: publishedPages = [] } = usePublicPortalPages();

  return (
    <footer className="bg-muted py-12 border-t border-border mt-auto">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <Link href="/" aria-label="Voltar à página inicial do INCESC">
            <img src={logoUrl} alt="INCESC" className="h-8 w-auto object-contain opacity-80" />
          </Link>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {settings?.officialLinks?.map((link, i) => (
              <a key={i} href={link.href} className="hover:text-foreground transition-colors font-medium">
                {link.label}
              </a>
            ))}
            {publishedPages
              .filter(page => !settings?.officialLinks?.some(link => link.href === `/paginas/${page.slug}`))
              .map(page => (
                <Link key={page.id} href={`/paginas/${page.slug}`} className="hover:text-foreground font-medium">
                  {page.title}
                </Link>
              ))}
            {(!settings || !settings.officialLinks || settings.officialLinks.length === 0) && (
              <>
                <Link href="/transparencia" className="hover:text-foreground font-medium">Transparência</Link>
                <Link href="/minha-jornada" className="hover:text-foreground font-medium">Minha jornada</Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-muted-foreground/80 border-t border-border/50 pt-8 text-center md:text-left">
          <div>
            <p className="font-bold text-foreground/70 mb-2 uppercase tracking-widest text-xs">O Instituto</p>
            <p className="max-w-md mx-auto md:mx-0 whitespace-pre-wrap">
              {settings?.footerInstitutional || "O INCESC é uma instituição sem fins lucrativos que atua em iniciativas de interesse comunitário, com ações relacionadas à educação, saúde, cultura, esporte, voluntariado, pesquisa, desenvolvimento social e sustentabilidade."}
            </p>
          </div>
          <div className="md:text-right">
             <p className="font-bold text-foreground/70 mb-2 uppercase tracking-widest text-xs">Contato</p>
             <p>Instituto INCESC · CNPJ 49.637.563/0001-84</p>
             {settings?.contact?.email && <p className="mt-1">{settings.contact.email}</p>}
             {settings?.contact?.phone && <p className="mt-1">{settings.contact.phone}</p>}
             {settings?.contact?.address && <p className="mt-1">{settings.contact.address}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
