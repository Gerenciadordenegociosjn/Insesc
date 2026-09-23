import { type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { SiteHeader, donationUrl } from "@/components/site-header";
import logoUrl from "@/assets/logo.png";

type InteriorLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function InteriorLayout({ eyebrow, title, description, children }: InteriorLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="conteudo">
        <section className="bg-gradient-to-b from-muted/70 to-background px-4 pb-14 pt-12 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-6xl">
            <Link href="/" data-testid="link-back-home" className="mb-12 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Voltar à página inicial
            </Link>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-secondary">{eyebrow}</p>
            <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </section>
        {children}
        <section className="bg-primary px-4 py-16 text-primary-foreground sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary-foreground/70">INCESC</p>
              <h2 className="max-w-xl text-3xl font-black sm:text-4xl">Apoiar também é fazer parte da transformação.</h2>
            </div>
            <a href={donationUrl} data-testid="link-interior-donate" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-secondary px-7 font-bold text-secondary-foreground hover:bg-secondary/90">
              Doe agora <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
            </a>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-muted px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Link href="/" data-testid="link-footer-home" aria-label="Voltar à página inicial do INCESC">
            <img src={logoUrl} alt="INCESC" className="h-8 w-auto object-contain" />
          </Link>
          <p className="text-sm text-muted-foreground">Instituto INCESC · CNPJ 49.637.563/0001-84</p>
        </div>
      </footer>
    </div>
  );
}