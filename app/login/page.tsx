import { AuthForm } from "@/components/auth/auth-form";
import { AuthRedirect } from "@/components/auth/auth-redirect";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Özel, hızlı, sade"
      title="Sadece ikinize ait bir sohbet alanı."
      description="Mesajlar anlık gelsin, tasarım hafif ve zarif kalsın. Giriş yaptığında seni doğrudan özel alanına yönlendireceğiz."
      footerText="Henüz hesabın yok mu?"
      footerCta="Kayıt ol"
      footerHref="/register"
    >
      <AuthRedirect />
      <AuthForm mode="login" />
    </AuthShell>
  );
}
