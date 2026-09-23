import { useRoute } from "wouter";
import { usePublicPortalPage } from "@/lib/api";
import { BlockRenderer } from "@/components/portal-blocks";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import NotFound from "@/pages/not-found";

export default function PublicPage() {
  const [, params] = useRoute("/paginas/:slug");
  const slug = params?.slug;
  const { data: page, isLoading, error } = usePublicPortalPage(slug || "");

  if (isLoading) {
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

  if (error && (error as any).status !== 404) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <p className="text-destructive font-bold text-xl mb-2">Erro ao carregar o portal</p>
          <p className="text-muted-foreground">{(error as any).message}</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // If page not found or not published, show 404
  if (error || !page || page.status !== 'published') {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {page.blocks.map(block => (
          <BlockRenderer 
            key={block.id} 
            block={block} 
            mediaList={page.media || []}
          />
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
