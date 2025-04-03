// Enhanced Binance API client with support for multiple exchanges
// and extended backtesting capabilities

export interface CandleData {
  time: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w';

export type BacktestPeriod = '3m' | '6m' | '1y' | '18m' | '2y'; // 3 months, 6 months, 1 year, 18 months, 2 years

export interface ExchangeConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  secretKey?: string;
}

class BinanceClient {
  private exchanges: Map<string, ExchangeConfig> = new Map();
  private defaultExchange = 'binance';
  
  constructor() {
    // Set up default exchanges
    this.exchanges.set('binance', {
      name: 'Binance',
      baseUrl: 'https://api.binance.com'
    });
    
    this.exchanges.set('bybit', {
      name: 'Bybit',
      baseUrl: 'https://api.bybit.com'
    });
    
    // More exchanges can be added here
  }
  
  // Register a new exchange or update existing one
  registerExchange(id: string, config: ExchangeConfig): void {
    this.exchanges.set(id, config);
  }
  
  // Set credentials for an exchange
  setExchangeCredentials(exchangeId: string, apiKey: string, secretKey: string): void {
    const exchange = this.exchanges.get(exchangeId);
    if (exchange) {
      exchange.apiKey = apiKey;
      exchange.secretKey = secretKey;
      this.exchanges.set(exchangeId, exchange);
    }
  }
  
  // Get base URL for a specific exchange
  private getBaseUrl(exchangeId?: string): string {
    const exchange = this.exchanges.get(exchangeId || this.defaultExchange);
    return exchange?.baseUrl || this.exchanges.get(this.defaultExchange)!.baseUrl;
  }
  
  // Convert a BacktestPeriod to milliseconds
  private periodToMs(period: BacktestPeriod): number {
    const now = Date.now();
    switch (period) {
      case '3m':
        return 3 * 30 * 24 * 60 * 60 * 1000; // ~3 months
      case '6m':
        return 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months
      case '1y':
        return 365 * 24 * 60 * 60 * 1000; // 1 year
      case '18m':
        return 18 * 30 * 24 * 60 * 60 * 1000; // ~18 months
      case '2y':
        return 2 * 365 * 24 * 60 * 60 * 1000; // 2 years
      default:
        return 6 * 30 * 24 * 60 * 60 * 1000; // Default to 6 months
    }
  }
  
