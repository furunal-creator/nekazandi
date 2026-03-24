import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── USERS ───
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
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

// ─── TRANSACTIONS (cash in/out + investments) ───
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  portfolioId: integer("portfolio_id").notNull(),
  type: text("type").notNull(), // "cash_in", "cash_out", "buy", "sell"
  assetType: text("asset_type"), // "bist100", "ipo_tr", "tefas", "bond", "bill", "sukuk", "nasdaq100", "precious_metals", "crypto", "fx", "other"
  assetName: text("asset_name"), // e.g. "BIST 100", "XU100", "BTC", "Gold/Ons"
  assetTicker: text("asset_ticker"), // for price lookups
  quantity: real("quantity"),
  price: real("price"), // purchase price per unit
  amount: real("amount").notNull(), // total amount in portfolio currency
  date: text("date").notNull(), // ISO date string
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
  allocations: text("allocations").notNull(), // JSON: [{assetType, assetName, weight}]
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
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── ASSET TYPE DEFINITIONS ───
export const ASSET_TYPES = {
  bist100: { label: "BIST 100", icon: "📈", category: "equity" },
  ipo_tr: { label: "IPO (Turkey)", icon: "🆕", category: "equity" },
  tefas: { label: "TEFAS Fonları", icon: "📊", category: "fund" },
  bond: { label: "Tahvil", icon: "📃", category: "fixed_income" },
  bill: { label: "Bono", icon: "📋", category: "fixed_income" },
  sukuk: { label: "Sukuk", icon: "🕌", category: "fixed_income" },
  nasdaq100: { label: "NASDAQ 100", icon: "🇺🇸", category: "equity" },
  precious_metals: { label: "Kıymetli Madenler", icon: "🥇", category: "commodity" },
  crypto: { label: "Kripto", icon: "₿", category: "crypto" },
  fx: { label: "Döviz", icon: "💱", category: "fx" },
  other: { label: "Diğer (Manuel)", icon: "📝", category: "other" },
} as const;

export type AssetTypeKey = keyof typeof ASSET_TYPES;

// ─── FINANCIAL THINKER PERSONAS ───
export const THINKER_PERSONAS = [
  { id: "keynes", name: "John Maynard Keynes", era: "1883–1946", philosophy: "Aggregate demand drives economies. Government intervention stabilizes markets. Animal spirits drive investment." },
  { id: "friedman", name: "Milton Friedman", era: "1912–2006", philosophy: "Free markets allocate resources optimally. Inflation is always a monetary phenomenon. Minimize government intervention." },
  { id: "graham", name: "Benjamin Graham", era: "1894–1976", philosophy: "Margin of safety protects against loss. Mr. Market is emotionally driven. Intrinsic value matters, not price." },
  { id: "drucker", name: "Peter Drucker", era: "1909–2005", philosophy: "Management by objectives. Innovation and marketing create customers. Efficiency drives enterprise success." },
  { id: "schumpeter", name: "Joseph Schumpeter", era: "1883–1950", philosophy: "Creative destruction drives capitalism. Entrepreneurs are the engine of growth. Innovation disrupts equilibrium." },
  { id: "fisher", name: "Irving Fisher", era: "1867–1947", philosophy: "Debt deflation theory. Interest rates reflect time preference. Purchasing power stability is paramount." },
  { id: "kostolany", name: "André Kostolany", era: "1906–1999", philosophy: "Psychology drives markets. Be a speculator, not a gambler. Buy during panic, sell during euphoria." },
  { id: "templeton", name: "Sir John Templeton", era: "1912–2008", philosophy: "Maximum pessimism is the best time to invest. Global diversification is key. Bargain hunting across borders." },
  { id: "bagehot", name: "Walter Bagehot", era: "1826–1877", philosophy: "Central banks must be lenders of last resort. Lombard Street principles govern credit. Money markets need stability." },
  { id: "kindleberger", name: "Charles Kindleberger", era: "1910–2003", philosophy: "Financial crises follow patterns: mania, panic, crash. Hegemonic stability keeps order. Markets are inherently unstable." },
] as const;

// ─── CALCULATION RESULT TYPE ───
export interface PortfolioResult {
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  percentReturn: number;
  twr: number; // time-weighted return
  xirr: number | null; // money-weighted return
  timeline: { date: string; value: number }[];
  allocation: { assetType: string; label: string; value: number; weight: number }[];
  transactions: Transaction[];
}

// ─── COMMENTARY TYPE ───
export interface ThinkerCommentary {
  thinkerId: string;
  name: string;
  era: string;
  commentary: string;
  sentiment: "bullish" | "bearish" | "neutral" | "cautious";
}
