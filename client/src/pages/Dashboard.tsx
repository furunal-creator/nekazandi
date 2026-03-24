import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import {
  ASSET_TYPES, THINKER_PERSONAS, PREMIUM_FEATURES,
  FREE_ENTRY_LIMIT, FREE_CALC_LIMIT,
} from "@shared/schema";
import type {
  Portfolio, Transaction, PortfolioResult, ThinkerCommentary,
  LivePrice, Sponsor,
} from "@shared/schema";
import {
  Plus, Trash2, Calculator, Sun, Moon, LogOut,
  TrendingUp, TrendingDown, DollarSign, Percent, BarChart3,
  User, Wallet, PieChart, MessageSquare, Award,
  Lock, RefreshCw, Clock, Activity, Check, ArrowRight,
  ChevronRight, Settings, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell, CartesianGrid,
} from "recharts";

/* ── Constants ─────────────────────────────────────────── */

const CHART_COLORS = [
  "#3b82f6", "#6366f1", "#d97706", "#8b5cf6", "#f97316",
  "#ec4899", "#14b8a6", "#2563eb", "#f59e0b", "#ef4444", "#6b7280",
];

const ASSET_TYPE_ENTRIES = Object.entries(ASSET_TYPES) as [
  string, { label: string; icon: string; category: string; color: string },
][];

const TX_LABELS: Record<string, string> = {
  cash_in: "Nakit Giriş", cash_out: "Nakit Çıkış",
  buy: "Alış", sell: "Satış",
};

