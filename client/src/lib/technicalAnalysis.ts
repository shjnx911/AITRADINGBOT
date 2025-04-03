import { CandleData } from "./binanceClient";

// Technical analysis functions

// Calculate RSI (Relative Strength Index)
export function calculateRSI(candles: CandleData[], period = 14): number[] {
  if (candles.length < period + 1) {
    return Array(candles.length).fill(50);
  }
  
  const closePrices = candles.map(candle => candle.close);
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < closePrices.length; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate initial RS
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
  
  const rsiValues: number[] = [];
  
  // First RSI value
  if (avgLoss === 0) {
    rsiValues.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
  }
  
  // Calculate rest of RSI values with smoothing
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    
    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
  }
  
  // Pad with undefined for the periods where RSI can't be calculated
  return [...Array(period).fill(undefined), ...rsiValues];
}

// Calculate EMA (Exponential Moving Average)
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = Array(prices.length).fill(undefined);
  
  // Start with SMA for the first EMA value
  const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  ema[period - 1] = sma;
  
  // Multiplier: (2 / (period + 1))
  const multiplier = 2 / (period + 1);
  
  // Calculate EMA values
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

// Calculate Fibonacci retracement levels
export function calculateFibonacciLevels(high: number, low: number): {
  level0: number,
  level236: number,
  level382: number,
  level5: number,
  level618: number,
  level786: number,
  level1: number
} {
  const diff = high - low;
  
  return {
    level0: high,
    level236: high - 0.236 * diff,
    level382: high - 0.382 * diff,
    level5: high - 0.5 * diff,
    level618: high - 0.618 * diff,
    level786: high - 0.786 * diff,
    level1: low
  };
}

// Detect bullish/bearish divergence between price and RSI
export function detectDivergence(candles: CandleData[], rsiValues: number[]): {
  bullishDivergence: boolean,
  bearishDivergence: boolean,
  divergenceStrength: number
} {
  if (candles.length < 10 || rsiValues.filter(v => v !== undefined).length < 10) {
    return { bullishDivergence: false, bearishDivergence: false, divergenceStrength: 0 };
  }
  
  const prices = candles.map(c => c.close);
  const validRsi = rsiValues.filter(v => v !== undefined) as number[];
  
  // Get last 10 candles
  const recentPrices = prices.slice(-10);
  const recentRsi = validRsi.slice(-10);
  
  // Find local minimums and maximums
  const priceMin = Math.min(...recentPrices);
  const priceMax = Math.max(...recentPrices);
  const rsiMin = Math.min(...recentRsi);
  const rsiMax = Math.max(...recentRsi);
  
  // Check for price trend and RSI trend
  const priceUptrend = recentPrices[recentPrices.length - 1] > recentPrices[0];
  const rsiUptrend = recentRsi[recentRsi.length - 1] > recentRsi[0];
  
  // Detect divergence
  const bullishDivergence = !priceUptrend && rsiUptrend; // Price making lower lows but RSI making higher lows
  const bearishDivergence = priceUptrend && !rsiUptrend; // Price making higher highs but RSI making lower highs
  
  // Strength based on how extreme the divergence is
  let divergenceStrength = 0;
  
  if (bullishDivergence) {
    // Calculate strength for bullish divergence
    const priceRange = priceMax - priceMin;
    const rsiRange = rsiMax - rsiMin;
    divergenceStrength = (priceRange / priceMin) * (rsiRange / rsiMin) * 100;
  } else if (bearishDivergence) {
    // Calculate strength for bearish divergence
    const priceRange = priceMax - priceMin;
    const rsiRange = rsiMax - rsiMin;
    divergenceStrength = (priceRange / priceMax) * (rsiRange / rsiMax) * 100;
  }
  
  return {
    bullishDivergence,
    bearishDivergence,
    divergenceStrength: Math.min(divergenceStrength, 100) // Cap at 100%
  };
}

