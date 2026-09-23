import { useLocation, Link } from "wouter";
import { PortalBlock, PortalMedia } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

export function BlockRenderer({ block, systemComponents, mediaList = [] }: { block: PortalBlock, systemComponents?: Record<string, ReactNode>, mediaList?: PortalMedia[] }) {
  const alignClass = block.alignment === 'center' ? 'text-center mx-auto' : block.alignment === 'right' ? 'text-right ml-auto' : 'text-left';
  const bgClasses: Record<string, string> = {
    muted: 'bg-muted',
    primary: 'bg-primary text-primary-foreground',
    transparent: 'bg-transparent'
  };
  const bgClass = block.background ? bgClasses[block.background] || 'bg-transparent' : 'bg-transparent';
  const widthClass = block.width === 'narrow' ? 'max-w-3xl' : block.width === 'wide' ? 'max-w-7xl' : block.width === 'full' ? 'max-w-full px-0' : 'max-w-5xl';
  const containerClass = `container mx-auto px-4 ${widthClass} py-12 md:py-16`;

  switch (block.type) {
    case 'hero':
      return (
        <div className={`${bgClass} w-full`}>
          <div className={containerClass}>
            <div className={`flex flex-col md:flex-row gap-8 items-center ${block.alignment === 'center' ? 'md:flex-col text-center' : ''}`}>
              <div className={`flex-1 ${alignClass}`}>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">{block.heading}</h1>
                {block.body && <p className="text-lg text-muted-foreground mb-8">{block.body}</p>}
                {block.cta && block.cta.href && (
                  <Button asChild size="lg" className="rounded-full text-lg px-8">
                    {block.cta.href.startsWith("https://") ? <a href={block.cta.href} target="_blank" rel="noopener noreferrer">{block.cta.label}</a> : <Link href={block.cta.href}>{block.cta.label}</Link>}
                  </Button>
                )}
              </div>
              {block.imageId && (
                <div className="flex-1 w-full flex justify-center">
                   <MediaRenderer mediaId={block.imageId} mediaList={mediaList} className="rounded-2xl max-h-[500px] object-cover shadow-xl" />
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className={`${bgClass} w-full`}>
          <div className={containerClass}>
            <div className={alignClass}>
              {block.heading && <h2 className="text-3xl font-black mb-6">{block.heading}</h2>}
              <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                {block.body}
              </div>
            </div>
          </div>
        </div>
      );

    case 'banner':
      return (
        <div className={`${bgClass} w-full py-16`}>
          <div className={containerClass}>
            <div className={`flex flex-col md:flex-row items-center justify-between gap-8 ${alignClass}`}>
               {block.imageId && <MediaRenderer mediaId={block.imageId} mediaList={mediaList} className="w-32 h-32 object-contain hidden md:block" />}
               <h3 className="text-3xl md:text-4xl font-black max-w-3xl leading-tight">{block.text}</h3>
               {block.cta && block.cta.href && (
                 <Button asChild size="lg" className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0">
                    {block.cta.href.startsWith("https://") ? <a href={block.cta.href} target="_blank" rel="noopener noreferrer">{block.cta.label}</a> : <Link href={block.cta.href}>{block.cta.label}</Link>}
                 </Button>
               )}
            </div>
          </div>
        </div>
      );

    case 'split':
      return (
        <div className={`${bgClass} w-full`}>
          <div className={containerClass}>
            <div className={`flex flex-col gap-12 items-center ${block.reverse ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
              <div className="flex-1 w-full">
                 <MediaRenderer mediaId={block.mediaId} mediaList={mediaList} className="w-full h-auto rounded-3xl object-cover shadow-lg aspect-[4/3]" />
              </div>
              <div className={`flex-1 ${alignClass}`}>
                {block.heading && <h2 className="text-3xl font-black mb-6">{block.heading}</h2>}
                <div className="prose prose-lg dark:prose-invert text-muted-foreground whitespace-pre-wrap">
                  {block.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'image':
      return (
        <div className={`${bgClass} w-full`}>
          <div className={`${containerClass} flex flex-col items-center`}>
            <MediaRenderer mediaId={block.mediaId} mediaList={mediaList} className="max-w-full h-auto rounded-xl shadow-md" />
            {block.caption && <p className="text-sm text-muted-foreground mt-4 italic text-center">{block.caption}</p>}
          </div>
        </div>
      );

    case 'cards':
      return (
        <div className={`${bgClass} w-full`}>
          <div className={containerClass}>
            {block.heading && <h2 className={`text-3xl font-black mb-12 ${alignClass}`}>{block.heading}</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {block.cards?.map((card: any, i: number) => (
                <div key={i} className="bg-card border border-border p-6 rounded-2xl flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                  <p className="text-muted-foreground mb-6 flex-1">{card.body}</p>
                  {card.href && (
                    <Button variant="outline" asChild className="w-full mt-auto">
                       {card.href.startsWith("https://") ? <a href={card.href} target="_blank" rel="noopener noreferrer">Saiba mais</a> : <Link href={card.href}>Saiba mais</Link>}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'gallery':
      return (
        <div className={`${bgClass} w-full`}>
          <div className={containerClass}>
             {block.heading && <h2 className={`text-3xl font-black mb-12 ${alignClass}`}>{block.heading}</h2>}
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {block.mediaIds?.map((id: string, i: number) => (
                  <div key={i} className="aspect-square relative overflow-hidden rounded-xl bg-muted">
                    <MediaRenderer mediaId={id} mediaList={mediaList} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
             </div>
          </div>
        </div>
      );

    case 'system':
      if (systemComponents && block.system && systemComponents[block.system]) {
        return (
          <div className={`${bgClass} w-full`}>
            {systemComponents[block.system]}
          </div>
        );
      }
      return (
        <div data-system-block={block.system} className={`${bgClass} w-full py-16 text-center border-y-2 border-dashed border-primary/20 my-8 bg-primary/5 flex flex-col items-center justify-center gap-4`}>
          <div className="bg-background p-4 rounded-xl shadow-sm border border-border">
            <p className="font-bold text-lg text-foreground mb-1">Módulo do Sistema: {block.system}</p>
            <p className="text-sm text-muted-foreground">O conteúdo real deste módulo é injetado pelo sistema apenas na visualização final.</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function MediaRenderer({ mediaId, mediaList = [], className }: { mediaId: string; mediaList?: PortalMedia[]; className?: string }) {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  if (!mediaId) return <div className={`bg-muted border border-dashed flex items-center justify-center text-muted-foreground text-xs ${className}`}>Sem imagem</div>;
  
  const mediaItem = mediaList.find(m => m.id === mediaId);
  const altText = mediaItem?.altText || "";

  if (mediaItem && mediaItem.url) {
    return <img src={mediaItem.url} alt={altText} className={className} loading="lazy" />;
  }

  const fallbackUrl = isAdmin ? `/api/admin/portal/media/${mediaId}` : `/api/public/portal/media/${mediaId}`;
  return <img src={fallbackUrl} alt={altText} className={className} loading="lazy" />;
}
