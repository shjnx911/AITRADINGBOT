import { 
  users, type User, type InsertUser,
  tradingSettings, type TradingSettings, type InsertTradingSettings,
  trades, type Trade, type InsertTrade,
  balanceHistory, type BalanceHistory, type InsertBalanceHistory,
  aiSignals, type AiSignal, type InsertAiSignal,
  botSettings, type BotSettings, type InsertBotSettings,
  exchangeCredentials, type ExchangeCredentials, type InsertExchangeCredentials,
  aiTrainingData, type AiTrainingData, type InsertAiTrainingData,
  backtestResults, type BacktestResults, type InsertBacktestResults,
  telegramNotifications, type TelegramNotification, type InsertTelegramNotification
} from "@shared/schema";

// Storage interface with all CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Exchange credentials methods
  getExchangeCredentials(userId: number): Promise<ExchangeCredentials[]>;
  getExchangeCredentialById(id: number): Promise<ExchangeCredentials | undefined>;
  createExchangeCredentials(credentials: InsertExchangeCredentials): Promise<ExchangeCredentials>;
  updateExchangeCredentials(id: number, credentials: Partial<ExchangeCredentials>): Promise<ExchangeCredentials | undefined>;
  deleteExchangeCredentials(id: number): Promise<boolean>;

  // Trading settings methods
  getTradingSettings(userId: number): Promise<TradingSettings | undefined>;
  getTradingSettingsByExchange(userId: number, exchange: string): Promise<TradingSettings | undefined>;
  createTradingSettings(settings: InsertTradingSettings): Promise<TradingSettings>;
  updateTradingSettings(id: number, settings: Partial<InsertTradingSettings>): Promise<TradingSettings | undefined>;

  // Trades methods
  getTrades(userId: number): Promise<Trade[]>;
  getTradesByExchange(userId: number, exchange: string): Promise<Trade[]>;
  getOpenTrades(userId: number): Promise<Trade[]>;
  getOpenTradesByExchange(userId: number, exchange: string): Promise<Trade[]>;
  getTradeById(id: number): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: number, trade: Partial<Trade>): Promise<Trade | undefined>;
  closeTrade(id: number, exitPrice: number, pnl: number, pnlPercentage: number): Promise<Trade | undefined>;
  createDCATrade(originTradeId: number, dcaLevel: number, amount: number, entryPrice: number): Promise<Trade>;

  // Balance history methods
  getBalanceHistory(userId: number): Promise<BalanceHistory[]>;
  getBalanceHistoryByExchange(userId: number, exchange: string): Promise<BalanceHistory[]>;
  addBalanceRecord(record: InsertBalanceHistory): Promise<BalanceHistory>;

  // AI signals methods
  getAiSignals(symbol: string, timeframe: string, limit?: number): Promise<AiSignal[]>;
  getRecentAiSignals(limit?: number): Promise<AiSignal[]>;
  createAiSignal(signal: InsertAiSignal): Promise<AiSignal>;

  // AI training data methods
  getAiTrainingData(symbol: string, timeframe: string, limit?: number): Promise<AiTrainingData[]>;
  createAiTrainingData(data: InsertAiTrainingData): Promise<AiTrainingData>;

  // Bot settings methods
  getBotSettings(userId: number): Promise<BotSettings | undefined>;
  getBotSettingsByExchange(userId: number, exchange: string): Promise<BotSettings | undefined>;
  createBotSettings(settings: InsertBotSettings): Promise<BotSettings>;
  updateBotSettings(id: number, settings: Partial<InsertBotSettings>): Promise<BotSettings | undefined>;
  toggleBotActive(id: number, isActive: boolean): Promise<BotSettings | undefined>;

  // Backtest results methods
  getBacktestResults(userId: number): Promise<BacktestResults[]>;
  getBacktestResultById(id: number): Promise<BacktestResults | undefined>;
  createBacktestResults(result: InsertBacktestResults): Promise<BacktestResults>;

  // Telegram notifications methods
  createTelegramNotification(notification: InsertTelegramNotification): Promise<TelegramNotification>;
  getTelegramNotifications(userId: number, limit?: number): Promise<TelegramNotification[]>;
}