const TX_COLORS: Record<string, string> = {
  cash_in: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cash_out: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  buy: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  sell: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

const SENTIMENT: Record<string, { border: string; badge: string; label: string }> = {
  bullish: { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", label: "Boğa" },
  bearish: { border: "border-l-red-500", badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", label: "Ayı" },
  neutral: { border: "border-l-slate-400", badge: "bg-slate-400/10 text-slate-600 dark:text-slate-400 border-slate-400/20", label: "Nötr" },
  cautious: { border: "border-l-yellow-500", badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", label: "Temkinli" },
};

/* ── Helpers ────────────────────────────────────────────── */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency", currency: "TRY",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toFixed(0);
}

function formatTRY(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

/* ══════════════════════════════════════════════════════════
   Ad Hook — fetch sponsor ads by placement
   ══════════════════════════════════════════════════════════ */

function useAd(placement: string) {
  return useQuery<Sponsor | null>({
    queryKey: ["/api/ads", placement],
    queryFn: async () => {
      const ads = await apiGet<Sponsor[]>(`/api/ads?placement=${placement}`);
      return ads?.[0] ?? null;
    },
  });
}

function useAdClick() {
  return useMutation({
    mutationFn: (id: number) => apiPost(`/api/ads/${id}/click`, {}),
  });
}

/* ══════════════════════════════════════════════════════════
   Main Dashboard
   ══════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const [, navigate] = useLocation();
  const params = useParams<{ portfolioId?: string }>();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isPremium, logout, upgradeToPremium } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState("portfolio");
  const [premiumOpen, setPremiumOpen] = useState(false);

  /* ── Queries ── */
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
    queryFn: () => apiGet("/api/portfolios"),
  });

  const selectedPid = params.portfolioId ? parseInt(params.portfolioId) : portfolios[0]?.id;

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/portfolios", selectedPid, "transactions"],
    queryFn: () => apiGet(`/api/portfolios/${selectedPid}/transactions`),
    enabled: !!selectedPid,
  });

  const { data: guestUsage } = useQuery<{ count: number; limit: number }>({
    queryKey: ["/api/guest-usage"],
    queryFn: () => apiGet("/api/guest-usage"),
    enabled: !isAuthenticated,
  });

  const { data: sponsorPortfolios = [] } = useQuery<any[]>({
    queryKey: ["/api/sponsors"],
    queryFn: () => apiGet("/api/sponsors"),
  });

  /* ── Mutations ── */
  const createPortfolio = useMutation({
    mutationFn: () => apiPost<Portfolio>("/api/portfolios", { name: "Portföyüm", currency: "TRY" }),
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ["/api/portfolios"] }); navigate(`/dashboard/${p.id}`); },
  });

  const deletePortfolio = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/portfolios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/portfolios"] }); navigate("/dashboard"); },
  });

  const addTx = useMutation({
    mutationFn: (data: any) => apiPost(`/api/portfolios/${selectedPid}/transactions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portfolios", selectedPid, "transactions"] });
      toast({ title: "İşlem eklendi" });
    },
    onError: (err: Error) => {
      if (err.message?.includes("limit")) setPremiumOpen(true);
      else toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const deleteTx = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/transactions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/portfolios", selectedPid, "transactions"] }); },
  });

  /* ── Calculate ── */
  const [calcResult, setCalcResult] = useState<(PortfolioResult & { commentary: ThinkerCommentary[] }) | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    if (!selectedPid) return;
    setIsCalculating(true);
    try {
      const r = await apiPost<PortfolioResult & { commentary: ThinkerCommentary[] }>(
        `/api/portfolios/${selectedPid}/calculate`, { prices: {} },
      );
      setCalcResult(r);
      setActiveTab("results");
    } catch (err: any) {
      if (err.message?.includes("limit")) setPremiumOpen(true);
      else toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
    setIsCalculating(false);
  };

  /* ── Premium upgrade ── */
  const upgradeMut = useMutation({
    mutationFn: () => apiPost("/api/premium/upgrade", {}),
    onSuccess: () => { qc.invalidateQueries(); setPremiumOpen(false); toast({ title: "Premium aktif!", description: "Tüm özellikler açıldı." }); },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  /* ── Limits ── */
  const entryCount = transactions.length;
  const isLimitReached = !isPremium && entryCount >= FREE_ENTRY_LIMIT;

  /* ── Empty state ── */
  if (portfolios.length === 0 && !createPortfolio.isPending) {
    return (
      <Shell theme={theme} toggleTheme={toggleTheme} user={user} isAuthenticated={isAuthenticated} isPremium={isPremium} isAdmin={isAdmin} logout={logout} navigate={navigate}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Portföyünüzü Oluşturun</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            Yatırımlarınızı girerek portföy performansınızı hesaplayın.
          </p>
          <Button onClick={() => createPortfolio.mutate()} className="gap-2" data-testid="create-portfolio">
            <Plus className="w-4 h-4" /> Portföy Oluştur
          </Button>
        </div>
        <PremiumDialog open={premiumOpen} onOpenChange={setPremiumOpen} onUpgrade={() => upgradeMut.mutate()} isPending={upgradeMut.isPending} />
      </Shell>
    );
  }

  return (
    <Shell theme={theme} toggleTheme={toggleTheme} user={user} isAuthenticated={isAuthenticated} isPremium={isPremium} isAdmin={isAdmin} logout={logout} navigate={navigate}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Ne Kazandın?</h1>
            {!isAuthenticated && guestUsage && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {guestUsage.count}/{guestUsage.limit} hesaplama
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedPid && (
              <Button size="sm" variant="destructive" onClick={() => deletePortfolio.mutate(selectedPid)} className="gap-1 h-8 text-xs" data-testid="delete-portfolio">
                <Trash2 className="w-3 h-3" /> Sil
              </Button>
            )}
            <Button size="sm" onClick={() => createPortfolio.mutate()} className="gap-1 h-8 text-xs" data-testid="new-portfolio">
              <Plus className="w-3 h-3" /> Yeni
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="portfolio" className="gap-1.5 text-xs" data-testid="tab-portfolio">
              <Wallet className="w-3.5 h-3.5" /> Portföy
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5 text-xs" disabled={!calcResult} data-testid="tab-results">
              <BarChart3 className="w-3.5 h-3.5" /> Sonuçlar
            </TabsTrigger>
            <TabsTrigger value="commentary" className="gap-1.5 text-xs" disabled={!calcResult} data-testid="tab-commentary">
              <MessageSquare className="w-3.5 h-3.5" /> Yorumlar
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-1.5 text-xs" data-testid="tab-prices">
              <Activity className="w-3.5 h-3.5" /> Fiyatlar
            </TabsTrigger>
            <TabsTrigger value="sponsors" className="gap-1.5 text-xs" data-testid="tab-sponsors">
              <Award className="w-3.5 h-3.5" /> Sponsor
            </TabsTrigger>
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => navigate("/admin")} className="gap-1 h-8 text-xs ml-auto" data-testid="tab-admin">
                <Settings className="w-3.5 h-3.5" /> Admin Panel
              </Button>
            )}
          </TabsList>

          {/* ═══ PORTFOLIO TAB ═══ */}
          <TabsContent value="portfolio">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left — Form */}
              <div className="lg:col-span-2 space-y-4">
                <TxForm
                  onSubmit={(d) => addTx.mutate(d)}
                  isPending={addTx.isPending}
                  isLimitReached={isLimitReached}
                  onUpgrade={() => setPremiumOpen(true)}
                />
                {!isPremium && (
                  <EntryLimitBar count={entryCount} limit={FREE_ENTRY_LIMIT} isReached={isLimitReached} onUpgrade={() => setPremiumOpen(true)} />
                )}
              </div>

              {/* Right — Transactions */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">İşlem Geçmişi</CardTitle>
                      <div className="flex items-center gap-2">
                        {!isPremium && !isAuthenticated && guestUsage && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {guestUsage.count}/{guestUsage.limit} hesaplama kaldı
                          </span>
                        )}
                        <Button
                          size="sm"
                          onClick={handleCalculate}
                          disabled={transactions.length === 0 || isCalculating}
                          className="gap-1.5 h-8 text-xs"
                          data-testid="btn-calculate"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          {isCalculating ? "Hesaplanıyor..." : "Ne Kazandın?"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-12">Henüz işlem eklenmedi.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
                        {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TX_COLORS[tx.type] ?? ""}`}>
                                  {TX_LABELS[tx.type] ?? tx.type}
                                </Badge>
                                {tx.assetType && (
                                  <span className="text-xs">{ASSET_TYPES[tx.assetType as keyof typeof ASSET_TYPES]?.icon}</span>
                                )}
                                {tx.assetName && (
                                  <span className="text-xs text-muted-foreground truncate">{tx.assetName}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>{new Date(tx.date).toLocaleDateString("tr-TR")}</span>
                                {tx.quantity != null && <span className="tabular-nums">{tx.quantity} adet</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium tabular-nums ${tx.type === "cash_in" || tx.type === "sell" ? "text-gain" : "text-loss"}`}>
                                {tx.type === "cash_in" || tx.type === "sell" ? "+" : "-"}{formatCurrency(tx.amount)}
                              </span>
                              <button
                                onClick={() => deleteTx.mutate(tx.id)}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                data-testid={`delete-tx-${tx.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Inline Ad */}
                <AdBanner placement="inline" />
              </div>
            </div>
          </TabsContent>

          {/* ═══ RESULTS TAB ═══ */}
          <TabsContent value="results">
            {calcResult && (
              <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <ResultsView result={calcResult} isPremium={isPremium} onUpgrade={() => setPremiumOpen(true)} />
                </div>
                <div className="lg:col-span-1">
                  <AdBanner placement="sidebar" />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ COMMENTARY TAB ═══ */}
          <TabsContent value="commentary">
            {calcResult?.commentary && (
              <CommentaryView commentary={calcResult.commentary} isPremium={isPremium} onUpgrade={() => setPremiumOpen(true)} />
            )}
          </TabsContent>

          {/* ═══ PRICES TAB ═══ */}
          <TabsContent value="prices">
            <PricesView />
          </TabsContent>

          {/* ═══ SPONSORS TAB ═══ */}
          <TabsContent value="sponsors">
            <SponsorsView sponsors={sponsorPortfolios} />
          </TabsContent>
        </Tabs>
      </div>

      <PremiumDialog open={premiumOpen} onOpenChange={setPremiumOpen} onUpgrade={() => upgradeMut.mutate()} isPending={upgradeMut.isPending} />
    </Shell>
  );
}

/* ══════════════════════════════════════════════════════════
   Shell
   ══════════════════════════════════════════════════════════ */

function Shell({ children, theme, toggleTheme, user, isAuthenticated, isPremium, isAdmin, logout, navigate }: {
  children: React.ReactNode; theme: string; toggleTheme: () => void;
  user: any; isAuthenticated: boolean; isPremium: boolean; isAdmin: boolean;
  logout: () => void; navigate: (p: string) => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2" data-testid="logo-home">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <path d="M8 22 L12 12 L16 18 L20 8 L24 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
              <circle cx="24" cy="14" r="2" fill="currentColor" className="text-primary" />
            </svg>
            <span className="font-semibold text-sm text-foreground">nekazandi</span>
          </button>

          <div className="flex items-center gap-3">
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{user.email}</span>
                {isAdmin ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-500">Admin</Badge>
                ) : isPremium ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-500">PRO</Badge>
                ) : null}
              </div>
            )}
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => navigate("/admin")} className="h-8 text-xs gap-1 hidden sm:flex" data-testid="header-admin">
                <Settings className="w-3.5 h-3.5" /> Admin
              </Button>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted transition-colors" data-testid="toggle-theme" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated ? (
              <Button size="sm" variant="ghost" onClick={() => logout()} className="h-8 text-xs gap-1" data-testid="logout">
                <LogOut className="w-3.5 h-3.5" /> Çıkış
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate("/auth")} className="h-8 text-xs" data-testid="goto-auth">
                Giriş Yap
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

