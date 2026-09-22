export type Action = {
  id: string;
  category: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  values: number[];
};

export const actions: Action[] = [
  {
    id: "aluguel",
    category: "Manutenção",
    title: "Aluguel do instituto",
    description: "Ajude a manter o espaço onde as ações, atendimentos e projetos comunitários acontecem.",
    goal: 8000,
    raised: 4900,
    values: [25, 50, 100, 250],
  },
  {
    id: "energia",
    category: "Estrutura",
    title: "Conta de luz do instituto",
    description: "Contribua para manter o instituto funcionando e preparado para receber a comunidade.",
    goal: 3000,
    raised: 2140,
    values: [20, 40, 80, 160],
  },
  {
    id: "neurodivergente",
    category: "Inclusão",
    title: "Adote uma pessoa neurodivergente",
    description: "Apoie custos de acompanhamento e inclusão, com proteção integral da identidade do beneficiário.",
    goal: 12000,
    raised: 7380,
    values: [50, 100, 200, 500],
  },
  {
    id: "educacao",
    category: "Educação",
    title: "Materiais para atividades educacionais",
    description: "Ajude a adquirir materiais necessários para oficinas, aulas e atividades de desenvolvimento.",
    goal: 6000,
    raised: 2860,
    values: [25, 75, 150, 300],
  },
  {
    id: "cultura",
    category: "Cultura",
    title: "Ações culturais e artísticas",
    description: "Contribua para atividades que valorizam a cultura, a arte e a expressão da comunidade.",
    goal: 5000,
    raised: 3750,
    values: [30, 60, 120, 240],
  },
  {
    id: "esporte",
    category: "Esporte",
    title: "Equipamentos esportivos",
    description: "Apoie a compra de equipamentos para atividades de esporte, integração e saúde.",
    goal: 7000,
    raised: 3190,
    values: [40, 80, 160, 320],
  },
];

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const getProgress = (raised: number, goal: number) => {
  return Math.min(Math.round((raised / goal) * 100), 100);
};

export const globalGoal = {
  raised: 18420,
  target: 30000,
};
