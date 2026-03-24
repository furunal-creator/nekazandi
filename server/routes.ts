import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { calculatePortfolio, generateCommentary } from "./calculator";
import { ASSET_TYPES, THINKER_PERSONAS, FREE_ENTRY_LIMIT, FREE_CALC_LIMIT } from "@shared/schema";
import { z } from "zod";

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

function getUserId(req: Request): number | null {
  return (req.session as any)?.userId || null;
}
function getSessionId(req: Request): string {
  return (req.headers["x-session-id"] as string) || "anon";
}
async function isPremiumUser(req: Request): Promise<boolean> {
  const uid = getUserId(req);
  if (!uid) return false;
  const user = storage.getUserById(uid);
  return !!user?.isPremium;
}

export function registerRoutes(server: Server, app: Express) {

  // ─── AUTH ───
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = z.object({
        email: z.string().email(), password: z.string().min(6),
        name: z.string().optional(), kvkkConsent: z.boolean().default(false),
      }).parse(req.body);
      if (storage.getUserByEmail(data.email)) return res.status(409).json({ error: "Bu e-posta zaten kayıtlı" });
      const passwordHash = await hashPassword(data.password);
      const user = storage.createUser({ email: data.email, passwordHash, name: data.name || null, isPremium: false, kvkkConsent: data.kvkkConsent });
      (req.session as any).userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name, isPremium: user.isPremium });
    } catch (err: any) { res.status(400).json({ error: err.message || "Kayıt hatası" }); }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const user = storage.getUserByEmail(data.email);
      if (!user || !(await verifyPassword(data.password, user.passwordHash))) return res.status(401).json({ error: "E-posta veya şifre hatalı" });
      (req.session as any).userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name, isPremium: user.isPremium });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.post("/api/auth/logout", (req, res) => { req.session?.destroy(() => {}); res.json({ ok: true }); });

  app.get("/api/auth/me", (req, res) => {
    const uid = getUserId(req);
    if (!uid) return res.json({ user: null });
    const user = storage.getUserById(uid);
    if (!user) return res.json({ user: null });
    res.json({ user: { id: user.id, email: user.email, name: user.name, isPremium: user.isPremium } });
  });

  // ─── PREMIUM ───
  app.post("/api/premium/upgrade", async (req, res) => {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: "Giriş yapın" });
    storage.upgradeToPremium(uid);
    res.json({ ok: true, isPremium: true });
  });

  // ─── PORTFOLIOS ───
  app.post("/api/portfolios", (req, res) => {
    try {
      const uid = getUserId(req); const sid = getSessionId(req);
      const data = z.object({ name: z.string().default("Portföyüm"), currency: z.string().default("TRY") }).parse(req.body);
      const portfolio = storage.createPortfolio({ userId: uid, sessionId: !uid ? sid : null, name: data.name, currency: data.currency });
      res.json(portfolio);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.get("/api/portfolios", (req, res) => {
    const uid = getUserId(req); const sid = getSessionId(req);
    res.json(uid ? storage.getPortfoliosByUser(uid) : storage.getPortfoliosBySession(sid));
  });

  app.get("/api/portfolios/:id", (req, res) => {
    const p = storage.getPortfolio(parseInt(req.params.id));
    if (!p) return res.status(404).json({ error: "Portföy bulunamadı" });
    res.json(p);
  });

  app.delete("/api/portfolios/:id", (req, res) => {
    storage.deletePortfolio(parseInt(req.params.id)); res.json({ ok: true });
  });

  // ─── TRANSACTIONS (with entry limit for free users) ───
  app.post("/api/portfolios/:id/transactions", async (req, res) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const portfolio = storage.getPortfolio(portfolioId);
      if (!portfolio) return res.status(404).json({ error: "Portföy bulunamadı" });

      const uid = getUserId(req);
      const sid = getSessionId(req);
      const premium = await isPremiumUser(req);

      // Check entry limit for non-premium
      if (!premium) {
        if (uid) {
          // Registered but not premium - check transaction count
          const count = storage.getTransactionCount(portfolioId);
          if (count >= FREE_ENTRY_LIMIT) {
            return res.status(403).json({ error: `Ücretsiz hesapta maksimum ${FREE_ENTRY_LIMIT} işlem girebilirsiniz. Premium'a yükseltin.`, limitReached: true, limitType: "entry" });
          }
        } else {
          // Guest
          const usage = storage.getGuestUsage(sid);
          if (usage.entryCount >= FREE_ENTRY_LIMIT) {
            return res.status(403).json({ error: `Misafir olarak ${FREE_ENTRY_LIMIT} işlem girebilirsiniz. Kayıt olun veya Premium'a yükseltin.`, limitReached: true, limitType: "entry" });
          }
          storage.incrementGuestEntry(sid);
        }
      }

      const schema = z.object({
        type: z.enum(["cash_in", "cash_out", "buy", "sell"]),
        assetType: z.string().optional(), assetName: z.string().optional(), assetTicker: z.string().optional(),
        quantity: z.number().optional(), price: z.number().optional(), amount: z.number(), date: z.string(), note: z.string().optional(),
      });
      const data = schema.parse(req.body);
      const tx = storage.addTransaction({
        portfolioId, ...data,
        assetType: data.assetType || null, assetName: data.assetName || null, assetTicker: data.assetTicker || null,
        quantity: data.quantity || null, price: data.price || null, note: data.note || null,
      });
      res.json(tx);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.get("/api/portfolios/:id/transactions", (req, res) => {
    res.json(storage.getTransactions(parseInt(req.params.id)));
  });

  app.delete("/api/transactions/:id", (req, res) => {
    storage.deleteTransaction(parseInt(req.params.id)); res.json({ ok: true });
  });

  // ─── CALCULATE ───
  app.post("/api/portfolios/:id/calculate", async (req, res) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const portfolio = storage.getPortfolio(portfolioId);
      if (!portfolio) return res.status(404).json({ error: "Portföy bulunamadı" });

      const uid = getUserId(req);
      const sid = getSessionId(req);
      const premium = await isPremiumUser(req);

      // Calc limit for non-premium
      if (!premium && !uid) {
        const usage = storage.getGuestUsage(sid);
        if (usage.calcCount >= FREE_CALC_LIMIT) {
          return res.status(403).json({ error: `Misafir olarak ${FREE_CALC_LIMIT} hesaplama yapabilirsiniz. Kayıt olun.`, limitReached: true, limitType: "calc" });
        }
        storage.incrementGuestCalc(sid);
      }

      const { startDate, endDate, prices } = req.body || {};
      const txns = storage.getTransactions(portfolioId);
      const currentPrices = new Map<string, number>();
      if (prices && typeof prices === "object") {
        for (const [k, v] of Object.entries(prices)) { if (typeof v === "number") currentPrices.set(k, v); }
      }

      const result = calculatePortfolio(txns, currentPrices, startDate, endDate, premium);
      const commentary = generateCommentary(result);

      // Non-premium gets only 3 thinkers
      const limitedCommentary = premium ? commentary : commentary.slice(0, 3);

      res.json({ ...result, commentary: limitedCommentary, isPremiumResult: premium });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ─── LIVE PRICES (Real-time from public APIs) ───
  app.get("/api/live-prices", async (_req, res) => {
    try {
      const prices: any[] = [];

      // Crypto from CoinGecko
      try {
        const cgRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd,try&include_24hr_change=true");
        const cg = await cgRes.json();
        if (cg.bitcoin) {
          prices.push({ symbol: "BTC", name: "Bitcoin", price: cg.bitcoin.try || cg.bitcoin.usd * 38, change24h: cg.bitcoin.usd_24h_change || 0, currency: "TRY" });
          prices.push({ symbol: "ETH", name: "Ethereum", price: cg.ethereum.try || cg.ethereum.usd * 38, change24h: cg.ethereum.usd_24h_change || 0, currency: "TRY" });
          prices.push({ symbol: "SOL", name: "Solana", price: cg.solana.try || cg.solana.usd * 38, change24h: cg.solana.usd_24h_change || 0, currency: "TRY" });
        }
      } catch {}

      // Gold from metals API (fallback to static)
      try {
        const goldRes = await fetch("https://api.metalpriceapi.com/v1/latest?api_key=demo&base=XAU&currencies=TRY,USD");
        const gold = await goldRes.json();
        if (gold.rates?.TRY) {
          prices.push({ symbol: "XAU", name: "Altın (Ons)", price: gold.rates.TRY, change24h: 0, currency: "TRY" });
        }
      } catch {
        prices.push({ symbol: "XAU", name: "Altın (Ons)", price: 113500, change24h: 0.8, currency: "TRY" });
      }

      // FX from exchangerate
      try {
        const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
        const fx = await fxRes.json();
        if (fx.rates?.TRY) {
          prices.push({ symbol: "USD/TRY", name: "Dolar/TL", price: fx.rates.TRY, change24h: 0, currency: "TRY" });
          prices.push({ symbol: "EUR/TRY", name: "Euro/TL", price: fx.rates.TRY * (fx.rates.EUR ? 1 / fx.rates.EUR : 1.08), change24h: 0, currency: "TRY" });
          prices.push({ symbol: "GBP/TRY", name: "Sterlin/TL", price: fx.rates.TRY * (fx.rates.GBP ? 1 / fx.rates.GBP : 1.26), change24h: 0, currency: "TRY" });
        }
      } catch {
        prices.push({ symbol: "USD/TRY", name: "Dolar/TL", price: 38.20, change24h: 0.1, currency: "TRY" });
        prices.push({ symbol: "EUR/TRY", name: "Euro/TL", price: 41.50, change24h: 0.2, currency: "TRY" });
      }

      res.json(prices);
    } catch (err: any) {
      res.status(500).json({ error: "Fiyat verisi alınamadı" });
    }
  });

  // ─── STATIC ENDPOINTS ───
  app.get("/api/asset-types", (_req, res) => res.json(ASSET_TYPES));
  app.get("/api/thinkers", (_req, res) => res.json(THINKER_PERSONAS));
  app.get("/api/sponsors", (_req, res) => res.json(storage.getSponsorPortfolios()));

  app.get("/api/guest-usage", (req, res) => {
    const sid = getSessionId(req);
    const usage = storage.getGuestUsage(sid);
    res.json({ calcCount: usage.calcCount, entryCount: usage.entryCount, calcLimit: FREE_CALC_LIMIT, entryLimit: FREE_ENTRY_LIMIT });
  });

  app.get("/api/kvkk", (_req, res) => {
    res.json({
      title: "KVKK Aydınlatma Metni",
      content: `nekazandi.com olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında verilerinizin korunmasına önem veriyoruz.\n\nToplanan Veriler: E-posta adresi, portföy verileri.\nİşleme Amacı: Portföy performans hesaplamaları.\nSaklama Süresi: Hesap aktif olduğu sürece.\nHaklarınız: KVKK Madde 11 kapsamında erişim, düzeltme, silme hakları.\nİletişim: info@nekazandi.com`,
    });
  });
}
