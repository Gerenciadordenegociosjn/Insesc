import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen,
  Palette,
  Heart,
  Trophy,
  ShieldCheck,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SiteHeader } from "@/components/site-header";
import logoUrl from "@/assets/logo.png";
import { usePublicActions, useCreateCheckout, useCheckoutStatus, Action } from "@/lib/api";

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

const categoryIcons: Record<string, any> = {
  "Educação": BookOpen,
  "Saúde": Heart,
  "Cultura": Palette,
  "Esporte": Trophy,
};

export default function Home() {
  const { toast } = useToast();
  const { data: actions = [], isLoading } = usePublicActions();
  const { data: checkoutStatus, isLoading: isLoadingCheckoutStatus } = useCheckoutStatus();
  const createCheckout = useCreateCheckout();
  
  // Donation State
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState<string>("");
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isDonationVisible, setIsDonationVisible] = useState(false);

  // New form fields
  const [communicationConsent, setCommunicationConsent] = useState<boolean>(false);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const openDonationModal = (action: Action | null = null) => {
    setSelectedAction(action);
    setSelectedValue(null);
    setCustomValue("");
    setCommunicationConsent(false);
    setIsDonationModalOpen(true);
  };

  const handleDonate = () => {
    if (!selectedAction) return;

    const amount = selectedValue ?? Number(customValue);
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
      toast({
        title: "Valor inválido",
        description: "O valor deve estar entre R$ 1,00 e R$ 100.000,00.",
        variant: "destructive"
      });
      return;
    }

    if (!checkoutStatus?.available) {
      toast({
        title: "Checkout indisponível",
        description: checkoutStatus?.reason || "Não foi possível iniciar o pagamento no momento.",
        variant: "destructive"
      });
      return;
    }

    createCheckout.mutate(
      { 
        actionId: selectedAction.id, 
        amountCents: Math.round(amount * 100),
        anonymous: true,
        communicationConsent: communicationConsent
      },
      {
        onSuccess: (data) => {
          if (data.checkoutUrl) window.location.href = data.checkoutUrl;
        },
        onError: (err: any) => {
          toast({
            title: "Erro ao iniciar doação",
            description: err.message || "Tente novamente mais tarde.",
            variant: "destructive"
          });
        }
      }
    );
  };

  useEffect(() => {
    const section = document.getElementById("doacoes");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsDonationVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [actions]);

  const scrollToDonate = () => {
    document.getElementById('doacoes')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 pb-20 lg:pb-0">
      <SiteHeader />

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

        {/* Actions Section */}
        <section id="doacoes" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-black mb-6">Apoie nossas ações</h2>
              <p className="text-lg text-muted-foreground">Conheça as iniciativas ativas do INCESC e escolha onde você quer fazer a diferença.</p>
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-80 bg-card rounded-3xl animate-pulse border border-border" />
                ))}
              </div>
            ) : actions.filter(a => a.status === 'published').length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {actions.filter(a => a.status === 'published').map((action) => {
                  const Icon = categoryIcons[action.category] || Heart;
                  const progress = Math.min(100, Math.round((action.raisedCents / (action.goalCents || 1)) * 100)) || 0;
                  
                  return (
                    <motion.div 
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-card p-8 rounded-3xl border border-border flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-primary uppercase tracking-wider">{action.category}</span>
                      </div>
                      
                      <h3 className="text-2xl font-black mb-3 leading-tight">{action.title}</h3>
                      <p className="text-muted-foreground text-sm flex-grow mb-6 line-clamp-3">{action.publicDescription}</p>
                      
                      <div className="mb-6 space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span>{formatCurrency(action.raisedCents / 100)}</span>
                          {action.goalCents !== null && (
                            <span className="text-muted-foreground text-xs">de {formatCurrency(action.goalCents / 100)}</span>
                          )}
                        </div>
                        {action.goalCents !== null && (
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>

                      <Button 
                        onClick={() => openDonationModal(action)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-12"
                        disabled={isLoadingCheckoutStatus || !checkoutStatus?.available}
                        title={checkoutStatus?.available ? "" : checkoutStatus?.reason}
                      >
                        {isLoadingCheckoutStatus ? "Aguarde..." : "Apoiar iniciativa"}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-12 bg-card border border-border border-dashed rounded-3xl">
                <p className="text-muted-foreground text-lg mb-6">Não há ações abertas para captação no momento.</p>
              </div>
            )}
          </div>
        </section>

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

      {/* Footer */}
      <footer className="bg-muted py-12 text-center border-t border-border">
        <div className="container mx-auto px-4">
          <img src={logoUrl} alt="INCESC" className="h-8 w-auto object-contain mx-auto mb-6" />
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-muted-foreground mb-6">
            <a href="https://www.incesc.org.br/politica-de-privacidade" className="hover:text-foreground">Privacidade</a>
            <Link href="/transparencia" data-testid="link-footer-transparency" className="hover:text-foreground">Transparência</Link>
            <Link href="/minha-jornada" data-testid="link-footer-journey" className="hover:text-foreground">Minha jornada</Link>
            <a href="https://www.incesc.org.br/etica-e-ouvidoria" className="hover:text-foreground">Atendimento</a>
          </div>
           <p className="text-xs text-muted-foreground">Instituto INCESC · CNPJ 49.637.563/0001-84</p>
        </div>
      </footer>

      {/* Floating Action Button for Mobile */}
       <div
        className={`fixed bottom-4 right-4 left-4 z-30 lg:hidden pointer-events-none flex justify-center ${isDonationVisible ? 'hidden' : ''}`}
      >
        <Button 
          size="lg" 
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-2xl shadow-secondary/30 rounded-full w-full max-w-sm h-14 text-lg font-black pointer-events-auto"
          onClick={scrollToDonate}
        >
          Ver ações para apoiar
        </Button>
       </div>

      {/* Donation Modal */}
      <Dialog open={isDonationModalOpen} onOpenChange={setIsDonationModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-8 bg-background rounded-[2.5rem]">
          <DialogHeader className="text-left mb-6">
            <DialogTitle className="text-3xl font-black mb-2">
              Apoiar iniciativa
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Você está contribuindo para: <span className="font-bold text-foreground">{selectedAction?.title}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {(selectedAction?.suggestedAmounts || [2500, 5000, 10000, 25000]).map(valCents => {
                const val = valCents / 100;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={selectedValue === val}
                    onClick={() => { setSelectedValue(val); setCustomValue(""); }}
                    className={`py-4 px-2 rounded-2xl border-2 text-center font-black text-lg transition-all ${
                      selectedValue === val 
                        ? 'border-secondary bg-secondary text-secondary-foreground scale-105' 
                        : 'border-border bg-background text-foreground hover:border-secondary/40 hover:bg-secondary/5'
                    }`}
                  >
                    {formatCurrency(val)}
                  </button>
                )
              })}
            </div>

            <div>
              <label htmlFor="custom-donation-modal" className="block text-left font-semibold mb-2 text-sm text-muted-foreground">Ou informe outro valor (R$ 1 a R$ 100.000)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-muted-foreground font-black text-lg">
                  R$
                </div>
                <Input
                  id="custom-donation-modal"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="100000"
                  step="0.01"
                  placeholder="Outro valor"
                  className="pl-14 h-14 text-lg rounded-2xl border-2 focus-visible:border-secondary font-bold bg-background"
                  value={customValue}
                  onChange={(e) => {
                    setCustomValue(e.target.value);
                    setSelectedValue(null);
                  }}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border text-left">
              <p className="text-sm leading-snug">
                <span className="font-bold block">Doação anônima</span>
                <span className="text-muted-foreground">As doações são processadas como anônimas. O histórico individual em “Minha Jornada” não está disponível.</span>
              </p>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="communication-consent"
                  className="mt-1 w-4 h-4 rounded border-border"
                  checked={communicationConsent}
                  onChange={(e) => setCommunicationConsent(e.target.checked)}
                />
                <label htmlFor="communication-consent" className="text-sm leading-snug">
                  <span className="font-bold block">Aceito receber comunicações</span>
                  <span className="text-muted-foreground">Gostaria de receber atualizações sobre as ações do INCESC.</span>
                </label>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl text-sm text-primary flex gap-3 items-start text-left">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                {isLoadingCheckoutStatus 
                  ? "Verificando disponibilidade de pagamento..."
                  : checkoutStatus?.available 
                    ? "Você será redirecionado para a página segura de pagamento."
                    : checkoutStatus?.reason || "A conexão de pagamento não está ativa no momento."}
              </p>
            </div>

            <Button 
              size="lg" 
              className="w-full h-14 text-lg rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground flex justify-between items-center px-6"
              onClick={handleDonate}
              disabled={createCheckout.isPending || !checkoutStatus?.available || isLoadingCheckoutStatus}
            >
              <span>{createCheckout.isPending ? "Preparando..." : "Ir para pagamento"}</span>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
