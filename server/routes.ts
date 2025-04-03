import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertTradeSchema,
  insertTradingSettingsSchema,
  insertBotSettingsSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for trading platform
  const apiRouter = app.route("/api");

  // User routes
  app.get("/api/user/:id", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't return the password
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // Trading settings routes
  app.get("/api/trading-settings/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const settings = await storage.getTradingSettings(userId);
    if (!settings) {
      return res.status(404).json({ message: "Trading settings not found" });
    }
    
    res.json(settings);
  });

  app.post("/api/trading-settings", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTradingSettingsSchema.parse(req.body);
      const settings = await storage.createTradingSettings(validatedData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create trading settings" });
    }
  });

  app.put("/api/trading-settings/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid settings ID" });
    }
    
    try {
      const validatedData = insertTradingSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateTradingSettings(id, validatedData);
      
      if (!settings) {
        return res.status(404).json({ message: "Trading settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update trading settings" });
    }
  });

  // Trades routes
  app.get("/api/trades/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const trades = await storage.getTrades(userId);
    res.json(trades);
  });

  app.get("/api/trades/:userId/open", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const openTrades = await storage.getOpenTrades(userId);
    res.json(openTrades);
  });

  app.post("/api/trades", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTradeSchema.parse(req.body);
      
      // If we have a userId, get the trading settings to apply capital adjustment
      if (validatedData.userId) {
        const tradingSettings = await storage.getTradingSettings(validatedData.userId);
        
        // Check if auto-adjust capital is enabled
        if (tradingSettings && tradingSettings.autoAdjustCapital && validatedData.aiSignals) {
          const signals = validatedData.aiSignals as any;
          
          // If we have confidence information from AI signals
          if (signals && typeof signals.confidence === 'number') {
            const confidence = signals.confidence;
            const minCapital = tradingSettings.minCapitalPerTrade || 5;
            const maxCapital = tradingSettings.maxCapitalPerTrade || 10;
            
            // Use a formula that increases capital based on confidence
            // For very high confidence (>0.9), use nearly max capital
            // For low confidence (<0.6), use near min capital
            const confidenceScaling = Math.pow(confidence, 1.5); // Apply curve to confidence
            const adjustedCapital = minCapital + (maxCapital - minCapital) * confidenceScaling;
            
            // Update amount based on the adjusted capital percentage
            if (validatedData.amount && typeof validatedData.amount === 'number') {
              const originalAmount = validatedData.amount;
              const originalCapitalPercent = tradingSettings.capitalPerTrade;
              const adjustedAmount = (originalAmount / originalCapitalPercent) * adjustedCapital;
              
              // Update the amount
              validatedData.amount = adjustedAmount;
              
              console.log(`Trade amount adjusted based on AI confidence (${confidence.toFixed(2)}): ${originalAmount} → ${adjustedAmount}`);
            }
          }
        }
      }
      
      // Create the trade with potentially adjusted amount
      const trade = await storage.createTrade(validatedData);
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create trade" });
    }
  });

  app.put("/api/trades/:id/close", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid trade ID" });
    }
    
    const closeTradeSchema = z.object({
      exitPrice: z.number().positive(),
      pnl: z.number(),
      pnlPercentage: z.number(),
    });
    
    try {
      const { exitPrice, pnl, pnlPercentage } = closeTradeSchema.parse(req.body);
      const closedTrade = await storage.closeTrade(id, exitPrice, pnl, pnlPercentage);
      
      if (!closedTrade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      
      res.json(closedTrade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to close trade" });
    }
  });

  // Balance history routes
  app.get("/api/balance-history/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const balanceHistory = await storage.getBalanceHistory(userId);
    res.json(balanceHistory);
  });

  app.post("/api/balance-history", async (req: Request, res: Response) => {
    const balanceSchema = z.object({
      userId: z.number().int().positive(),
      balance: z.number().positive(),
      timestamp: z.date().optional(),
    });
    
    try {
      const validatedData = balanceSchema.parse(req.body);
      const record = await storage.addBalanceRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add balance record" });
    }
  });

  // AI signals routes
  app.get("/api/ai-signals", async (req: Request, res: Response) => {
    const symbol = req.query.symbol as string;
    const timeframe = req.query.timeframe as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const signals = await storage.getAiSignals(symbol, timeframe, limit);
    res.json(signals);
  });

  // Bot settings routes
  app.get("/api/bot-settings/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const settings = await storage.getBotSettings(userId);
    if (!settings) {
      return res.status(404).json({ message: "Bot settings not found" });
    }
    
    res.json(settings);
  });

  app.post("/api/bot-settings", async (req: Request, res: Response) => {
    try {
      const validatedData = insertBotSettingsSchema.parse(req.body);
      const settings = await storage.createBotSettings(validatedData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bot settings" });
    }
  });

  app.put("/api/bot-settings/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid settings ID" });
    }
    
    try {
      const validatedData = insertBotSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateBotSettings(id, validatedData);
      
      if (!settings) {
        return res.status(404).json({ message: "Bot settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update bot settings" });
    }
  });

  app.put("/api/bot-settings/:id/toggle", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid settings ID" });
    }
    
    const toggleSchema = z.object({
      isActive: z.boolean(),
    });
    
    try {
      const { isActive } = toggleSchema.parse(req.body);
      const settings = await storage.toggleBotActive(id, isActive);
      
      if (!settings) {
        return res.status(404).json({ message: "Bot settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to toggle bot status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
