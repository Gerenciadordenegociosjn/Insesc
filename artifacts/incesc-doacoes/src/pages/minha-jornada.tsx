import { HeartHandshake, LockKeyhole, Route } from "lucide-react";
import { InteriorLayout } from "@/components/interior-layout";

export default function MinhaJornada() {
  return (
    <InteriorLayout
      eyebrow="Participação e acompanhamento"
      title="Minha jornada"
      description="Um espaço pensado para acompanhar sua participação nas iniciativas do INCESC, com respeito à privacidade de quem apoia e de quem é atendido."
    >
      <section className="px-4 pb-16 pt-4 sm:pb-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10">
            <span className="mb-7 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm font-bold text-secondary">
              <Route aria-hidden="true" className="h-4 w-4" /> Ainda não disponível
            </span>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">Sua participação merece um acompanhamento de verdade.</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              No momento, esta página não possui contas de apoiadores nem está conectada a um sistema de pagamentos. Por isso, não podemos mostrar um histórico de contribuições ou progresso pessoal.
            </p>
            <div data-testid="status-journey-history" className="mt-8 rounded-2xl bg-muted/60 p-6">
              <p className="font-bold">Histórico de contribuições</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Indisponível. Os valores escolhidos na página de doação são apenas uma demonstração e não geram uma doação nem um registro pessoal.
              </p>
            </div>
          </div>
          <div className="space-y-5 pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Como essa área deve funcionar</p>
            <div className="flex gap-4 border-b border-border pb-6">
              <HeartHandshake aria-hidden="true" className="h-7 w-7 shrink-0 text-secondary" />
              <div>
                <h3 className="text-lg font-bold">Participação com contexto</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Quando houver uma integração oficial, o apoiador poderá acompanhar apenas informações ligadas às suas próprias contribuições confirmadas.</p>
              </div>
            </div>
            <div className="flex gap-4 border-b border-border pb-6">
              <LockKeyhole aria-hidden="true" className="h-7 w-7 shrink-0 text-secondary" />
              <div>
                <h3 className="text-lg font-bold">Privacidade em primeiro lugar</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Dados de apoiadores e beneficiários não devem ser expostos publicamente. O acesso pessoal depende de autenticação e regras de proteção de dados.</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enquanto isso, você pode conhecer as informações institucionais no <a href="https://www.incesc.org.br/" target="_blank" rel="noopener noreferrer" data-testid="link-official-incesc" className="font-semibold text-primary underline-offset-4 hover:underline">site oficial do INCESC</a>.
            </p>
          </div>
        </div>
      </section>
    </InteriorLayout>
  );
}