import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { calculatePortfolio, generateCommentary } from "./calculator";
import { ASSET_TYPES, THINKER_PERSONAS, FREE_ENTRY_LIMIT, FREE_CALC_LIMIT } from "@shared/schema";
import { z } from "zod";

async function hashPw(p: string) { return (await import("bcryptjs")).hash(p, 10); }
async function verifyPw(p: string, h: string) { return (await import("bcryptjs")).compare(p, h); }
function uid(req: Request): number | null { return (req.session as any)?.userId || null; }
function sid(req: Request): string { return (req.headers["x-session-id"] as string) || "anon"; }
function getUser(req: Request) { const id = uid(req); return id ? storage.getUserById(id) : undefined; }
function isPremium(req: Request) { const u = getUser(req); return u?.role === "premium" || u?.role === "admin"; }
function isAdmin(req: Request) { const u = getUser(req); return u?.role === "admin"; }

export function registerRoutes(server: Server, app: Express) {

  // ── AUTH ──
  app.post("/api/auth/register", async (req, res) => {
    try {
      const d = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional(), kvkkConsent: z.boolean().default(false) }).parse(req.body);
      if (storage.getUserByEmail(d.email)) return res.status(409).json({ error: "Bu e-posta zaten kayıtlı" });
      const user = storage.createUser({ email: d.email, passwordHash: await hashPw(d.password), name: d.name || null, role: "user", kvkkConsent: d.kvkkConsent });
      (req.session as any).userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const d = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const user = storage.getUserByEmail(d.email);
      if (!user || !(await verifyPw(d.password, user.passwordHash))) return res.status(401).json({ error: "E-posta veya şifre hatalı" });
      (req.session as any).userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/auth/logout", (req, res) => { req.session?.destroy(() => {}); res.json({ ok: true }); });

  app.get("/api/auth/me", (req, res) => {
    const u = getUser(req);
    res.json({ user: u ? { id: u.id, email: u.email, name: u.name, role: u.role } : null });
  });

  app.post("/api/premium/upgrade", (req, res) => {
    const id = uid(req); if (!id) return res.status(401).json({ error: "Giriş yapın" });
    storage.setUserRole(id, "premium");
    res.json({ ok: true, role: "premium" });
  });

  // ── PORTFOLIOS ──
  app.post("/api/portfolios", (req, res) => {
    const d = z.object({ name: z.string().default("Portföyüm"), currency: z.string().default("TRY") }).parse(req.body);
    res.json(storage.createPortfolio({ userId: uid(req), sessionId: !uid(req) ? sid(req) : null, name: d.name, currency: d.currency }));
  });
  app.get("/api/portfolios", (req, res) => { const id = uid(req); res.json(id ? storage.getPortfoliosByUser(id) : storage.getPortfoliosBySession(sid(req))); });
  app.get("/api/portfolios/:id", (req, res) => { const p = storage.getPortfolio(+req.params.id); p ? res.json(p) : res.status(404).json({ error: "Bulunamadı" }); });
  app.delete("/api/portfolios/:id", (req, res) => { storage.deletePortfolio(+req.params.id); res.json({ ok: true }); });

  // ── TRANSACTIONS (entry limit) ──
  app.post("/api/portfolios/:id/transactions", (req, res) => {
    try {
      const pid = +req.params.id;
      if (!storage.getPortfolio(pid)) return res.status(404).json({ error: "Bulunamadı" });
      if (!isPremium(req)) {
        const id = uid(req);
        if (id) { if (storage.getTransactionCount(pid) >= FREE_ENTRY_LIMIT) return res.status(403).json({ error: `Ücretsiz hesapta maks ${FREE_ENTRY_LIMIT} işlem. Premium'a yükseltin.`, limitReached: true }); }
        else { const u = storage.getGuestUsage(sid(req)); if (u.entryCount >= FREE_ENTRY_LIMIT) return res.status(403).json({ error: `Misafir limiti: ${FREE_ENTRY_LIMIT} işlem. Kayıt olun.`, limitReached: true }); storage.incrementGuestEntry(sid(req)); }
      }
      const d = z.object({ type: z.enum(["cash_in","cash_out","buy","sell"]), assetType: z.string().optional(), assetName: z.string().optional(), assetTicker: z.string().optional(), quantity: z.number().optional(), price: z.number().optional(), amount: z.number(), date: z.string(), note: z.string().optional() }).parse(req.body);
      res.json(storage.addTransaction({ portfolioId: pid, ...d, assetType: d.assetType||null, assetName: d.assetName||null, assetTicker: d.assetTicker||null, quantity: d.quantity||null, price: d.price||null, note: d.note||null }));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.get("/api/portfolios/:id/transactions", (req, res) => res.json(storage.getTransactions(+req.params.id)));
  app.delete("/api/transactions/:id", (req, res) => { storage.deleteTransaction(+req.params.id); res.json({ ok: true }); });

  // ── CALCULATE ──
  app.post("/api/portfolios/:id/calculate", (req, res) => {
    try {
      const pid = +req.params.id;
      if (!storage.getPortfolio(pid)) return res.status(404).json({ error: "Bulunamadı" });
      const prem = isPremium(req);
      if (!prem && !uid(req)) { const u = storage.getGuestUsage(sid(req)); if (u.calcCount >= FREE_CALC_LIMIT) return res.status(403).json({ error: `Misafir limiti: ${FREE_CALC_LIMIT} hesaplama.`, limitReached: true }); storage.incrementGuestCalc(sid(req)); }
      const { startDate, endDate, prices } = req.body || {};
      const txns = storage.getTransactions(pid);
      const pm = new Map<string, number>(); if (prices) Object.entries(prices).forEach(([k,v]) => { if (typeof v==="number") pm.set(k,v); });
      const result = calculatePortfolio(txns, pm, startDate, endDate, prem);
      const commentary = generateCommentary(result);
      res.json({ ...result, commentary: prem ? commentary : commentary.slice(0, 3), isPremiumResult: prem });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ── LIVE PRICES ──
  app.get("/api/live-prices", async (_req, res) => {
    try {
      const prices: any[] = [];
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd,try&include_24hr_change=true");
        const d = await r.json();
        if (d.bitcoin) {
          prices.push({ symbol:"BTC", name:"Bitcoin", price: d.bitcoin.try||d.bitcoin.usd*38, change24h: d.bitcoin.usd_24h_change||0, currency:"TRY" });
          prices.push({ symbol:"ETH", name:"Ethereum", price: d.ethereum.try||d.ethereum.usd*38, change24h: d.ethereum.usd_24h_change||0, currency:"TRY" });
          prices.push({ symbol:"SOL", name:"Solana", price: d.solana.try||d.solana.usd*38, change24h: d.solana.usd_24h_change||0, currency:"TRY" });
        }
      } catch {}
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const d = await r.json();
        if (d.rates?.TRY) {
          prices.push({ symbol:"USD/TRY", name:"Dolar/TL", price: d.rates.TRY, change24h: 0, currency:"TRY" });
          prices.push({ symbol:"EUR/TRY", name:"Euro/TL", price: d.rates.TRY*(d.rates.EUR?1/d.rates.EUR:1.08), change24h: 0, currency:"TRY" });
          prices.push({ symbol:"GBP/TRY", name:"Sterlin/TL", price: d.rates.TRY*(d.rates.GBP?1/d.rates.GBP:1.26), change24h: 0, currency:"TRY" });
        }
      } catch { prices.push({ symbol:"USD/TRY", name:"Dolar/TL", price:38.20, change24h:0.1, currency:"TRY" }); }
      prices.push({ symbol:"XAU", name:"Altın (Ons/TRY)", price:113500, change24h:0.8, currency:"TRY" });
      res.json(prices);
    } catch { res.status(500).json({ error: "Fiyat verisi alınamadı" }); }
  });

  // ── SPONSORS (public) ──
  app.get("/api/sponsors", (_req, res) => res.json(storage.getSponsorPortfolios()));
  app.get("/api/ads", (req, res) => {
    const placement = req.query.placement as string | undefined;
    const ads = storage.getActiveSponsors(placement);
    ads.forEach(a => storage.trackImpression(a.id));
    res.json(ads);
  });
  app.post("/api/ads/:id/click", (req, res) => { storage.trackClick(+req.params.id); res.json({ ok: true }); });

  // ── ADMIN ──
  app.get("/api/admin/stats", (req, res) => { if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" }); res.json(storage.getStats()); });
  app.get("/api/admin/users", (req, res) => { if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" }); res.json(storage.getAllUsers().map(u => ({ id:u.id, email:u.email, name:u.name, role:u.role, createdAt:u.createdAt }))); });
  app.post("/api/admin/users/:id/role", (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" });
    const { role } = req.body; if (!["user","premium","admin"].includes(role)) return res.status(400).json({ error: "Geçersiz rol" });
    storage.setUserRole(+req.params.id, role); res.json({ ok: true });
  });
  app.delete("/api/admin/users/:id", (req, res) => { if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" }); storage.deleteUser(+req.params.id); res.json({ ok: true }); });

  app.get("/api/admin/sponsors", (req, res) => { if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" }); res.json(storage.getAllSponsors()); });
  app.post("/api/admin/sponsors", (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" });
    const d = z.object({ name: z.string(), type: z.string().default("sponsor"), website: z.string().optional(), description: z.string().optional(), ctaText: z.string().optional(), ctaUrl: z.string().optional(), placement: z.string().default("sidebar"), priority: z.number().default(0), active: z.boolean().default(true) }).parse(req.body);
    res.json(storage.createSponsor({ ...d, logo: null, website: d.website||null, description: d.description||null, ctaText: d.ctaText||null, ctaUrl: d.ctaUrl||null }));
  });
  app.post("/api/admin/sponsors/:id", (req, res) => { if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" }); storage.updateSponsor(+req.params.id, req.body); res.json({ ok: true }); });
  app.delete("/api/admin/sponsors/:id", (req, res) => { if (!isAdmin(req)) return res.status(403).json({ error: "Yetkisiz" }); storage.deleteSponsor(+req.params.id); res.json({ ok: true }); });

  // ── STATIC ──
  app.get("/api/asset-types", (_req, res) => res.json(ASSET_TYPES));
  app.get("/api/thinkers", (_req, res) => res.json(THINKER_PERSONAS));
  app.get("/api/guest-usage", (req, res) => { const u = storage.getGuestUsage(sid(req)); res.json({ ...u, calcLimit: FREE_CALC_LIMIT, entryLimit: FREE_ENTRY_LIMIT }); });
  app.get("/api/kvkk", (_req, res) => res.json({ title: "KVKK Aydınlatma Metni", content: "nekazandi.com - 6698 sayılı KVKK kapsamında verileriniz korunmaktadır." }));
}
