import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Link } from "wouter";
import { usePublicPortalPage } from "@/lib/api";
import { BlockRenderer } from "@/components/portal-blocks";
import { SiteFooter } from "@/components/site-footer";
import { SystemTransparency } from "@/components/system-modules";

export default function Transparencia() {
  const { data: page, isLoading: isPageLoading, error: pageError } = usePublicPortalPage("transparencia");

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse w-16 h-16 bg-muted rounded-full"></div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (pageError && (pageError as any).status !== 404) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <p className="text-destructive font-bold text-xl mb-2">Erro ao carregar o portal</p>
          <p className="text-muted-foreground">{pageError.message}</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const fallbackOriginalContent = (
    <main className="py-16 lg:py-24 flex-1">
      <div className="container mx-auto px-4 max-w-4xl">
        <header className="mb-16 text-center">
          <ShieldCheck className="w-16 h-16 text-secondary mx-auto mb-6" />
          <h1 className="text-4xl lg:text-5xl font-black mb-6">Portal da Transparência</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Acompanhe o destino dos recursos arrecadados e as despesas aprovadas de cada iniciativa. 
            Nosso compromisso é com a clareza e a responsabilidade.
          </p>
        </header>
        <SystemTransparency />
      </div>
    </main>
  );

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader />
      
      {page && page.status === 'published' ? (
        <main className="flex-1">
          {page.blocks.map(block => (
            <BlockRenderer 
              key={block.id} 
              block={block} 
              mediaList={page.media || []}
              systemComponents={{ transparency: <SystemTransparency /> }} 
            />
          ))}
        </main>
      ) : (
        fallbackOriginalContent
      )}

      <SiteFooter />
    </div>
  );
}
