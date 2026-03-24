import bcryptjs from "bcryptjs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import {
  users, portfolios, transactions, sponsors, sponsorPortfolios, guestUsage,
  type User, type InsertUser, type Portfolio, type InsertPortfolio,
  type Transaction, type InsertTransaction, type Sponsor, type InsertSponsor,
  type SponsorPortfolio, type InsertSponsorPortfolio, type AdminStats,
} from "@shared/schema";

const sqlite = new Database("nekazandi.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, name TEXT, role TEXT NOT NULL DEFAULT 'user',
    kvkk_consent INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, session_id TEXT,
    name TEXT NOT NULL DEFAULT 'Portföyüm', currency TEXT NOT NULL DEFAULT 'TRY',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, portfolio_id INTEGER NOT NULL,
    type TEXT NOT NULL, asset_type TEXT, asset_name TEXT, asset_ticker TEXT,
    quantity REAL, price REAL, amount REAL NOT NULL, date TEXT NOT NULL,
    note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo TEXT,
    type TEXT NOT NULL DEFAULT 'sponsor', website TEXT, description TEXT,
    cta_text TEXT, cta_url TEXT, placement TEXT NOT NULL DEFAULT 'sidebar',
    priority INTEGER NOT NULL DEFAULT 0, active INTEGER DEFAULT 1,
    impressions INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sponsor_portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, sponsor_id INTEGER, sponsor_name TEXT NOT NULL,
    sponsor_logo TEXT, name TEXT NOT NULL, description TEXT, allocations TEXT NOT NULL,
    active INTEGER DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS guest_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL UNIQUE,
    calculation_count INTEGER NOT NULL DEFAULT 0, entry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrations
try { sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"); } catch {}
try { sqlite.exec("ALTER TABLE guest_usage ADD COLUMN entry_count INTEGER NOT NULL DEFAULT 0"); } catch {}
try { sqlite.exec("ALTER TABLE sponsor_portfolios ADD COLUMN sponsor_id INTEGER"); } catch {}

export const storage = {
  // Users
  createUser(data: InsertUser): User { return db.insert(users).values(data).returning().get(); },
  getUserByEmail(email: string) { return db.select().from(users).where(eq(users.email, email)).get(); },
  getUserById(id: number) { return db.select().from(users).where(eq(users.id, id)).get(); },
  getAllUsers(): User[] { return db.select().from(users).all(); },
  setUserRole(id: number, role: string) { sqlite.prepare("UPDATE users SET role=? WHERE id=?").run(role, id); },
  deleteUser(id: number) { sqlite.prepare("DELETE FROM users WHERE id=?").run(id); },

  // Portfolios
  createPortfolio(data: InsertPortfolio): Portfolio { return db.insert(portfolios).values(data).returning().get(); },
  getPortfolio(id: number) { return db.select().from(portfolios).where(eq(portfolios.id, id)).get(); },
  getPortfoliosByUser(userId: number) { return db.select().from(portfolios).where(eq(portfolios.userId, userId)).all(); },
  getPortfoliosBySession(sid: string) { return db.select().from(portfolios).where(eq(portfolios.sessionId, sid)).all(); },
  deletePortfolio(id: number) { db.delete(transactions).where(eq(transactions.portfolioId, id)).run(); db.delete(portfolios).where(eq(portfolios.id, id)).run(); },

  // Transactions
  addTransaction(data: InsertTransaction): Transaction { return db.insert(transactions).values(data).returning().get(); },
  getTransactions(pid: number) { return db.select().from(transactions).where(eq(transactions.portfolioId, pid)).all(); },
  getTransactionCount(pid: number) { return db.select().from(transactions).where(eq(transactions.portfolioId, pid)).all().length; },
  deleteTransaction(id: number) { db.delete(transactions).where(eq(transactions.id, id)).run(); },

  // Sponsors
  createSponsor(data: InsertSponsor): Sponsor { return db.insert(sponsors).values(data).returning().get(); },
  getAllSponsors(): Sponsor[] { return db.select().from(sponsors).all(); },
  getActiveSponsors(placement?: string): Sponsor[] {
    const all = db.select().from(sponsors).where(eq(sponsors.active, true)).all();
    return placement ? all.filter(s => s.placement === placement) : all;
  },
  updateSponsor(id: number, data: Partial<InsertSponsor>) {
    const sets: string[] = []; const vals: any[] = [];
    if (data.name !== undefined) { sets.push("name=?"); vals.push(data.name); }
    if (data.type !== undefined) { sets.push("type=?"); vals.push(data.type); }
    if (data.website !== undefined) { sets.push("website=?"); vals.push(data.website); }
    if (data.description !== undefined) { sets.push("description=?"); vals.push(data.description); }
    if (data.ctaText !== undefined) { sets.push("cta_text=?"); vals.push(data.ctaText); }
    if (data.ctaUrl !== undefined) { sets.push("cta_url=?"); vals.push(data.ctaUrl); }
    if (data.placement !== undefined) { sets.push("placement=?"); vals.push(data.placement); }
    if (data.priority !== undefined) { sets.push("priority=?"); vals.push(data.priority); }
    if (data.active !== undefined) { sets.push("active=?"); vals.push(data.active ? 1 : 0); }
    if (sets.length) { vals.push(id); sqlite.prepare(`UPDATE sponsors SET ${sets.join(",")} WHERE id=?`).run(...vals); }
  },
  deleteSponsor(id: number) { sqlite.prepare("DELETE FROM sponsors WHERE id=?").run(id); },
  trackImpression(id: number) { sqlite.prepare("UPDATE sponsors SET impressions=impressions+1 WHERE id=?").run(id); },
  trackClick(id: number) { sqlite.prepare("UPDATE sponsors SET clicks=clicks+1 WHERE id=?").run(id); },

  // Sponsor portfolios
  getSponsorPortfolios() { return db.select().from(sponsorPortfolios).where(eq(sponsorPortfolios.active, true)).all(); },
  createSponsorPortfolio(data: InsertSponsorPortfolio) { return db.insert(sponsorPortfolios).values(data).returning().get(); },

  // Guest usage
  getGuestUsage(sid: string) { const r = db.select().from(guestUsage).where(eq(guestUsage.sessionId, sid)).get(); return { calcCount: r?.calculationCount??0, entryCount: r?.entryCount??0 }; },
  incrementGuestCalc(sid: string) { const e = db.select().from(guestUsage).where(eq(guestUsage.sessionId, sid)).get(); if(e){const n=(e.calculationCount??0)+1;sqlite.prepare("UPDATE guest_usage SET calculation_count=? WHERE session_id=?").run(n,sid);return n;}db.insert(guestUsage).values({sessionId:sid,calculationCount:1,entryCount:0}).run();return 1; },
  incrementGuestEntry(sid: string) { const e = db.select().from(guestUsage).where(eq(guestUsage.sessionId, sid)).get(); if(e){const n=(e.entryCount??0)+1;sqlite.prepare("UPDATE guest_usage SET entry_count=? WHERE session_id=?").run(n,sid);return n;}db.insert(guestUsage).values({sessionId:sid,calculationCount:0,entryCount:1}).run();return 1; },

  // Admin stats
  getStats(): AdminStats {
    const u = sqlite.prepare("SELECT COUNT(*) as c FROM users").get() as any;
    const p = sqlite.prepare("SELECT COUNT(*) as c FROM users WHERE role='premium'").get() as any;
    const pf = sqlite.prepare("SELECT COUNT(*) as c FROM portfolios").get() as any;
    const tx = sqlite.prepare("SELECT COUNT(*) as c FROM transactions").get() as any;
    const sp = sqlite.prepare("SELECT COUNT(*) as c FROM sponsors").get() as any;
    const imp = sqlite.prepare("SELECT COALESCE(SUM(impressions),0) as c FROM sponsors").get() as any;
    const cl = sqlite.prepare("SELECT COALESCE(SUM(clicks),0) as c FROM sponsors").get() as any;
    return { totalUsers: u.c, premiumUsers: p.c, totalPortfolios: pf.c, totalTransactions: tx.c, totalSponsors: sp.c, totalImpressions: imp.c, totalClicks: cl.c };
  },
};

// Seed admin + sponsors
if (!storage.getUserByEmail("admin@nekazandi.com")) {
  const hash = bcryptjs.hashSync("admin123", 10);
  storage.createUser({ email: "admin@nekazandi.com", passwordHash: hash, name: "Admin", role: "admin", kvkkConsent: true });
}

if (storage.getAllSponsors().length === 0) {
  storage.createSponsor({ name: "İş Bankası", type: "bank", description: "Türkiye'nin köklü bankası ile yatırım fırsatları", ctaText: "Hesap Aç", ctaUrl: "https://isbank.com.tr", placement: "sidebar", priority: 10, active: true, logo: null, website: "https://isbank.com.tr" });
  storage.createSponsor({ name: "Garanti BBVA", type: "bank", description: "Dijital yatırım çözümleri", ctaText: "Fon Alım-Satım", ctaUrl: "https://garantibbva.com.tr", placement: "banner", priority: 9, active: true, logo: null, website: "https://garantibbva.com.tr" });
  storage.createSponsor({ name: "Yapı Kredi Yatırım", type: "broker", description: "Profesyonel yatırım platformu", ctaText: "Yatırım Yap", ctaUrl: "https://yapikredi.com.tr", placement: "sidebar", priority: 8, active: true, logo: null, website: "https://yapikredi.com.tr" });
  storage.createSponsor({ name: "Paribu", type: "crypto", description: "Türkiye'nin lider kripto borsası", ctaText: "Kripto Al", ctaUrl: "https://paribu.com", placement: "inline", priority: 7, active: true, logo: null, website: "https://paribu.com" });
  storage.createSponsor({ name: "BtcTurk", type: "crypto", description: "Güvenilir kripto alım satım", ctaText: "Ücretsiz Hesap", ctaUrl: "https://btcturk.com", placement: "sidebar", priority: 6, active: true, logo: null, website: "https://btcturk.com" });
}

if (storage.getSponsorPortfolios().length === 0) {
  storage.createSponsorPortfolio({ sponsorId: 1, sponsorName: "İş Bankası", sponsorLogo: null, name: "Dengeli Portföy", description: "BIST 100, Altın ve Tahvil karışımı", allocations: JSON.stringify([{assetType:"bist100",assetName:"BIST 100",weight:40},{assetType:"precious_metals",assetName:"Altın",weight:30},{assetType:"bond",assetName:"Devlet Tahvili",weight:30}]), active: true });
  storage.createSponsorPortfolio({ sponsorId: 2, sponsorName: "Garanti BBVA", sponsorLogo: null, name: "Teknoloji Odaklı", description: "NASDAQ ve kripto ağırlıklı portföy", allocations: JSON.stringify([{assetType:"nasdaq100",assetName:"NASDAQ 100",weight:45},{assetType:"crypto",assetName:"Bitcoin",weight:25},{assetType:"bist100",assetName:"BIST 100",weight:20},{assetType:"fx",assetName:"USD/TRY",weight:10}]), active: true });
}
