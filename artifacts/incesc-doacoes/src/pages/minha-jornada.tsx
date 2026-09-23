import { SiteHeader } from "@/components/site-header";
import { useUser, SignOutButton } from "@clerk/react";
import { Link } from "wouter";
import { useMyDonations, usePublicActions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, ArrowRight, UserCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MinhaJornada() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { data: donations = [], isLoading: isLoadingDonations } = useMyDonations();
  const { data: actions = [], isLoading: isLoadingActions } = usePublicActions();

  const isLoading = isLoadingDonations || isLoadingActions;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  const paidDonations = donations.filter(d => d.paymentStatus === "paid");

  if (!isLoaded) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader />
      
      <main className="flex-grow py-16 lg:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {!isSignedIn ? (
            <div className="text-center py-20 bg-card rounded-[2.5rem] border border-border shadow-sm px-6 max-w-2xl mx-auto">
              <UserCircle2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
              <h1 className="text-3xl lg:text-4xl font-black mb-4">Minha Jornada</h1>
              <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
                Acompanhe o impacto da sua participação. Acesse seu histórico de contribuições reais ao INCESC.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/sign-in">
                  <Button size="lg" className="w-full sm:w-auto font-bold h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                    Entrar na minha conta
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold h-14 px-8 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-xl">
                    Criar meu cadastro
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 bg-card p-8 rounded-[2rem] border border-border">
                <div>
                  <h1 className="text-3xl font-black mb-2">Olá, {user.firstName || "Doador"}!</h1>
                  <p className="text-muted-foreground">Bem-vindo(a) à sua área pessoal de acompanhamento.</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="font-bold border-border rounded-xl" asChild>
                    <Link href="/">Fazer nova doação</Link>
                  </Button>
                  <SignOutButton>
                    <Button variant="ghost" className="text-muted-foreground hover:text-destructive rounded-xl px-3">
                      <LogOut className="w-5 h-5 sm:mr-2" />
                      <span className="hidden sm:inline">Sair</span>
                    </Button>
                  </SignOutButton>
                </div>
              </header>

              <div className="space-y-6">
                <h2 className="text-2xl font-black mb-6">Histórico de Contribuições</h2>
                
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 bg-card rounded-2xl animate-pulse border border-border" />
                    ))}
                  </div>
                ) : paidDonations.length > 0 ? (
                  <div className="space-y-4">
                    {paidDonations.map(donation => {
                      const action = actions.find(a => a.id === donation.actionId);
                      return (
                        <div key={donation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-card rounded-2xl border border-border hover:shadow-md transition-shadow gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                              <Heart className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{action?.title || "Doação Livre ao Instituto"}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(donation.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="sm:text-right ml-16 sm:ml-0">
                            <p className="text-xl font-black text-secondary">{formatCurrency(donation.netAmountCents ?? donation.amountCents)}</p>
                            {donation.refundedCents && donation.refundedCents > 0 ? (
                              <p className="text-xs font-bold text-warning uppercase tracking-wider mb-1">Reembolso parcial</p>
                            ) : (
                              <p className="text-xs font-bold text-success uppercase tracking-wider">Pago</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-muted/30 rounded-3xl border border-border border-dashed px-4">
                    <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Sua jornada começa aqui</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-8">
                      Você ainda não possui contribuições confirmadas. Que tal conhecer as iniciativas que estão transformando vidas hoje?
                    </p>
                    <Button asChild size="lg" className="font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-14">
                      <Link href="/#doacoes">
                        Conhecer ações <ArrowRight className="ml-2 w-5 h-5" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
