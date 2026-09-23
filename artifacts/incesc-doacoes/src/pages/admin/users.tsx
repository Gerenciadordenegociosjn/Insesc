import { useAdminUsers, useUpdateUserRole } from "@/lib/api";
import { Users, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMe } from "@/lib/api";

export default function AdminUsers() {
  const { data: users = [], isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const { data: me } = useMe();

  if (me?.role !== "administrator") {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
        <ShieldAlert className="w-12 h-12 mb-4 text-destructive" />
        <p className="text-lg">Acesso negado. Apenas administradores podem gerenciar permissões.</p>
      </div>
    );
  }

  if (isLoading) return <div className="animate-pulse h-32 bg-card rounded-2xl" />;

  const handleRoleChange = (userId: string, role: string) => {
    updateRole.mutate({ id: userId, role });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black">Equipe e Usuários</h1>
        <p className="text-muted-foreground mt-2">Gerencie as permissões de acesso ao backoffice do instituto.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Nível de Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-base">{user.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={user.id === me?.userId || updateRole.isPending}
                        className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="unassigned">Não atribuído (Público)</option>
                        <option value="administrator">Administrador do Sistema</option>
                        <option value="financial">Financeiro</option>
                        <option value="content">Conteúdo</option>
                        <option value="transparency">Transparência</option>
                        <option value="auditor">Auditor</option>
                        <option value="support">Suporte</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhum usuário encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
