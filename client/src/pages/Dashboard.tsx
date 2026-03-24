import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import {
  ASSET_TYPES,
  THINKER_PERSONAS,
  PREMIUM_FEATURES,
  FREE_ENTRY_LIMIT,
  FREE_CALC_LIMIT,
} from "@shared/schema";
import type {
  Portfolio,
  Transaction,
  PortfolioResult,
  ThinkerCommentary,
  LivePrice,
} from "@shared/schema";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Calculator,
  Sun,
  Moon,
  LogOut,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  User,
  Wallet,
  PieChart,
  MessageSquare,
  Award,
  Crown,
  Lock,
  RefreshCw,
  Clock,
  Shield,
  LineChart,
  Zap,
  ChevronRight,
  Activity,
  Check,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

/* ══════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════ */

const CHART_COLORS = [
  "#10b981", "#3b82f6", "#eab308", "#8b5cf6", "#f97316",
  "#ec4899", "#14b8a6", "#6366f1", "#f59e0b", "#ef4444", "#6b7280",
];

const ASSET_TYPE_ENTRIES = Object.entries(ASSET_TYPES) as [
  string,
  { label: string; icon: string; category: string; color: string },
][];

const TX_TYPE_LABELS: Record<string, string> = {
  cash_in: "Nakit Giriş",
  cash_out: "Nakit Çıkış",
  buy: "Alış",
  sell: "Satış",
};

const TX_TYPE_COLORS: Record<string, string> = {
  cash_in: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  cash_out: "bg-red-500/15 text-red-500 border-red-500/30",
  buy: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  sell: "bg-orange-500/15 text-orange-500 border-orange-500/30",
};

const SENTIMENT_STYLES: Record<string, { border: string; badge: string; label: string }> = {
  bullish: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    label: "Boğa",
  },
  bearish: {
    border: "border-l-red-500",
    badge: "bg-red-500/15 text-red-500 border-red-500/30",
    label: "Ayı",
  },
  neutral: {
    border: "border-l-zinc-400",
    badge: "bg-zinc-400/15 text-zinc-400 border-zinc-400/30",
    label: "Nötr",
  },
  cautious: {
    border: "border-l-yellow-500",
    badge: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    label: "Temkinli",
  },
};

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toFixed(0);
}

