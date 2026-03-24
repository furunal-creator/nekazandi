import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Brain,
  BarChart3,
  Sun,
  Moon,
  Calculator,
  Users,
  Zap,
  Crown,
  Star,
  LineChart,
  FileText,
  Bell,
  Sparkles,
  ChevronRight,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ── Constants ─────────────────────────────────────────── */

const ASSET_TYPES = [
  { label: "BIST 100", emoji: "📈", color: "border-red-400/60 text-red-400" },
  { label: "TEFAS", emoji: "🏦", color: "border-blue-400/60 text-blue-400" },
  { label: "NASDAQ 100", emoji: "🇺🇸", color: "border-indigo-400/60 text-indigo-400" },
  { label: "Tahvil", emoji: "📄", color: "border-sky-400/60 text-sky-400" },
  { label: "Bono", emoji: "💵", color: "border-teal-400/60 text-teal-400" },
  { label: "Sukuk", emoji: "🕌", color: "border-emerald-400/60 text-emerald-400" },
  { label: "Altın", emoji: "🥇", color: "border-yellow-400/60 text-yellow-400" },
  { label: "Kripto", emoji: "₿", color: "border-orange-400/60 text-orange-400" },
  { label: "Döviz", emoji: "💱", color: "border-green-400/60 text-green-400" },
  { label: "IPO", emoji: "🚀", color: "border-purple-400/60 text-purple-400" },
  { label: "Diğer", emoji: "📦", color: "border-zinc-400/60 text-zinc-400" },
];

const THINKERS = [
  { name: "Keynes", emoji: "🎩", era: "1883–1946" },
  { name: "Friedman", emoji: "📊", era: "1912–2006" },
  { name: "Graham", emoji: "📖", era: "1894–1976" },
  { name: "Drucker", emoji: "🏢", era: "1909–2005" },
  { name: "Schumpeter", emoji: "⚡", era: "1883–1950" },
  { name: "Fisher", emoji: "💰", era: "1867–1947" },
  { name: "Kostolany", emoji: "🎭", era: "1906–1999" },
  { name: "Templeton", emoji: "🌍", era: "1912–2008" },
  { name: "Bagehot", emoji: "🏛️", era: "1826–1877" },
  { name: "Kindleberger", emoji: "📚", era: "1910–2003" },
];

const TICKER_DATA = [
  { symbol: "BTC/TRY", price: "2.145.320", change: "+3.42%", up: true },
  { symbol: "USD/TRY", price: "38.24", change: "+0.18%", up: true },
  { symbol: "EUR/TRY", price: "41.56", change: "-0.12%", up: false },
  { symbol: "XAU/TRY", price: "3.280", change: "+1.85%", up: true },
  { symbol: "BIST 100", price: "10.842", change: "-0.34%", up: false },
  { symbol: "ETH/TRY", price: "124.560", change: "+2.15%", up: true },
  { symbol: "GBP/TRY", price: "48.92", change: "+0.25%", up: true },
  { symbol: "NASDAQ", price: "18.320", change: "+0.67%", up: true },
];

const FEATURES = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Gerçek Zamanlı Veri",
    desc: "Simülasyon yok. Tüm hesaplamalar canlı piyasa verileriyle yapılır.",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Profesyonel Hesaplama",
    desc: "TWR ve XIRR ile endüstri standardında getiri hesaplaması.",
    gradient: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "Efsanelerin Yorumu",
    desc: "Keynes'ten Graham'a, 10 efsanevi düşünürün AI yorumu.",
    gradient: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-400",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "KVKK Uyumlu",
    desc: "Verileriniz güvende. 6698 sayılı KVKK'ya tam uyum.",
    gradient: "from-sky-500/20 to-sky-600/10",
    iconColor: "text-sky-400",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Hızlı ve Kolay",
    desc: "Saniyeler içinde portföy performansınızı öğrenin.",
    gradient: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-400",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Sponsor Karşılaştırma",
    desc: "Finansal markaların önerdiği portföylerle karşılaştırın.",
    gradient: "from-rose-500/20 to-rose-600/10",
    iconColor: "text-rose-400",
  },
];

