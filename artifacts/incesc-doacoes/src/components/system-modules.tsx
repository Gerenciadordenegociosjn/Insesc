import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Heart, BookOpen, Palette, Trophy, 
  Info, ChevronRight, FileText, Calendar, 
  ExternalLink, UserCircle2, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  usePublicActions, useCreateCheckout, useCheckoutStatus, 
  Action, useTransparency 
} from "@/lib/api";

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const categoryIcons: Record<string, any> = {
  "Educação": BookOpen,
  "Saúde": Heart,
  "Cultura": Palette,
  "Esporte": Trophy,
};

export function SystemActions() {
  const { toast } = useToast();
  const { data: actions = [], isLoading } = usePublicActions();
  const { data: checkoutStatus, isLoading: isLoadingCheckoutStatus } = useCheckoutStatus();
  const createCheckout = useCreateCheckout();
  
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState<string>("");
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isDonationVisible, setIsDonationVisible] = useState(false);
  const [communicationConsent, setCommunicationConsent] = useState<boolean>(false);

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
      toast({ title: "Valor inválido", description: "O valor deve estar entre R$ 1,00 e R$ 100.000,00.", variant: "destructive" });
      return;
    }
    if (!checkoutStatus?.available) {
      toast({ title: "Checkout indisponível", description: checkoutStatus?.reason || "Não foi possível iniciar o pagamento no momento.", variant: "destructive" });
      return;
    }
    createCheckout.mutate(
      { actionId: selectedAction.id, amountCents: Math.round(amount * 100), anonymous: true, communicationConsent },
      {
        onSuccess: (data) => { if (data.checkoutUrl) window.location.href = data.checkoutUrl; },
        onError: (err: any) => toast({ title: "Erro ao iniciar doação", description: err.message || "Tente novamente mais tarde.", variant: "destructive" })
      }
    );
  };

  useEffect(() => {
    const section = document.getElementById("doacoes");
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setIsDonationVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [actions]);

  const scrollToDonate = () => document.getElementById('doacoes')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <section id="doacoes" className="py-24 bg-muted/30 w-full">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-black mb-6">Apoie nossas ações</h2>
            <p className="text-lg text-muted-foreground">Conheça as iniciativas ativas do INCESC e escolha onde você quer fazer a diferença.</p>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-80 bg-card rounded-3xl animate-pulse border border-border" />)}
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
                    className="bg-card p-8 rounded-3xl border border-border flex flex-col hover:shadow-lg transition-shadow relative overflow-hidden text-left"
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

      <div className={`fixed bottom-4 right-4 left-4 z-30 lg:hidden pointer-events-none flex justify-center ${isDonationVisible ? 'hidden' : ''}`}>
        <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-2xl shadow-secondary/30 rounded-full w-full max-w-sm h-14 text-lg font-black pointer-events-auto" onClick={scrollToDonate}>
          Ver ações para apoiar
        </Button>
      </div>

      <Dialog open={isDonationModalOpen} onOpenChange={setIsDonationModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-8 bg-background rounded-[2.5rem]">
          <DialogHeader className="text-left mb-6">
            <DialogTitle className="text-3xl font-black mb-2">Apoiar iniciativa</DialogTitle>
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
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-muted-foreground font-black text-lg">R$</div>
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
                  onChange={(e) => { setCustomValue(e.target.value); setSelectedValue(null); }}
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
    </>
  );
}

export function SystemTransparency() {
  const { data: transparencyData = [], isLoading } = useTransparency();

  return (
    <div className="container mx-auto px-4 max-w-4xl py-12 w-full text-left">
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map(i => <div key={i} className="h-64 bg-card rounded-3xl animate-pulse border border-border" />)}
        </div>
      ) : transparencyData.length > 0 ? (
        <div className="space-y-12">
          {transparencyData.map(summary => (
            <section key={summary.id} className="bg-card rounded-3xl border border-border overflow-hidden">
              <div className="p-8 border-b border-border bg-muted/20">
                <h2 className="text-2xl font-black mb-6">{summary.title}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-background p-4 rounded-2xl border border-border">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Arrecadado</p>
                    <p className="text-2xl font-black text-primary">{formatCurrency(summary.paidCents / 100)}</p>
                  </div>
                  <div className="bg-background p-4 rounded-2xl border border-border">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Investido</p>
                    <p className="text-2xl font-black text-secondary">{formatCurrency(summary.usedCents / 100)}</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  Despesas Aprovadas
                </h3>
                
                {summary.expenses.length > 0 ? (
                  <div className="space-y-4">
                    {summary.expenses.map(expense => (
                      <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border gap-4">
                        <div>
                          <p className="font-bold text-lg mb-1">{expense.description}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {expense.paidAt ? format(new Date(expense.paidAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Não paga"}
                          </p>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto">
                          <span className="font-black text-lg">{formatCurrency(expense.amountCents / 100)}</span>
                          {expense.publicReceiptPath && (
                            <a href={expense.publicReceiptPath} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-secondary hover:underline flex items-center gap-1">
                              Ver comprovante <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-border">
                    <p className="text-muted-foreground">Nenhuma despesa foi aprovada e publicada para esta ação até o momento.</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed px-4">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sem registros financeiros públicos</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Não há dados financeiros consolidados disponíveis no momento. As informações serão publicadas aqui de forma transparente à medida que os recursos forem arrecadados e investidos nos projetos.
          </p>
        </div>
      )}
    </div>
  );
}

export function SystemJourney() {
  return (
    <div className="container mx-auto px-4 max-w-2xl py-12 w-full">
      <div className="text-center py-20 bg-card rounded-[2.5rem] border border-border shadow-sm px-6">
        <UserCircle2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
        <h1 className="text-3xl lg:text-4xl font-black mb-4">Minha Jornada</h1>
        <p className="text-lg text-muted-foreground mb-8">
          O histórico individual de contribuições ainda não está disponível nesta plataforma.
          Você pode fazer uma doação anônima e acompanhar as ações do INCESC pelo portal público.
        </p>
        <Button asChild size="lg" className="font-bold rounded-xl">
          <Link href="/#doacoes">Conhecer ações <ChevronRight className="ml-2 w-5 h-5" /></Link>
        </Button>
      </div>
    </div>
  );
}