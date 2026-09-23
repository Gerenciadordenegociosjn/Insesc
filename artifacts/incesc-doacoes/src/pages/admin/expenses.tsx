import { useState } from "react";
import { useAdminExpenses, useCreateExpense, useReviewExpense, usePublishExpense, useAdminActions, Expense, useRequestUploadUrl, useMe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit2, Receipt, ExternalLink, ShieldCheck, UploadCloud, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminExpenses() {
  const { data: expenses = [], isLoading: loadingExpenses } = useAdminExpenses();
  const { data: actions = [] } = useAdminActions();
  const { data: me } = useMe();
  const createExpense = useCreateExpense();
  const reviewExpense = useReviewExpense();
  const publishExpense = usePublishExpense();
  const requestUpload = useRequestUploadUrl();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form state
  const [actionId, setActionId] = useState("");
  const [category, setCategory] = useState("Materiais");
  const [description, setDescription] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [amountCents, setAmountCents] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Specific modals for Review/Publish
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewingExpense, setReviewingExpense] = useState<Expense | null>(null);
  const [redactedAttestation, setRedactedAttestation] = useState(false);
  
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishingExpense, setPublishingExpense] = useState<Expense | null>(null);

  const canCreate = me && ["administrator", "financial"].includes(me.role);
  const canReview = me && ["administrator", "financial", "transparency"].includes(me.role);
  const canPublish = me && ["administrator", "transparency"].includes(me.role);

  const openCreate = () => {
    setEditingExpense(null);
    setActionId(actions.length > 0 ? actions[0].id.toString() : "");
    setCategory("Materiais");
    setDescription("");
    setAmountCents("");
    setDate(new Date().toISOString().split('T')[0]);
    setFile(null);
    setIsModalOpen(true);
  };

  const uploadFile = async (f: File, purpose: 'original' | 'reviewed', expenseId?: string): Promise<string | null> => {
    try {
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        name: f.name,
        size: f.size,
        contentType: f.type,
        purpose,
        expenseId,
      });
      const res = await fetch(uploadURL, {
        method: "PUT",
        body: f,
        headers: { "Content-Type": f.type }
      });
      if (!res.ok) {
        throw new Error(`Falha no upload: ${res.statusText}`);
      }
      return objectPath;
    } catch (err: any) {
      toast({ title: "Erro de upload", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    let objectPath: string | undefined = undefined;

    if (file) {
      const res = await uploadFile(file, 'original');
      if (!res) {
        setUploading(false);
        return;
      }
      objectPath = res;
    }

    const data = {
      actionId,
      category,
      description,
      amountCents: Math.round(parseFloat(amountCents) * 100),
      paidAt: date ? new Date(date).toISOString() : undefined,
      originalReceiptPath: objectPath,
    };

    createExpense.mutate(data, {
      onSuccess: () => {
        setIsModalOpen(false);
        toast({ title: "Despesa criada com sucesso! Aguardando revisão." });
        setUploading(false);
      },
      onError: (err: any) => {
        toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
        setUploading(false);
      }
    });
  };

  const openReview = (expense: Expense) => {
    setReviewingExpense(expense);
    setPublicDescription(expense.publicDescription || "");
    setFile(null);
    setRedactedAttestation(false);
    setIsReviewOpen(true);
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingExpense || !file || !redactedAttestation) return;
    
    setUploading(true);
    const objectPath = await uploadFile(file, 'reviewed', reviewingExpense.id);
    if (!objectPath) {
      setUploading(false);
      return;
    }

    reviewExpense.mutate({
      id: reviewingExpense.id,
      data: {
        reviewedReceiptPath: objectPath,
        publicDescription,
        redactedAttestation: true,
      }
    }, {
      onSuccess: () => {
        setIsReviewOpen(false);
        toast({ title: "Despesa revisada e aprovada!" });
        setUploading(false);
      },
      onError: (err: any) => {
        toast({ title: "Erro ao revisar", description: err.message, variant: "destructive" });
        setUploading(false);
      }
    });
  };

  const openPublish = (expense: Expense) => {
    setPublishingExpense(expense);
    setIsPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!publishingExpense) return;
    publishExpense.mutate({ id: publishingExpense.id }, {
      onSuccess: () => {
        setIsPublishOpen(false);
        toast({ title: "Despesa publicada na Transparência!" });
      },
      onError: (err: any) => {
        toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" });
      }
    });
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  if (loadingExpenses) return <div className="animate-pulse h-32 bg-card rounded-2xl" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black">Despesas e Repasses</h1>
          <p className="text-muted-foreground mt-2">Gerencie as despesas que aparecerão no Portal da Transparência.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="font-bold rounded-xl h-11 px-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Plus className="w-5 h-5 mr-2" />
            Lançar Despesa
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição e Categoria</th>
                  <th className="px-6 py-4">Iniciativa</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Comprovantes</th>
                  <th className="px-6 py-4 text-right">Opções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map(expense => {
                  const action = actions.find(a => a.id === expense.actionId);
                  return (
                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {expense.paidAt ? format(new Date(expense.paidAt), "dd MMM yyyy", { locale: ptBR }) : "Não paga"}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        <div>{expense.description}</div>
                        <div className="text-xs text-muted-foreground font-normal">{expense.category}</div>
                      </td>
                      <td className="px-6 py-4">{action?.title || "Desconhecida"}</td>
                      <td className="px-6 py-4 font-black text-secondary">{formatCurrency(expense.amountCents)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          expense.status === 'published' ? 'bg-success/10 text-success' :
                          expense.status === 'approved' ? 'bg-primary/10 text-primary' :
                          expense.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {expense.status === 'published' ? 'Público' : 
                           expense.status === 'approved' ? 'Aprovada' :
                           expense.status === 'pending_review' ? 'Em análise' : 'Rejeitada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        {expense.originalReceiptPath && (
                          <div className="text-xs flex items-center gap-1">Orig: <ExternalLink className="w-3 h-3" /></div>
                        )}
                        {expense.reviewedReceiptPath && (
                          <div className="text-xs text-primary font-bold flex items-center gap-1">Rev: <ExternalLink className="w-3 h-3" /></div>
                        )}
                        {!expense.originalReceiptPath && !expense.reviewedReceiptPath && (
                          <span className="text-muted-foreground text-xs">Sem anexo</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {expense.status === "pending_review" && canReview && (
                          <Button variant="outline" size="sm" onClick={() => openReview(expense)} className="rounded-lg">
                            Revisar
                          </Button>
                        )}
                        {expense.status === "approved" && canPublish && (
                          <Button variant="default" size="sm" onClick={() => openPublish(expense)} className="rounded-lg bg-success hover:bg-success/90">
                            Publicar
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Receipt className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhuma despesa lançada.</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card p-6 sm:p-8 rounded-[2rem]">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black">
              Lançar Despesa
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold">Iniciativa vinculada</label>
              <select 
                required 
                value={actionId} 
                onChange={e => setActionId(e.target.value)}
                className="w-full flex h-11 items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>Selecione uma ação...</option>
                {actions.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Categoria</label>
                <select 
                  required 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full flex h-11 items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Materiais">Materiais</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Infraestrutura">Infraestrutura</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Data da Despesa</label>
                <Input 
                  required 
                  type="date"
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Descrição da Despesa (Uso interno)</label>
              <Input 
                required 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="rounded-xl h-11"
                placeholder="Ex: Compra de materiais didáticos NFe 123"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold">Valor (R$)</label>
              <Input 
                required 
                type="number" 
                step="0.01" 
                min="0.01"
                value={amountCents} 
                onChange={e => setAmountCents(e.target.value)} 
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2 border-t border-border pt-4 mt-4">
              <label className="text-sm font-bold flex items-center gap-2">
                <UploadCloud className="w-4 h-4" /> Comprovante Original (Opcional)
              </label>
              <p className="text-xs text-muted-foreground mb-2">Envie o recibo ou NF original (máx 25MB, PDF/Imagem). Documentos com dados sensíveis precisarão de versão rasurada na etapa de revisão.</p>
              <Input 
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)} 
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={uploading} className="w-full sm:w-auto rounded-xl font-bold h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {uploading ? "Salvando..." : "Salvar Lançamento (Rascunho)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 sm:p-8 rounded-[2rem] bg-card">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black">Revisar Despesa</DialogTitle>
            <DialogDescription>
              Para aprovar esta despesa, você deve fornecer uma versão pública da descrição e enviar o comprovante com dados sensíveis rasurados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReview} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold">Descrição Pública</label>
              <Input 
                required 
                value={publicDescription} 
                onChange={e => setPublicDescription(e.target.value)} 
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Comprovante Rasurado (Requerido)
              </label>
              <Input 
                required
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)} 
                className="rounded-xl"
              />
            </div>
            
            <div className="flex items-start gap-3 mt-4 bg-muted/30 p-4 rounded-xl border border-border">
              <input
                type="checkbox"
                id="redacted-attestation"
                className="mt-1 w-4 h-4 rounded border-border"
                checked={redactedAttestation}
                onChange={(e) => setRedactedAttestation(e.target.checked)}
              />
              <label htmlFor="redacted-attestation" className="text-sm leading-snug">
                Confirmo que verifiquei humanamente este documento e que ele <span className="font-bold text-destructive">não contém dados sensíveis</span> (foi corretamente rasurado para publicação).
              </label>
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={uploading || !file || !redactedAttestation} className="w-full rounded-xl font-bold h-11">
                {uploading ? "Enviando..." : "Aprovar Revisão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent className="sm:max-w-[400px] p-6 sm:p-8 rounded-[2rem] bg-card text-center">
          <AlertCircle className="w-16 h-16 text-warning mx-auto mb-4" />
          <DialogHeader className="mb-4 text-center">
            <DialogTitle className="text-2xl font-black mb-2">Publicar na Transparência?</DialogTitle>
            <DialogDescription>
              Atenção: A publicação requer que você não seja nem o criador nem o revisor original desta despesa. Ela passará a aparecer no portal público após esta ação.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center mt-6">
            <Button variant="outline" onClick={() => setIsPublishOpen(false)} className="rounded-xl h-11 px-6">Cancelar</Button>
            <Button onClick={handlePublish} disabled={publishExpense.isPending} className="bg-success hover:bg-success/90 rounded-xl font-bold h-11 px-6 text-white">
              {publishExpense.isPending ? "Publicando..." : "Sim, Publicar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
