import { useAdminDonations, useAdminActions } from "@/lib/api";
import { HeartHandshake } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminDonations() {
  const { data: donations = [], isLoading } = useAdminDonations();
  const { data: actions = [] } = useAdminActions();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  if (isLoading) return <div className="animate-pulse h-32 bg-card rounded-2xl" />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black">Registro de Doações</h1>
        <p className="text-muted-foreground mt-2">Acompanhe todas as contribuições realizadas no portal.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {donations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Iniciativa (Ação)</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donations.map(donation => {
                  const action = actions.find(a => a.id === donation.actionId);
                  return (
                    <tr key={donation.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(donation.createdAt), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 font-black text-secondary text-base">
                        {formatCurrency(donation.amountCents)}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {action?.title || "Doação Livre"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          donation.paymentStatus === 'paid' ? 'bg-success/10 text-success' :
                          donation.paymentStatus === 'failed' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {donation.paymentStatus === 'paid' ? 'Pago' : donation.paymentStatus === 'pending' ? 'Pendente' : 'Falha'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <HeartHandshake className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhuma doação registrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
