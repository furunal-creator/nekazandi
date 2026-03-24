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
  Check,
  Lock,
  LineChart,
  Building2,
  Code2,
  Award,
  ChevronRight,
  Mail,
  ExternalLink,
} from "lucide-react";
import { useEffect, useRef } from "react";

/* ── Data ──────────────────────────────────────────────── */

const TICKER_DATA = [
  { symbol: "BTC/TRY", price: "3.100.000", change: "+2.14%", up: true },
  { symbol: "USD/TRY", price: "38.24", change: "+0.18%", up: true },
  { symbol: "EUR/TRY", price: "41.56", change: "-0.12%", up: false },
  { symbol: "XAU/TRY", price: "3.280", change: "+1.85%", up: true },
  { symbol: "BIST 100", price: "10.842", change: "-0.34%", up: false },
  { symbol: "ETH/TRY", price: "124.560", change: "+2.15%", up: true },
];

const PARTNERS = [
  {
    name: "Is Bankasi",
    desc: "Yatirim hesaplarinizi otomatik entegre edin.",
    cta: "Detaylar",
  },
  {
    name: "Garanti BBVA",
    desc: "Fon ve hisse portfoyunuzu anlik takip edin.",
    cta: "Detaylar",
  },
  {
    name: "Yapi Kredi",
    desc: "Tahvil ve bono yatirimlarinizi analiz edin.",
    cta: "Detaylar",
  },
  {
    name: "Paribu",
    desc: "Kripto varliklarinizi gercek zamanli izleyin.",
    cta: "Detaylar",
  },
  {
    name: "BtcTurk",
    desc: "Dijital varlik portfoyunuzu profesyonelce yonetin.",
    cta: "Detaylar",
  },
];

const FEATURES = [
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Gercek Zamanli Veri",
    desc: "Canli piyasa verileriyle hesaplama. Simulasyon yok, gercek fiyatlar.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "TWR & XIRR Hesaplama",
    desc: "Endustri standardi getiri olcumleri ile profesyonel analiz.",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "AI Yorum Motoru",
    desc: "10 efsanevi yatirimcinin bakis acisiyla portfoy degerlendirmesi.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "KVKK Uyumlu",
    desc: "6698 sayili kanuna tam uyum. Verileriniz Turkiye'de, guvenle.",
  },
  {
    icon: <Code2 className="w-5 h-5" />,
    title: "Kurumsal API",
    desc: "RESTful API ile kendi uygulamaniza entegre edin.",
  },
  {
    icon: <Award className="w-5 h-5" />,
    title: "Sponsor Portfolyer",
    desc: "Banka ve aracilarin onerilen portfoyleri ile karsilastirin.",
  },
];

const PREMIUM_FEATURES = [
  "Sinirsiz islem ve hesaplama",
  "Gelismis analiz: Sharpe Ratio, Max Drawdown",
  "PDF rapor indirme",
  "10 dusunurden AI yorumlari",
  "Gercek zamanli fiyat verileri",
  "Fiyat alarmlari ve bildirimler",
];

const ASSET_PILLS = [
  { label: "BIST 100", emoji: "📈" },
  { label: "TEFAS", emoji: "🏦" },
  { label: "NASDAQ 100", emoji: "🇺🇸" },
  { label: "Tahvil", emoji: "📄" },
  { label: "Bono", emoji: "💵" },
  { label: "Sukuk", emoji: "🕌" },
  { label: "Altin", emoji: "🥇" },
  { label: "Kripto", emoji: "₿" },
  { label: "Doviz", emoji: "💱" },
  { label: "IPO", emoji: "🚀" },
  { label: "Diger", emoji: "📦" },
];

/* ── Component ─────────────────────────────────────────── */

