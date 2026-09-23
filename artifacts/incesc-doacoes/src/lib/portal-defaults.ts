import type { PortalBlock, PortalPage } from "@/lib/api";

const systemBlock = (system: string): PortalBlock => ({
  id: crypto.randomUUID(),
  type: "system",
  system,
});

export function currentPageBlocks(slug: string): PortalBlock[] {
  if (slug === "home") {
    return [
      {
        id: crypto.randomUUID(),
        type: "hero",
        heading: "Sua doação transforma possibilidades em novas histórias.",
        body: "Educação, saúde, cultura e esporte podem abrir caminhos para pessoas e comunidades em situação de vulnerabilidade. Apoie o INCESC e ajude a construir um futuro mais justo, inclusivo e sustentável.",
        cta: { label: "Ver causas para doar", href: "/#doacoes" },
        imagePlaceholder: "Reservado para fotografia oficial do instituto acompanhando projetos reais, respeitando diretrizes de privacidade.",
        width: "wide",
      },
      {
        id: crypto.randomUUID(),
        type: "text",
        body: "Uma instituição sem fins lucrativos dedicada ao desenvolvimento humano e ao fortalecimento das comunidades.",
        background: "muted",
        width: "wide",
      },
      systemBlock("actions"),
      {
        id: crypto.randomUUID(),
        type: "text",
        heading: "Quem participa também acredita nessa transformação.",
        body: "Conteúdo institucional pendente\nRelatos, imagens e resultados serão apresentados somente após validação pelo INCESC. Nenhum depoimento ou número foi criado para esta página.",
        background: "primary",
        alignment: "center",
        width: "wide",
      },
      {
        id: crypto.randomUUID(),
        type: "text",
        heading: "Doe com confiança.",
        body: "O INCESC é uma instituição sem fins lucrativos que atua em iniciativas de interesse comunitário, com ações relacionadas à educação, saúde, cultura, esporte, voluntariado, pesquisa, desenvolvimento social e sustentabilidade.",
        alignment: "center",
        width: "narrow",
      },
      {
        id: crypto.randomUUID(),
        type: "cards",
        cards: [
          { title: "Transparência", body: "", href: "https://www.incesc.org.br/transparencia" },
          { title: "Ética e Ouvidoria", body: "", href: "https://www.incesc.org.br/etica-e-ouvidoria" },
          { title: "Privacidade", body: "", href: "https://www.incesc.org.br/politica-de-privacidade" },
          { title: "Documentos", body: "", href: "https://www.incesc.org.br/documentos" },
        ],
        width: "wide",
      },
    ];
  }

  if (slug === "transparencia") {
    return [
      {
        id: crypto.randomUUID(),
        type: "text",
        heading: "Portal da Transparência",
        body: "Acompanhe o destino dos recursos arrecadados e as despesas aprovadas de cada iniciativa.\nNosso compromisso é com a clareza e a responsabilidade.",
        alignment: "center",
        width: "narrow",
      },
      systemBlock("transparency"),
    ];
  }

  if (slug === "minha-jornada") return [systemBlock("journey")];
  return [];
}

// Only the original, never-edited one-block drafts are upgraded in the editor.
// An intentionally edited or published page must never be replaced by a template.
export function isUninitializedCorePage(page: PortalPage): boolean {
  const expected = page.slug === "home" ? "actions" : page.slug === "transparencia" ? "transparency" : null;
  return !!expected &&
    page.status === "draft" &&
    page.version === 1 &&
    page.blocks.length === 1 &&
    page.blocks[0].type === "system" &&
    page.blocks[0].system === expected;
}