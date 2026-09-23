import { useAdminAuditLogs } from "@/lib/api";
import { FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminAuditLogs() {
  const { data: logs = [], isLoading } = useAdminAuditLogs();

  if (isLoading) return <div className="animate-pulse h-32 bg-card rounded-2xl" />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black">Logs de Auditoria</h1>
        <p className="text-muted-foreground mt-2">Registro de atividades sensíveis realizadas no backoffice.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Usuário ID</th>
                  <th className="px-6 py-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {log.createdAt ? format(new Date(log.createdAt), "dd MMM yyyy, HH:mm", { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground capitalize">
                      {log.action?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {log.userId}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhum registro de auditoria encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
