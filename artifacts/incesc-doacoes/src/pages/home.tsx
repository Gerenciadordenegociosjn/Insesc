import { motion } from "framer-motion";
import { ShieldCheck, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { usePublicPortalPage } from "@/lib/api";
import { BlockRenderer } from "@/components/portal-blocks";
import { SiteFooter } from "@/components/site-footer";
import { SystemActions } from "@/components/system-modules";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Home() {
  const { data: page, isLoading: isPageLoading, error: pageError } = usePublicPortalPage("home");

  const scrollToDonate = () => {
    document.getElementById('doacoes')?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <main>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-2xl">
              <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl lg:text-6xl/tight font-black mb-6 text-foreground">
                Sua doação transforma possibilidades em <span className="text-secondary">novas histórias.</span>
              </motion.h1>
              
              <motion.p variants={fadeIn} className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Educação, saúde, cultura e esporte podem abrir caminhos para pessoas e comunidades em situação de vulnerabilidade. Apoie o INCESC e ajude a construir um futuro mais justo, inclusivo e sustentável.
              </motion.p>
              
              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button 
                  size="lg" 
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6 rounded-full font-bold w-full sm:w-auto"
                  onClick={scrollToDonate}
                >
                  Ver causas para doar
                </Button>
              </motion.div>

              <motion.div variants={fadeIn} className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 p-4 rounded-2xl border border-border/50">
                <ShieldCheck className="w-5 h-5 text-secondary shrink-0" />
                <p>Uma instituição sem fins lucrativos dedicada ao desenvolvimento humano e ao fortalecimento das comunidades.</p>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-border/60"
            >
              <div className="text-center p-8 max-w-sm">
                <Info className="w-8 h-8 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground/80 uppercase tracking-widest mb-2">Espaço Editorial</p>
                <p className="text-sm text-muted-foreground">Reservado para fotografia oficial do instituto acompanhando projetos reais, respeitando diretrizes de privacidade.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SystemActions />

      {/* Social Proof (Pending States) */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          <h2 className="text-3xl lg:text-4xl font-black mb-12 text-center">Quem participa também acredita nessa transformação.</h2>
           <div className="max-w-3xl mx-auto bg-primary-foreground/5 rounded-3xl p-8 md:p-12 border border-primary-foreground/10 border-dashed text-center">
             <Info className="w-8 h-8 text-primary-foreground/60 mx-auto mb-4" />
             <p className="text-sm font-medium text-primary-foreground uppercase tracking-widest mb-2">Conteúdo institucional pendente</p>
             <p className="text-primary-foreground/80">Relatos, imagens e resultados serão apresentados somente após validação pelo INCESC. Nenhum depoimento ou número foi criado para esta página.</p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl text-center">
          <ShieldCheck className="w-12 h-12 text-secondary mx-auto mb-6" />
          <h2 className="text-3xl lg:text-4xl font-black mb-6">Doe com confiança.</h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-12">
            O INCESC é uma instituição sem fins lucrativos que atua em iniciativas de interesse comunitário, com ações relacionadas à educação, saúde, cultura, esporte, voluntariado, pesquisa, desenvolvimento social e sustentabilidade.
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <a href="https://www.incesc.org.br/transparencia" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-muted/50 rounded-2xl hover:bg-muted transition-colors">
              <span className="font-bold mb-2">Transparência</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="https://www.incesc.org.br/etica-e-ouvidoria" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-muted/50 rounded-2xl hover:bg-muted transition-colors">
              <span className="font-bold mb-2">Ética e Ouvidoria</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="https://www.incesc.org.br/politica-de-privacidade" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-muted/50 rounded-2xl hover:bg-muted transition-colors">
              <span className="font-bold mb-2">Privacidade</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="https://www.incesc.org.br/documentos" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-muted/50 rounded-2xl hover:bg-muted transition-colors">
              <span className="font-bold mb-2">Documentos</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 pb-20 lg:pb-0 flex flex-col">
      <SiteHeader />

      {page && page.status === 'published' ? (
        <main className="flex-1">
          {page.blocks.map(block => (
            <BlockRenderer 
              key={block.id} 
              block={block} 
              mediaList={page.media || []}
              systemComponents={{ actions: <SystemActions /> }} 
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
