import { AuthForm } from "@/components/auth/auth-form";
import { AuthRedirect } from "@/components/auth/auth-redirect";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="İki kişilik alan"
      title="İlk oda kodu burada başlar."
      description="Hesabını oluştur, partnerinle eşleş ve size özel sohbet alanını kur. İlk sürüm web için hazır; mimari PWA ve mobil büyümesine uygun."
      footerText="Zaten hesabın var mı?"
      footerCta="Giriş yap"
      footerHref="/login"
    >
      <AuthRedirect />
      <AuthForm mode="register" />
    </AuthShell>
  );
}
