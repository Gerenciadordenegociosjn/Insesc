import { useEffect } from "react";
import { useLocation } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { useCheckoutStatusResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ConfirmationPage() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session_id");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useCheckoutStatusResult(sessionId || "");

  useEffect(() => {
    if (data?.paymentStatus === "paid") {
      // Invalidate caches to refresh data
      queryClient.invalidateQueries({ queryKey: ["public", "actions"] });
      queryClient.invalidateQueries({ queryKey: ["public", "transparency"] });
      queryClient.invalidateQueries({ queryKey: ["me", "donations"] });
    }
  }, [data, queryClient]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background font-sans flex flex-col">
        <SiteHeader />
        <main className="flex-grow flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border shadow-sm text-center">
            <div className="flex flex-col items-center">
              <XCircle className="w-16 h-16 text-destructive mb-6" />
              <h1 className="text-2xl font-black mb-2">Link Inválido</h1>
              <p className="text-muted-foreground mb-8">
                O link de confirmação acessado não contém uma sessão válida.
              </p>
              <Button onClick={() => navigate("/")} className="rounded-xl w-full h-12 font-bold">
                Voltar ao Início
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border shadow-sm text-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
              <h1 className="text-2xl font-black mb-2">Processando...</h1>
              <p className="text-muted-foreground">Aguarde enquanto confirmamos sua doação.</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center">
              <XCircle className="w-16 h-16 text-destructive mb-6" />
              <h1 className="text-2xl font-black mb-2">Erro ao confirmar</h1>
              <p className="text-muted-foreground mb-8">
                Não conseguimos validar o status da sua doação no momento.
              </p>
              <Button onClick={() => navigate("/")} className="rounded-xl w-full h-12 font-bold">
                Voltar ao Início
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {data.paymentStatus === "paid" ? (
                <>
                  <CheckCircle2 className="w-16 h-16 text-success mb-6" />
                  <h1 className="text-3xl font-black mb-2 text-foreground">Doação Confirmada!</h1>
                  <p className="text-muted-foreground mb-4">
                    Sua contribuição foi processada com sucesso e já está fazendo a diferença. Muito obrigado!
                  </p>
                  {(data.refundedCents && data.refundedCents > 0) ? (
                    <div className="bg-warning/10 text-warning-foreground p-4 rounded-xl mb-8 w-full">
                      <p className="text-sm font-bold">Aviso de Reembolso Parcial</p>
                      <p className="text-xs">
                        Foi processado um reembolso parcial de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.refundedCents / 100)}.
                        Sua doação líquida validada é de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((data.netAmountCents || (data.amountCents || 0) - data.refundedCents) / 100)}.
                      </p>
                    </div>
                  ) : <div className="mb-8" />}
                </>
              ) : data.paymentStatus === "failed" || data.paymentStatus === "refunded" ? (
                <>
                  <XCircle className="w-16 h-16 text-destructive mb-6" />
                  <h1 className="text-2xl font-black mb-2">Falha no Pagamento</h1>
                  <p className="text-muted-foreground mb-8">
                    Sua doação foi marcada como {data.paymentStatus === "refunded" ? "reembolsada" : "falha"}. Se achar que houve um erro, tente novamente ou contate-nos.
                  </p>
                </>
              ) : (
                <>
                  <Clock className="w-16 h-16 text-warning mb-6" />
                  <h1 className="text-2xl font-black mb-2">Aguardando Pagamento</h1>
                  <p className="text-muted-foreground mb-8">
                    Sua doação foi registrada, mas o pagamento ainda está sendo processado pelo provedor.
                  </p>
                </>
              )}
              
              <div className="flex flex-col gap-3 w-full">
                <Button onClick={() => navigate("/minha-jornada")} className="rounded-xl w-full h-12 font-bold bg-primary text-primary-foreground">
                  Acompanhar Minha Jornada <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl w-full h-12 font-bold">
                  Voltar ao Início
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
