import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useChangePassword, useLogin, useTotpSetup, useTotpVerify } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import logoUrl from "@/assets/logo.png";

type Stage = "login" | "password" | "setup" | "totp";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<Stage>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [value, setValue] = useState("");
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string }>();
  const [error, setError] = useState("");
  const login = useLogin();
  const changePassword = useChangePassword();
  const startSetup = useTotpSetup();
  const verify = useTotpVerify();
  useEffect(() => {
    setValue("");
    if (stage !== "login") setPassword("");
  }, [stage]);
  useEffect(() => () => {
    setPassword("");
    setValue("");
    setSetup(undefined);
  }, []);

  const next = (result: { next: "totp" | "setup" | "password" }) => {
    setError("");
    setPassword("");
    setValue("");
    if (result.next === "setup") {
      setStage("setup");
      startSetup.mutate(undefined, { onSuccess: setSetup, onError: showError });
    } else setStage(result.next);
  };
  const showError = (err: Error) => setError(err.message || "Não foi possível concluir.");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (stage === "login") login.mutate({ username, password }, { onSuccess: next, onError: showError });
    else if (stage === "password") changePassword.mutate(value, { onSuccess: next, onError: showError });
    else verify.mutate(value, { onSuccess: () => navigate("/admin"), onError: showError });
  };
  const busy = login.isPending || changePassword.isPending || verify.isPending || startSetup.isPending;
  const title = stage === "login" ? "Acesso administrativo" : stage === "password" ? "Atualize sua senha" : stage === "setup" ? "Configure a autenticação" : "Código de autenticação";
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
        <img src={logoUrl} alt="INCESC" className="h-10 w-auto mx-auto" />
        <div className="text-center">
          <h1 className="text-2xl font-black">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {stage === "login" ? "Entre com suas credenciais de equipe." : stage === "password" ? "Defina uma senha permanente para continuar." : stage === "setup" ? "Escaneie o QR Code no Google Authenticator e confirme com o código gerado." : "Informe o código de seis dígitos do seu aplicativo."}
          </p>
        </div>
        {stage === "login" && <>
          <Input data-testid="input-admin-username" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} required />
          <Input data-testid="input-admin-password" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
        </>}
        {stage === "password" && <Input data-testid="input-new-password" type="password" minLength={12} placeholder="Nova senha (mínimo 12 caracteres)" value={value} onChange={e => setValue(e.target.value)} required />}
        {stage === "setup" && <div className="rounded-xl bg-muted p-4 text-sm space-y-4">
          {setup ? <>
            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-3" role="img" aria-label="QR Code para configurar o Google Authenticator" data-testid="totp-setup-qr">
                <QRCodeSVG value={setup.otpauthUrl} size={200} marginSize={4} bgColor="#ffffff" fgColor="#111827" />
              </div>
            </div>
            <p className="text-center">No Google Authenticator, toque em “+” e selecione “Ler código QR”.</p>
            <div className="border-t border-border pt-3">
              <p className="font-semibold">Se estiver usando o mesmo aparelho, configure manualmente:</p>
              <p className="mt-2"><strong>Nome da conta:</strong> INCESC</p>
              <p className="break-all"><strong>Chave:</strong> {setup.secret}</p>
              <p className="text-muted-foreground">Tipo: baseado em tempo (TOTP)</p>
            </div>
          </> : <p>Gerando sua chave...</p>}
          <Input data-testid="input-setup-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Código de confirmação" value={value} onChange={e => setValue(e.target.value)} required />
        </div>}
        {stage === "totp" && <Input data-testid="input-totp-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Código de seis dígitos" value={value} onChange={e => setValue(e.target.value)} required />}
        {error && <p data-testid="status-login-error" className="text-sm text-destructive">{error}</p>}
        <Button data-testid="button-admin-submit" type="submit" className="w-full rounded-xl" disabled={busy || (stage === "setup" && !setup)}>
          {busy ? "Aguarde..." : stage === "login" ? "Entrar" : "Continuar"}
        </Button>
      </form>
    </main>
  );
}