function TxForm({ onSubmit, isPending, isLimitReached, onUpgrade }: {
  onSubmit: (d: any) => void; isPending: boolean;
  isLimitReached: boolean; onUpgrade: () => void;
}) {
  const [type, setType] = useState("cash_in");
  const [assetType, setAssetType] = useState("");
  const [assetName, setAssetName] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const isInv = type === "buy" || type === "sell";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d: any = { type, amount: parseFloat(amount), date };
    if (isInv) {
      d.assetType = assetType;
      d.assetName = assetName || ASSET_TYPES[assetType as keyof typeof ASSET_TYPES]?.label || assetType;
      d.assetTicker = assetName || assetType;
      if (quantity) d.quantity = parseFloat(quantity);
      if (price) d.price = parseFloat(price);
    }
    onSubmit(d);
    setAmount(""); setQuantity(""); setPrice("");
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">İşlem Ekle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">İşlem Türü</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-xs" data-testid="select-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_in">Nakit Giriş</SelectItem>
                <SelectItem value="cash_out">Nakit Çıkış</SelectItem>
                <SelectItem value="buy">Varlık Alış</SelectItem>
                <SelectItem value="sell">Varlık Satış</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isInv && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Varlık Sınıfı</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger className="h-9 text-xs" data-testid="select-asset-type"><SelectValue placeholder="Seçin..." /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_ENTRIES.map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className="inline-flex items-center gap-1.5">
                          <span>{v.icon}</span> {v.label}
                          <span className="w-2 h-2 rounded-full ml-1" style={{ backgroundColor: v.color }} />
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Varlık Adı / Ticker</Label>
                <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Örn: BTC, THYAO" className="h-9 text-xs" data-testid="input-asset-name" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Miktar</Label>
                  <Input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Adet" className="h-9 text-xs" data-testid="input-quantity" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Birim Fiyat</Label>
                  <Input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="TRY" className="h-9 text-xs" data-testid="input-price" />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Toplam Tutar (TRY)</Label>
            <Input type="number" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9 text-xs" data-testid="input-amount" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tarih</Label>
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs" data-testid="input-date" />
          </div>

          {isLimitReached ? (
            <Button type="button" variant="outline" onClick={onUpgrade} className="w-full h-9 text-xs gap-1.5" data-testid="btn-upgrade-limit">
              <Lock className="w-3 h-3" /> Limit Doldu — Premium'a Yükselt
            </Button>
          ) : (
            <Button type="submit" disabled={isPending} className="w-full h-9 text-xs gap-1.5" data-testid="btn-add-tx">
              <Plus className="w-3 h-3" /> {isPending ? "Ekleniyor..." : "İşlem Ekle"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Entry Limit Bar ── */

function EntryLimitBar({ count, limit, isReached, onUpgrade }: {
  count: number; limit: number; isReached: boolean; onUpgrade: () => void;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground">İşlem Limiti</span>
          <span className="text-[10px] font-medium tabular-nums">{count} / {limit} İşlem</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isReached ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
          />
        </div>
        {isReached && (
          <button onClick={onUpgrade} className="text-[10px] text-primary hover:underline mt-2 block" data-testid="limit-upgrade">
            Sınırsız işlem için Premium'a yükselt
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Results View
   ══════════════════════════════════════════════════════════ */

function ResultsView({ result, isPremium, onUpgrade }: {
  result: PortfolioResult; isPremium: boolean; onUpgrade: () => void;
}) {
  const gain = result.gainLoss >= 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Yatırılan Sermaye" value={formatCurrency(result.totalInvested)} icon={<DollarSign className="w-4 h-4" />} />
        <KPI label="Mevcut Değer" value={formatCurrency(result.currentValue)} icon={<Wallet className="w-4 h-4" />} />
        <KPI label="Kar / Zarar" value={(gain ? "+" : "") + formatCurrency(result.gainLoss)} icon={gain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} accent={gain ? "gain" : "loss"} />
        <KPI label="Getiri" value={(gain ? "+" : "") + result.percentReturn.toFixed(2) + "%"} icon={<Percent className="w-4 h-4" />} accent={gain ? "gain" : "loss"} />
      </div>

      {/* TWR + XIRR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-1">TWR (Zaman Ağırlıklı)</p>
            <p className={`text-lg font-semibold tabular-nums ${result.twr >= 0 ? "text-gain" : "text-loss"}`}>
              {result.twr >= 0 ? "+" : ""}{result.twr.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-1">XIRR (Para Ağırlıklı)</p>
            <p className={`text-lg font-semibold tabular-nums ${(result.xirr ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
              {result.xirr != null ? `${result.xirr >= 0 ? "+" : ""}${result.xirr.toFixed(2)}%` : "N/A"}
            </p>
          </CardContent>
        </Card>

        {/* Sharpe */}
        {isPremium ? (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Sharpe Oranı</p>
              <p className="text-lg font-semibold tabular-nums">{result.sharpeRatio?.toFixed(2) ?? "—"}</p>
            </CardContent>
          </Card>
        ) : (
          <LockedMetric label="Sharpe Oranı" onClick={onUpgrade} testId="locked-sharpe" />
        )}

        {/* Max Drawdown */}
        {isPremium ? (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-1">Max Drawdown</p>
              <p className="text-lg font-semibold tabular-nums text-loss">
                {result.maxDrawdown != null ? `-${result.maxDrawdown.toFixed(2)}%` : "—"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <LockedMetric label="Max Drawdown" onClick={onUpgrade} testId="locked-maxdd" />
        )}
      </div>

      {/* Area Chart */}
      {result.timeline.length > 1 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Portföy Değer Grafiği</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.timeline}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" })} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={formatCompact} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }}
                    formatter={(v: number) => [formatCurrency(v), "Değer"]}
                    labelFormatter={(d) => new Date(d).toLocaleDateString("tr-TR")}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#areaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart */}
      {result.allocation.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Varlık Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={result.allocation} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="label">
                      {result.allocation.map((a, i) => (
                        <Cell key={i} fill={a.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }}
                      formatter={(v: number, name: string) => [formatCurrency(v), name]}
                    />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {result.allocation.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span>{a.label}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">{a.weight.toFixed(1)}%</span>
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

/* ── Locked Metric Card ── */

function LockedMetric({ label, onClick, testId }: { label: string; onClick: () => void; testId: string }) {
  return (
    <Card className="border-border/50 relative overflow-hidden cursor-pointer group" onClick={onClick} data-testid={testId}>
      <CardContent className="p-4">
        <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-muted-foreground/20">—</p>
      </CardContent>
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-medium text-primary">Premium</span>
      </div>
    </Card>
  );
}

/* ── KPI Card ── */

function KPI({ label, value, icon, accent }: {
  label: string; value: string; icon: React.ReactNode; accent?: "gain" | "loss";
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
          {icon}
          <span className="text-[10px]">{label}</span>
        </div>
        <p className={`text-lg font-semibold tabular-nums ${accent === "gain" ? "text-gain" : accent === "loss" ? "text-loss" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Commentary View
   ══════════════════════════════════════════════════════════ */

function CommentaryView({ commentary, isPremium, onUpgrade }: {
  commentary: ThinkerCommentary[]; isPremium: boolean; onUpgrade: () => void;
}) {
  const visible = isPremium ? commentary : commentary.slice(0, 3);
  const locked = isPremium ? 0 : Math.max(commentary.length - 3, 0);

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h2 className="text-base font-semibold mb-1">Efsanelerin Gözünden</h2>
        <p className="text-xs text-muted-foreground">Tarihin en büyük düşünürleri portföyünüzü değerlendiriyor.</p>
      </div>

      {visible.map((c) => {
        const s = SENTIMENT[c.sentiment] ?? SENTIMENT.neutral;
        return (
          <Card key={c.thinkerId} className={`border-border/50 border-l-4 ${s.border}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none flex-shrink-0">{c.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{c.era}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${s.badge}`}>{s.label}</Badge>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{c.commentary}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {!isPremium && locked > 0 && (
        <div className="relative">
          <div className="space-y-3 blur-sm pointer-events-none select-none" aria-hidden>
            {commentary.slice(3, 5).map((c) => (
              <Card key={c.thinkerId} className="border-border/50 border-l-4 border-l-slate-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{c.avatar}</span>
                    <div><span className="text-sm font-semibold">{c.name}</span><p className="text-xs mt-1">{c.commentary.slice(0, 60)}...</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/90 to-background/50 rounded-lg">
            <Lock className="w-6 h-6 text-primary mb-2" />
            <p className="text-sm font-medium mb-1">+{locked} düşünürün yorumları</p>
            <p className="text-xs text-muted-foreground mb-3">Premium ile 10 düşünürün tam yorumlarını okuyun</p>
            <Button size="sm" onClick={onUpgrade} className="gap-1.5 text-xs" data-testid="commentary-upgrade">
              Premium'a Yükselt <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Live Prices
   ══════════════════════════════════════════════════════════ */

function PricesView() {
  const { data: prices = [], isLoading, dataUpdatedAt, refetch, isFetching } = useQuery<LivePrice[]>({
    queryKey: ["/api/live-prices"],
    queryFn: () => apiGet("/api/live-prices"),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Canlı Fiyatlar</h2>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Son: {new Date(dataUpdatedAt).toLocaleTimeString("tr-TR")}
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-7 text-xs gap-1" data-testid="refresh-prices">
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} /> Yenile
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50 animate-pulse"><CardContent className="p-4 h-20" /></Card>
          ))}
        </div>
      ) : prices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-12">Fiyat verisi bulunamadı.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {prices.map((p) => {
            const up = p.change24h >= 0;
            return (
              <Card key={p.symbol} className={`border-border/50 border-l-4 ${up ? "border-l-emerald-500" : "border-l-red-500"}`} data-testid={`price-${p.symbol.toLowerCase()}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{p.symbol}</span>
                    <span className={`text-xs tabular-nums font-medium ${up ? "text-gain" : "text-loss"}`}>
                      {up ? "+" : ""}{p.change24h.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-1">{p.name}</p>
                  <p className="text-base font-semibold tabular-nums">{formatTRY(p.price)} <span className="text-[10px] font-normal text-muted-foreground">{p.currency}</span></p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Banner ad at bottom */}
      <AdBanner placement="banner" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Sponsors View
   ══════════════════════════════════════════════════════════ */

function SponsorsView({ sponsors }: { sponsors: any[] }) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-base font-semibold mb-1">Sponsor Portföyler</h2>
        <p className="text-xs text-muted-foreground">Finansal markaların önerdiği portföy stratejileri.</p>
      </div>
      {sponsors.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-12">Henüz sponsor portföy bulunmuyor.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sponsors.map((s) => {
            const allocs = JSON.parse(s.allocations || "[]");
            return (
              <Card key={s.id} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">Sponsored</Badge>
                    <span className="text-xs text-muted-foreground">{s.sponsorName}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{s.description}</p>
                  <Separator className="mb-3" />
                  <div className="space-y-1.5">
                    {allocs.map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span>{a.assetName}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground">{a.weight}%</span>
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
   Ad Banner (Sponsor Ads)
   ══════════════════════════════════════════════════════════ */

function AdBanner({ placement }: { placement: string }) {
  const { data: ad } = useAd(placement);
  const click = useAdClick();

  if (!ad) return null;

  const handleClick = () => {
    click.mutate(ad.id);
    if (ad.ctaUrl) window.open(ad.ctaUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="ad-banner border-border/50 relative" data-testid={`ad-${placement}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground border-muted-foreground/30">Reklam</Badge>
              <span className="text-xs font-medium">{ad.name}</span>
            </div>
            {ad.description && <p className="text-[10px] text-muted-foreground leading-relaxed">{ad.description}</p>}
          </div>
          {ad.ctaText && (
            <Button size="sm" variant="outline" onClick={handleClick} className="h-7 text-[10px] gap-1 flex-shrink-0" data-testid={`ad-cta-${placement}`}>
              {ad.ctaText} <ExternalLink className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Premium Dialog
   ══════════════════════════════════════════════════════════ */

function PremiumDialog({ open, onOpenChange, onUpgrade, isPending }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onUpgrade: () => void; isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Premium'a Yükselt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Sınırsız erişim, gelişmiş analiz araçları ve AI yorumları.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>{f.title}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex gap-2">
            <Button onClick={onUpgrade} disabled={isPending} className="flex-1 text-xs" data-testid="btn-upgrade-premium">
              {isPending ? "Yükseltiliyor..." : "Premium'a Yükselt"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs" data-testid="btn-upgrade-later">
              Daha Sonra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