// @ts-ignore: We'll implement the missing methods later
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private exchangeCredentials: Map<number, ExchangeCredentials>;
  private tradingSettings: Map<number, TradingSettings>;
  private trades: Map<number, Trade>;
  private balanceHistory: Map<number, BalanceHistory>;
  private aiSignals: Map<number, AiSignal>;
  private botSettings: Map<number, BotSettings>;
  private aiTrainingData: Map<number, AiTrainingData>;
  private backtestResults: Map<number, BacktestResults>;
  private telegramNotifications: Map<number, TelegramNotification>;

  currentUserId: number;
  currentExchangeCredentialId: number;
  currentTradeId: number;
  currentSettingsId: number;
  currentBalanceId: number;
  currentSignalId: number;
  currentBotSettingsId: number;
  currentAiTrainingDataId: number;
  currentBacktestResultId: number;
  currentTelegramNotificationId: number;

  constructor() {
    this.users = new Map();
    this.exchangeCredentials = new Map();
    this.tradingSettings = new Map();
    this.trades = new Map();
    this.balanceHistory = new Map();
    this.aiSignals = new Map();
    this.botSettings = new Map();
    this.aiTrainingData = new Map();
    this.backtestResults = new Map();
    this.telegramNotifications = new Map();

    this.currentUserId = 1;
    this.currentExchangeCredentialId = 1;
    this.currentTradeId = 1;
    this.currentSettingsId = 1;
    this.currentBalanceId = 1;
    this.currentSignalId = 1;
    this.currentBotSettingsId = 1;
    this.currentAiTrainingDataId = 1;
    this.currentBacktestResultId = 1;
    this.currentTelegramNotificationId = 1;

    // Add default user
    this.createUser({
      username: "demo",
      password: "password",
    });

    // Add default trading settings for demo user
    this.createTradingSettings({
      userId: 1,
      capitalPerTrade: 5,
      maxLeverage: 25,
      minLeverage: 10,
      softStopLoss: 10,
      targetDailyProfit: 3,
      maxDailyTrades: 10,
      minDailyTrades: 3,
      dcaLevels: 3,
      exchange: "binance",
      isActive: true
    });

    // Add default bot settings for demo user
    this.createBotSettings({
      userId: 1,
      isActive: true,
      tradingPairs: ["BTC/USDT", "ETH/USDT"],
      timeframes: ["1h", "4h", "1d"],
      indicatorsToUse: ["rsi", "ema", "fibonacci", "volume"],
      minConfidenceThreshold: 0.7
    });

    // Add initial balance record
    this.addBalanceRecord({
      userId: 1,
      balance: 10000,
      timestamp: new Date()
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Trading settings methods
  async getTradingSettings(userId: number): Promise<TradingSettings | undefined> {
    return Array.from(this.tradingSettings.values()).find(
      (settings) => settings.userId === userId
    );
  }

  async createTradingSettings(settings: InsertTradingSettings): Promise<TradingSettings> {
    const id = this.currentSettingsId++;
    const now = new Date();
    const tradingSetting: TradingSettings = { 
      ...settings, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.tradingSettings.set(id, tradingSetting);
    return tradingSetting;
  }

  async updateTradingSettings(id: number, settings: Partial<InsertTradingSettings>): Promise<TradingSettings | undefined> {
    const existingSettings = this.tradingSettings.get(id);
    if (!existingSettings) return undefined;

    const updatedSettings: TradingSettings = { 
      ...existingSettings, 
      ...settings, 
      updatedAt: new Date() 
    };
    this.tradingSettings.set(id, updatedSettings);
    return updatedSettings;
  }

  // Trades methods
  async getTrades(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      (trade) => trade.userId === userId
    );
  }

  async getOpenTrades(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      (trade) => trade.userId === userId && trade.status === "OPEN"
    );
  }

  async getTradeById(id: number): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const id = this.currentTradeId++;
    const newTrade: Trade = { 
      ...trade, 
      id, 
      status: "OPEN",
      exitPrice: null,
      exitTime: null,
      pnl: null,
      pnlPercentage: null
    };
    this.trades.set(id, newTrade);
    return newTrade;
  }

  async updateTrade(id: number, trade: Partial<Trade>): Promise<Trade | undefined> {
    const existingTrade = this.trades.get(id);
    if (!existingTrade) return undefined;

    const updatedTrade: Trade = { ...existingTrade, ...trade };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async closeTrade(id: number, exitPrice: number, pnl: number, pnlPercentage: number): Promise<Trade | undefined> {
    const existingTrade = this.trades.get(id);
    if (!existingTrade) return undefined;

    const closedTrade: Trade = { 
      ...existingTrade, 
      status: "CLOSED", 
      exitPrice, 
      exitTime: new Date(),
      pnl,
      pnlPercentage
    };
    this.trades.set(id, closedTrade);
    return closedTrade;
  }

  // Balance history methods
  async getBalanceHistory(userId: number): Promise<BalanceHistory[]> {
    return Array.from(this.balanceHistory.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async addBalanceRecord(record: InsertBalanceHistory): Promise<BalanceHistory> {
    const id = this.currentBalanceId++;
    const balanceRecord: BalanceHistory = { ...record, id };
    this.balanceHistory.set(id, balanceRecord);
    return balanceRecord;
  }

  // AI signals methods
  async getAiSignals(symbol: string, timeframe: string, limit = 10): Promise<AiSignal[]> {
    return Array.from(this.aiSignals.values())
      .filter(signal => 
        (symbol ? signal.symbol === symbol : true) && 
        (timeframe ? signal.timeframe === timeframe : true)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createAiSignal(signal: InsertAiSignal): Promise<AiSignal> {
    const id = this.currentSignalId++;
    const newSignal: AiSignal = { ...signal, id };
    this.aiSignals.set(id, newSignal);
    return newSignal;
  }

  // Bot settings methods
  async getBotSettings(userId: number): Promise<BotSettings | undefined> {
    return Array.from(this.botSettings.values()).find(
      (settings) => settings.userId === userId
    );
  }

  async createBotSettings(settings: InsertBotSettings): Promise<BotSettings> {
    const id = this.currentBotSettingsId++;
    const botSetting: BotSettings = { 
      ...settings, 
      id, 
      updatedAt: new Date() 
    };
    this.botSettings.set(id, botSetting);
    return botSetting;
  }

  async updateBotSettings(id: number, settings: Partial<InsertBotSettings>): Promise<BotSettings | undefined> {
    const existingSettings = this.botSettings.get(id);
    if (!existingSettings) return undefined;

    const updatedSettings: BotSettings = { 
      ...existingSettings, 
      ...settings, 
      updatedAt: new Date() 
    };
    this.botSettings.set(id, updatedSettings);
    return updatedSettings;
  }

  async toggleBotActive(id: number, isActive: boolean): Promise<BotSettings | undefined> {
    const existingSettings = this.botSettings.get(id);
    if (!existingSettings) return undefined;

    const updatedSettings: BotSettings = { 
      ...existingSettings, 
      isActive, 
      updatedAt: new Date() 
    };
    this.botSettings.set(id, updatedSettings);
    return updatedSettings;
  }
}

export const storage = new MemStorage();