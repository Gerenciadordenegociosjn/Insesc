import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useAdminPortalPage, useUpdatePortalPage, usePublishPortalPage, PortalBlock, PortalPage, useMe } from "@/lib/api";
import { BlockRenderer } from "@/components/portal-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LayoutTemplate, ArrowUp, ArrowDown, Trash2, Plus, FileCheck, Save, Settings, GripVertical, Image as ImageIcon, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function AdminPortalEditor() {
  const [, params] = useRoute("/admin/portal/:id");
  const id = params?.id;
  const { data: page, isLoading } = useAdminPortalPage(id || "");
  const updatePage = useUpdatePortalPage();
  const publishPage = usePublishPortalPage();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<PortalBlock[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);

  const { data: me } = useMe();
  const canPublish = me && ["administrator"].includes(me.role);

  const initializedFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (page && initializedFor.current !== id) {
      setBlocks(page.blocks || []);
      setTitle(page.title || "");
      setSlug(page.slug || "");
      initializedFor.current = id;
    }
  }, [page, id]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (andPublish = false) => {
    if (!id || !page) return;
    setIsSaving(true);
    updatePage.mutate(
      { id, data: { title, slug, blocks, expectedVersion: page.version } },
      {
        onSuccess: (updatedData) => {
          setIsSaving(false);
          toast({ title: "Rascunho salvo." });
          if (andPublish) {
            publishPage.mutate({ id, expectedVersion: updatedData.version }, {
              onSuccess: () => toast({ title: "Página publicada!" }),
              onError: (err: any) => toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" })
            });
          }
        },
        onError: (err: any) => {
          setIsSaving(false);
          toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handlePublish = () => {
    if (hasUnsavedChanges) {
      handleSave(true);
    } else {
      if (!id || !page) return;
      publishPage.mutate({ id, expectedVersion: page.version }, {
        onSuccess: () => toast({ title: "Página publicada!" }),
        onError: (err: any) => toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" })
      });
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    }
    setBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
    if (confirm("Remover este bloco?")) {
      const newBlocks = [...blocks];
      newBlocks.splice(index, 1);
      setBlocks(newBlocks);
      if (editingBlockIndex === index) setEditingBlockIndex(null);
    }
  };

  const addBlock = (type: string) => {
    const newBlock: PortalBlock = { id: crypto.randomUUID(), type };
    // Add default fields based on type
    if (type === 'hero') { newBlock.heading = "Novo Hero"; newBlock.body = ""; }
    if (type === 'text') { newBlock.heading = ""; newBlock.body = "Texto do bloco..."; }
    if (type === 'banner') { newBlock.text = "Texto do banner"; }
    if (type === 'split') { newBlock.heading = "Título"; newBlock.body = "Conteúdo"; newBlock.reverse = false; }
    if (type === 'cards') { newBlock.heading = "Cards"; newBlock.cards = [{ title: "Card 1", body: "Texto" }]; }
    if (type === 'gallery') { newBlock.heading = "Galeria"; newBlock.mediaIds = []; }
    if (type === 'image') { /* mediaId required but let user select it */ }
    if (type === 'system') { newBlock.system = "actions"; }
    
    setBlocks([...blocks, newBlock]);
    setIsAddBlockOpen(false);
    setEditingBlockIndex(blocks.length);
  };

  const updateBlock = (index: number, updates: Partial<PortalBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    setBlocks(newBlocks);
  };

  const hasUnsavedChanges = page ? JSON.stringify(blocks) !== JSON.stringify(page.blocks) || title !== page.title || slug !== page.slug : false;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    (window as any).__hasUnsavedChanges = hasUnsavedChanges;
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      (window as any).__hasUnsavedChanges = false;
    };
  }, [hasUnsavedChanges]);

  if (isLoading) return <div className="animate-pulse h-screen bg-muted rounded-xl"></div>;

  if (!page) return <div className="p-8 text-center text-destructive">Página não encontrada.</div>;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-primary" />
            Editor: <Input className="w-64 inline-flex ml-2 h-8 font-bold border-dashed bg-transparent" value={title} onChange={e => setTitle(e.target.value)} />
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            URL: {["home", "transparencia", "minha-jornada"].includes(slug) ? "/" : "/paginas/"} <Input className="w-48 inline-flex h-6 text-xs bg-transparent border-dashed" value={slug} onChange={e => setSlug(e.target.value)} disabled={["home", "transparencia", "minha-jornada"].includes(page.slug)} />
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {hasUnsavedChanges && <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Alterações não salvas</span>}
          <Button variant="outline" onClick={() => handleSave(false)} disabled={!hasUnsavedChanges || isSaving || updatePage.isPending}>
            <Save className="w-4 h-4 mr-2" /> Salvar Rascunho
          </Button>
          {hasUnsavedChanges ? (
            <Button variant="secondary" disabled title="Salve o rascunho antes de visualizar"><Eye className="w-4 h-4 mr-2" /> Prever</Button>
          ) : (
            <Button variant="secondary" asChild>
              <Link href={`/admin/portal/${id}/preview`}><Eye className="w-4 h-4 mr-2" /> Prever</Link>
            </Button>
          )}
          {canPublish && (
            <Button onClick={handlePublish} disabled={isSaving || publishPage.isPending || updatePage.isPending}>
              <FileCheck className="w-4 h-4 mr-2" /> Publicar
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative">
        {isSaving && (
          <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] flex items-center justify-center cursor-not-allowed rounded-xl">
            <div className="bg-card p-4 rounded-lg shadow-lg border border-border flex items-center gap-3 font-bold">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Salvando...
            </div>
          </div>
        )}
        {/* Workspace */}
        <div className="flex-1 min-h-[420px] lg:min-h-0 overflow-y-auto bg-card border border-border rounded-xl shadow-inner relative">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12">
              <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Esta página está vazia.</p>
              <Button className="mt-6" onClick={() => setIsAddBlockOpen(true)}>Adicionar primeiro bloco</Button>
            </div>
          ) : (
            <div className="pb-32">
              {blocks.map((block, index) => (
                <div 
                  key={block.id} 
                  className={`relative group border-y-2 border-transparent transition-colors ${editingBlockIndex === index ? 'border-primary/50' : 'hover:border-border/50'}`}
                  onClick={() => setEditingBlockIndex(index)}
                >
                  {/* Editor Controls Overlay */}
                  <div className={`absolute top-2 right-2 z-10 bg-background/90 backdrop-blur border border-border shadow-lg rounded-lg p-1 flex gap-1 ${editingBlockIndex === index ? 'opacity-100 flex' : 'opacity-0 hidden group-hover:flex'}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }} disabled={index === 0}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }} disabled={index === blocks.length - 1}>
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <div className="w-px bg-border mx-1 my-1"></div>
                    {blocks[index].type !== 'system' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removeBlock(index); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Block Render */}
                  <div className={`pointer-events-none opacity-50 absolute inset-0 z-0 ${editingBlockIndex === index ? 'bg-primary/5' : ''}`}></div>
                  <div className={`relative z-0 ${editingBlockIndex === index ? 'ring-2 ring-primary/20 ring-inset' : ''}`}>
                    <BlockRenderer block={block} />
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center mt-12">
                <Button variant="outline" className="rounded-full shadow-md gap-2" onClick={() => setIsAddBlockOpen(true)}>
                  <Plus className="w-4 h-4" /> Adicionar Bloco
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Inspector */}
        <div className="w-full lg:w-80 min-h-[320px] lg:min-h-0 shrink-0 bg-card border border-border rounded-xl overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-border font-bold flex items-center gap-2 bg-muted/30 sticky top-0 z-10">
            <Settings className="w-4 h-4 text-muted-foreground" /> 
            {editingBlockIndex !== null ? `Editar Bloco (${blocks[editingBlockIndex]?.type})` : 'Propriedades da Página'}
          </div>
          
          <div className="p-4 flex-1">
            {editingBlockIndex === null ? (
              <div className="text-sm text-muted-foreground space-y-4">
                <p>Selecione um bloco na área de trabalho para editar suas propriedades.</p>
                <div className="bg-muted p-4 rounded-lg">
                   <p className="font-bold mb-1 text-foreground">Status atual</p>
                   <p>{page.status === 'published' ? 'Publicado' : 'Rascunho'}</p>
                   {page.publishedAt && <p className="text-xs mt-2">Última pub: {new Date(page.publishedAt).toLocaleString('pt-BR')}</p>}
                </div>
              </div>
            ) : (
              <BlockInspector 
                block={blocks[editingBlockIndex]} 
                onChange={(updates) => updateBlock(editingBlockIndex, updates)} 
              />
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Escolha o tipo de bloco</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            {[
              { type: 'hero', icon: LayoutTemplate, label: 'Hero', desc: 'Destaque com título grande' },
              { type: 'text', icon: LayoutTemplate, label: 'Texto Livre', desc: 'Parágrafos e títulos' },
              { type: 'banner', icon: LayoutTemplate, label: 'Banner CTA', desc: 'Faixa colorida com botão' },
              { type: 'split', icon: LayoutTemplate, label: 'Imagem + Texto', desc: 'Lado a lado' },
              { type: 'cards', icon: LayoutTemplate, label: 'Cards', desc: 'Grade de informações' },
              { type: 'gallery', icon: ImageIcon, label: 'Galeria', desc: 'Mosaico de imagens' },
              { type: 'image', icon: ImageIcon, label: 'Imagem', desc: 'Imagem única' },
              { type: 'system', icon: Settings, label: 'Sistema', desc: 'Conteúdo dinâmico' },
            ].map(b => (
              <button 
                key={b.type}
                onClick={() => addBlock(b.type)}
                className="flex flex-col items-center justify-center p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center gap-2"
              >
                <b.icon className="w-8 h-8 text-muted-foreground" />
                <span className="font-bold">{b.label}</span>
                <span className="text-xs text-muted-foreground">{b.desc}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { MediaPicker } from "@/components/media-picker";

// Separate component for the right sidebar form
function BlockInspector({ block, onChange }: { block: PortalBlock, onChange: (updates: Partial<PortalBlock>) => void }) {
  // Base properties
  const renderBaseProps = () => (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Aparência</h4>
      
      <div>
        <label className="text-xs font-bold block mb-1">Fundo (Background)</label>
        <Select value={block.background || 'transparent'} onValueChange={v => onChange({ background: v === 'transparent' ? undefined : v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="transparent">Padrão</SelectItem>
            <SelectItem value="muted">Cinza Claro</SelectItem>
            <SelectItem value="primary">Cor Primária (Escuro)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-bold block mb-1">Alinhamento</label>
        <Select value={block.alignment || 'left'} onValueChange={v => onChange({ alignment: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-bold block mb-1">Largura</label>
        <Select value={block.width || 'medium'} onValueChange={v => onChange({ width: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="narrow">Estreita</SelectItem>
            <SelectItem value="medium">Média (Padrão)</SelectItem>
            <SelectItem value="wide">Larga</SelectItem>
            <SelectItem value="full">Tela Cheia</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Type specific properties */}
      {(block.type === 'hero' || block.type === 'text' || block.type === 'split' || block.type === 'cards' || block.type === 'gallery') && (
        <div>
          <label className="text-xs font-bold block mb-1">Título</label>
          <Input value={block.heading || ''} onChange={e => onChange({ heading: e.target.value })} />
        </div>
      )}

      {(block.type === 'hero' || block.type === 'text' || block.type === 'split') && (
        <div>
          <label className="text-xs font-bold block mb-1">Texto (Body)</label>
          <Textarea rows={6} value={block.body || ''} onChange={e => onChange({ body: e.target.value })} />
        </div>
      )}

      {block.type === 'banner' && (
        <div>
          <label className="text-xs font-bold block mb-1">Texto do Banner</label>
          <Input value={block.text || ''} onChange={e => onChange({ text: e.target.value })} />
        </div>
      )}

      {(block.type === 'hero' || block.type === 'banner' || block.type === 'split' || block.type === 'image') && (
        <div>
          <label className="text-xs font-bold block mb-1">Imagem</label>
          <div className="flex gap-2">
             <Input className="flex-1 text-xs font-mono" readOnly value={block.imageId || block.mediaId || ''} placeholder="ID da imagem" />
             <MediaPicker 
               value={block.imageId || block.mediaId} 
               onSelect={id => onChange({ [block.type === 'image' || block.type === 'split' ? 'mediaId' : 'imageId']: id })} 
             />
             {(block.imageId || block.mediaId) && (block.type === 'hero' || block.type === 'banner') && (
               <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => onChange({ imageId: undefined })}>
                 <Trash2 className="w-4 h-4" />
               </Button>
             )}
          </div>
        </div>
      )}

      {block.type === 'gallery' && (
        <div className="space-y-2">
          <label className="text-xs font-bold block mb-1">Imagens da Galeria</label>
          {block.mediaIds?.map((id: string, i: number) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input className="flex-1 text-xs font-mono" readOnly value={id} />
              <MediaPicker 
                value={id} 
                onSelect={newId => {
                  const newIds = [...(block.mediaIds || [])];
                  newIds[i] = newId;
                  onChange({ mediaIds: newIds });
                }} 
              />
              <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => {
                const newIds = [...(block.mediaIds || [])];
                newIds.splice(i, 1);
                onChange({ mediaIds: newIds });
              }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <div className="mt-2 flex justify-center">
            <MediaPicker 
              onSelect={newId => {
                const newIds = [...(block.mediaIds || []), newId];
                onChange({ mediaIds: newIds });
              }} 
            />
          </div>
        </div>
      )}

      {block.type === 'image' && (
        <div>
          <label className="text-xs font-bold block mb-1">Legenda</label>
          <Input value={block.caption || ''} onChange={e => onChange({ caption: e.target.value })} />
        </div>
      )}

      {(block.type === 'hero' || block.type === 'banner') && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <label className="text-xs font-bold block">Botão de Ação (CTA)</label>
          <Input placeholder="Texto do botão" value={block.cta?.label || ''} onChange={e => onChange({ cta: { ...block.cta, label: e.target.value } })} />
          <Input placeholder="Link (/doacoes ou https://...)" value={block.cta?.href || ''} onChange={e => onChange({ cta: { ...block.cta, href: e.target.value } })} />
        </div>
      )}

      {block.type === 'split' && (
        <div className="flex items-center gap-2 pt-2">
          <Switch id="reverse" checked={block.reverse || false} onCheckedChange={c => onChange({ reverse: c })} />
          <label htmlFor="reverse" className="text-xs font-bold">Inverter Ordem (Imagem à direita)</label>
        </div>
      )}

      {block.type === 'system' && (
        <div>
          <label className="text-xs font-bold block mb-1">Componente de Sistema</label>
          <div className="bg-muted p-2 rounded text-sm text-muted-foreground font-mono">
             {block.system}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Este módulo é injetado pelo sistema e não pode ser alterado.</p>
        </div>
      )}

      {block.type === 'cards' && (
        <div className="space-y-3">
          <label className="text-xs font-bold block">Cartões</label>
          {block.cards?.map((card: any, i: number) => (
            <div key={i} className="p-3 border border-border rounded-lg bg-muted/30 space-y-2">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-xs font-bold text-muted-foreground">Card {i+1}</span>
                 <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => {
                   const newCards = [...block.cards];
                   newCards.splice(i, 1);
                   onChange({ cards: newCards });
                 }}>Remover</Button>
               </div>
               <Input placeholder="Título" value={card.title || ''} onChange={e => {
                 const newCards = [...block.cards];
                 newCards[i].title = e.target.value;
                 onChange({ cards: newCards });
               }} />
               <Textarea placeholder="Texto" rows={2} value={card.body || ''} onChange={e => {
                 const newCards = [...block.cards];
                 newCards[i].body = e.target.value;
                 onChange({ cards: newCards });
               }} />
               <Input placeholder="Link (opcional)" value={card.href || ''} onChange={e => {
                 const newCards = [...block.cards];
                 newCards[i].href = e.target.value;
                 onChange({ cards: newCards });
               }} />
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={() => {
            const newCards = [...(block.cards || []), { title: 'Novo Card', body: '' }];
            onChange({ cards: newCards });
          }}>Adicionar Card</Button>
        </div>
      )}

      {renderBaseProps()}
    </div>
  );
}
