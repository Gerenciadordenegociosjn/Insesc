import { ArrowUpRight, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { InteriorLayout } from "@/components/interior-layout";

const officialLinks = [
  {
    title: "Transparência institucional",
    description: "Consulte as informações divulgadas diretamente pelo INCESC em seu portal oficial.",
    href: "https://www.incesc.org.br/transparencia",
    testId: "link-official-transparency",
    icon: ShieldCheck,
  },
  {
    title: "Documentos institucionais",
    description: "Acesse os documentos publicados pelo instituto em seu próprio site.",
    href: "https://www.incesc.org.br/documentos",
    testId: "link-official-documents",
    icon: FileText,
  },
  {
    title: "Política de privacidade",
    description: "Entenda como o instituto apresenta suas diretrizes de privacidade.",
    href: "https://www.incesc.org.br/politica-de-privacidade",
    testId: "link-official-privacy",
    icon: LockKeyhole,
  },
];

export default function Transparencia() {
  return (
    <InteriorLayout
      eyebrow="Prestação de contas"
      title="Portal da transparência"
      description="Um espaço para acompanhar informações oficiais do INCESC e encontrar as fontes institucionais de prestação de contas."
    >
      <section className="px-4 pb-16 pt-4 sm:pb-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Compromisso com a clareza</p>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">Transparência exige informações verificáveis.</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Esta página reúne caminhos para consultar documentos e informações publicados pelo próprio instituto. Registros específicos de campanhas, despesas ou comprovantes não estão integrados a este site de doações.
            </p>
            <div data-testid="status-campaign-records" className="mt-8 rounded-2xl border border-border bg-muted/60 p-6">
              <p className="mb-2 font-bold text-foreground">Registros de campanhas neste portal</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ainda não disponíveis aqui. Nenhum valor arrecadado, despesa, comprovante ou beneficiário é exibido sem documentação oficial validada e proteção dos dados pessoais.
              </p>
            </div>
          </div>
          <div>
            <h2 className="mb-5 text-xl font-black">Fontes oficiais do INCESC</h2>
            <div className="space-y-3">
              {officialLinks.map(({ title, description, href, icon: Icon, testId }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={testId}
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <span className="flex-1">
                    <span className="block font-bold text-foreground">{title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                </a>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Canal de atendimento: <a className="font-semibold text-primary underline-offset-4 hover:underline" href="tel:+556241015303">+55 (62) 4101-5303</a>
            </p>
          </div>
        </div>
      </section>
    </InteriorLayout>
  );
}