// Identify support and resistance levels using Darvas box theory
export function findDarvasBoxes(candles: CandleData[], period = 5): {
  boxes: Array<{ top: number, bottom: number, startIndex: number, endIndex: number }>,
  currentBox: { top: number, bottom: number } | null
} {
  if (candles.length < period) {
    return { boxes: [], currentBox: null };
  }
  
  const boxes = [];
  let currentBoxTop = -1;
  let currentBoxBottom = -1;
  let boxStartIndex = -1;
  
  // Find high and low of the first 'period' candles
  let initialHigh = Math.max(...candles.slice(0, period).map(c => c.high));
  let initialLow = Math.min(...candles.slice(0, period).map(c => c.low));
  
  for (let i = period; i < candles.length; i++) {
    const candle = candles[i];
    
    // If price breaks above current box top
    if (candle.high > initialHigh) {
      // Complete the current box if one exists
      if (boxStartIndex !== -1) {
        boxes.push({
          top: currentBoxTop,
          bottom: currentBoxBottom,
          startIndex: boxStartIndex,
          endIndex: i - 1
        });
      }
      
      // Start a new box
      currentBoxTop = candle.high;
      currentBoxBottom = initialLow;
      boxStartIndex = i;
      initialHigh = candle.high;
    } 
    // If price breaks below current box bottom
    else if (candle.low < initialLow) {
      // Complete the current box if one exists
      if (boxStartIndex !== -1) {
        boxes.push({
          top: currentBoxTop,
          bottom: currentBoxBottom,
          startIndex: boxStartIndex,
          endIndex: i - 1
        });
      }
      
      // Start a new box
      currentBoxTop = initialHigh;
      currentBoxBottom = candle.low;
      boxStartIndex = i;
      initialLow = candle.low;
    }
  }
  
  // Add the final box if one is in progress
  if (boxStartIndex !== -1 && boxStartIndex < candles.length - 1) {
    boxes.push({
      top: currentBoxTop,
      bottom: currentBoxBottom,
      startIndex: boxStartIndex,
      endIndex: candles.length - 1
    });
  }
  
  // Current active box
  const currentBox = boxStartIndex !== -1 ? {
    top: currentBoxTop,
    bottom: currentBoxBottom
  } : null;
  
  return { boxes, currentBox };
}

// Analyze volume profile
export function analyzeVolumeProfile(candles: CandleData[]): {
  highVolumeNodes: number[],
  volumeAverage: number,
  volumeZones: Array<{ price: number, volume: number }>
} {
  if (candles.length === 0) {
    return { highVolumeNodes: [], volumeAverage: 0, volumeZones: [] };
  }
  
  // Get price range
  const highestPrice = Math.max(...candles.map(c => c.high));
  const lowestPrice = Math.min(...candles.map(c => c.low));
  const priceRange = highestPrice - lowestPrice;
  
  // Create price zones (divide price range into 10 zones)
  const zoneCount = 10;
  const zoneSize = priceRange / zoneCount;
  const volumeZones: Array<{ price: number, volume: number }> = [];
  
  for (let i = 0; i < zoneCount; i++) {
    const zonePrice = lowestPrice + (i * zoneSize) + (zoneSize / 2); // Get the midpoint of zone
    volumeZones.push({ price: zonePrice, volume: 0 });
  }
  
  // Distribute volume across zones
  for (const candle of candles) {
    const candleRange = candle.high - candle.low;
    
    for (let i = 0; i < zoneCount; i++) {
      const zoneStart = lowestPrice + (i * zoneSize);
      const zoneEnd = zoneStart + zoneSize;
      
      // Check if candle overlaps with this zone
      if (candle.low <= zoneEnd && candle.high >= zoneStart) {
        // Calculate overlap percentage
        const overlapStart = Math.max(candle.low, zoneStart);
        const overlapEnd = Math.min(candle.high, zoneEnd);
        const overlapSize = overlapEnd - overlapStart;
        const overlapPercentage = overlapSize / candleRange;
        
        // Add proportional volume to zone
        volumeZones[i].volume += candle.volume * overlapPercentage;
      }
    }
  }
  
  // Calculate volume average
  const totalVolume = candles.reduce((sum, candle) => sum + candle.volume, 0);
  const volumeAverage = totalVolume / candles.length;
  
  // Find high volume nodes (zones with volume above average)
  const highVolumeThreshold = volumeAverage * 1.5;
  const highVolumeNodes = volumeZones
    .filter(zone => zone.volume > highVolumeThreshold)
    .map(zone => zone.price);
  
  return {
    highVolumeNodes,
    volumeAverage,
    volumeZones
  };
}

