import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { calculatePortfolio, generateCommentary } from "./calculator";
import { ASSET_TYPES, THINKER_PERSONAS } from "@shared/schema";
import { z } from "zod";

// Simple password hashing (bcryptjs)
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

export function registerRoutes(server: Server, app: Express) {
  // ─── AUTH ROUTES ───
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
        kvkkConsent: z.boolean().default(false),
      });
      const data = schema.parse(req.body);

      const existing = storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(409).json({ error: "Bu e-posta zaten kayıtlı" });
      }

      const passwordHash = await hashPassword(data.password);
      const user = storage.createUser({
        email: data.email,
        passwordHash,
        name: data.name || null,
        kvkkConsent: data.kvkkConsent,
      });

      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Kayıt hatası" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ email: z.string().email(), password: z.string() });
      const data = schema.parse(req.body);

      const user = storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ error: "E-posta veya şifre hatalı" });
      }

      const valid = await verifyPassword(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "E-posta veya şifre hatalı" });
      }

      // Set session
      if (req.session) {
        (req.session as any).userId = user.id;
      }

      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Giriş hatası" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy(() => {});
    }
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.json({ user: null });
    const user = storage.getUserById(userId);
    if (!user) return res.json({ user: null });
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  // ─── PORTFOLIO ROUTES ───
  app.post("/api/portfolios", (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;
      const sessionId = req.headers["x-session-id"] as string;

      const schema = z.object({
        name: z.string().default("Portföyüm"),
        currency: z.string().default("TRY"),
      });
      const data = schema.parse(req.body);

      const portfolio = storage.createPortfolio({
        userId: userId || null,
        sessionId: !userId ? sessionId : null,
        name: data.name,
        currency: data.currency,
      });

      res.json(portfolio);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/portfolios", (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    const sessionId = req.headers["x-session-id"] as string;

    let portfolios;
    if (userId) {
      portfolios = storage.getPortfoliosByUser(userId);
    } else if (sessionId) {
      portfolios = storage.getPortfoliosBySession(sessionId);
    } else {
      portfolios = [];
    }
    res.json(portfolios);
  });

  app.get("/api/portfolios/:id", (req: Request, res: Response) => {
    const portfolio = storage.getPortfolio(parseInt(req.params.id));
    if (!portfolio) return res.status(404).json({ error: "Portföy bulunamadı" });
    res.json(portfolio);
  });

  app.delete("/api/portfolios/:id", (req: Request, res: Response) => {
    storage.deletePortfolio(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── TRANSACTION ROUTES ───
  app.post("/api/portfolios/:id/transactions", (req: Request, res: Response) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const portfolio = storage.getPortfolio(portfolioId);
      if (!portfolio) return res.status(404).json({ error: "Portföy bulunamadı" });

      const schema = z.object({
        type: z.enum(["cash_in", "cash_out", "buy", "sell"]),
        assetType: z.string().optional(),
        assetName: z.string().optional(),
        assetTicker: z.string().optional(),
        quantity: z.number().optional(),
        price: z.number().optional(),
        amount: z.number(),
        date: z.string(),
        note: z.string().optional(),
      });
      const data = schema.parse(req.body);

      const transaction = storage.addTransaction({
        portfolioId,
        ...data,
        assetType: data.assetType || null,
        assetName: data.assetName || null,
        assetTicker: data.assetTicker || null,
        quantity: data.quantity || null,
        price: data.price || null,
        note: data.note || null,
      });

      res.json(transaction);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/portfolios/:id/transactions", (req: Request, res: Response) => {
    const portfolioId = parseInt(req.params.id);
    const txns = storage.getTransactions(portfolioId);
    res.json(txns);
  });

  app.delete("/api/transactions/:id", (req: Request, res: Response) => {
    storage.deleteTransaction(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── CALCULATE ROUTE ───
  app.post("/api/portfolios/:id/calculate", (req: Request, res: Response) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const portfolio = storage.getPortfolio(portfolioId);
      if (!portfolio) return res.status(404).json({ error: "Portföy bulunamadı" });

      // Check guest usage
      const userId = (req.session as any)?.userId;
      const sessionId = req.headers["x-session-id"] as string;
      if (!userId && sessionId) {
        const usage = storage.getGuestUsage(sessionId);
        if (usage >= 5) {
          return res.status(403).json({ error: "Misafir kullanıcı limiti aşıldı. Kayıt olarak sınırsız hesaplama yapabilirsiniz.", limitReached: true });
        }
        storage.incrementGuestUsage(sessionId);
      }

      const { startDate, endDate, prices } = req.body || {};
      const txns = storage.getTransactions(portfolioId);

      // Build current prices map from request or defaults
      const currentPrices = new Map<string, number>();
      if (prices && typeof prices === "object") {
        for (const [key, value] of Object.entries(prices)) {
          if (typeof value === "number") {
            currentPrices.set(key, value);
          }
        }
      }

      const result = calculatePortfolio(txns, currentPrices, startDate, endDate);
      const commentary = generateCommentary(result);

      res.json({ ...result, commentary });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ─── ASSET TYPES ───
  app.get("/api/asset-types", (_req: Request, res: Response) => {
    res.json(ASSET_TYPES);
  });

  // ─── THINKER PERSONAS ───
  app.get("/api/thinkers", (_req: Request, res: Response) => {
    res.json(THINKER_PERSONAS);
  });

  // ─── SPONSOR PORTFOLIOS ───
  app.get("/api/sponsors", (_req: Request, res: Response) => {
    const sponsors = storage.getSponsorPortfolios();
    res.json(sponsors);
  });

  // ─── GUEST USAGE ───
  app.get("/api/guest-usage", (req: Request, res: Response) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) return res.json({ count: 0, limit: 5 });
    const count = storage.getGuestUsage(sessionId);
    res.json({ count, limit: 5 });
  });

  // ─── KVKK (Data Privacy) ───
  app.get("/api/kvkk", (_req: Request, res: Response) => {
    res.json({
      title: "KVKK Aydınlatma Metni",
      content: `nekazandi.com olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel verilerinizin korunmasına büyük önem veriyoruz.

Toplanan Veriler: E-posta adresi, portföy verileri (yatırım tutarları, varlık dağılımları).

İşleme Amacı: Portföy performans hesaplamaları, kullanıcı deneyiminin iyileştirilmesi.

Saklama Süresi: Hesabınız aktif olduğu sürece. Hesap silme talebiniz üzerine 30 gün içinde silinir.

Haklarınız: KVKK Madde 11 kapsamında; verilerinize erişim, düzeltme, silme, işleme itiraz etme haklarınız bulunmaktadır.

İletişim: info@nekazandi.com`,
    });
  });
}
