import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { AdminStats, Sponsor } from "@shared/schema";
import { ArrowLeft, Sun, Moon, Users, BarChart3, Megaphone, Shield, Trash2, Crown, Settings, TrendingUp, MousePointerClick, Eye } from "lucide-react";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Guard: only admin
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-sm"><CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">Yetkisiz Erişim</h2>
          <p className="text-sm text-muted-foreground mb-4">Bu sayfaya erişmek için admin yetkisi gereklidir.</p>
          <Button onClick={() => navigate("/")} data-testid="admin-back">Ana Sayfa</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="admin-back-dash">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
            <Badge variant="destructive" className="text-[10px]">Admin Panel</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">Admin Panel</h1>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Genel Bakış</TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" /> Kullanıcılar</TabsTrigger>
            <TabsTrigger value="sponsors" className="text-xs gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Sponsorlar / Reklamlar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><StatsPanel /></TabsContent>
          <TabsContent value="users"><UsersPanel /></TabsContent>
          <TabsContent value="sponsors"><SponsorsPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Stats Panel ───
function StatsPanel() {
  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"], queryFn: () => apiGet("/api/admin/stats") });
  if (!stats) return <p className="text-sm text-muted-foreground">Yükleniyor...</p>;

  const cards = [
    { label: "Toplam Kullanıcı", value: stats.totalUsers, icon: <Users className="w-4 h-4" />, color: "text-blue-500" },
    { label: "Premium Üye", value: stats.premiumUsers, icon: <Crown className="w-4 h-4" />, color: "text-amber-500" },
    { label: "Portföy Sayısı", value: stats.totalPortfolios, icon: <BarChart3 className="w-4 h-4" />, color: "text-indigo-500" },
    { label: "İşlem Sayısı", value: stats.totalTransactions, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-500" },
    { label: "Aktif Sponsor", value: stats.totalSponsors, icon: <Megaphone className="w-4 h-4" />, color: "text-pink-500" },
    { label: "Toplam Gösterim", value: stats.totalImpressions, icon: <Eye className="w-4 h-4" />, color: "text-cyan-500" },
    { label: "Toplam Tıklama", value: stats.totalClicks, icon: <MousePointerClick className="w-4 h-4" />, color: "text-orange-500" },
    { label: "CTR", value: stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) + "%" : "0%", icon: <Settings className="w-4 h-4" />, color: "text-violet-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="border-border/60">
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-2 ${c.color}`}>{c.icon}<span className="text-xs text-muted-foreground">{c.label}</span></div>
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Users Panel ───
function UsersPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/admin/users"], queryFn: () => apiGet("/api/admin/users") });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => apiPost(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Rol güncellendi" }); },
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/admin/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Kullanıcı silindi" }); },
  });

  const roleColors: Record<string, string> = { admin: "bg-red-500/10 text-red-600 border-red-500/20", premium: "bg-blue-500/10 text-blue-600 border-blue-500/20", user: "bg-gray-500/10 text-gray-600 border-gray-500/20" };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3"><CardTitle className="text-sm">Kullanıcı Yönetimi ({users.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{u.email}</span>
                  <Badge variant="outline" className={`text-[10px] ${roleColors[u.role] || roleColors.user}`}>{u.role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{u.name || "—"} · {new Date(u.createdAt).toLocaleDateString("tr-TR")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={u.role} onValueChange={(role) => changeRole.mutate({ id: u.id, role })}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={() => deleteUser.mutate(u.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" data-testid={`delete-user-${u.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sponsors Panel ───
function SponsorsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: sponsors = [] } = useQuery<Sponsor[]>({ queryKey: ["/api/admin/sponsors"], queryFn: () => apiGet("/api/admin/sponsors") });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "sponsor", description: "", ctaText: "", ctaUrl: "", placement: "sidebar", priority: 0 });

  const createSponsor = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/sponsors", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/sponsors"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Sponsor eklendi" }); setShowForm(false); setForm({ name: "", type: "sponsor", description: "", ctaText: "", ctaUrl: "", placement: "sidebar", priority: 0 }); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => apiPost(`/api/admin/sponsors/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/sponsors"] }),
  });

  const deleteSponsor = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/admin/sponsors/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/sponsors"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Sponsor silindi" }); },
  });

  const typeColors: Record<string, string> = { bank: "text-blue-600", broker: "text-indigo-600", crypto: "text-amber-600", sponsor: "text-gray-600" };
  const placementLabels: Record<string, string> = { sidebar: "Kenar Çubuğu", banner: "Banner", inline: "Satır İçi", modal: "Pop-up" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sponsor / Reklam Yönetimi ({sponsors.length})</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="text-xs h-8" data-testid="add-sponsor">
          {showForm ? "İptal" : "+ Yeni Sponsor"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Ad</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-8 text-xs" placeholder="Sponsor adı" /></div>
              <div><Label className="text-xs">Tür</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Banka</SelectItem>
                    <SelectItem value="broker">Aracı Kurum</SelectItem>
                    <SelectItem value="crypto">Kripto Borsası</SelectItem>
                    <SelectItem value="sponsor">Genel Sponsor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label className="text-xs">Açıklama</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">CTA Metin</Label><Input value={form.ctaText} onChange={e => setForm({...form, ctaText: e.target.value})} className="h-8 text-xs" placeholder="Hesap Aç" /></div>
              <div><Label className="text-xs">CTA URL</Label><Input value={form.ctaUrl} onChange={e => setForm({...form, ctaUrl: e.target.value})} className="h-8 text-xs" placeholder="https://..." /></div>
              <div><Label className="text-xs">Yerleşim</Label>
                <Select value={form.placement} onValueChange={v => setForm({...form, placement: v})}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sidebar">Kenar Çubuğu</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="inline">Satır İçi</SelectItem>
                    <SelectItem value="modal">Pop-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Öncelik</Label><Input type="number" value={form.priority} onChange={e => setForm({...form, priority: +e.target.value})} className="h-8 text-xs" /></div>
            </div>
            <Button size="sm" className="mt-3 text-xs h-8" onClick={() => createSponsor.mutate(form)} disabled={!form.name} data-testid="save-sponsor">Kaydet</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sponsors.map(s => (
          <Card key={s.id} className={`border-border/50 ${!s.active ? "opacity-50" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <Badge variant="outline" className={`text-[10px] ${typeColors[s.type] || ""}`}>{s.type}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{placementLabels[s.placement] || s.placement}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {s.impressions} gösterim</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {s.clicks} tıklama</span>
                    <span>CTR: {s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Aktif</span>
                    <Switch checked={!!s.active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, active: v })} />
                  </div>
                  <button onClick={() => deleteSponsor.mutate(s.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
