import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { encryptApiKeys, decryptApiKeysForUse } from './middleware/api-key-protection';
import crypto from 'crypto';

const app = express();

// Security headers
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API key protection - encrypt sensitive data
app.use('/api/exchange-credentials', encryptApiKeys);
app.use(decryptApiKeysForUse);

// Rate limiting for API endpoints to prevent brute force attacks
const requestCounts = new Map<string, { count: number, timestamp: number }>();
app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  
  if (req.path.startsWith('/api/')) {
    const current = requestCounts.get(ip) || { count: 0, timestamp: now };
    
    // Reset counter if it's been more than a minute
    if (now - current.timestamp > 60000) {
      current.count = 0;
      current.timestamp = now;
    }
    
    current.count++;
    requestCounts.set(ip, current);
    
    // If more than 100 requests in a minute, block temporarily
    if (current.count > 100) {
      return res.status(429).json({ 
        error: "Too many requests",
        retryAfter: "60 seconds"
      });
    }
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        // Mask any sensitive data in logs
        const safeResponse = { ...capturedJsonResponse };
        
        // Don't log sensitive information
        if (safeResponse.apiKey) safeResponse.apiKey = "***MASKED***";
        if (safeResponse.secretKey) safeResponse.secretKey = "***MASKED***";
        if (safeResponse.password) safeResponse.password = "***MASKED***";
        
        logLine += ` :: ${JSON.stringify(safeResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
