import { useState } from "react";
import { useAdminActions, useCreateAction, useUpdateAction, Action, useMe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminActions() {
  const { data: actions = [], isLoading } = useAdminActions();
  const createAction = useCreateAction();
  const updateAction = useUpdateAction();
  const { toast } = useToast();
  const { data: me } = useMe();
  const canEdit = me && ["administrator", "content"].includes(me.role);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Educação");
  const [publicDescription, setPublicDescription] = useState("");
  const [goalCents, setGoalCents] = useState("10000.00");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");

  const openCreate = () => {
    setEditingAction(null);
    setTitle("");
    setSlug("");
    setCategory("Educação");
    setPublicDescription("");
    setGoalCents("");
    setStatus("draft");
    setIsModalOpen(true);
  };

  const openEdit = (action: Action) => {
    setEditingAction(action);
    setTitle(action.title);
    setSlug(action.slug);
    setCategory(action.category);
    setPublicDescription(action.publicDescription);
    setGoalCents(action.goalCents !== null ? (action.goalCents / 100).toFixed(2) : "");
    setStatus(action.status as any);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedGoal = parseFloat(goalCents);
    
    const data = {
      title,
      slug,
      category,
      publicDescription,
      goalCents: isNaN(parsedGoal) ? null : Math.round(parsedGoal * 100),
      suggestedAmounts: [2500, 5000, 10000, 25000], // In cents
      status
    };

    if (editingAction) {
      updateAction.mutate(
        { id: editingAction.id, data },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            toast({ title: "Ação atualizada com sucesso!" });
          }
        }
      );
    } else {
      createAction.mutate({ ...data, status: "draft" }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast({ title: "Ação criada com sucesso!" });
        }
      });
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  if (isLoading) return <div className="animate-pulse h-32 bg-card rounded-2xl" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-black">Ações e Campanhas</h1>
        {canEdit && (
          <Button onClick={openCreate} className="font-bold rounded-xl h-11 px-6">
            <Plus className="w-5 h-5 mr-2" />
            Nova Ação
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {actions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Título</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Arrecadação</th>
                  <th className="px-6 py-4 text-right">Opções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {actions.map(action => (
                  <tr key={action.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-base">{action.title}</td>
                    <td className="px-6 py-4">{action.category}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                        action.status === 'published' ? 'bg-success/10 text-success' :
                        action.status === 'archived' ? 'bg-muted text-muted-foreground' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {action.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <span className="text-secondary">{formatCurrency(action.raisedCents)}</span>
                      {action.goalCents !== null && (
                        <span className="text-muted-foreground text-xs ml-1">/ {formatCurrency(action.goalCents)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(action)} className="rounded-lg">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Activity className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhuma ação cadastrada.</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card p-6 sm:p-8 rounded-[2rem]">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black">
              {editingAction ? "Editar Ação" : "Nova Ação"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold">Título</label>
              <Input 
                required 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="rounded-xl h-11"
              />
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Slug (URL)</label>
                <Input 
                  required 
                  value={slug} 
                  onChange={e => setSlug(e.target.value)} 
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Categoria</label>
                <select 
                  required 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Educação">Educação</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Cultura">Cultura</option>
                  <option value="Esporte">Esporte</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Meta (R$) (Opcional)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={goalCents} 
                onChange={e => setGoalCents(e.target.value)} 
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Status</label>
              <select 
                required 
                value={status} 
                onChange={e => setStatus(e.target.value as any)}
                className="w-full flex h-11 items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                disabled={!editingAction} // New actions are always draft
              >
                <option value="draft">Rascunho</option>
                <option value="awaiting_approval">Aguardando Aprovação</option>
                <option value="published">Publicado</option>
                <option value="funded">Financiado (Atingiu Meta)</option>
                <option value="executing">Em Execução</option>
                <option value="completed">Concluído</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Descrição Pública</label>
              <textarea 
                required
                rows={4}
                value={publicDescription}
                onChange={e => setPublicDescription(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={createAction.isPending || updateAction.isPending} className="w-full sm:w-auto rounded-xl font-bold h-11">
                {(createAction.isPending || updateAction.isPending) ? "Salvando..." : "Salvar Ação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
