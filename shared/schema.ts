import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema from the original file
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  telegramChatId: text("telegram_chat_id"), // For Telegram notifications
  telegramEnabled: boolean("telegram_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  telegramChatId: true,
  telegramEnabled: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Exchange API credentials
export const exchangeCredentials = pgTable("exchange_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  exchangeName: text("exchange_name").notNull(), // binance, bybit, etc.
  apiKey: text("api_key").notNull(),
  secretKey: text("secret_key").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExchangeCredentialsSchema = createInsertSchema(exchangeCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExchangeCredentials = z.infer<typeof insertExchangeCredentialsSchema>;
export type ExchangeCredentials = typeof exchangeCredentials.$inferSelect;

// New Trading related schemas
export const tradingSettings = pgTable("trading_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  minCapitalPerTrade: real("min_capital_per_trade").notNull().default(5), // Minimum percentage of capital per trade (default 5%)
  maxCapitalPerTrade: real("max_capital_per_trade").notNull().default(10), // Maximum percentage of capital per trade (default 10%)
  capitalPerTrade: real("capital_per_trade").notNull().default(5), // Default percentage of capital per trade
  autoAdjustCapital: boolean("auto_adjust_capital").notNull().default(true), // Auto adjust capital based on signal confidence
  maxLeverage: integer("max_leverage").notNull().default(15), // Now default to 15x max as requested
  minLeverage: integer("min_leverage").notNull().default(10), // Now default to 10x min as requested
  softStopLoss: real("soft_stop_loss").notNull().default(10), // Percentage for soft stop loss (default 10%)
  targetDailyProfit: real("target_daily_profit").notNull().default(3), // Target daily profit percentage
  maxDailyTrades: integer("max_daily_trades").notNull().default(10),
  minDailyTrades: integer("min_daily_trades").notNull().default(3),
  dcaLevels: integer("dca_levels").notNull().default(3), // Number of DCA levels
  dcaPercentTriggers: jsonb("dca_percent_triggers").default([]), // Percentage loss triggers for DCA
  exchange: text("exchange").notNull().default("binance"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTradingSettingsSchema = createInsertSchema(tradingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTradingSettings = z.infer<typeof insertTradingSettingsSchema>;
export type TradingSettings = typeof tradingSettings.$inferSelect;

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  exchangeName: text("exchange_name").notNull().default("binance"), // Which exchange this trade is on
  symbol: text("symbol").notNull(),
  type: text("type").notNull(), // LONG or SHORT
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  amount: real("amount").notNull(), // Amount in base currency
  leverage: integer("leverage").notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN, CLOSED, CANCELLED
  pnl: real("pnl"), // Profit or loss in quote currency
  pnlPercentage: real("pnl_percentage"), // Profit or loss percentage
  entryTime: timestamp("entry_time").defaultNow(),
  exitTime: timestamp("exit_time"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  notes: text("notes"),
  dcaLevel: integer("dca_level").default(0), // Current DCA level (0 = initial entry)
  aiSignals: jsonb("ai_signals"), // Store AI signals that led to this trade
  indicators: jsonb("indicators"), // Store indicator values at the time of the trade
  originTradeId: integer("origin_trade_id"), // For trades that are part of a DCA strategy
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  exitTime: true,
  pnl: true,
  pnlPercentage: true,
  status: true
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export const balanceHistory = pgTable("balance_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  exchangeName: text("exchange_name").notNull().default("binance"),
  balance: real("balance").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertBalanceHistorySchema = createInsertSchema(balanceHistory).omit({
  id: true,
});

export type InsertBalanceHistory = z.infer<typeof insertBalanceHistorySchema>;
export type BalanceHistory = typeof balanceHistory.$inferSelect;

// AI Bot analysis and signals
export const aiSignals = pgTable("ai_signals", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  signalType: text("signal_type").notNull(), // BUY, SELL, NEUTRAL
  confidence: real("confidence").notNull(), // 0 to 1 confidence score
  indicators: jsonb("indicators"), // Technical indicators values
  priceAtSignal: real("price_at_signal").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  reasoning: jsonb("reasoning"), // Array of reasoning steps that led to this signal
  notes: text("notes"),
  takeProfitSuggestion: real("take_profit_suggestion"),
  stopLossSuggestion: real("stop_loss_suggestion"),
});

export const insertAiSignalSchema = createInsertSchema(aiSignals).omit({
  id: true,
});

export type InsertAiSignal = z.infer<typeof insertAiSignalSchema>;
export type AiSignal = typeof aiSignals.$inferSelect;

// Trading bot settings
export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  exchangeName: text("exchange_name").notNull().default("binance"),
  isActive: boolean("is_active").notNull().default(false),
  tradingPairs: jsonb("trading_pairs").notNull(), // Array of trading pairs
  timeframes: jsonb("timeframes").notNull(), // Array of timeframes to analyze
  indicatorsToUse: jsonb("indicators_to_use").notNull(), // Which indicators to use
  minConfidenceThreshold: real("min_confidence_threshold").notNull().default(0.7), // Minimum confidence to execute trades
  dcaEnabled: boolean("dca_enabled").default(false),
  telegramNotificationsEnabled: boolean("telegram_notifications_enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettings.$inferSelect;

// AI Model Training Data
export const aiTrainingData = pgTable("ai_training_data", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  candles: jsonb("candles").notNull(), // Store candle data for training
  indicators: jsonb("indicators"), // Calculated indicators
  signalType: text("signal_type"), // The signal given after analysis
  actualOutcome: text("actual_outcome"), // What actually happened (for validation)
  profitLoss: real("profit_loss"), // If a trade was made, what was the P/L
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiTrainingDataSchema = createInsertSchema(aiTrainingData).omit({
  id: true,
  createdAt: true,
});

export type InsertAiTrainingData = z.infer<typeof insertAiTrainingDataSchema>;
export type AiTrainingData = typeof aiTrainingData.$inferSelect;

// Backtesting results
export const backtestResults = pgTable("backtest_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalTrades: integer("total_trades").notNull(),
  winningTrades: integer("winning_trades").notNull(),
  losingTrades: integer("losing_trades").notNull(),
  profitFactor: real("profit_factor"),
  netProfit: real("net_profit").notNull(),
  maxDrawdown: real("max_drawdown"),
  winRate: real("win_rate").notNull(),
  strategy: text("strategy").notNull(),
  parameters: jsonb("parameters").notNull(), // Strategy parameters used
  tradesData: jsonb("trades_data").notNull(), // All individual trades
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBacktestResultsSchema = createInsertSchema(backtestResults).omit({
  id: true,
  createdAt: true,
});

export type InsertBacktestResults = z.infer<typeof insertBacktestResultsSchema>;
export type BacktestResults = typeof backtestResults.$inferSelect;

// Telegram notifications history
export const telegramNotifications = pgTable("telegram_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  messageType: text("message_type").notNull(), // TRADE_OPENED, TRADE_CLOSED, SIGNAL, STATUS, etc.
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  status: text("status").notNull(), // SENT, FAILED
  errorMessage: text("error_message"),
});

export const insertTelegramNotificationSchema = createInsertSchema(telegramNotifications).omit({
  id: true,
  sentAt: true,
});

export type InsertTelegramNotification = z.infer<typeof insertTelegramNotificationSchema>;
export type TelegramNotification = typeof telegramNotifications.$inferSelect;
