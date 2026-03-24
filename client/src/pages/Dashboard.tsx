import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { ASSET_TYPES, THINKER_PERSONAS } from "@shared/schema";
import type { Portfolio, Transaction, PortfolioResult, ThinkerCommentary } from "@shared/schema";
import {
  ArrowLeft, Plus, Trash2, Calculator, Sun, Moon, LogOut,
  TrendingUp, TrendingDown, DollarSign, Percent, BarChart3,
  User, Wallet, PieChart, MessageSquare, Award
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell, CartesianGrid, Area, AreaChart
} from "recharts";

const CHART_COLORS = [
  "hsl(160, 70%, 42%)", "hsl(200, 70%, 50%)", "hsl(45, 80%, 50%)",
  "hsl(280, 50%, 55%)", "hsl(15, 70%, 55%)", "hsl(330, 60%, 50%)",
  "hsl(90, 50%, 45%)", "hsl(240, 50%, 55%)", "hsl(30, 80%, 50%)",
  "hsl(180, 60%, 40%)", "hsl(0, 60%, 50%)"
];

const ASSET_TYPE_ENTRIES = Object.entries(ASSET_TYPES) as [string, { label: string; icon: string; category: string }][];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const params = useParams<{ portfolioId?: string }>();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("portfolio");

  // Portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
    queryFn: () => apiGet("/api/portfolios"),
  });

  const selectedPortfolioId = params.portfolioId ? parseInt(params.portfolioId) : portfolios[0]?.id;

  // Transactions
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/portfolios", selectedPortfolioId, "transactions"],
    queryFn: () => apiGet(`/api/portfolios/${selectedPortfolioId}/transactions`),
    enabled: !!selectedPortfolioId,
  });

  // Guest usage
  const { data: guestUsage } = useQuery<{ count: number; limit: number }>({
    queryKey: ["/api/guest-usage"],
    queryFn: () => apiGet("/api/guest-usage"),
    enabled: !isAuthenticated,
  });

  // Sponsors
  const { data: sponsors = [] } = useQuery<any[]>({
    queryKey: ["/api/sponsors"],
    queryFn: () => apiGet("/api/sponsors"),
  });

  // Create portfolio
  const createPortfolio = useMutation({
    mutationFn: () => apiPost<Portfolio>("/api/portfolios", { name: "Portföyüm", currency: "TRY" }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      navigate(`/dashboard/${p.id}`);
    },
  });

  // Delete portfolio
  const deletePortfolio = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      navigate("/dashboard");
    },
  });

  // Add transaction
  const addTransaction = useMutation({
    mutationFn: (data: any) => apiPost(`/api/portfolios/${selectedPortfolioId}/transactions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId, "transactions"] });
      toast({ title: "İşlem eklendi" });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  // Delete transaction
  const deleteTx = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId, "transactions"] });
    },
  });

  // Calculate
  const [calcResult, setCalcResult] = useState<(PortfolioResult & { commentary: ThinkerCommentary[] }) | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    if (!selectedPortfolioId) return;
    setIsCalculating(true);
    try {
      const result = await apiPost<PortfolioResult & { commentary: ThinkerCommentary[] }>(
        `/api/portfolios/${selectedPortfolioId}/calculate`,
        { prices: {} }
      );
      setCalcResult(result);
      setActiveTab("results");
    } catch (err: any) {
      if (err.message?.includes("limit")) {
        toast({ title: "Limit Aşıldı", description: "Kayıt olarak sınırsız hesaplama yapabilirsiniz.", variant: "destructive" });
      } else {
        toast({ title: "Hata", description: err.message, variant: "destructive" });
      }
    }
    setIsCalculating(false);
  };

  // Auto-create portfolio for new users
  if (portfolios.length === 0 && !createPortfolio.isPending) {
    return (
      <DashboardShell theme={theme} toggleTheme={toggleTheme} user={user} isAuthenticated={isAuthenticated} logout={logout} navigate={navigate}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Wallet className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Portföyünüzü Oluşturun</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            Yatırımlarınızı girerek portföy performansınızı hesaplayın.
          </p>
          <Button onClick={() => createPortfolio.mutate()} data-testid="create-portfolio">
            <Plus className="w-4 h-4 mr-2" /> Portföy Oluştur
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell theme={theme} toggleTheme={toggleTheme} user={user} isAuthenticated={isAuthenticated} logout={logout} navigate={navigate}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Portfolio selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Ne Kazandın?</h1>
            {!isAuthenticated && guestUsage && (
              <Badge variant="secondary" className="text-xs">
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
                className="h-8 text-xs"
                data-testid="delete-portfolio"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Sil
              </Button>
            )}
            <Button size="sm" onClick={() => createPortfolio.mutate()} className="h-8 text-xs" data-testid="new-portfolio">
              <Plus className="w-3 h-3 mr-1" /> Yeni
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="portfolio" className="text-xs" data-testid="tab-portfolio">
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Portföy
            </TabsTrigger>
            <TabsTrigger value="results" className="text-xs" data-testid="tab-results" disabled={!calcResult}>
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Sonuçlar
            </TabsTrigger>
            <TabsTrigger value="commentary" className="text-xs" data-testid="tab-commentary" disabled={!calcResult}>
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Yorumlar
            </TabsTrigger>
            <TabsTrigger value="sponsors" className="text-xs" data-testid="tab-sponsors">
              <Award className="w-3.5 h-3.5 mr-1.5" />
              Sponsor
            </TabsTrigger>
          </TabsList>

          {/* PORTFOLIO TAB */}
          <TabsContent value="portfolio">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Transaction Form */}
              <div className="lg:col-span-2">
                <TransactionForm onSubmit={(data) => addTransaction.mutate(data)} isPending={addTransaction.isPending} />
              </div>
              {/* Transaction List */}
              <div className="lg:col-span-3">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">İşlem Geçmişi</CardTitle>
                      <Button
                        onClick={handleCalculate}
                        disabled={transactions.length === 0 || isCalculating}
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        data-testid="btn-calculate"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        {isCalculating ? "Hesaplanıyor..." : "Ne Kazandın?"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Henüz işlem eklenmedi. Sol taraftan işlem ekleyin.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant={tx.type === "cash_in" || tx.type === "buy" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                                  {tx.type === "cash_in" ? "Nakit Giriş" : tx.type === "cash_out" ? "Nakit Çıkış" : tx.type === "buy" ? "Alış" : "Satış"}
                                </Badge>
                                {tx.assetName && <span className="text-xs text-muted-foreground truncate">{tx.assetName}</span>}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{new Date(tx.date).toLocaleDateString("tr-TR")}</span>
                                {tx.quantity && <span>{tx.quantity} adet</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-medium tabular-nums ${(tx.type === "cash_in" || tx.type === "sell") ? "text-gain" : "text-loss"}`}>
                                {(tx.type === "cash_in" || tx.type === "sell") ? "+" : "-"}
                                {formatCurrency(tx.amount)}
                              </span>
                              <button
                                onClick={() => deleteTx.mutate(tx.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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

          {/* RESULTS TAB */}
          <TabsContent value="results">
            {calcResult && <ResultsView result={calcResult} />}
          </TabsContent>

          {/* COMMENTARY TAB */}
          <TabsContent value="commentary">
            {calcResult?.commentary && <CommentaryView commentary={calcResult.commentary} />}
          </TabsContent>

          {/* SPONSORS TAB */}
          <TabsContent value="sponsors">
            <SponsorsView sponsors={sponsors} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

// ─── Dashboard Shell ───
function DashboardShell({ children, theme, toggleTheme, user, isAuthenticated, logout, navigate }: {
  children: React.ReactNode;
  theme: string;
  toggleTheme: () => void;
  user: any;
  isAuthenticated: boolean;
  logout: () => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2" data-testid="logo-home">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <path d="M8 22 L12 12 L16 18 L20 8 L24 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
              <circle cx="24" cy="14" r="2" fill="currentColor" className="text-primary" />
            </svg>
            <span className="font-semibold text-sm">nekazandi</span>
          </button>
          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                <User className="w-3 h-3 inline mr-1" />
                {user.email}
              </span>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted transition-colors" data-testid="toggle-theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated ? (
              <Button size="sm" variant="ghost" onClick={() => logout()} className="h-8 text-xs" data-testid="logout">
                <LogOut className="w-3.5 h-3.5 mr-1" /> Çıkış
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

// ─── Transaction Form ───
function TransactionForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
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
    const data: any = {
      type,
      amount: parseFloat(amount),
      date,
    };
    if (isInvestment) {
      data.assetType = assetType;
      data.assetName = assetName || ASSET_TYPES[assetType as keyof typeof ASSET_TYPES]?.label || assetType;
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
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">İşlem Ekle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type */}
          <div className="space-y-1">
            <Label className="text-xs">İşlem Türü</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-xs" data-testid="select-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_in">Nakit Giriş</SelectItem>
                <SelectItem value="cash_out">Nakit Çıkış</SelectItem>
                <SelectItem value="buy">Varlık Alış</SelectItem>
                <SelectItem value="sell">Varlık Satış</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Asset Type (for buy/sell) */}
          {isInvestment && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Varlık Sınıfı</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger className="h-9 text-xs" data-testid="select-asset-type">
                    <SelectValue placeholder="Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_ENTRIES.map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.icon} {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Varlık Adı / Ticker</Label>
                <Input
                  value={assetName}
                  onChange={e => setAssetName(e.target.value)}
                  placeholder="Örn: BIST 100, BTC, Altın"
                  className="h-9 text-xs"
                  data-testid="input-asset-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Miktar</Label>
                  <Input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="Adet"
                    className="h-9 text-xs"
                    data-testid="input-quantity"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Birim Fiyat</Label>
                  <Input
                    type="number"
                    step="any"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="TRY"
                    className="h-9 text-xs"
                    data-testid="input-price"
                  />
                </div>
              </div>
            </>
          )}

          {/* Amount */}
          <div className="space-y-1">
            <Label className="text-xs">Toplam Tutar (TRY)</Label>
            <Input
              type="number"
              step="any"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-9 text-xs"
              data-testid="input-amount"
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label className="text-xs">Tarih</Label>
            <Input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-9 text-xs"
              data-testid="input-date"
            />
          </div>

          <Button type="submit" className="w-full h-9 text-xs" disabled={isPending} data-testid="btn-add-tx">
            <Plus className="w-3.5 h-3.5 mr-1" />
            {isPending ? "Ekleniyor..." : "İşlem Ekle"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Results View ───
function ResultsView({ result }: { result: PortfolioResult }) {
  const isGain = result.gainLoss >= 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Yatırılan Sermaye"
          value={formatCurrency(result.totalInvested)}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label="Mevcut Değer"
          value={formatCurrency(result.currentValue)}
          icon={<Wallet className="w-4 h-4" />}
        />
        <KPICard
          label="Kar / Zarar"
          value={(isGain ? "+" : "") + formatCurrency(result.gainLoss)}
          icon={isGain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          accent={isGain ? "gain" : "loss"}
        />
        <KPICard
          label="Getiri"
          value={(isGain ? "+" : "") + result.percentReturn.toFixed(2) + "%"}
          icon={<Percent className="w-4 h-4" />}
          accent={isGain ? "gain" : "loss"}
        />
      </div>

      {/* Return Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">TWR (Zaman Ağırlıklı)</p>
            <p className={`text-lg font-semibold tabular-nums ${result.twr >= 0 ? "text-gain" : "text-loss"}`}>
              {result.twr >= 0 ? "+" : ""}{result.twr.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">XIRR (Para Ağırlıklı)</p>
            <p className={`text-lg font-semibold tabular-nums ${(result.xirr ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
              {result.xirr !== null ? `${result.xirr >= 0 ? "+" : ""}${result.xirr.toFixed(2)}%` : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
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
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 70%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 70%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" })}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatCompact(v)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Değer"]}
                    labelFormatter={(d) => new Date(d).toLocaleDateString("tr-TR")}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(160, 70%, 42%)"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocation Pie */}
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
                    <Pie
                      data={result.allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="label"
                    >
                      {result.allocation.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                      formatter={(v: number, name: string) => [formatCurrency(v), name]}
                    />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {result.allocation.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
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

// ─── Commentary View ───
function CommentaryView({ commentary }: { commentary: ThinkerCommentary[] }) {
  const sentimentColors = {
    bullish: "text-gain border-green-500/20 bg-green-500/5",
    bearish: "text-loss border-red-500/20 bg-red-500/5",
    neutral: "text-muted-foreground border-border/50 bg-muted/20",
    cautious: "text-yellow-600 dark:text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
  };

  const sentimentLabels = {
    bullish: "Boğa",
    bearish: "Ayı",
    neutral: "Nötr",
    cautious: "Temkinli",
  };

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Efsanelerin Gözünden</h2>
        <p className="text-xs text-muted-foreground">Tarihin en büyük finansal düşünürleri portföyünüzü değerlendiriyor.</p>
      </div>
      {commentary.map(c => (
        <Card key={c.thinkerId} className={`border ${sentimentColors[c.sentiment]}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                <span className="text-[10px] text-muted-foreground">{c.era}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${sentimentColors[c.sentiment]}`}>
                {sentimentLabels[c.sentiment]}
              </Badge>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{c.commentary}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Sponsors View ───
function SponsorsView({ sponsors }: { sponsors: any[] }) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold mb-1">Sponsor Portföyler</h2>
        <p className="text-xs text-muted-foreground">Finansal markaların önerdiği portföy stratejileri ile karşılaştırın.</p>
      </div>
      {sponsors.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Henüz sponsor portföy bulunmuyor.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sponsors.map(s => {
            const allocs = JSON.parse(s.allocations || "[]");
            return (
              <Card key={s.id} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
                      Sponsored
                    </Badge>
                    <span className="text-xs text-muted-foreground">{s.sponsorName}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{s.description}</p>
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

// ─── KPI Card ───
function KPICard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: "gain" | "loss" }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-lg font-semibold tabular-nums ${accent === "gain" ? "text-gain" : accent === "loss" ? "text-loss" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ───
function formatCurrency(n: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toFixed(0);
}
