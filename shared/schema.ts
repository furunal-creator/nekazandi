import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── USERS ───
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role").notNull().default("user"), // "user" | "premium" | "admin"
  kvkkConsent: integer("kvkk_consent", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── PORTFOLIOS ───
export const portfolios = sqliteTable("portfolios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  name: text("name").notNull().default("Portföyüm"),
  currency: text("currency").notNull().default("TRY"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertPortfolioSchema = createInsertSchema(portfolios).omit({ id: true, createdAt: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

// ─── TRANSACTIONS ───
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  portfolioId: integer("portfolio_id").notNull(),
  type: text("type").notNull(),
  assetType: text("asset_type"),
  assetName: text("asset_name"),
  assetTicker: text("asset_ticker"),
  quantity: real("quantity"),
  price: real("price"),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ─── SPONSORS / ADS ───
export const sponsors = sqliteTable("sponsors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  logo: text("logo"),
  type: text("type").notNull().default("sponsor"), // "sponsor" | "bank" | "broker" | "crypto"
  website: text("website"),
  description: text("description"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  placement: text("placement").notNull().default("sidebar"), // "sidebar" | "banner" | "inline" | "modal"
  priority: integer("priority").notNull().default(0),
  active: integer("active", { mode: "boolean" }).default(true),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertSponsorSchema = createInsertSchema(sponsors).omit({ id: true, createdAt: true, impressions: true, clicks: true });
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type Sponsor = typeof sponsors.$inferSelect;

// ─── SPONSOR PORTFOLIOS (model portfolios from sponsors) ───
export const sponsorPortfolios = sqliteTable("sponsor_portfolios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sponsorId: integer("sponsor_id"),
  sponsorName: text("sponsor_name").notNull(),
  sponsorLogo: text("sponsor_logo"),
  name: text("name").notNull(),
  description: text("description"),
  allocations: text("allocations").notNull(),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertSponsorPortfolioSchema = createInsertSchema(sponsorPortfolios).omit({ id: true, createdAt: true });
export type InsertSponsorPortfolio = z.infer<typeof insertSponsorPortfolioSchema>;
export type SponsorPortfolio = typeof sponsorPortfolios.$inferSelect;

// ─── GUEST USAGE ───
export const guestUsage = sqliteTable("guest_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  calculationCount: integer("calculation_count").notNull().default(0),
  entryCount: integer("entry_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── CONSTANTS ───
export const ASSET_TYPES = {
  bist100: { label: "BIST 100", icon: "📈", category: "equity", color: "#3b82f6" },
  ipo_tr: { label: "IPO (Turkey)", icon: "🆕", category: "equity", color: "#8b5cf6" },
  tefas: { label: "TEFAS Fonları", icon: "📊", category: "fund", color: "#6366f1" },
  bond: { label: "Tahvil", icon: "📃", category: "fixed_income", color: "#f59e0b" },
  bill: { label: "Bono", icon: "📋", category: "fixed_income", color: "#f97316" },
  sukuk: { label: "Sukuk", icon: "🕌", category: "fixed_income", color: "#ec4899" },
  nasdaq100: { label: "NASDAQ 100", icon: "🇺🇸", category: "equity", color: "#2563eb" },
  precious_metals: { label: "Kıymetli Madenler", icon: "🥇", category: "commodity", color: "#d97706" },
  crypto: { label: "Kripto", icon: "₿", category: "crypto", color: "#f59e0b" },
  fx: { label: "Döviz", icon: "💱", category: "fx", color: "#14b8a6" },
  other: { label: "Diğer (Manuel)", icon: "📝", category: "other", color: "#6b7280" },
} as const;
export type AssetTypeKey = keyof typeof ASSET_TYPES;

export const THINKER_PERSONAS = [
  { id: "keynes", name: "J.M. Keynes", era: "1883–1946", avatar: "🎩", philosophy: "Aggregate demand drives economies." },
  { id: "friedman", name: "M. Friedman", era: "1912–2006", avatar: "📊", philosophy: "Free markets allocate resources optimally." },
  { id: "graham", name: "B. Graham", era: "1894–1976", avatar: "📖", philosophy: "Margin of safety protects against loss." },
  { id: "drucker", name: "P. Drucker", era: "1909–2005", avatar: "🏢", philosophy: "Management by objectives." },
  { id: "schumpeter", name: "J. Schumpeter", era: "1883–1950", avatar: "⚡", philosophy: "Creative destruction drives capitalism." },
  { id: "fisher", name: "I. Fisher", era: "1867–1947", avatar: "💰", philosophy: "Debt deflation theory." },
  { id: "kostolany", name: "A. Kostolany", era: "1906–1999", avatar: "🎭", philosophy: "Buy during panic, sell during euphoria." },
  { id: "templeton", name: "J. Templeton", era: "1912–2008", avatar: "🌍", philosophy: "Maximum pessimism is the best time to invest." },
  { id: "bagehot", name: "W. Bagehot", era: "1826–1877", avatar: "🏛️", philosophy: "Lombard Street principles." },
  { id: "kindleberger", name: "C. Kindleberger", era: "1910–2003", avatar: "📚", philosophy: "Mania, panic, crash." },
] as const;

export const FREE_ENTRY_LIMIT = 5;
export const FREE_CALC_LIMIT = 3;

export const PREMIUM_FEATURES = [
  { icon: "♾️", title: "Sınırsız İşlem", desc: "İşlem giriş limiti yok" },
  { icon: "📊", title: "Gelişmiş Analiz", desc: "Sharpe Ratio, Max Drawdown" },
  { icon: "📄", title: "PDF Rapor", desc: "Profesyonel portföy raporu" },
  { icon: "🧠", title: "AI Yorumları", desc: "10 efsanevi düşünürün tam analizi" },
  { icon: "⚡", title: "Gerçek Zamanlı", desc: "Canlı piyasa verileri" },
  { icon: "🔔", title: "Fiyat Alarmları", desc: "Hedef fiyat bildirimleri" },
] as const;

// ─── TYPES ───
export interface PortfolioResult {
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  percentReturn: number;
  twr: number;
  xirr: number | null;
  sharpeRatio?: number;
  maxDrawdown?: number;
  timeline: { date: string; value: number }[];
  allocation: { assetType: string; label: string; value: number; weight: number; color: string }[];
  transactions: Transaction[];
}

export interface ThinkerCommentary {
  thinkerId: string;
  name: string;
  era: string;
  avatar: string;
  commentary: string;
  sentiment: "bullish" | "bearish" | "neutral" | "cautious";
}

export interface LivePrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  currency: string;
}

// Admin stats
export interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  totalPortfolios: number;
  totalTransactions: number;
  totalSponsors: number;
  totalImpressions: number;
  totalClicks: number;
}