export default function Landing() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ═══ HEADER ═══ */}
      <header className="glass sticky top-0 z-50 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            data-testid="logo"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-label="nekazandi logo"
            >
              <rect
                x="2"
                y="2"
                width="28"
                height="28"
                rx="6"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              />
              <path
                d="M8 22 L12 12 L16 18 L20 8 L24 14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              />
              <circle cx="24" cy="14" r="2" fill="currentColor" className="text-primary" />
            </svg>
            <span className="font-semibold text-foreground tracking-tight">nekazandi</span>
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <button
              onClick={() =>
                document.getElementById("ozellikler")?.scrollIntoView({ behavior: "smooth" })
              }
              className="hover:text-foreground transition-colors"
              data-testid="nav-ozellikler"
            >
              Ozellikler
            </button>
            <button
              onClick={() =>
                document.getElementById("nasil-calisir")?.scrollIntoView({ behavior: "smooth" })
              }
              className="hover:text-foreground transition-colors"
              data-testid="nav-nasil"
            >
              Nasil Calisir
            </button>
            <button
              onClick={() =>
                document.getElementById("kurumsal")?.scrollIntoView({ behavior: "smooth" })
              }
              className="hover:text-foreground transition-colors"
              data-testid="nav-kurumsal"
            >
              Kurumsal
            </button>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Toggle theme"
              data-testid="toggle-theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/admin")}
                className="text-xs"
                data-testid="goto-admin"
              >
                Admin
              </Button>
            )}

            {isAuthenticated ? (
              <Button
                size="sm"
                onClick={() => navigate("/dashboard")}
                data-testid="goto-dashboard"
              >
                Panelim
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/auth")}
                data-testid="goto-auth"
              >
                Giris Yap
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left copy */}
            <div>
              <Badge
                variant="outline"
                className="mb-6 text-xs px-3 py-1 border-primary/30 text-primary"
              >
                Turkiye'nin Portfoy Hesaplama Platformu
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-white">
                Ne Kazandin?
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-lg mb-8 leading-relaxed">
                Yatirimlarinizi girin, gercek piyasa verileriyle portfoy performansinizi
                hesaplayin. TWR ve XIRR ile endustri standartlarinda getiri analizi.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="gradient-primary text-white border-0 gap-2 px-6"
                  data-testid="cta-start"
                >
                  Hesaplamaya Basla
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    document
                      .getElementById("kurumsal")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white"
                  data-testid="cta-kurumsal"
                >
                  Kurumsal Cozumler
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Gercek Zamanli Veri
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  KVKK Uyumlu
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Banka Entegrasyonu
                </span>
              </div>
            </div>

            {/* Right — stat cards */}
            <div className="hidden lg:flex flex-col gap-4 items-end">
              <StatCard value="2.4M+" label="Hesaplanan" suffix="TRY" />
              <StatCard value="11" label="Varlik Sinifi" />
              <StatCard value="50K+" label="Kullanici" />
            </div>
          </div>
        </div>

        {/* ── Ticker ── */}
        <div className="border-t border-white/5 bg-black/30">
          <TickerStrip />
        </div>
      </section>

      {/* ═══ ASSET TYPE PILLS ═══ */}
      <section className="py-8 border-b border-border/30 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {ASSET_PILLS.map(({ label, emoji }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border/50 bg-background text-muted-foreground"
              >
                <span>{emoji}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PARTNER BANKS ═══ */}
      <section id="kurumsal" className="py-16 sm:py-24 px-4" data-testid="kurumsal-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Kurumsal Partnerler</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Turkiye'nin oncu finans kurumlariyla entegrasyon.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PARTNERS.map((p) => (
              <Card
                key={p.name}
                className="border-border/50 hover:border-border transition-colors"
              >
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{p.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {p.desc}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-0 text-primary hover:text-primary/80"
                    data-testid={`partner-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {p.cta} <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            <Mail className="w-3 h-3 inline mr-1" />
            Reklam alanlari ve kurumsal is birlikleri icin:{" "}
            <a
              href="mailto:partner@nekazandi.com"
              className="text-primary hover:underline"
              data-testid="partner-email"
            >
              partner@nekazandi.com
            </a>
          </p>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section
        id="ozellikler"
        className="py-16 sm:py-24 px-4 bg-muted/20 border-y border-border/30"
        data-testid="features-section"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Neden nekazandi.com?
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Profesyonel portfoy analizi icin ihtiyaciniz olan her sey.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, desc }) => (
              <Card
                key={title}
                className="border-border/50 hover:border-border transition-colors"
              >
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                    {icon}
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section
        id="nasil-calisir"
        className="py-16 sm:py-24 px-4"
        data-testid="how-it-works"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Nasil Calisir?</h2>
            <p className="text-sm text-muted-foreground">
              Uc adimda portfoy performansinizi ogrenin.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-border" />

            <Step
              n={1}
              title="Yatirimlarinizi Girin"
              desc="Hisse, fon, kripto, altin — varlik turunden bagimsiz olarak ekleyin."
            />
            <Step
              n={2}
              title="Hesaplama Yapin"
              desc="TWR, XIRR ve gercek piyasa verileriyle profesyonel analiz."
            />
            <Step
              n={3}
              title="Sonuclari Analiz Edin"
              desc="Detayli raporlar, grafikler ve efsanelerin yorumlarini alin."
            />
          </div>
        </div>
      </section>

      {/* ═══ PREMIUM ═══ */}
      <section
        id="premium"
        className="py-16 sm:py-24 px-4 bg-muted/20 border-y border-border/30"
        data-testid="premium-section"
      >
        <div className="max-w-3xl mx-auto">
          <Card className="border-border/50 bg-slate-950 dark:bg-slate-900/50 text-white overflow-hidden">
            <CardContent className="p-8 sm:p-10">
              <Badge
                variant="outline"
                className="mb-5 text-xs border-blue-500/30 text-blue-400"
              >
                Premium
              </Badge>

              <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">
                Profesyonel analiz araclarinin kilidini acin
              </h2>
              <p className="text-sm text-slate-400 mb-8 max-w-lg">
                Premium ile sinirsiz erisim, gelismis metrikler ve AI destekli
                yorumlarin tamamina ulastin.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {PREMIUM_FEATURES.map((text) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="gradient-primary text-white border-0 gap-2 px-6"
                data-testid="cta-premium"
              >
                Premium'a Yukselt
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <rect
                x="2"
                y="2"
                width="28"
                height="28"
                rx="6"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted-foreground/40"
              />
              <path
                d="M8 22 L12 12 L16 18 L20 8 L24 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/40"
              />
            </svg>
            <span>&copy; 2026 nekazandi.com</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/auth")}
              className="hover:text-foreground transition-colors"
              data-testid="footer-kvkk"
            >
              KVKK
            </button>
            <a
              href="mailto:partner@nekazandi.com"
              className="hover:text-foreground transition-colors"
              data-testid="footer-partner"
            >
              partner@nekazandi.com
            </a>
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

/* ── Sub-components ────────────────────────────────────── */

function TickerStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;
    let pos = 0;
    const speed = 0.5;
    const tick = () => {
      pos += speed;
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.style.transform = `translateX(-${pos}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const items = [...TICKER_DATA, ...TICKER_DATA];

  return (
    <div className="overflow-hidden py-2.5" data-testid="ticker-strip">
      <div ref={scrollRef} className="flex gap-8 whitespace-nowrap will-change-transform">
        {items.map(({ symbol, price, change, up }, i) => (
          <span
            key={`${symbol}-${i}`}
            className="inline-flex items-center gap-2 text-xs font-medium"
          >
            <span className="text-slate-400">{symbol}</span>
            <span className="text-slate-200 tabular-nums">{price}</span>
            <span className={`tabular-nums ${up ? "text-gain" : "text-loss"}`}>
              {change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  suffix,
}: {
  value: string;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="glass rounded-xl px-6 py-4 min-w-[180px] border border-white/10">
      <p className="text-2xl font-bold text-white tabular-nums">
        {suffix && <span className="text-xs text-slate-400 mr-1">{suffix}</span>}
        {value}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="text-center relative" data-testid={`step-${n}`}>
      <div className="w-10 h-10 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-4 relative z-10">
        {n}
      </div>
      <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
        {desc}
      </p>
    </div>
  );
}
