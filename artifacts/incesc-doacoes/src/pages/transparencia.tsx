import { SiteHeader } from "@/components/site-header";
import { Link } from "wouter";
import { useTransparency } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, ArrowLeft, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoUrl from "@/assets/logo.png";

export default function Transparencia() {
  const { data: transparencyData = [], isLoading } = useTransparency();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteHeader />
      
      <main className="py-16 lg:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
          </div>

          <header className="mb-16 text-center">
            <ShieldCheck className="w-16 h-16 text-secondary mx-auto mb-6" />
            <h1 className="text-4xl lg:text-5xl font-black mb-6">Portal da Transparência</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Acompanhe o destino dos recursos arrecadados e as despesas aprovadas de cada iniciativa. 
              Nosso compromisso é com a clareza e a responsabilidade.
            </p>
          </header>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="h-64 bg-card rounded-3xl animate-pulse border border-border" />
              ))}
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
                        <p className="text-2xl font-black text-primary">{formatCurrency(summary.paidCents)}</p>
                      </div>
                      <div className="bg-background p-4 rounded-2xl border border-border">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Investido</p>
                        <p className="text-2xl font-black text-secondary">{formatCurrency(summary.usedCents)}</p>
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
                              <span className="font-black text-lg">{formatCurrency(expense.amountCents)}</span>
                              {expense.publicReceiptPath && (
                                <a 
                                  href={expense.publicReceiptPath} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-secondary hover:underline flex items-center gap-1"
                                >
                                  Ver comprovante
                                  <ExternalLink className="w-3 h-3" />
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
      </main>

      <footer className="bg-muted py-12 text-center border-t border-border mt-auto">
        <div className="container mx-auto px-4">
          <img src={logoUrl} alt="INCESC" className="h-8 w-auto object-contain mx-auto mb-6 opacity-80" />
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
             Instituto INCESC · CNPJ 49.637.563/0001-84<br/>
             Consulte também nossos <a href="https://www.incesc.org.br/documentos" className="underline hover:text-foreground">documentos oficiais</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
