import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, TrendingUp, Shield, Brain, BarChart3, Sun, Moon, Calculator, Users, Zap } from "lucide-react";

const ASSET_LABELS = [
  "BIST 100", "TEFAS", "NASDAQ 100", "Tahvil", "Bono", "Sukuk",
  "Altın", "Kripto", "Döviz", "IPO", "Diğer"
];

const THINKERS = [
  "Keynes", "Friedman", "Graham", "Drucker", "Schumpeter",
  "Fisher", "Kostolany", "Templeton", "Bagehot", "Kindleberger"
];

export default function Landing() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="nekazandi.com logo">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <path d="M8 22 L12 12 L16 18 L20 8 L24 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
              <circle cx="24" cy="14" r="2" fill="currentColor" className="text-primary" />
            </svg>
            <span className="font-semibold text-foreground tracking-tight">nekazandi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Toggle theme"
              data-testid="toggle-theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")} data-testid="goto-dashboard">
                Panelim
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate("/auth")} data-testid="goto-auth">
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/60 bg-muted/50 text-xs text-muted-foreground mb-6">
            <Calculator className="w-3 h-3" />
            Gerçek verilerle portföy performansı
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4">
            Ne Kazandın?
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Yatırımlarınızı girin, gerçek piyasa verileriyle portföy performansınızı hesaplayın.
            TWR, XIRR ve efsanevi yatırımcıların yorumlarıyla tam bir analiz.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto gap-2"
              data-testid="cta-start"
            >
              Hesaplamaya Başla
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto"
              data-testid="cta-learn"
            >
              Nasıl Çalışır?
            </Button>
          </div>
        </div>
      </section>

      {/* Asset Types */}
      <section className="py-8 border-y border-border/30 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {ASSET_LABELS.map(label => (
              <span key={label} className="px-3 py-1 rounded-full text-xs font-medium border border-border/50 bg-background text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-center mb-12 text-foreground">
            Neden nekazandi.com?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Gerçek Veri"
              desc="Simülasyon yok. Tüm hesaplamalar gerçek piyasa verileriyle yapılır."
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Profesyonel Hesaplama"
              desc="TWR ve XIRR ile endüstri standardında getiri hesaplaması."
            />
            <FeatureCard
              icon={<Brain className="w-5 h-5" />}
              title="Efsanelerin Yorumu"
              desc="Keynes'ten Graham'a, 10 efsanevi düşünürün portföy yorumu."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="KVKK Uyumlu"
              desc="Verileriniz güvende. 6698 sayılı KVKK'ya tam uyum."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Hızlı ve Kolay"
              desc="Saniyeler içinde portföy performansınızı öğrenin."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Sponsor Karşılaştırma"
              desc="Finansal markaların önerdiği portföylerle karşılaştırın."
            />
          </div>
        </div>
      </section>

      {/* Thinkers */}
      <section className="py-16 sm:py-24 px-4 bg-muted/20 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-center mb-3 text-foreground">
            Efsanelerin Gözünden
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-10 max-w-lg mx-auto">
            Portföyünüz, tarihin en büyük finansal düşünürleri tarafından değerlendirilir.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {THINKERS.map(name => (
              <span key={name} className="px-3 py-1.5 rounded-md text-xs font-medium bg-background border border-border/60 text-foreground">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Portföyünüz ne kazandı?
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Ücretsiz hesaplayın. Kayıt olmadan 5 hesaplama hakkınız var.
          </p>
          <Button size="lg" onClick={() => navigate("/dashboard")} className="gap-2" data-testid="cta-bottom">
            Hemen Başla <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 nekazandi.com — Tüm hakları saklıdır.</span>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">KVKK</button>
            <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Created with Perplexity Computer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
          {icon}
        </div>
        <h3 className="font-medium text-sm text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </CardContent>
    </Card>
  );
}
