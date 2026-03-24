import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";
import { ArrowLeft, Sun, Moon } from "lucide-react";

export default function Auth() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [showKvkk, setShowKvkk] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { login, register, loginError, registerError, isLoginPending, isRegisterPending } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, name: name || undefined, kvkkConsent });
      }
      navigate("/dashboard");
    } catch (err) {
      // Error is shown from the hook
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 h-14 flex items-center px-4 sm:px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="back-home">
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfa
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted transition-colors">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-center">
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Ad Soyad</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="İsteğe bağlı"
                    className="h-9 text-sm"
                    data-testid="input-name"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="h-9 text-sm"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "En az 6 karakter" : ""}
                  className="h-9 text-sm"
                  data-testid="input-password"
                />
              </div>

              {mode === "register" && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="kvkk"
                    checked={kvkkConsent}
                    onCheckedChange={(checked) => setKvkkConsent(!!checked)}
                    data-testid="checkbox-kvkk"
                  />
                  <label htmlFor="kvkk" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    <button type="button" onClick={() => setShowKvkk(!showKvkk)} className="text-primary hover:underline">
                      KVKK Aydınlatma Metni
                    </button>
                    'ni okudum ve kabul ediyorum.
                  </label>
                </div>
              )}

              {showKvkk && (
                <div className="p-3 rounded-md bg-muted/50 border border-border/50 text-xs text-muted-foreground max-h-40 overflow-y-auto leading-relaxed">
                  <p className="font-medium text-foreground mb-2">KVKK Aydınlatma Metni</p>
                  <p>nekazandi.com olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında verilerinizin korunmasına önem veriyoruz.</p>
                  <p className="mt-2">Toplanan Veriler: E-posta adresi, portföy verileri.</p>
                  <p className="mt-1">İşleme Amacı: Portföy performans hesaplamaları.</p>
                  <p className="mt-1">Haklarınız: Verilerinize erişim, düzeltme, silme hakları bulunmaktadır.</p>
                </div>
              )}

              {(loginError || registerError) && (
                <p className="text-xs text-destructive">{loginError || registerError}</p>
              )}

              <Button
                type="submit"
                className="w-full h-9 text-sm"
                disabled={isLoginPending || isRegisterPending}
                data-testid="submit-auth"
              >
                {(isLoginPending || isRegisterPending) ? "..." : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                data-testid="toggle-auth-mode"
              >
                {mode === "login" ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
