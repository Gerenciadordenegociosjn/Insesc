import { useAdminUsers, useUpdateUserRole, useCreateAdminUser } from "@/lib/api";
import { Users, ShieldAlert } from "lucide-react";
import { useMe } from "@/lib/api";
import { useEffect, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminUsers() {
  const { data: users = [], isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const createUser = useCreateAdminUser();
  const { data: me } = useMe();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("support");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdUsername, setCreatedUsername] = useState("");
  const [createError, setCreateError] = useState("");
  const [roleError, setRoleError] = useState("");
  useEffect(() => () => setTemporaryPassword(""), []);

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
    setRoleError("");
    updateRole.mutate({ id: userId, role }, {
      onError: (error) => setRoleError(error.message || "Não foi possível atualizar o perfil."),
    });
  };
  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    setCreateError("");
    setTemporaryPassword("");
    createUser.mutate({ username, name: name || undefined, role }, {
      onSuccess: (result) => { setTemporaryPassword(result.temporaryPassword); setCreatedUsername(username); setUsername(""); setName(""); },
      onError: (error) => setCreateError(error.message || "Não foi possível criar o usuário."),
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black">Equipe e Usuários</h1>
        <p className="text-muted-foreground mt-2">Gerencie as permissões de acesso ao backoffice do instituto.</p>
      </div>
      <form onSubmit={handleCreate} className="bg-card border border-border rounded-2xl p-6 mb-8 grid md:grid-cols-4 gap-3 items-end">
        <div><label className="text-sm font-bold block mb-2">Usuário</label><Input data-testid="input-new-username" value={username} onChange={e => setUsername(e.target.value)} required /></div>
        <div><label className="text-sm font-bold block mb-2">Nome (opcional)</label><Input data-testid="input-new-name" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="text-sm font-bold block mb-2">Perfil</label><select data-testid="select-new-role" value={role} onChange={e => setRole(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3"><option value="administrator">Administrador</option><option value="financial">Financeiro</option><option value="content">Conteúdo</option><option value="transparency">Transparência</option><option value="auditor">Auditor</option><option value="support">Suporte</option></select></div>
        <Button data-testid="button-create-user" type="submit" disabled={createUser.isPending}>Criar usuário</Button>
      </form>
      {createError && <p data-testid="status-create-user-error" className="mb-4 text-sm text-destructive">{createError}</p>}
      {roleError && <p data-testid="status-role-error" className="mb-4 text-sm text-destructive">{roleError}</p>}
      {temporaryPassword && <div data-testid="status-temporary-password" className="mb-8 rounded-xl border border-primary bg-primary/5 p-4"><strong>Senha temporária para {createdUsername} (exiba uma única vez):</strong> <code>{temporaryPassword}</code></div>}

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
                    <td className="px-6 py-4 font-bold text-base">{user.username || user.name || user.email || "Usuário sem nome"}</td>
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
