import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── USERS ───
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  isPremium: integer("is_premium", { mode: "boolean" }).default(false),
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
  type: text("type").notNull(), // "cash_in", "cash_out", "buy", "sell"
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

// ─── SPONSOR PORTFOLIOS ───
export const sponsorPortfolios = sqliteTable("sponsor_portfolios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

// ─── GUEST USAGE TRACKING ───
export const guestUsage = sqliteTable("guest_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  calculationCount: integer("calculation_count").notNull().default(0),
  entryCount: integer("entry_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── ASSET TYPES ───
export const ASSET_TYPES = {
  bist100: { label: "BIST 100", icon: "📈", category: "equity", color: "#10b981" },
  ipo_tr: { label: "IPO (Turkey)", icon: "🆕", category: "equity", color: "#8b5cf6" },
  tefas: { label: "TEFAS Fonları", icon: "📊", category: "fund", color: "#3b82f6" },
  bond: { label: "Tahvil", icon: "📃", category: "fixed_income", color: "#f59e0b" },
  bill: { label: "Bono", icon: "📋", category: "fixed_income", color: "#f97316" },
  sukuk: { label: "Sukuk", icon: "🕌", category: "fixed_income", color: "#ec4899" },
  nasdaq100: { label: "NASDAQ 100", icon: "🇺🇸", category: "equity", color: "#6366f1" },
  precious_metals: { label: "Kıymetli Madenler", icon: "🥇", category: "commodity", color: "#eab308" },
  crypto: { label: "Kripto", icon: "₿", category: "crypto", color: "#f59e0b" },
  fx: { label: "Döviz", icon: "💱", category: "fx", color: "#14b8a6" },
  other: { label: "Diğer (Manuel)", icon: "📝", category: "other", color: "#6b7280" },
} as const;

export type AssetTypeKey = keyof typeof ASSET_TYPES;

// ─── FINANCIAL THINKER PERSONAS ───
export const THINKER_PERSONAS = [
  { id: "keynes", name: "John Maynard Keynes", era: "1883–1946", avatar: "🎩", philosophy: "Aggregate demand drives economies. Government intervention stabilizes markets. Animal spirits drive investment." },
  { id: "friedman", name: "Milton Friedman", era: "1912–2006", avatar: "📊", philosophy: "Free markets allocate resources optimally. Inflation is always a monetary phenomenon." },
  { id: "graham", name: "Benjamin Graham", era: "1894–1976", avatar: "📖", philosophy: "Margin of safety protects against loss. Mr. Market is emotionally driven. Intrinsic value matters." },
  { id: "drucker", name: "Peter Drucker", era: "1909–2005", avatar: "🏢", philosophy: "Management by objectives. Innovation and marketing create customers." },
  { id: "schumpeter", name: "Joseph Schumpeter", era: "1883–1950", avatar: "⚡", philosophy: "Creative destruction drives capitalism. Entrepreneurs are the engine of growth." },
  { id: "fisher", name: "Irving Fisher", era: "1867–1947", avatar: "💰", philosophy: "Debt deflation theory. Interest rates reflect time preference." },
  { id: "kostolany", name: "André Kostolany", era: "1906–1999", avatar: "🎭", philosophy: "Psychology drives markets. Buy during panic, sell during euphoria." },
  { id: "templeton", name: "Sir John Templeton", era: "1912–2008", avatar: "🌍", philosophy: "Maximum pessimism is the best time to invest. Global diversification is key." },
  { id: "bagehot", name: "Walter Bagehot", era: "1826–1877", avatar: "🏛️", philosophy: "Central banks must be lenders of last resort. Lombard Street principles." },
  { id: "kindleberger", name: "Charles Kindleberger", era: "1910–2003", avatar: "📚", philosophy: "Financial crises follow patterns: mania, panic, crash." },
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

// ─── PREMIUM FEATURES ───
export const PREMIUM_FEATURES = [
  { icon: "♾️", title: "Sınırsız İşlem", desc: "İşlem giriş limiti yok" },
  { icon: "📊", title: "Gelişmiş Analiz", desc: "Sharpe Ratio, Max Drawdown, Sortino" },
  { icon: "📄", title: "PDF Rapor", desc: "Profesyonel portföy raporu çıkarın" },
  { icon: "🧠", title: "AI Yorumları", desc: "10 efsanevi düşünürün tam analizi" },
  { icon: "⚡", title: "Gerçek Zamanlı Veri", desc: "Canlı piyasa fiyatları ile hesaplama" },
  { icon: "🔔", title: "Fiyat Alarmları", desc: "Hedef fiyat bildirimleri" },
] as const;

export const FREE_ENTRY_LIMIT = 5;
export const FREE_CALC_LIMIT = 3;
