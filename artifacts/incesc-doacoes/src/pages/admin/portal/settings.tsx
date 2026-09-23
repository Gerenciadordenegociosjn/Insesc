import { useState, useEffect } from "react";
import { useAdminPortalSettings, useUpdatePortalSettings, usePublishPortalSettings, useMe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Plus, Trash2, Globe, FileCheck } from "lucide-react";

export default function AdminPortalSettings() {
  const { data: settingsResponse, isLoading } = useAdminPortalSettings();
  const updateSettings = useUpdatePortalSettings();
  const publishSettings = usePublishPortalSettings();
  const { toast } = useToast();
  const { data: me } = useMe();
  const canPublish = me && ["administrator"].includes(me.role);

  const [form, setForm] = useState({
    footerInstitutional: "",
    officialLinks: [] as { label: string; href: string }[],
    contact: { email: "", phone: "", address: "" }
  });

  useEffect(() => {
    if (settingsResponse?.draft) {
      const settings = settingsResponse.draft;
      setForm({
        footerInstitutional: settings.footerInstitutional || "",
        officialLinks: settings.officialLinks || [],
        contact: {
          email: settings.contact?.email || "",
          phone: settings.contact?.phone || "",
          address: settings.contact?.address || "",
        }
      });
    }
  }, [settingsResponse]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (andPublish = false) => {
    if (!settingsResponse) return;
    setIsSaving(true);
    const payload = {
      ...form,
      contact: {
        email: form.contact.email || undefined,
        phone: form.contact.phone || undefined,
        address: form.contact.address || undefined,
      }
    };
    updateSettings.mutate({ draft: payload, expectedVersion: settingsResponse.version }, {
      onSuccess: (updatedData) => {
        setIsSaving(false);
        toast({ title: "Sucesso", description: "Configurações salvas." });
        if (andPublish) {
          publishSettings.mutate({ expectedVersion: updatedData.version }, {
            onSuccess: () => toast({ title: "Sucesso", description: "Configurações publicadas." }),
            onError: (err: any) => toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" })
          });
        }
      },
      onError: (err: any) => {
        setIsSaving(false);
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    });
  };

  const handlePublish = () => {
    handleSave(true);
  };

  const hasUnsavedChanges = settingsResponse ? (
    JSON.stringify(form) !== JSON.stringify({
      footerInstitutional: settingsResponse.draft.footerInstitutional || "",
      officialLinks: settingsResponse.draft.officialLinks || [],
      contact: {
        email: settingsResponse.draft.contact?.email || "",
        phone: settingsResponse.draft.contact?.phone || "",
        address: settingsResponse.draft.contact?.address || "",
      }
    })
  ) : false;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    (window as any).__hasUnsavedChanges = hasUnsavedChanges;
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      (window as any).__hasUnsavedChanges = false;
    };
  }, [hasUnsavedChanges]);

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted rounded"></div></div>;

  return (
    <div className="space-y-8 relative">
      {isSaving && (
        <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] flex items-center justify-center cursor-not-allowed rounded-xl">
          <div className="bg-card p-4 rounded-lg shadow-lg border border-border flex items-center gap-3 font-bold">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Salvando...
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          Configurações do Portal
        </h1>
        <div className="flex gap-3 items-center">
          {hasUnsavedChanges && <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Alterações não salvas</span>}
          <Button onClick={() => handleSave(false)} disabled={!hasUnsavedChanges || updateSettings.isPending || isSaving} variant="outline">
            <FileCheck className="w-4 h-4 mr-2" />
            {updateSettings.isPending || isSaving ? "Salvando..." : "Salvar Rascunho"}
          </Button>
          {canPublish && (
            <Button onClick={handlePublish} disabled={publishSettings.isPending || updateSettings.isPending || isSaving}>
              <FileCheck className="w-4 h-4 mr-2" />
              {publishSettings.isPending ? "Publicando..." : "Publicar"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="bg-card p-6 rounded-2xl border border-border">
            <h2 className="text-xl font-bold mb-4">Institucional no Rodapé</h2>
            <Textarea
              rows={6}
              placeholder="Texto institucional..."
              value={form.footerInstitutional}
              onChange={(e) => setForm({ ...form, footerInstitutional: e.target.value })}
            />
          </section>

          <section className="bg-card p-6 rounded-2xl border border-border">
            <h2 className="text-xl font-bold mb-4">Contato Oficial</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1">E-mail</label>
                <Input value={form.contact.email} onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })} placeholder="contato@incesc.org.br" />
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1">Telefone</label>
                <Input value={form.contact.phone} onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1">Endereço</label>
                <Input value={form.contact.address} onChange={(e) => setForm({ ...form, contact: { ...form.contact, address: e.target.value } })} placeholder="Rua..." />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-card p-6 rounded-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Links Oficiais (Rodapé)</h2>
              <Button size="sm" variant="secondary" onClick={() => setForm({ ...form, officialLinks: [...form.officialLinks, { label: "", href: "/" }] })}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Link
              </Button>
            </div>
            
            <div className="space-y-4">
              {form.officialLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">Nenhum link adicionado.</p>
              ) : form.officialLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input value={link.label} onChange={(e) => {
                      const newLinks = [...form.officialLinks];
                      newLinks[i].label = e.target.value;
                      setForm({ ...form, officialLinks: newLinks });
                    }} placeholder="Rótulo (Ex: Instagram)" />
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input value={link.href} onChange={(e) => {
                        const newLinks = [...form.officialLinks];
                        newLinks[i].href = e.target.value;
                        setForm({ ...form, officialLinks: newLinks });
                      }} placeholder="https://..." />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                    const newLinks = form.officialLinks.filter((_, idx) => idx !== i);
                    setForm({ ...form, officialLinks: newLinks });
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
