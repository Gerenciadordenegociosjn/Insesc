import { SignIn } from "@clerk/react";
import { SiteHeader } from "@/components/site-header";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteHeader />
      <main className="flex items-center justify-center py-20 px-4">
        <SignIn 
          path={`${basePath}/sign-in`}
          routing="path"
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${basePath}/minha-jornada`}
          appearance={{
            elements: {
              card: "shadow-xl border border-border rounded-3xl",
              headerTitle: "font-display text-2xl font-black",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
            }
          }}
        />
      </main>
    </div>
  );
}
