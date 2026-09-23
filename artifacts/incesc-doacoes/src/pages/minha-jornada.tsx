import { SiteHeader } from "@/components/site-header";
import { usePublicPortalPage } from "@/lib/api";
import { BlockRenderer } from "@/components/portal-blocks";
import { SiteFooter } from "@/components/site-footer";
import { SystemJourney } from "@/components/system-modules";

export default function MinhaJornada() {
  const { data: page, isLoading: isPageLoading, error: pageError } = usePublicPortalPage("minha-jornada");

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
    <main className="flex-grow py-16 lg:py-24">
      <SystemJourney />
    </main>
  );

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader />
      
      {page && page.status === 'published' ? (
        <main className="flex-grow">
          {page.blocks.map(block => (
            <BlockRenderer 
              key={block.id} 
              block={block} 
              mediaList={page.media || []}
              systemComponents={{ journey: <SystemJourney /> }} 
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
