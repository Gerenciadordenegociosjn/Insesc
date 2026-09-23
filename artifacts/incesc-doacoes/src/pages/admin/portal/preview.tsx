import { useRoute, Link } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BlockRenderer } from "@/components/portal-blocks";
import { SystemActions, SystemTransparency, SystemJourney } from "@/components/system-modules";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useAdminPortalPage, useAdminPortalMedia, useMe } from "@/lib/api";

export default function AdminPortalPreview() {
  const [, params] = useRoute("/admin/portal/:id/preview");
  const id = params?.id;
  const { data: me, isLoading: meLoading } = useMe();
  const authorized = !!me && ["administrator", "content", "auditor"].includes(me.role);
  const { data: page, isLoading } = useAdminPortalPage(authorized ? id || "" : "");
  const { data: mediaList } = useAdminPortalMedia(authorized);

  if (meLoading) return <div className="animate-pulse h-screen bg-muted"></div>;
  if (!authorized) {
    return <div className="p-8 text-center text-destructive">Visualização restrita à equipe autorizada.</div>;
  }
  if (isLoading) return <div className="animate-pulse h-screen bg-muted"></div>;
  if (!page) return <div className="p-8 text-center text-destructive">Página não encontrada.</div>;

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <div className="bg-amber-500 text-amber-950 px-4 py-2 flex justify-between items-center text-sm font-bold z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Visualização de Rascunho (Não publicado)</span>
        </div>
        <Button asChild size="sm" variant="outline" className="border-amber-950/20 bg-amber-500 hover:bg-amber-600 text-amber-950 hover:text-amber-950 h-7">
          <Link href={`/admin/portal/${id}`}>Voltar ao Editor</Link>
        </Button>
      </div>
      <SiteHeader />
      <main className="flex-1 relative">
         {page.blocks.map(block => (
            <BlockRenderer 
              key={block.id} 
              block={block}
              mediaList={mediaList || []}
              systemComponents={{
                actions: <SystemActions />,
                transparency: <SystemTransparency />,
                journey: <SystemJourney />
              }}
            />
         ))}
      </main>
      <SiteFooter />
    </div>
  );
}
