import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAdminPortalPages, useCreatePortalPage, usePublishPortalPage, useUnpublishPortalPage, useMe } from "@/lib/api";
import { currentPageBlocks, isUninitializedCorePage } from "@/lib/portal-defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LayoutTemplate, Plus, FileEdit, ExternalLink, Globe, Lock, Trash2, Eye, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminPortalPages() {
  const [, navigate] = useLocation();
  const { data: pages, isLoading } = useAdminPortalPages();
  const createPage = useCreatePortalPage();
  const publishPage = usePublishPortalPage();
  const unpublishPage = useUnpublishPortalPage();
  const { toast } = useToast();
  const { data: me } = useMe();
  const canPublish = me && ["administrator"].includes(me.role);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPageForm, setNewPageForm] = useState({ title: "", slug: "" });

  const handleCreate = () => {
    if (!newPageForm.title || !newPageForm.slug) {
      toast({ title: "Erro", description: "Preencha título e slug.", variant: "destructive" });
      return;
    }
    createPage.mutate(
      { title: newPageForm.title, slug: newPageForm.slug, blocks: [] },
      {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Página criada." });
          setIsCreateModalOpen(false);
          setNewPageForm({ title: "", slug: "" });
        },
        onError: (err: any) => {
          toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const corePages = [
    { slug: 'home', title: 'Página Inicial', system: 'actions' },
    { slug: 'transparencia', title: 'Portal da Transparência', system: 'transparency' },
    { slug: 'minha-jornada', title: 'Minha Jornada', system: 'journey' }
  ];

  const getPublicUrl = (slug: string) => {
    if (slug === 'home') return '/';
    if (slug === 'transparencia') return '/transparencia';
    if (slug === 'minha-jornada') return '/minha-jornada';
    return `/paginas/${slug}`;
  };

  const renderPageCard = (page: any) => (
    <div key={page.id} className="border border-border rounded-xl p-5 hover:border-primary/50 transition-colors flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold line-clamp-1" title={page.title}>{page.title}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Globe className="w-3 h-3" /> {getPublicUrl(page.slug)}
          </p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold ${page.status === 'published' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}`}>
          {page.status === 'published' ? 'Publicado' : 'Rascunho'}
        </div>
      </div>
      
      <div className="mt-auto space-y-3 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" asChild className="w-full">
            <Link href={`/admin/portal/${page.id}`}>
              <FileEdit className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full">
            {page.status === 'published' ? (
              <a href={getPublicUrl(page.slug)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver
              </a>
            ) : (
              <Link href={`/admin/portal/${page.id}/preview`}>
                <Eye className="w-4 h-4 mr-2" /> Prever
              </Link>
            )}
          </Button>
        </div>
        <div className="flex justify-between">
          {canPublish && (
            page.status === 'published' ? (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive w-full" onClick={() => {
                if (confirm("Despublicar página? Ela ficará inacessível para o público.")) {
                  unpublishPage.mutate({ id: page.id, expectedVersion: page.version }, {
                    onSuccess: () => toast({ title: "Página despublicada." }),
                    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" })
                  });
                }
              }}>
                <Lock className="w-4 h-4 mr-2" /> Despublicar
              </Button>
            ) : isUninitializedCorePage(page) ? (
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href={`/admin/portal/${page.id}`}>Preparar estrutura antes de publicar</Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary hover:bg-secondary/10 w-full" onClick={() => {
                publishPage.mutate({ id: page.id, expectedVersion: page.version }, {
                  onSuccess: () => toast({ title: "Página publicada." }),
                  onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" })
                });
              }}>
                <FileCheck className="w-4 h-4 mr-2" /> Publicar
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted rounded"></div></div>;

  const existingPages = pages || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <LayoutTemplate className="w-8 h-8 text-primary" />
          Páginas do Portal
        </h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Página Customizada
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {corePages.map(core => {
            const page = existingPages.find(p => p.slug === core.slug);
            if (page) {
              return renderPageCard(page);
            }
            return (
              <div key={core.slug} className="border border-border border-dashed bg-muted/20 rounded-xl p-5 flex flex-col justify-center items-center text-center gap-4">
                <div>
                  <h3 className="text-lg font-bold">{core.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Página principal do sistema</p>
                </div>
                <Button 
                  onClick={() => {
                    createPage.mutate({
                      title: core.title,
                      slug: core.slug,
                      blocks: currentPageBlocks(core.slug)
                    }, {
                      onSuccess: (created) => navigate(`/admin/portal/${created.id}`),
                      onError: (err: Error) => toast({ title: "Erro ao criar a página", description: err.message, variant: "destructive" }),
                    });
                  }} 
                  disabled={createPage.isPending}
                >
                  Criar e Configurar
                </Button>
              </div>
            );
          })}
          
          {existingPages.filter(p => !corePages.some(c => c.slug === p.slug)).map(page => renderPageCard(page))}
        </div>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Página</DialogTitle>
            <DialogDescription>Defina o título e o endereço (slug) da nova página.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1">Título da Página</label>
              <Input value={newPageForm.title} onChange={(e) => setNewPageForm({ ...newPageForm, title: e.target.value })} placeholder="Ex: Quem Somos" />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1">Slug (URL)</label>
              <div className="flex items-center">
                <span className="bg-muted px-3 py-2 border border-r-0 border-border rounded-l-md text-muted-foreground">/paginas/</span>
                <Input className="rounded-l-none" value={newPageForm.slug} onChange={(e) => setNewPageForm({ ...newPageForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="quem-somos" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Apenas letras minúsculas, números e hifens.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createPage.isPending}>Criar Página</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