// Analyze market structure
export function analyzeMarketStructure(candles: CandleData[]): {
  trend: 'bullish' | 'bearish' | 'neutral',
  higherHigh: boolean,
  higherLow: boolean,
  lowerHigh: boolean,
  lowerLow: boolean,
  breakOfStructure: boolean
} {
  if (candles.length < 10) {
    return {
      trend: 'neutral',
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      breakOfStructure: false
    };
  }
  
  // Get swing highs and lows (simplified)
  const swingHighs: Array<{ price: number, index: number }> = [];
  const swingLows: Array<{ price: number, index: number }> = [];
  
  // Simple swing high/low detection (not as robust as in real trading systems)
  for (let i = 2; i < candles.length - 2; i++) {
    // Swing high
    if (candles[i].high > candles[i-1].high && 
        candles[i].high > candles[i-2].high && 
        candles[i].high > candles[i+1].high && 
        candles[i].high > candles[i+2].high) {
      swingHighs.push({ price: candles[i].high, index: i });
    }
    
    // Swing low
    if (candles[i].low < candles[i-1].low && 
        candles[i].low < candles[i-2].low && 
        candles[i].low < candles[i+1].low && 
        candles[i].low < candles[i+2].low) {
      swingLows.push({ price: candles[i].low, index: i });
    }
  }
  
  // Need at least 2 swing points to analyze structure
  if (swingHighs.length < 2 || swingLows.length < 2) {
    return {
      trend: 'neutral',
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      breakOfStructure: false
    };
  }
  
  // Sort by index to get chronological order
  swingHighs.sort((a, b) => a.index - b.index);
  swingLows.sort((a, b) => a.index - b.index);
  
  // Check for higher highs and higher lows
  const higherHigh = swingHighs[swingHighs.length - 1].price > swingHighs[swingHighs.length - 2].price;
  const higherLow = swingLows[swingLows.length - 1].price > swingLows[swingLows.length - 2].price;
  
  // Check for lower highs and lower lows
  const lowerHigh = swingHighs[swingHighs.length - 1].price < swingHighs[swingHighs.length - 2].price;
  const lowerLow = swingLows[swingLows.length - 1].price < swingLows[swingLows.length - 2].price;
  
  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (higherHigh && higherLow) {
    trend = 'bullish';
  } else if (lowerHigh && lowerLow) {
    trend = 'bearish';
  }
  
  // Detect break of structure
  let breakOfStructure = false;
  
  // Break of bullish structure: price breaks below previous higher low
  if (trend === 'bullish' && candles[candles.length - 1].low < swingLows[swingLows.length - 2].price) {
    breakOfStructure = true;
  }
  
  // Break of bearish structure: price breaks above previous lower high
  if (trend === 'bearish' && candles[candles.length - 1].high > swingHighs[swingHighs.length - 2].price) {
    breakOfStructure = true;
  }
  
  return {
    trend,
    higherHigh,
    higherLow,
    lowerHigh,
    lowerLow,
    breakOfStructure
  };
}

// Detect fakeouts and possible traps
export function detectTraps(candles: CandleData[]): {
  bullTrap: boolean,
  bearTrap: boolean,
  fakeout: boolean,
  fakeoutDirection: 'up' | 'down' | null
} {
  if (candles.length < 5) {
    return {
      bullTrap: false,
      bearTrap: false,
      fakeout: false,
      fakeoutDirection: null
    };
  }
  
  // Get the last few candles
  const recentCandles = candles.slice(-5);
  
  // Find the general trend direction
  const firstClose = recentCandles[0].close;
  const lastClose = recentCandles[recentCandles.length - 1].close;
  const trendDirection = lastClose > firstClose ? 'up' : 'down';
  
  // Check for bull trap: price breaks above resistance then quickly reverses down
  const bullTrap = recentCandles[2].close > recentCandles[1].high && // Break above resistance
                  recentCandles[3].close < recentCandles[2].close && // Start moving down
                  recentCandles[4].close < recentCandles[3].close;   // Continue moving down
  
  // Check for bear trap: price breaks below support then quickly reverses up
  const bearTrap = recentCandles[2].close < recentCandles[1].low && // Break below support
                  recentCandles[3].close > recentCandles[2].close && // Start moving up
                  recentCandles[4].close > recentCandles[3].close;   // Continue moving up
  
  // Detect general fakeout (false breakout)
  let fakeout = false;
  let fakeoutDirection: 'up' | 'down' | null = null;
  
  // Fakeout to the upside
  if (recentCandles[2].high > Math.max(recentCandles[0].high, recentCandles[1].high) &&
      recentCandles[4].close < recentCandles[2].low) {
    fakeout = true;
    fakeoutDirection = 'up';
  }
  
  // Fakeout to the downside
  if (recentCandles[2].low < Math.min(recentCandles[0].low, recentCandles[1].low) &&
      recentCandles[4].close > recentCandles[2].high) {
    fakeout = true;
    fakeoutDirection = 'down';
  }
  
  return {
    bullTrap,
    bearTrap,
    fakeout,
    fakeoutDirection
  };
}
export function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period) return 0;
  
  const trueRanges: number[] = [];
  
  // Calculate True Range for each candle
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  // Calculate ATR using Simple Moving Average
  const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  
  return atr;
}