function formatTRY(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/* ══════════════════════════════════════════════════════════
   Main Dashboard
   ══════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const [, navigate] = useLocation();
  const params = useParams<{ portfolioId?: string }>();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isPremium = user?.isPremium ?? false;

  const [activeTab, setActiveTab] = useState("portfolio");
  const [premiumOpen, setPremiumOpen] = useState(false);

  /* ── Queries ── */
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
    queryFn: () => apiGet("/api/portfolios"),
  });

  const selectedPortfolioId = params.portfolioId
    ? parseInt(params.portfolioId)
    : portfolios[0]?.id;

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/portfolios", selectedPortfolioId, "transactions"],
    queryFn: () => apiGet(`/api/portfolios/${selectedPortfolioId}/transactions`),
    enabled: !!selectedPortfolioId,
  });

  const { data: guestUsage } = useQuery<{ count: number; limit: number }>({
    queryKey: ["/api/guest-usage"],
    queryFn: () => apiGet("/api/guest-usage"),
    enabled: !isAuthenticated,
  });

  const { data: sponsors = [] } = useQuery<any[]>({
    queryKey: ["/api/sponsors"],
    queryFn: () => apiGet("/api/sponsors"),
  });

  /* ── Mutations ── */
  const createPortfolio = useMutation({
    mutationFn: () =>
      apiPost<Portfolio>("/api/portfolios", { name: "Portföyüm", currency: "TRY" }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      navigate(`/dashboard/${p.id}`);
    },
  });

  const deletePortfolio = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      navigate("/dashboard");
    },
  });

  const addTransaction = useMutation({
    mutationFn: (data: any) =>
      apiPost(`/api/portfolios/${selectedPortfolioId}/transactions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/portfolios", selectedPortfolioId, "transactions"],
      });
      toast({ title: "İşlem eklendi" });
    },
    onError: (err: Error) => {
      if (err.message?.includes("limit")) {
        setPremiumOpen(true);
      } else {
        toast({ title: "Hata", description: err.message, variant: "destructive" });
      }
    },
  });

  const deleteTx = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/portfolios", selectedPortfolioId, "transactions"],
      });
    },
  });

  /* ── Calculate ── */
  const [calcResult, setCalcResult] = useState<
    (PortfolioResult & { commentary: ThinkerCommentary[] }) | null
  >(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    if (!selectedPortfolioId) return;
    setIsCalculating(true);
    try {
      const result = await apiPost<
        PortfolioResult & { commentary: ThinkerCommentary[] }
      >(`/api/portfolios/${selectedPortfolioId}/calculate`, { prices: {} });
      setCalcResult(result);
      setActiveTab("results");
    } catch (err: any) {
      if (err.message?.includes("limit")) {
        setPremiumOpen(true);
      } else {
        toast({ title: "Hata", description: err.message, variant: "destructive" });
      }
    }
    setIsCalculating(false);
  };

  /* ── Premium upgrade ── */
  const upgradeMutation = useMutation({
    mutationFn: () => apiPost("/api/premium/upgrade", {}),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setPremiumOpen(false);
      toast({ title: "Premium aktif! 🎉", description: "Tüm özellikler açıldı." });
    },
    onError: (err: Error) =>
      toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  /* ── Entry limit ── */
  const entryCount = transactions.length;
  const entryLimit = isPremium ? Infinity : FREE_ENTRY_LIMIT;
  const calcLimit = isPremium ? Infinity : FREE_CALC_LIMIT;
  const isEntryLimitReached = !isPremium && entryCount >= FREE_ENTRY_LIMIT;

  /* ── Empty state ── */
  if (portfolios.length === 0 && !createPortfolio.isPending) {
    return (
      <DashboardShell
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        isAuthenticated={isAuthenticated}
        isPremium={isPremium}
        logout={logout}
        navigate={navigate}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center mb-6">
            <Wallet className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Portföyünüzü Oluşturun</h2>
          <p className="text-muted-foreground mb-8 text-center max-w-sm">
            Yatırımlarınızı girerek portföy performansınızı hesaplayın.
          </p>
          <Button
            onClick={() => createPortfolio.mutate()}
            className="gap-2 gradient-primary text-white border-0 shadow-lg shadow-emerald-500/25 px-6 py-5 text-base"
            data-testid="create-portfolio"
          >
            <Plus className="w-5 h-5" /> Portföy Oluştur
          </Button>
        </div>

        <PremiumDialog
          open={premiumOpen}
          onOpenChange={setPremiumOpen}
          onUpgrade={() => upgradeMutation.mutate()}
          isPending={upgradeMutation.isPending}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      theme={theme}
      toggleTheme={toggleTheme}
      user={user}
      isAuthenticated={isAuthenticated}
      isPremium={isPremium}
      logout={logout}
      navigate={navigate}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Portfolio Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold">Ne Kazandın?</h1>
            {!isAuthenticated && guestUsage && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {guestUsage.count}/{guestUsage.limit} hesaplama
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedPortfolioId && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deletePortfolio.mutate(selectedPortfolioId)}
                className="gap-1"
                data-testid="delete-portfolio"
              >
                <Trash2 className="w-3.5 h-3.5" /> Sil
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => createPortfolio.mutate()}
              className="gap-1"
              data-testid="new-portfolio"
            >
              <Plus className="w-3.5 h-3.5" /> Yeni
            </Button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="portfolio" className="gap-1.5" data-testid="tab-portfolio">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Portföy</span>
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="gap-1.5"
              data-testid="tab-results"
              disabled={!calcResult}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Sonuçlar</span>
            </TabsTrigger>
            <TabsTrigger
              value="commentary"
              className="gap-1.5"
              data-testid="tab-commentary"
              disabled={!calcResult}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Yorumlar</span>
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-1.5" data-testid="tab-prices">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Fiyatlar</span>
            </TabsTrigger>
            <TabsTrigger value="sponsors" className="gap-1.5" data-testid="tab-sponsors">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Sponsor</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════ PORTFOLIO TAB ═══════ */}
          <TabsContent value="portfolio">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left: Transaction Form */}
              <div className="lg:col-span-2 space-y-4">
                <TransactionForm
                  onSubmit={(data) => addTransaction.mutate(data)}
                  isPending={addTransaction.isPending}
                  isLimitReached={isEntryLimitReached}
                  onUpgradeClick={() => setPremiumOpen(true)}
                />

                {/* Entry Limit Bar */}
                {!isPremium && (
                  <Card className="glass border-border/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          İşlem Limiti
                        </span>
                        <span className="text-xs font-bold tabular-nums">
                          {entryCount} / {FREE_ENTRY_LIMIT} İşlem
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isEntryLimitReached
                              ? "bg-gradient-to-r from-red-500 to-orange-500"
                              : "bg-gradient-to-r from-emerald-500 to-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (entryCount / FREE_ENTRY_LIMIT) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      {isEntryLimitReached && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPremiumOpen(true)}
                          className="w-full mt-3 text-xs text-yellow-500 hover:text-yellow-400 gap-1.5"
                          data-testid="limit-upgrade-cta"
                        >
                          <Crown className="w-3.5 h-3.5" /> Sınırsız işlem için Premium'a
                          yükselt
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Transaction History */}
              <div className="lg:col-span-3">
                <Card className="glass border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">İşlem Geçmişi</CardTitle>
                      <div className="flex items-center gap-2">
                        {!isPremium && !isAuthenticated && guestUsage && (
                          <Badge variant="outline" className="text-xs tabular-nums">
                            {guestUsage.count}/{guestUsage.limit} hesaplama kaldı
                          </Badge>
                        )}
                        <Button
                          onClick={handleCalculate}
                          disabled={transactions.length === 0 || isCalculating}
                          className="gap-2 gradient-primary text-white border-0 shadow-lg shadow-emerald-500/20 pulse-glow"
                          data-testid="btn-calculate"
                        >
                          <Calculator className="w-4 h-4" />
                          {isCalculating ? "Hesaplanıyor..." : "Ne Kazandın?"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                          <BarChart3 className="w-7 h-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Henüz işlem eklenmedi.
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Sol taraftan işlem ekleyerek başlayın.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                        {[...transactions]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors group"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[11px] px-2 py-0.5 font-medium ${
                                      TX_TYPE_COLORS[tx.type] ?? ""
                                    }`}
                                  >
                                    {TX_TYPE_LABELS[tx.type] ?? tx.type}
                                  </Badge>
                                  {tx.assetType && (
                                    <span className="text-sm">
                                      {ASSET_TYPES[tx.assetType as keyof typeof ASSET_TYPES]?.icon}
                                    </span>
                                  )}
                                  {tx.assetName && (
                                    <span className="text-xs text-muted-foreground truncate font-medium">
                                      {tx.assetName}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>
                                    {new Date(tx.date).toLocaleDateString("tr-TR")}
                                  </span>
                                  {tx.quantity && (
                                    <span className="tabular-nums">
                                      {tx.quantity} adet
                                    </span>
                                  )}
                                  {tx.price && (
                                    <span className="tabular-nums">
                                      @{formatTRY(tx.price)} ₺
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-sm font-semibold tabular-nums ${
                                    tx.type === "cash_in" || tx.type === "sell"
                                      ? "text-gain"
                                      : "text-loss"
                                  }`}
                                >
                                  {tx.type === "cash_in" || tx.type === "sell"
                                    ? "+"
                                    : "-"}
                                  {formatCurrency(tx.amount)}
                                </span>
                                <button
                                  onClick={() => deleteTx.mutate(tx.id)}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                  data-testid={`delete-tx-${tx.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══════ RESULTS TAB ═══════ */}
          <TabsContent value="results">
            {calcResult && (
              <ResultsView
                result={calcResult}
                isPremium={isPremium}
                onUpgradeClick={() => setPremiumOpen(true)}
              />
            )}
          </TabsContent>

          {/* ═══════ COMMENTARY TAB ═══════ */}
          <TabsContent value="commentary">
            {calcResult?.commentary && (
              <CommentaryView
                commentary={calcResult.commentary}
                isPremium={isPremium}
                onUpgradeClick={() => setPremiumOpen(true)}
              />
            )}
          </TabsContent>

          {/* ═══════ LIVE PRICES TAB ═══════ */}
          <TabsContent value="prices">
            <LivePricesView />
          </TabsContent>

          {/* ═══════ SPONSORS TAB ═══════ */}
          <TabsContent value="sponsors">
            <SponsorsView sponsors={sponsors} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Premium Dialog */}
      <PremiumDialog
        open={premiumOpen}
        onOpenChange={setPremiumOpen}
        onUpgrade={() => upgradeMutation.mutate()}
        isPending={upgradeMutation.isPending}
      />
    </DashboardShell>
  );
}

/* ══════════════════════════════════════════════════════════
   Dashboard Shell (Header)
   ══════════════════════════════════════════════════════════ */

function DashboardShell({
  children,
  theme,
  toggleTheme,
  user,
  isAuthenticated,
  isPremium,
  logout,
  navigate,
}: {
  children: React.ReactNode;
  theme: string;
  toggleTheme: () => void;
  user: any;
  isAuthenticated: boolean;
  isPremium: boolean;
  logout: () => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/70 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5"
            data-testid="logo-home"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-label="nekazandi.com logo"
            >
              <rect
                x="2"
                y="2"
                width="28"
                height="28"
                rx="7"
                stroke="url(#logo-grad-d)"
                strokeWidth="2.5"
              />
              <path
                d="M8 22 L12 14 L16 18 L20 8 L24 14"
                stroke="url(#logo-grad-d)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="24" cy="14" r="2.5" fill="url(#logo-grad-d)" />
              <defs>
                <linearGradient id="logo-grad-d" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="font-bold text-foreground tracking-tight">nekazandi</span>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user && (
              <div className="flex items-center gap-2 hidden sm:flex">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user.email}</span>
                {isPremium && (
                  <Badge className="shimmer-gold bg-yellow-500/15 text-yellow-500 border-yellow-500/30 gap-1 text-[10px] px-2">
                    <Crown className="w-3 h-3" /> PRO
                  </Badge>
                )}
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted/80 transition-colors"
              data-testid="toggle-theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {isAuthenticated ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => logout()}
                className="gap-1.5"
                data-testid="logout"
              >
                <LogOut className="w-4 h-4" /> Çıkış
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="gap-1.5"
                data-testid="goto-auth"
              >
                Giriş Yap <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Transaction Form
   ══════════════════════════════════════════════════════════ */

function TransactionForm({
  onSubmit,
  isPending,
  isLimitReached,
  onUpgradeClick,
}: {
  onSubmit: (data: any) => void;
  isPending: boolean;
  isLimitReached: boolean;
  onUpgradeClick: () => void;
}) {
  const [type, setType] = useState("cash_in");
  const [assetType, setAssetType] = useState("");
  const [assetName, setAssetName] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const isInvestment = type === "buy" || type === "sell";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { type, amount: parseFloat(amount), date };
    if (isInvestment) {
      data.assetType = assetType;
      data.assetName =
        assetName ||
        ASSET_TYPES[assetType as keyof typeof ASSET_TYPES]?.label ||
        assetType;
      data.assetTicker = assetName || assetType;
      if (quantity) data.quantity = parseFloat(quantity);
      if (price) data.price = parseFloat(price);
    }
    onSubmit(data);
    setAmount("");
    setQuantity("");
    setPrice("");
  };

  return (
    <Card className="glass border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-emerald-400" />
          </div>
          İşlem Ekle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">İşlem Türü</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_in">💰 Nakit Giriş</SelectItem>
                <SelectItem value="cash_out">💸 Nakit Çıkış</SelectItem>
                <SelectItem value="buy">📈 Varlık Alış</SelectItem>
                <SelectItem value="sell">📉 Varlık Satış</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Investment fields */}
          {isInvestment && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Varlık Sınıfı</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger data-testid="select-asset-type">
                    <SelectValue placeholder="Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_ENTRIES.map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span>{val.icon}</span>
                          <span>{val.label}</span>
                          <span
                            className="w-2 h-2 rounded-full ml-auto"
                            style={{ backgroundColor: val.color }}
                          />
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Varlık Adı / Ticker</Label>
                <Input
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Örn: BIST 100, BTC, Altın"
                  data-testid="input-asset-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Miktar</Label>
                  <Input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Adet"
                    data-testid="input-quantity"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Birim Fiyat</Label>
                  <Input
                    type="number"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="₺"
                    data-testid="input-price"
                  />
                </div>
              </div>
            </>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Toplam Tutar (₺)</Label>
            <Input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              data-testid="input-amount"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tarih</Label>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="input-date"
            />
          </div>

          {/* Submit */}
          {isLimitReached ? (
            <Button
              type="button"
              onClick={onUpgradeClick}
              className="w-full gradient-gold text-black border-0 font-semibold gap-2"
              data-testid="btn-upgrade-limit"
            >
              <Crown className="w-4 h-4" /> Limit Doldu — Premium'a Yükselt
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isPending}
              className="w-full gradient-primary text-white border-0 shadow-lg shadow-emerald-500/20 gap-2"
              data-testid="btn-add-tx"
            >
              <Plus className="w-4 h-4" />
              {isPending ? "Ekleniyor..." : "İşlem Ekle"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Results View
   ══════════════════════════════════════════════════════════ */

function ResultsView({
  result,
  isPremium,
  onUpgradeClick,
}: {
  result: PortfolioResult;
  isPremium: boolean;
  onUpgradeClick: () => void;
}) {
  const isGain = result.gainLoss >= 0;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Yatırılan Sermaye"
          value={formatCurrency(result.totalInvested)}
          icon={<DollarSign className="w-5 h-5" />}
          gradient="from-blue-500/15 to-blue-600/5"
          iconColor="text-blue-400"
        />
        <KPICard
          label="Mevcut Değer"
          value={formatCurrency(result.currentValue)}
          icon={<Wallet className="w-5 h-5" />}
          gradient="from-purple-500/15 to-purple-600/5"
          iconColor="text-purple-400"
        />
        <KPICard
          label="Kar / Zarar"
          value={(isGain ? "+" : "") + formatCurrency(result.gainLoss)}
          icon={
            isGain ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )
          }
          accent={isGain ? "gain" : "loss"}
          gradient={
            isGain
              ? "from-emerald-500/15 to-emerald-600/5"
              : "from-red-500/15 to-red-600/5"
          }
          iconColor={isGain ? "text-emerald-400" : "text-red-400"}
        />
        <KPICard
          label="Getiri"
          value={(isGain ? "+" : "") + result.percentReturn.toFixed(2) + "%"}
          icon={<Percent className="w-5 h-5" />}
          accent={isGain ? "gain" : "loss"}
          gradient={
            isGain
              ? "from-emerald-500/15 to-emerald-600/5"
              : "from-red-500/15 to-red-600/5"
          }
          iconColor={isGain ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      {/* ── TWR & XIRR ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-border/40">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              TWR (Zaman Ağırlıklı)
            </p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                result.twr >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {result.twr >= 0 ? "+" : ""}
              {result.twr.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-border/40">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              XIRR (Para Ağırlıklı)
            </p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                (result.xirr ?? 0) >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {result.xirr !== null
                ? `${result.xirr >= 0 ? "+" : ""}${result.xirr.toFixed(2)}%`
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        {/* Sharpe — Premium or Locked */}
        {isPremium ? (
          <Card className="glass border-yellow-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-muted-foreground font-medium">Sharpe Oranı</p>
                <Crown className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {result.sharpeRatio?.toFixed(2) ?? "—"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="glass border-border/40 relative overflow-hidden cursor-pointer group"
            onClick={onUpgradeClick}
            data-testid="locked-sharpe"
          >
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Sharpe Oranı
              </p>
              <p className="text-2xl font-bold tabular-nums text-muted-foreground/30">
                —
              </p>
            </CardContent>
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Lock className="w-5 h-5 text-yellow-500" />
              <span className="text-[10px] font-medium text-yellow-500">
                Premium ile açın
              </span>
            </div>
          </Card>
        )}

        {/* Max Drawdown — Premium or Locked */}
        {isPremium ? (
          <Card className="glass border-yellow-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-muted-foreground font-medium">Max Drawdown</p>
                <Crown className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-loss">
                {result.maxDrawdown !== undefined
                  ? `-${result.maxDrawdown.toFixed(2)}%`
                  : "—"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="glass border-border/40 relative overflow-hidden cursor-pointer group"
            onClick={onUpgradeClick}
            data-testid="locked-maxdd"
          >
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Max Drawdown
              </p>
              <p className="text-2xl font-bold tabular-nums text-muted-foreground/30">
                —
              </p>
            </CardContent>
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Lock className="w-5 h-5 text-yellow-500" />
              <span className="text-[10px] font-medium text-yellow-500">
                Premium ile açın
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* ── Timeline Area Chart ── */}
      {result.timeline.length > 1 && (
        <Card className="glass border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LineChart className="w-4 h-4 text-emerald-400" />
              Portföy Değer Grafiği
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.timeline}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString("tr-TR", {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatCompact(v)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Değer"]}
                    labelFormatter={(d) => new Date(d).toLocaleDateString("tr-TR")}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#areaGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Allocation Pie ── */}
      {result.allocation.length > 0 && (
        <Card className="glass border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-400" />
              Varlık Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-8 items-center">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={result.allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="label"
                    >
                      {result.allocation.map((a, i) => (
                        <Cell
                          key={i}
                          fill={a.color || CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(v: number, name: string) => [
                        formatCurrency(v),
                        name,
                      ]}
                    />
                  </RPieChart>
                </ResponsiveContainer>
              </div>

              {/* Asset Breakdown Table */}
              <div className="space-y-2.5">
                {result.allocation.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            a.color || CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-foreground font-medium">{a.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-muted-foreground text-xs">
                        {formatCurrency(a.value)}
                      </span>
                      <Badge variant="outline" className="tabular-nums text-xs px-2">
                        {a.weight.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Commentary View
   ══════════════════════════════════════════════════════════ */

function CommentaryView({
  commentary,
  isPremium,
  onUpgradeClick,
}: {
  commentary: ThinkerCommentary[];
  isPremium: boolean;
  onUpgradeClick: () => void;
}) {
  const visibleCommentary = isPremium ? commentary : commentary.slice(0, 3);
  const lockedCount = isPremium ? 0 : Math.max(commentary.length - 3, 0);

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Efsanelerin Gözünden
        </h2>
        <p className="text-sm text-muted-foreground">
          Tarihin en büyük finansal düşünürleri portföyünüzü değerlendiriyor.
        </p>
      </div>

      {/* Visible commentaries */}
      <div className="space-y-3">
        {visibleCommentary.map((c) => {
          const style = SENTIMENT_STYLES[c.sentiment] ?? SENTIMENT_STYLES.neutral;
          return (
            <Card
              key={c.thinkerId}
              className={`glass border-border/40 border-l-4 ${style.border} overflow-hidden`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="text-[40px] leading-none flex-shrink-0">{c.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <h3 className="font-semibold text-foreground">{c.name}</h3>
                        <span className="text-xs text-muted-foreground">{c.era}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${style.badge}`}
                      >
                        {style.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {c.commentary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Locked section */}
      {!isPremium && lockedCount > 0 && (
        <div className="relative">
          {/* Blurred preview cards */}
          <div className="space-y-3 blur-sm pointer-events-none select-none" aria-hidden>
            {commentary.slice(3, 5).map((c) => (
              <Card key={c.thinkerId} className="border-border/40 border-l-4 border-l-zinc-400">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-[40px] leading-none">{c.avatar}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {c.commentary.slice(0, 80)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Upgrade overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/90 to-background/60 rounded-xl">
            <Crown className="w-10 h-10 text-yellow-500 mb-3" />
            <p className="font-semibold text-foreground mb-1">
              +{lockedCount} düşünürün yorumları
            </p>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Premium ile 10 düşünürün tam yorumlarını okuyun
            </p>
            <Button
              onClick={onUpgradeClick}
              className="gradient-gold text-black border-0 font-semibold gap-2"
              data-testid="commentary-upgrade-cta"
            >
              <Crown className="w-4 h-4" /> Premium'a Yükselt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Live Prices View
   ══════════════════════════════════════════════════════════ */

function LivePricesView() {
  const {
    data: prices = [],
    isLoading,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useQuery<LivePrice[]>({
    queryKey: ["/api/live-prices"],
    queryFn: () => apiGet("/api/live-prices"),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          Canlı Fiyatlar
        </h2>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Son: {new Date(dataUpdatedAt).toLocaleTimeString("tr-TR")}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
            data-testid="refresh-prices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass border-border/40 animate-pulse">
              <CardContent className="p-5 h-24" />
            </Card>
          ))}
        </div>
      ) : prices.length === 0 ? (
        <Card className="glass border-border/40">
          <CardContent className="p-12 text-center">
            <Activity className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Fiyat verisi bulunamadı.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {prices.map((p) => {
            const isUp = p.change24h >= 0;
            return (
              <Card
                key={p.symbol}
                className={`glass border-border/40 border-l-4 ${
                  isUp ? "border-l-emerald-500" : "border-l-red-500"
                } hover:-translate-y-0.5 transition-transform`}
                data-testid={`price-${p.symbol.toLowerCase()}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-foreground">{p.symbol}</span>
                    <Badge
                      variant="outline"
                      className={`tabular-nums text-xs font-medium ${
                        isUp ? "text-gain border-emerald-500/30" : "text-loss border-red-500/30"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {p.change24h.toFixed(2)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{p.name}</p>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {formatTRY(p.price)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {p.currency}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Sponsors View
   ══════════════════════════════════════════════════════════ */

function SponsorsView({ sponsors }: { sponsors: any[] }) {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Award className="w-5 h-5 text-orange-400" />
          Sponsor Portföyler
        </h2>
        <p className="text-sm text-muted-foreground">
          Finansal markaların önerdiği portföy stratejileri ile karşılaştırın.
        </p>
      </div>

      {sponsors.length === 0 ? (
        <Card className="glass border-border/40">
          <CardContent className="p-16 text-center">
            <Award className="w-10 h-10 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">
              Henüz sponsor portföy bulunmuyor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sponsors.map((s) => {
            const allocs = JSON.parse(s.allocations || "[]");
            return (
              <Card key={s.id} className="glass border-border/40 hover:-translate-y-0.5 transition-transform">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="text-xs font-medium text-orange-500 border-orange-500/30 bg-orange-500/10"
                    >
                      Sponsored
                    </Badge>
                    <span className="text-xs text-muted-foreground">{s.sponsorName}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{s.description}</p>
                  <Separator className="mb-4" />
                  <div className="space-y-2">
                    {allocs.map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                          <span className="text-foreground">{a.assetName}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground text-xs">
                          {a.weight}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Premium Upgrade Dialog
   ══════════════════════════════════════════════════════════ */

function PremiumDialog({
  open,
  onOpenChange,
  onUpgrade,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Premium'a Yükselt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Premium card image */}
          <div className="relative rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
            <img
              src="/images/premium-card.png"
              alt="nekazandi Premium"
              className="w-full h-40 object-cover"
              data-testid="premium-dialog-image"
            />
          </div>

          {/* Features list */}
          <div className="space-y-3">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-500/15 text-yellow-500 flex items-center justify-center flex-shrink-0 text-lg">
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onUpgrade}
              disabled={isPending}
              className="flex-1 gradient-gold text-black border-0 font-semibold shadow-lg shadow-yellow-500/20 gap-2 py-5 shimmer-gold"
              data-testid="btn-upgrade-premium"
            >
              <Crown className="w-5 h-5" />
              {isPending ? "Yükseltiliyor..." : "Premium'a Yükselt"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 py-5"
              data-testid="btn-upgrade-later"
            >
              Daha Sonra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════
   KPI Card
   ══════════════════════════════════════════════════════════ */

function KPICard({
  label,
  value,
  icon,
  accent,
  gradient,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "gain" | "loss";
  gradient: string;
  iconColor: string;
}) {
  return (
    <Card className="glass border-border/40 overflow-hidden">
      <CardContent className="p-5 relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
        <div className="relative">
          <div className={`flex items-center gap-2 mb-2 ${iconColor}`}>
            {icon}
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold tabular-nums ${
              accent === "gain"
                ? "text-gain"
                : accent === "loss"
                ? "text-loss"
                : "text-foreground"
            }`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
