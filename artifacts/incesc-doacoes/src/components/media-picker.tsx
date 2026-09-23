import { useState, useRef } from "react";
import { useAdminPortalMedia, useRequestMediaUploadUrl, useConfirmMediaUpload, PortalMedia } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Image as ImageIcon, UploadCloud, Check, X } from "lucide-react";

export function MediaPicker({ value, onSelect }: { value?: string, onSelect: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: mediaList, isLoading } = useAdminPortalMedia();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  const requestUpload = useRequestMediaUploadUrl();
  const confirmUpload = useConfirmMediaUpload();

  const [pendingUpload, setPendingUpload] = useState<{ file: File, id: string } | null>(null);
  const [altText, setAltText] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use PNG, JPEG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O limite é 8MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { uploadURL, id } = await requestUpload.mutateAsync({
        name: file.name,
        size: file.size,
        contentType: file.type
      });

      // Upload directly to S3/Storage
      const res = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!res.ok) throw new Error("Falha no upload");

      setPendingUpload({ file, id });
      setAltText("");
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!pendingUpload) return;
    if (!altText) {
      toast({ title: "Atenção", description: "O texto alternativo (alt text) é obrigatório para acessibilidade.", variant: "destructive" });
      return;
    }

    try {
      const media = await confirmUpload.mutateAsync({
        id: pendingUpload.id,
        altText
      });
      toast({ title: "Imagem salva com sucesso!" });
      setPendingUpload(null);
      onSelect(media.id);
      setIsOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao confirmar", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="shrink-0">
          <ImageIcon className="w-4 h-4 mr-2" /> {value ? "Trocar Imagem" : "Selecionar Imagem"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteca de Mídia</DialogTitle>
        </DialogHeader>

        {pendingUpload ? (
          <div className="p-6 border border-border rounded-xl bg-muted/30 text-center space-y-4">
            <h3 className="font-bold">Imagem enviada. Confirme os detalhes:</h3>
            <img src={URL.createObjectURL(pendingUpload.file)} alt="Preview" className="w-48 h-48 object-cover rounded-lg mx-auto" />
            <div className="text-left max-w-md mx-auto">
              <label className="text-sm font-bold block mb-1">Texto Alternativo (Alt Text) *</label>
              <Input value={altText} onChange={e => setAltText(e.target.value)} placeholder="Descrição da imagem para leitores de tela..." />
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={() => setPendingUpload(null)}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
              <Button onClick={handleConfirm}><Check className="w-4 h-4 mr-2" /> Confirmar e Selecionar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border border-border shrink-0">
              <p className="text-sm text-muted-foreground">Selecione uma imagem ou envie uma nova (Máx 8MB).</p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <UploadCloud className="w-4 h-4 mr-2" /> {uploading ? "Enviando..." : "Fazer Upload"}
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleFileSelect} />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] border border-border rounded-xl p-4">
              {isLoading ? (
                <div className="grid grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />)}
                </div>
              ) : mediaList && mediaList.some(media => media.status === "confirmed") ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaList.filter(media => media.status === "confirmed").map(media => (
                    <button
                      key={media.id}
                      onClick={() => {
                        onSelect(media.id);
                        setIsOpen(false);
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${value === media.id ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/50'}`}
                    >
                      <img src={`/api/admin/portal/media/${media.id}`} alt={media.altText} className="w-full h-full object-cover" />
                      {value === media.id && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12 flex flex-col items-center">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p>Nenhuma imagem na biblioteca.</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