const PREMIUM_FEATURES = [
  { icon: <Star className="w-4 h-4" />, text: "Sınırsız İşlem" },
  { icon: <LineChart className="w-4 h-4" />, text: "Gelişmiş Analiz (Sharpe, Max Drawdown)" },
  { icon: <FileText className="w-4 h-4" />, text: "PDF Rapor" },
  { icon: <Sparkles className="w-4 h-4" />, text: "AI Yorumları" },
  { icon: <TrendingUp className="w-4 h-4" />, text: "Gerçek Zamanlı Veri" },
  { icon: <Bell className="w-4 h-4" />, text: "Fiyat Alarmları" },
];

/* ── Main Component ────────────────────────────────────── */

export default function Landing() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            data-testid="logo"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="nekazandi.com logo">
              <rect x="2" y="2" width="28" height="28" rx="7" stroke="url(#logo-grad)" strokeWidth="2.5" />
              <path
                d="M8 22 L12 14 L16 18 L20 8 L24 14"
                stroke="url(#logo-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="24" cy="14" r="2.5" fill="url(#logo-grad)" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="font-bold text-lg text-foreground tracking-tight">nekazandi</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-foreground transition-colors"
              data-testid="nav-features"
            >
              Özellikler
            </button>
            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-foreground transition-colors"
              data-testid="nav-how"
            >
              Nasıl Çalışır
            </button>
            <button
              onClick={() => document.getElementById("premium")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-foreground transition-colors"
              data-testid="nav-premium"
            >
              Premium
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted/80 transition-colors"
              aria-label="Toggle theme"
              data-testid="toggle-theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} data-testid="goto-dashboard" className="gap-1.5">
                Panelim <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/auth")} data-testid="goto-auth" className="gap-1.5">
                Giriş Yap <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm gap-2">
                <Calculator className="w-4 h-4" />
                11 Varlık Türü Desteği
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                <span className="glow-text">Ne Kazandın?</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                Yatırımlarınızı girin, gerçek piyasa verileriyle portföy performansınızı hesaplayın.{" "}
                <span className="text-foreground font-medium">TWR, XIRR</span> ve efsanevi yatırımcıların
                AI yorumlarıyla tam bir analiz.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto gap-2 gradient-primary text-white border-0 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow text-base px-8 py-6"
                  data-testid="cta-start"
                >
                  Hesaplamaya Başla
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full sm:w-auto text-base px-8 py-6 border-border/60"
                  data-testid="cta-learn"
                >
                  Nasıl Çalışır?
                </Button>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 mt-8 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Ücretsiz başla
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Kayıt gerekmez
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> KVKK uyumlu
                </span>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-3xl" />
              <img
                src="/images/hero-landing.png"
                alt="nekazandi.com portföy hesaplayıcı"
                className="relative animate-float w-full max-w-lg rounded-2xl shadow-2xl shadow-black/40"
                data-testid="hero-image"
              />
            </div>
          </div>
        </div>

        {/* ── Live Ticker Strip ── */}
        <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-sm mt-8">
          <TickerStrip />
        </div>
      </section>

      {/* ── Asset Types Bar ── */}
      <section className="py-10 border-b border-border/30 bg-muted/30" data-testid="asset-types">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-5 font-medium uppercase tracking-wider">
            Desteklenen Varlık Türleri
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {ASSET_TYPES.map(({ label, emoji, color }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border-2 bg-background/80 backdrop-blur-sm transition-transform hover:scale-105 ${color}`}
                data-testid={`asset-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="text-base">{emoji}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-20 sm:py-28 px-4" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Özellikler
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Neden <span className="text-primary">nekazandi.com</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Türkiye'nin en kapsamlı portföy performans hesaplayıcısı.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc, gradient, iconColor }) => (
              <Card
                key={title}
                className="glass border-border/40 hover:border-border/80 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} ${iconColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    {icon}
                  </div>
                  <h3 className="font-semibold text-base text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 bg-muted/20 border-y border-border/30" data-testid="how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              3 Kolay Adım
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Nasıl Çalışır?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-emerald-500/50 via-blue-500/50 to-purple-500/50" />

            <StepCard
              number={1}
              title="Yatırımlarınızı Girin"
              desc="Hisse, fon, kripto, altın — hangi varlık türü olursa olsun ekleyin."
              color="from-emerald-500 to-emerald-600"
            />
            <StepCard
              number={2}
              title="Hesaplama Yapın"
              desc="TWR, XIRR ve gerçek piyasa verileriyle profesyonel analiz."
              color="from-blue-500 to-blue-600"
            />
            <StepCard
              number={3}
              title="Ne Kazandın? Öğrenin"
              desc="Detaylı raporlar, grafikler ve efsanelerin yorumlarını alın."
              color="from-purple-500 to-purple-600"
            />
          </div>
        </div>
      </section>

      {/* ── Premium Section ── */}
      <section id="premium" className="gradient-premium py-20 sm:py-28 px-4 relative overflow-hidden" data-testid="premium-section">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.08),transparent_70%)]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="premium-badge mb-6 px-4 py-1.5 border-yellow-500/30 bg-yellow-500/10 text-yellow-400 gap-1.5">
                <Crown className="w-4 h-4" /> Premium
              </Badge>

              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Yatırımlarınızı{" "}
                <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  Zirveye Taşıyın
                </span>
              </h2>

              <p className="text-muted-foreground text-lg mb-8 max-w-lg">
                Premium ile sınırsız erişim, gelişmiş analiz araçları ve AI destekli yorumların kilidini açın.
              </p>

              <div className="space-y-3 mb-10">
                {PREMIUM_FEATURES.map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/15 text-yellow-400 flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <span className="text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="gradient-gold text-black border-0 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all font-semibold text-base px-8 py-6 shimmer-gold"
                data-testid="cta-premium"
              >
                <Crown className="w-5 h-5 mr-2" />
                Premium'a Yükselt
              </Button>
            </div>

            <div className="relative flex justify-center">
              <div className="absolute -inset-8 bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-yellow-500/15 rounded-3xl blur-3xl" />
              <img
                src="/images/premium-card.png"
                alt="nekazandi.com Premium"
                className="relative animate-float w-full max-w-md rounded-2xl shadow-2xl shadow-yellow-900/30"
                data-testid="premium-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Thinkers Section ── */}
      <section className="py-20 sm:py-28 px-4" data-testid="thinkers-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Brain className="w-3.5 h-3.5 mr-1.5" /> AI Yorumları
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Efsanelerin Gözünden
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Portföyünüz, tarihin en büyük finansal düşünürleri tarafından AI ile değerlendirilir.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {THINKERS.map(({ name, emoji, era }) => (
              <Card
                key={name}
                className="glass border-border/40 hover:border-primary/40 transition-all duration-300 group hover:-translate-y-1 cursor-default"
                data-testid={`thinker-${name.toLowerCase()}`}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                    {emoji}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{era}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 sm:py-28 px-4 border-t border-border/30 bg-muted/20 relative overflow-hidden" data-testid="final-cta">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_60%)]" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Portföyünüz ne kazandı?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Ücretsiz hesaplayın. Kayıt olmadan 5 hesaplama hakkınız var.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/dashboard")}
            className="gap-2 gradient-primary text-white border-0 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow text-base px-8 py-6"
            data-testid="cta-bottom"
          >
            Hemen Başla <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-10 px-4 bg-background">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="7" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/50" />
              <path d="M8 22 L12 14 L16 18 L20 8 L24 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50" />
            </svg>
            <span>© 2026 nekazandi.com — Tüm hakları saklıdır.</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/auth")}
              className="hover:text-foreground transition-colors"
              data-testid="footer-kvkk"
            >
              KVKK Aydınlatma Metni
            </button>
            <a
              href="https://www.perplexity.ai/computer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              data-testid="footer-perplexity"
            >
              Created with Perplexity Computer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-Components ────────────────────────────────────── */

function TickerStrip() {
  const [offset, setOffset] = useState(0);
  const doubled = [...TICKER_DATA, ...TICKER_DATA];

  useEffect(() => {
    const id = setInterval(() => setOffset((o) => o + 1), 40);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden py-3" data-testid="ticker-strip">
      <div
        className="flex gap-8 whitespace-nowrap transition-none"
        style={{ transform: `translateX(-${offset % (TICKER_DATA.length * 180)}px)` }}
      >
        {doubled.map(({ symbol, price, change, up }, i) => (
          <span key={`${symbol}-${i}`} className="inline-flex items-center gap-2 text-sm font-medium">
            <span className="text-white/70">{symbol}</span>
            <span className="text-white/90 tabular-nums">{price}</span>
            <span className={up ? "text-gain" : "text-loss"}>{change}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  desc,
  color,
}: {
  number: number;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="relative text-center group" data-testid={`step-${number}`}>
      <div
        className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center text-xl font-bold mb-5 shadow-lg group-hover:scale-110 transition-transform relative z-10`}
      >
        {number}
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
