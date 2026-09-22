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
  ChevronRight
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
import logoUrl from "@/assets/logo.png";

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
  const { toast } = useToast();
  
  // Donation State
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState<string>("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [preparedAmount, setPreparedAmount] = useState<number | null>(null);
  const [isDonationVisible, setIsDonationVisible] = useState(false);

  const donationValues = [25, 50, 100, 250];

  const handleDonate = () => {
    const amount = selectedValue ?? Number(customValue);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
      toast({
        title: "Valor inválido",
        description: "Selecione um valor positivo em reais, com até duas casas decimais.",
        variant: "destructive"
      });
      return;
    }

    setPreparedAmount(amount);
    setIsSuccessModalOpen(true);
  };

  useEffect(() => {
    const section = document.getElementById("doacao");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsDonationVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const scrollToDonate = () => {
    document.getElementById('doacao')?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 pb-20 lg:pb-0">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md py-4 border-b border-border/50">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl flex justify-between items-center gap-4">
          <Link href="/" className="flex items-center">
             <img src={logoUrl} alt="INCESC" className="h-8 sm:h-10 w-auto object-contain" />
          </Link>
          <Button 
             className="hidden sm:flex bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold"
            onClick={scrollToDonate}
          >
            Doe agora
          </Button>
        </div>
      </header>

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
                    Doe agora
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

        {/* Pain & Opportunity Section */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl/tight font-black mb-6">
                  Quando faltam oportunidades, o potencial de uma vida inteira pode permanecer invisível.
                </h2>
                <p className="text-primary-foreground/80 text-lg leading-relaxed mb-8">
                  Muitas pessoas ainda enfrentam barreiras para acessar educação, saúde, cultura, esporte e condições dignas de desenvolvimento.
                </p>
                <p className="text-primary-foreground/80 text-lg leading-relaxed">
                  Uma doação não resolve apenas uma necessidade imediata: ela ajuda a criar acesso, estimular talentos, fortalecer vínculos e ampliar as possibilidades de futuro.
                </p>
              </div>
              <div className="grid gap-4">
                {[
                  "Mais acesso ao conhecimento",
                  "Apoio a comunidades vulneráveis",
                  "Promoção da saúde e do bem-estar",
                  "Incentivo à cultura, ao esporte e à cidadania"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 bg-primary-foreground/10 p-5 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
                    <span className="font-bold text-lg">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-24 bg-background border-b border-border/50">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-black mb-6">Sua contribuição ajuda a transformar intenção em impacto.</h2>
               <Button onClick={scrollToDonate} variant="outline" className="font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-full px-6">
                 Doe agora
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: BookOpen, title: "Educação", desc: "Amplie o acesso a conhecimentos que abrem portas para novas possibilidades." },
                { icon: Heart, title: "Saúde", desc: "Contribua para ações que promovem bem-estar, cuidado e qualidade de vida." },
                { icon: Palette, title: "Cultura", desc: "Ajude a valorizar a arte, as histórias, a criatividade e a expressão humana." },
                { icon: Trophy, title: "Esporte", desc: "Apoie práticas que estimulam saúde, disciplina, integração e desenvolvimento." }
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Donation Section */}
        <section id="doacao" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <div className="bg-card rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-border/50 text-center">
              <h2 className="text-3xl lg:text-4xl font-black mb-4">Cada contribuição faz parte de algo maior.</h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
                Escolha o valor que melhor representa sua possibilidade hoje. O importante é participar da construção de uma sociedade mais justa e com mais oportunidades para todos.
              </p>

              <div className="max-w-2xl mx-auto space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {donationValues.map(val => (
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
                  ))}
                </div>

                 <div className="max-w-sm mx-auto">
                   <label htmlFor="custom-donation" className="block text-left font-semibold mb-2">Ou informe outro valor</label>
                   <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-muted-foreground font-black text-lg">
                    R$
                  </div>
                  <Input
                     id="custom-donation"
                    type="number"
                     inputMode="decimal"
                     min="0.01"
                     step="0.01"
                    placeholder="Outro valor"
                     className="pl-14 h-16 text-lg rounded-2xl border-2 focus-visible:border-secondary font-bold bg-background"
                    value={customValue}
                    onChange={(e) => {
                      setCustomValue(e.target.value);
                      setSelectedValue(null);
                    }}
                  />
                   </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl text-sm text-primary flex gap-3 items-start text-left max-w-lg mx-auto">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>A conexão de pagamento ainda não está ativa. Ao clicar abaixo, você apenas simulará a preparação da doação.</p>
                </div>

                <Button 
                  size="lg" 
                  className="w-full sm:w-auto min-w-[280px] h-16 text-lg rounded-full font-black bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleDonate}
                >
                   Preparar valor da doação
                   <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof (Pending States) */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
            <h2 className="text-3xl lg:text-4xl font-black mb-12 text-center">Quem participa também acredita nessa transformação.</h2>
            
             <div className="max-w-3xl mx-auto bg-muted/40 rounded-3xl p-8 md:p-12 border border-border/50 border-dashed text-center">
               <Info className="w-8 h-8 text-muted-foreground/60 mx-auto mb-4" />
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Conteúdo institucional pendente</p>
               <p className="text-muted-foreground">Relatos, imagens e resultados serão apresentados somente após validação pelo INCESC. Nenhum depoimento ou número foi criado para esta página.</p>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl text-center">
            <ShieldCheck className="w-12 h-12 text-secondary mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-black mb-6">Doe com confiança.</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed mb-12">
              O INCESC é uma instituição sem fins lucrativos que atua em iniciativas de interesse comunitário, com ações relacionadas à educação, saúde, cultura, esporte, voluntariado, pesquisa, desenvolvimento social e sustentabilidade.
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <a href="https://www.incesc.org.br/transparencia" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-primary-foreground/10 rounded-2xl hover:bg-primary-foreground/20 transition-colors">
                <span className="font-bold mb-2">Transparência</span>
                <ExternalLink className="w-4 h-4 opacity-50" />
              </a>
              <a href="https://www.incesc.org.br/etica-e-ouvidoria" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-primary-foreground/10 rounded-2xl hover:bg-primary-foreground/20 transition-colors">
                <span className="font-bold mb-2">Ética e Ouvidoria</span>
                <ExternalLink className="w-4 h-4 opacity-50" />
              </a>
              <a href="https://www.incesc.org.br/politica-de-privacidade" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-primary-foreground/10 rounded-2xl hover:bg-primary-foreground/20 transition-colors">
                <span className="font-bold mb-2">Privacidade</span>
                <ExternalLink className="w-4 h-4 opacity-50" />
              </a>
              <a href="https://www.incesc.org.br/documentos" target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-primary-foreground/10 rounded-2xl hover:bg-primary-foreground/20 transition-colors">
                <span className="font-bold mb-2">Documentos</span>
                <ExternalLink className="w-4 h-4 opacity-50" />
              </a>
            </div>
            
            <div className="mt-12 pt-12 border-t border-primary-foreground/10 text-primary-foreground/60 text-sm flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
              <span>CNPJ 49.637.563/0001-84</span>
              <span className="hidden sm:inline">•</span>
              <span>Telefone: +55 (62) 4101-5303</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">O futuro começa com uma atitude de hoje.</h2>
            <p className="text-muted-foreground text-lg mb-10">
              Apoie o INCESC e contribua para que mais pessoas tenham acesso a oportunidades capazes de transformar suas vidas.
            </p>
            <Button 
              size="lg" 
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xl px-10 py-7 rounded-full font-black shadow-lg shadow-secondary/20"
              onClick={scrollToDonate}
            >
              Doe agora
            </Button>
            <p className="text-sm text-muted-foreground mt-6 max-w-md mx-auto">
              O meio oficial de pagamento ainda não está conectado. Nenhum valor será cobrado nesta demonstração.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-12 text-center border-t border-border">
        <div className="container mx-auto px-4">
          <img src={logoUrl} alt="INCESC" className="h-8 w-auto object-contain mx-auto mb-6" />
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-muted-foreground mb-6">
            <a href="https://www.incesc.org.br/politica-de-privacidade" className="hover:text-foreground">Privacidade</a>
            <a href="https://www.incesc.org.br/transparencia" className="hover:text-foreground">Transparência</a>
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
          Doe agora
        </Button>
       </div>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-[425px] text-center p-8 bg-background rounded-3xl">
          <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <DialogHeader>
          <DialogTitle className="text-2xl font-black mb-2">Valor selecionado</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mb-6">
            Você selecionou {formatCurrency(preparedAmount ?? 0)}.
          </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted p-4 rounded-xl text-sm text-muted-foreground mb-6 text-left">
            <p>Este é um ambiente de demonstração. O pagamento ainda não está conectado; nenhuma doação foi feita e nenhum valor foi cobrado.</p>
          </div>

          <Button 
            className="w-full font-bold h-12 rounded-xl"
            onClick={() => setIsSuccessModalOpen(false)}
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
