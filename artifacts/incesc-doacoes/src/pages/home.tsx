import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Palette,
  Heart,
  Trophy,
  ShieldCheck,
  TrendingUp,
  Target,
  FileCheck,
  CheckCircle2,
  X,
  Lock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { actions, formatCurrency, getProgress, globalGoal, type Action } from "@/data";
import heroImg from "@assets/generated_images/hero-community.jpg";

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
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState<string>("");
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isDonating, setIsDonating] = useState(false);

  // Other Modals
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);
  const [isGamificationOpen, setIsGamificationOpen] = useState(false);

  const handleOpenDonation = (action: Action) => {
    setSelectedAction(action);
    setSelectedValue(null);
    setCustomValue("");
    setIsDonationModalOpen(true);
  };

  const handleDonate = () => {
    const amount = selectedValue || parseFloat(customValue.replace(',', '.'));
    if (!amount || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, selecione ou informe um valor para doação.",
        variant: "destructive"
      });
      return;
    }

    setIsDonating(true);
    // Simulate network request
    setTimeout(() => {
      setIsDonating(false);
      setIsDonationModalOpen(false);
      toast({
        title: "Doação simulada com sucesso!",
        description: `Obrigado por apoiar a ação: ${selectedAction?.title}.`,
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-secondary/30">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur-md text-primary-foreground py-4 border-b border-white/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-3 font-display font-bold text-xl tracking-wide group">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-black group-hover:scale-105 transition-transform">
              I
            </span>
            INCESC
          </Link>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none border-white/30 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setIsTransparencyOpen(true)}
            >
              Portal da transparência
            </Button>
            <Button 
              className="flex-1 sm:flex-none bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:-translate-y-0.5 transition-transform"
              onClick={() => setIsGamificationOpen(true)}
            >
              Minha jornada
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden text-white">
          <div className="absolute inset-0 bg-primary">
            {/* Fallback pattern if image is missing/loading */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            {/* The generated image with an overlay */}
            <img 
              src={heroImg} 
              alt="Comunidade em ação" 
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-transparent"></div>
          </div>

          <div className="container relative z-10 mx-auto px-4 lg:px-8 max-w-6xl">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
              <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                <motion.div variants={fadeIn} className="text-secondary font-bold tracking-widest uppercase text-sm mb-6 flex items-center gap-2">
                  <span className="w-8 h-[2px] bg-secondary inline-block"></span>
                  Educação • Cultura • Saúde • Esporte
                </motion.div>
                
                <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl lg:text-6xl/tight font-black mb-6">
                  Sua doação transforma possibilidades em <span className="text-secondary">novas histórias.</span>
                </motion.h1>
                
                <motion.p variants={fadeIn} className="text-lg text-white/80 max-w-xl mb-10 leading-relaxed">
                  O INCESC atua para expandir, incluir, ensinar, repensar a realidade e ressignificar valores. Escolha uma ação e ajude a transformar recursos em impacto real.
                </motion.p>
                
                <motion.div variants={fadeIn}>
                  <Button 
                    size="lg" 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-105 transition-transform text-lg px-8 py-6 rounded-full"
                    onClick={() => {
                      document.getElementById('acoes')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Escolher uma ação
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl"
              >
                <div className="text-sm font-medium text-white/80 mb-2">Meta geral das ações prioritárias</div>
                <div className="text-4xl font-black mb-1">{formatCurrency(globalGoal.raised)}</div>
                <div className="text-sm text-white/70 mb-6">arrecadados de {formatCurrency(globalGoal.target)}</div>
                
                <Progress 
                  value={getProgress(globalGoal.raised, globalGoal.target)} 
                  className="h-3 bg-white/20" 
                  indicatorClassName="bg-gradient-to-r from-secondary to-yellow-300"
                />
                
                <div className="mt-6 flex items-start gap-3 bg-primary/40 p-4 rounded-xl text-sm text-white/90">
                  <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <p>Cada contribuição é associada a uma finalidade e poderá ser acompanhada no Portal da Transparência.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Actions Grid */}
        <section id="acoes" className="py-24 bg-background">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
            <div className="max-w-2xl mb-16">
              <div className="text-primary font-bold tracking-widest uppercase text-sm mb-4">Escolha onde apoiar</div>
              <h2 className="text-3xl lg:text-4xl font-black text-foreground mb-4">Seu gesto pode atender uma necessidade específica.</h2>
              <p className="text-muted-foreground text-lg">
                Selecione uma ação para consultar sua meta, seus valores de doação e a finalidade dos recursos arrecadados.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {actions.map((action, i) => {
                const progress = getProgress(action.raised, action.goal);
                return (
                  <motion.article 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    key={action.id} 
                    className="flex flex-col bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-shadow duration-300 group"
                  >
                    <div className="h-40 bg-gradient-to-br from-primary to-primary/80 relative p-6 flex items-start">
                      <div className="absolute -right-8 -top-12 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-colors"></div>
                      <span className="relative z-10 bg-secondary text-secondary-foreground text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
                        {action.category}
                      </span>
                    </div>
                    
                    <div className="p-6 md:p-8 flex flex-col flex-1">
                      <h3 className="text-xl font-bold mb-3">{action.title}</h3>
                      <p className="text-muted-foreground text-sm mb-8 leading-relaxed flex-1">
                        {action.description}
                      </p>

                      <div className="mt-auto">
                        <div className="flex justify-between text-sm font-bold mb-2">
                          <span className="text-foreground">{formatCurrency(action.raised)}</span>
                          <span className="text-primary">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2.5 mb-2" indicatorClassName="bg-primary" />
                        <div className="text-xs text-muted-foreground font-medium mb-6">
                          Meta: {formatCurrency(action.goal)}
                        </div>

                        <Button 
                          className="w-full bg-primary/5 hover:bg-primary text-primary hover:text-white border-none shadow-none font-bold"
                          onClick={() => handleOpenDonation(action)}
                        >
                          Apoiar esta ação
                        </Button>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-24 bg-white border-y border-border/50">
          <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="text-secondary font-bold tracking-widest uppercase text-sm mb-4">O propósito do INCESC</div>
              <h2 className="text-3xl lg:text-4xl font-black mb-6">Recursos para promover desenvolvimento integral.</h2>
              <p className="text-muted-foreground text-lg">
                As ações estão alinhadas à missão institucional de promover cultura, educação, saúde, esporte, cidadania, voluntariado e desenvolvimento sustentável.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: BookOpen, title: "Educação", desc: "Conhecimento para ampliar oportunidades e fortalecer a cidadania." },
                { icon: Palette, title: "Cultura", desc: "Valorização da arte, da criatividade, da identidade e da inclusão." },
                { icon: Heart, title: "Saúde", desc: "Apoio ao bem-estar e à qualidade de vida das comunidades." },
                { icon: Trophy, title: "Esporte", desc: "Integração, disciplina, desenvolvimento e participação social." }
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="bg-background p-8 rounded-3xl border border-border/60 hover:border-primary/30 transition-colors"
                >
                  <div className="w-14 h-14 bg-secondary/20 text-secondary-foreground rounded-2xl flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-24 bg-primary text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="container relative z-10 mx-auto px-4 lg:px-8 max-w-6xl">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-16 items-center">
              <div>
                <div className="text-secondary font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Confiança e responsabilidade
                </div>
                <h2 className="text-3xl lg:text-4xl font-black mb-6">Você acompanha o destino da sua contribuição.</h2>
                <p className="text-white/80 text-lg leading-relaxed">
                  O Portal da Transparência deverá apresentar as atividades concluídas, os pagamentos realizados, os documentos comprobatórios e o status de cada ação, sempre respeitando a privacidade das pessoas envolvidas.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Target, title: "01. Ação definida", desc: "Finalidade clara antes da doação." },
                  { icon: TrendingUp, title: "02. Meta acompanhável", desc: "Progresso atualizado por ação." },
                  { icon: CheckCircle2, title: "03. Pagamento registrado", desc: "Despesas vinculadas à finalidade." },
                  { icon: FileCheck, title: "04. Comprovante revisado", desc: "Documentos com dados sensíveis ocultados." }
                ].map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm"
                  >
                    <item.icon className="w-6 h-6 text-secondary mb-4" />
                    <strong className="block text-white font-bold mb-2">{item.title}</strong>
                    <span className="text-white/70 text-sm">{item.desc}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-border text-center">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 font-display font-black text-2xl text-primary mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground text-sm">
              I
            </span>
            INCESC
          </div>
          <p className="text-muted-foreground">Expandir, incluir, ensinar e transformar vidas.</p>
        </div>
      </footer>

      {/* Floating Action Button for Mobile/Scroll */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-30 lg:hidden"
      >
        <Button 
          size="lg" 
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-2xl shadow-secondary/20 rounded-full px-8 h-14 text-lg font-bold"
          onClick={() => document.getElementById('acoes')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Doe agora
        </Button>
      </motion.div>

      {/* MODALS */}
      
      {/* Donation Modal */}
      <Dialog open={isDonationModalOpen} onOpenChange={setIsDonationModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background rounded-3xl border-border/50 shadow-2xl">
          <div className="p-6 sm:p-8">
            <DialogHeader className="mb-6 text-left">
              <div className="text-primary font-bold tracking-widest uppercase text-xs mb-2">Sua contribuição</div>
              <DialogTitle className="text-2xl font-black">Escolha o valor</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Apoiando a ação: <strong className="text-foreground">{selectedAction?.title}</strong>
              </DialogDescription>
            </DialogHeader>

            {selectedAction && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedAction.values.map(val => (
                    <button
                      key={val}
                      onClick={() => { setSelectedValue(val); setCustomValue(""); }}
                      className={`py-3 px-2 rounded-xl border-2 text-center font-bold transition-all ${
                        selectedValue === val 
                          ? 'border-primary bg-primary text-primary-foreground scale-[1.02]' 
                          : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5'
                      }`}
                    >
                      {formatCurrency(val)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground font-bold">
                    R$
                  </div>
                  <Input
                    type="number"
                    placeholder="Ou informe outro valor"
                    className="pl-12 h-14 text-lg rounded-xl border-2 focus-visible:ring-0 focus-visible:border-primary"
                    value={customValue}
                    onChange={(e) => {
                      setCustomValue(e.target.value);
                      setSelectedValue(null);
                    }}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm leading-relaxed border border-blue-100 dark:border-blue-900/50 flex gap-3 items-start">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>No ambiente de produção, este botão deverá encaminhar para o checkout oficial, Pix ou outro meio autorizado pelo INCESC.</p>
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleDonate}
                  disabled={isDonating}
                >
                  {isDonating ? 'Processando...' : 'Continuar para doação'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transparency Modal */}
      <Dialog open={isTransparencyOpen} onOpenChange={setIsTransparencyOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background rounded-3xl max-h-[85vh] flex flex-col">
          <div className="p-6 sm:p-8 border-b border-border/50 shrink-0">
            <DialogHeader className="text-left">
              <div className="text-primary font-bold tracking-widest uppercase text-xs mb-2">Prestação de contas</div>
              <DialogTitle className="text-2xl font-black">Portal da transparência</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Exemplo de como as ações concluídas e pagas poderão ser apresentadas. Dados fictícios.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
            {[
              { title: "Conta de energia elétrica", status: "PAGO", cpf: "Beneficiário relacionado: CPF ***.***.***-42", value: "R$ 680,00", link: "Visualizar comprovante revisado", done: true },
              { title: "Kit de apoio para atividade educacional", status: "PAGO", cpf: "Dados pessoais protegidos conforme política de privacidade.", value: "R$ 1.250,00", link: "Visualizar comprovante revisado", done: true },
              { title: "Adote uma pessoa neurodivergente", status: "EM EXECUÇÃO", cpf: "A identidade do beneficiário não é publicada.", value: "R$ 900,00", link: "Ver detalhes da ação", done: false }
            ].map((item, idx) => (
              <div key={idx} className="p-5 border border-border rounded-2xl bg-card">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h4 className="font-bold text-foreground">{item.title}</h4>
                  <span className={`text-xs font-black px-2 py-1 rounded-md shrink-0 ${item.done ? 'bg-success/10 text-success' : 'bg-secondary/20 text-secondary-foreground'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Lock className="w-3.5 h-3.5" />
                  {item.cpf}
                </div>
                <div className="text-sm mb-4">
                  {item.done ? 'Valor pago: ' : 'Valor comprometido: '}<strong className="text-foreground">{item.value}</strong>
                </div>
                <button 
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5"
                  onClick={() => toast({ title: "Documento simulado", description: "O comprovante abriria aqui com tarjas de segurança na versão final." })}
                >
                  <FileCheck className="w-4 h-4" />
                  {item.link}
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gamification Modal */}
      <Dialog open={isGamificationOpen} onOpenChange={setIsGamificationOpen}>
        <DialogContent className="sm:max-w-[450px] p-6 sm:p-8 bg-background rounded-3xl">
          <DialogHeader className="text-left mb-6">
            <div className="text-secondary font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Gamificação
            </div>
            <DialogTitle className="text-2xl font-black">Minha jornada de impacto</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground leading-relaxed mb-6">
            Área reservada para a futura lógica de gamificação: níveis de apoiador, conquistas, histórico de contribuições, desafios coletivos e badges.
          </p>

          <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl text-sm text-primary-foreground dark:text-primary-foreground flex gap-3 items-start">
            <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-foreground">A gamificação deve incentivar a participação sem expor valores doados, dados pessoais ou criar competição inadequada entre beneficiários.</p>
          </div>
          
          <div className="mt-8 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="font-bold">Entendi</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
