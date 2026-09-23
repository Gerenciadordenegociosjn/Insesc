import { SiteHeader } from "@/components/site-header";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, UserCircle2 } from "lucide-react";

export default function MinhaJornada() {
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader />
      <main className="flex-grow py-16 lg:py-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center py-20 bg-card rounded-[2.5rem] border border-border shadow-sm px-6">
            <UserCircle2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
            <h1 className="text-3xl lg:text-4xl font-black mb-4">Minha Jornada</h1>
            <p className="text-lg text-muted-foreground mb-8">
              O histórico individual de contribuições ainda não está disponível nesta plataforma.
              Você pode fazer uma doação anônima e acompanhar as ações do INCESC pelo portal público.
            </p>
            <Button asChild size="lg" className="font-bold rounded-xl">
              <Link href="/#doacoes">Conhecer ações <ArrowRight className="ml-2 w-5 h-5" /></Link>
            </Button>
            <Heart className="w-7 h-7 text-primary/30 mx-auto mt-10" />
          </div>
        </div>
      </main>
    </div>
  );
}