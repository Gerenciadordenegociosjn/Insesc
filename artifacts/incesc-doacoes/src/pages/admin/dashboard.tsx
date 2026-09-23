import { useAdminDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Target, Receipt, HeartHandshake } from "lucide-react";

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return <div className="space-y-4">
      <div className="h-10 w-48 bg-muted animate-pulse rounded" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card border border-border animate-pulse rounded-2xl" />)}
      </div>
    </div>;
  }

  // Fallback to empty if endpoint doesn't exist yet
  const stats = data || {
    totalRaisedCents: 0,
    receiptsAwaitingReview: 0,
    activeActions: 0,
    totalDonations: 0,
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  const cards = [
    {
      title: "Total Arrecadado",
      value: formatCurrency(stats.totalRaisedCents || 0),
      icon: HeartHandshake,
      color: "text-primary"
    },
    {
      title: "Despesas P/ Revisão",
      value: stats.receiptsAwaitingReview || 0,
      icon: Receipt,
      color: "text-secondary"
    },
    {
      title: "Ações Ativas",
      value: stats.activeActions || 0,
      icon: Target,
      color: "text-accent"
    },
    {
      title: "Doações Recebidas",
      value: stats.totalDonations || 0,
      icon: Activity,
      color: "text-muted-foreground"
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Visão Geral</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <Card key={i} className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
