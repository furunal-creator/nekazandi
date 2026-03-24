import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import {
  users, portfolios, transactions, sponsorPortfolios, guestUsage,
  type User, type InsertUser,
  type Portfolio, type InsertPortfolio,
  type Transaction, type InsertTransaction,
  type SponsorPortfolio, type InsertSponsorPortfolio,
} from "@shared/schema";

const sqlite = new Database("nekazandi.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// Create tables with v2 schema
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    is_premium INTEGER DEFAULT 0,
    kvkk_consent INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    name TEXT NOT NULL DEFAULT 'Portföyüm',
    currency TEXT NOT NULL DEFAULT 'TRY',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    asset_type TEXT,
    asset_name TEXT,
    asset_ticker TEXT,
    quantity REAL,
    price REAL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
  );
  CREATE TABLE IF NOT EXISTS sponsor_portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_name TEXT NOT NULL,
    sponsor_logo TEXT,
    name TEXT NOT NULL,
    description TEXT,
    allocations TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS guest_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    calculation_count INTEGER NOT NULL DEFAULT 0,
    entry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add is_premium column if missing (migration)
try { sqlite.exec("ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0"); } catch {}
try { sqlite.exec("ALTER TABLE guest_usage ADD COLUMN entry_count INTEGER NOT NULL DEFAULT 0"); } catch {}

export interface IStorage {
  createUser(data: InsertUser): User;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  upgradeToPremium(userId: number): void;
  createPortfolio(data: InsertPortfolio): Portfolio;
  getPortfolio(id: number): Portfolio | undefined;
  getPortfoliosByUser(userId: number): Portfolio[];
  getPortfoliosBySession(sessionId: string): Portfolio[];
  deletePortfolio(id: number): void;
  addTransaction(data: InsertTransaction): Transaction;
  getTransactions(portfolioId: number): Transaction[];
  getTransactionCount(portfolioId: number): number;
  deleteTransaction(id: number): void;
  getSponsorPortfolios(): SponsorPortfolio[];
  createSponsorPortfolio(data: InsertSponsorPortfolio): SponsorPortfolio;
  getGuestUsage(sessionId: string): { calcCount: number; entryCount: number };
  incrementGuestCalc(sessionId: string): number;
  incrementGuestEntry(sessionId: string): number;
}

export class SqliteStorage implements IStorage {
  createUser(data: InsertUser): User {
    return db.insert(users).values(data).returning().get();
  }
  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }
  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  upgradeToPremium(userId: number): void {
    sqlite.prepare("UPDATE users SET is_premium = 1 WHERE id = ?").run(userId);
  }
  createPortfolio(data: InsertPortfolio): Portfolio {
    return db.insert(portfolios).values(data).returning().get();
  }
  getPortfolio(id: number): Portfolio | undefined {
    return db.select().from(portfolios).where(eq(portfolios.id, id)).get();
  }
  getPortfoliosByUser(userId: number): Portfolio[] {
    return db.select().from(portfolios).where(eq(portfolios.userId, userId)).all();
  }
  getPortfoliosBySession(sessionId: string): Portfolio[] {
    return db.select().from(portfolios).where(eq(portfolios.sessionId, sessionId)).all();
  }
  deletePortfolio(id: number): void {
    db.delete(transactions).where(eq(transactions.portfolioId, id)).run();
    db.delete(portfolios).where(eq(portfolios.id, id)).run();
  }
  addTransaction(data: InsertTransaction): Transaction {
    return db.insert(transactions).values(data).returning().get();
  }
  getTransactions(portfolioId: number): Transaction[] {
    return db.select().from(transactions).where(eq(transactions.portfolioId, portfolioId)).all();
  }
  getTransactionCount(portfolioId: number): number {
    const rows = db.select().from(transactions).where(eq(transactions.portfolioId, portfolioId)).all();
    return rows.length;
  }
  deleteTransaction(id: number): void {
    db.delete(transactions).where(eq(transactions.id, id)).run();
  }
  getSponsorPortfolios(): SponsorPortfolio[] {
    return db.select().from(sponsorPortfolios).where(eq(sponsorPortfolios.active, true)).all();
  }
  createSponsorPortfolio(data: InsertSponsorPortfolio): SponsorPortfolio {
    return db.insert(sponsorPortfolios).values(data).returning().get();
  }
  getGuestUsage(sessionId: string): { calcCount: number; entryCount: number } {
    const row = db.select().from(guestUsage).where(eq(guestUsage.sessionId, sessionId)).get();
    return { calcCount: row?.calculationCount ?? 0, entryCount: row?.entryCount ?? 0 };
  }
  incrementGuestCalc(sessionId: string): number {
    const existing = db.select().from(guestUsage).where(eq(guestUsage.sessionId, sessionId)).get();
    if (existing) {
      const n = (existing.calculationCount ?? 0) + 1;
      sqlite.prepare("UPDATE guest_usage SET calculation_count = ? WHERE session_id = ?").run(n, sessionId);
      return n;
    }
    db.insert(guestUsage).values({ sessionId, calculationCount: 1, entryCount: 0 }).run();
    return 1;
  }
  incrementGuestEntry(sessionId: string): number {
    const existing = db.select().from(guestUsage).where(eq(guestUsage.sessionId, sessionId)).get();
    if (existing) {
      const n = (existing.entryCount ?? 0) + 1;
      sqlite.prepare("UPDATE guest_usage SET entry_count = ? WHERE session_id = ?").run(n, sessionId);
      return n;
    }
    db.insert(guestUsage).values({ sessionId, calculationCount: 0, entryCount: 1 }).run();
    return 1;
  }
}

export const storage = new SqliteStorage();

// Seed sponsors
const existingSponsors = storage.getSponsorPortfolios();
if (existingSponsors.length === 0) {
  storage.createSponsorPortfolio({
    sponsorName: "Örnek Yatırım A.Ş.",
    sponsorLogo: null,
    name: "Dengeli Portföy",
    description: "BIST 100, Altın ve Tahvil karışımı dengeli yatırım stratejisi",
    allocations: JSON.stringify([
      { assetType: "bist100", assetName: "BIST 100", weight: 40 },
      { assetType: "precious_metals", assetName: "Altın (Ons)", weight: 30 },
      { assetType: "bond", assetName: "Devlet Tahvili", weight: 30 },
    ]),
    active: true,
  });
  storage.createSponsorPortfolio({
    sponsorName: "Dijital Varlık A.Ş.",
    sponsorLogo: null,
    name: "Agresif Büyüme",
    description: "Teknoloji ve kripto ağırlıklı yüksek riskli portföy",
    allocations: JSON.stringify([
      { assetType: "nasdaq100", assetName: "NASDAQ 100", weight: 40 },
      { assetType: "crypto", assetName: "Bitcoin", weight: 30 },
      { assetType: "bist100", assetName: "BIST 100", weight: 20 },
      { assetType: "fx", assetName: "USD/TRY", weight: 10 },
    ]),
    active: true,
  });
}