  // Fetch market data for a specific symbol and timeframe
  async getCandles(
    symbol: string, 
    timeframe: TimeFrame, 
    limit = 100, 
    exchangeId?: string
  ): Promise<CandleData[]> {
    const baseUrl = this.getBaseUrl(exchangeId);
    const formattedSymbol = symbol.replace('/', '');
    const url = `${baseUrl}/api/v3/klines?symbol=${formattedSymbol}&interval=${timeframe}&limit=${limit}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch candles: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.map((candle: any[]) => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));
    } catch (error) {
      console.error('Error fetching candles:', error);
      return [];
    }
  }
  
  // Get current price for a symbol
  async getCurrentPrice(symbol: string, exchangeId?: string): Promise<number | null> {
    const baseUrl = this.getBaseUrl(exchangeId);
    const formattedSymbol = symbol.replace('/', '');
    const url = `${baseUrl}/api/v3/ticker/price?symbol=${formattedSymbol}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Error fetching price:', error);
      return null;
    }
  }
  
  // Get 24hr ticker information
  async get24hTicker(symbol: string, exchangeId?: string): Promise<TickerData | null> {
    const baseUrl = this.getBaseUrl(exchangeId);
    const formattedSymbol = symbol.replace('/', '');
    const url = `${baseUrl}/api/v3/ticker/24hr?symbol=${formattedSymbol}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ticker: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        symbol,
        price: parseFloat(data.lastPrice),
        changePercent: parseFloat(data.priceChangePercent),
        volume: parseFloat(data.volume),
      };
    } catch (error) {
      console.error('Error fetching ticker:', error);
      return null;
    }
  }
  
  // Get exchange info (symbols, filters, etc)
  async getExchangeInfo(exchangeId?: string): Promise<any> {
    const baseUrl = this.getBaseUrl(exchangeId);
    const url = `${baseUrl}/api/v3/exchangeInfo`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange info: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching exchange info:', error);
      return null;
    }
  }
  
  // Get backtest data (download historical data for a specific period)
  async getBacktestData(
    symbol: string, 
    timeframe: TimeFrame, 
    startTime: number, 
    endTime: number,
    exchangeId?: string
  ): Promise<CandleData[]> {
    const baseUrl = this.getBaseUrl(exchangeId);
    const formattedSymbol = symbol.replace('/', '');
    const url = `${baseUrl}/api/v3/klines?symbol=${formattedSymbol}&interval=${timeframe}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch backtest data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.map((candle: any[]) => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));
    } catch (error) {
      console.error('Error fetching backtest data:', error);
      return [];
    }
  }
  
  // Get backtest data using predefined time periods for AI training
  async getBacktestDataByPeriod(
    symbol: string,
    timeframe: TimeFrame,
    period: BacktestPeriod,
    exchangeId?: string
  ): Promise<CandleData[]> {
    const now = Date.now();
    const periodMs = this.periodToMs(period);
    const startTime = now - periodMs;
    
    return this.getBacktestData(symbol, timeframe, startTime, now, exchangeId);
  }
  
  // Fetch multiple timeframes for multi-timeframe analysis
  async getMultiTimeframeData(
    symbol: string,
    timeframes: TimeFrame[],
    limit = 100,
    exchangeId?: string,
    period?: BacktestPeriod  // Optional parameter to get data for a specific period
  ): Promise<Record<TimeFrame, CandleData[]>> {
    const result: Partial<Record<TimeFrame, CandleData[]>> = {};
    
    // If period is provided, use it to calculate time range
    if (period) {
      const now = Date.now();
      const periodMs = this.periodToMs(period);
      const startTime = now - periodMs;
      
      await Promise.all(
        timeframes.map(async (timeframe) => {
          result[timeframe] = await this.getBacktestData(symbol, timeframe, startTime, now, exchangeId);
        })
      );
    } else {
      // Otherwise just get the most recent candles
      await Promise.all(
        timeframes.map(async (timeframe) => {
          result[timeframe] = await this.getCandles(symbol, timeframe, limit, exchangeId);
        })
      );
    }
    
    return result as Record<TimeFrame, CandleData[]>;
  }
  
  // Fetch data for multiple symbols (portfolio analysis)
  async getMultiSymbolData(
    symbols: string[],
    timeframe: TimeFrame,
    limit = 100,
    exchangeId?: string,
    period?: BacktestPeriod  // Optional parameter to get data for a specific historical period
  ): Promise<Record<string, CandleData[]>> {
    const result: Record<string, CandleData[]> = {};
    
    // If period is provided, use it to calculate time range
    if (period) {
      const now = Date.now();
      const periodMs = this.periodToMs(period);
      const startTime = now - periodMs;
      
      await Promise.all(
        symbols.map(async (symbol) => {
          result[symbol] = await this.getBacktestData(symbol, timeframe, startTime, now, exchangeId);
        })
      );
    } else {
      // Otherwise just get the most recent candles
      await Promise.all(
        symbols.map(async (symbol) => {
          result[symbol] = await this.getCandles(symbol, timeframe, limit, exchangeId);
        })
      );
    }
    
    return result;
  }
  
  // Batch download backtest data in chunks to handle large periods
  async batchDownloadBacktestData(
    symbol: string,
    timeframe: TimeFrame,
    startTime: number,
    endTime: number,
    exchangeId?: string
  ): Promise<CandleData[]> {
    // Binance API has a limit of 1000 candles per request
    // We'll batch the requests to download the complete dataset
    
    const MAX_CANDLES_PER_REQUEST = 1000;
    let allCandles: CandleData[] = [];
    let currentStartTime = startTime;
    
    // Calculate approximate duration of each candle in milliseconds
    const candleDurationMap: Record<TimeFrame, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    
    const candleDuration = candleDurationMap[timeframe];
    const batchDuration = candleDuration * MAX_CANDLES_PER_REQUEST;
    
    while (currentStartTime < endTime) {
      const batchEndTime = Math.min(currentStartTime + batchDuration, endTime);
      
      console.log(`Downloading batch: ${new Date(currentStartTime).toISOString()} to ${new Date(batchEndTime).toISOString()}`);
      
      const candles = await this.getBacktestData(
        symbol,
        timeframe,
        currentStartTime,
        batchEndTime,
        exchangeId
      );
      
      if (candles.length === 0) {
        // If we get no candles, break to avoid infinite loop
        break;
      }
      
      allCandles = [...allCandles, ...candles];
      
      // Update the start time for the next batch
      // Use the last candle time + 1ms to avoid duplicates
      if (candles.length > 0) {
        currentStartTime = candles[candles.length - 1].time + 1;
      } else {
        currentStartTime = batchEndTime + 1;
      }
      
      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allCandles;
  }
}

export const binanceClient = new BinanceClient();
