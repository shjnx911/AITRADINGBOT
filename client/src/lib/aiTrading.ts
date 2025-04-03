import { CandleData } from "./binanceClient";
import * as ta from "./technicalAnalysis";
import { analyzeCandlestickPatterns, incorporateCandlestickAnalysis, PatternResult, Trend } from './candlestickAnalysis';

// Define the MultiTimeframeAnalysis interface
interface MultiTimeframeAnalysis {
  timeframe: string;
  trend: string;
  rsi: number;
  emaStatus: string;
  marketStructure: string[];
  volumeSupport: number[];
  divergence: {
    bullish: boolean;
    bearish: boolean;
    strength: number;
  };
  confidence: number;
  candleData?: CandleData[]; // Dữ liệu nến cho phân tích mẫu hình nến
  candlestickPatterns?: PatternResult[]; // Kết quả phân tích mẫu hình nến
}

// Interface for GPU monitoring during AI processes
export interface GpuUsageMonitor {
  currentUsage: number; // Current GPU usage percentage
  highWatermark: number; // Highest GPU usage recorded
  threshold: { pause: number, resume: number }; // Thresholds for pausing/resuming operations
  status: 'running' | 'paused' | 'idle'; // Current status of GPU monitoring
  history: Array<{ timestamp: number, usage: number }>;
}

// Helper function to calculate trade amount with dynamic capital allocation based on confidence
export function calculateTradeAmount(
  totalBalance: number, 
  minCapitalPercent: number, 
  maxCapitalPercent: number, 
  defaultCapitalPercent: number,
  signalConfidence: number, 
  autoAdjust: boolean, 
  leverage: number
): number {
  // Calculate trade amount based on risk percentage, confidence and leverage
  let capitalPercentToUse;

  if (autoAdjust && signalConfidence > 0) {
    // Scale between min and max based on confidence (0-1)
    // Using a curve that gives more weight to higher confidence values
    const confidenceScaling = Math.pow(signalConfidence, 1.5); // Apply curve to confidence
    capitalPercentToUse = minCapitalPercent + (maxCapitalPercent - minCapitalPercent) * confidenceScaling;
    // Ensure within limits
    capitalPercentToUse = Math.max(minCapitalPercent, Math.min(maxCapitalPercent, capitalPercentToUse));
  } else {
    // Use default setting if auto adjust is off or no confidence provided
    capitalPercentToUse = defaultCapitalPercent;
  }

  // Calculate trade amount based on capital percentage and leverage
  return (totalBalance * (capitalPercentToUse / 100)) / leverage;
}

// Helper function to monitor GPU usage and control AI operations
export function monitorGpuUsage(
  maxGpuUsage: number = 75,
  callback?: (status: 'pause' | 'resume') => void
): GpuUsageMonitor {
  // Initialize monitor
  const monitor: GpuUsageMonitor = {
    currentUsage: 0,
    highWatermark: 0,
    threshold: { pause: maxGpuUsage, resume: 30 },
    status: 'idle',
    history: []
  };

  // Simulated function to check GPU usage
  // In a real implementation, this would use system calls or a dedicated library
  const checkGpuUsage = async () => {
    try {
      const response = await fetch('/api/gpu-usage');
      const { usage } = await response.json();
      const newUsage = usage;
      monitor.currentUsage = newUsage;
      monitor.highWatermark = Math.max(monitor.highWatermark, newUsage);
      monitor.history.push({ timestamp: Date.now(), usage: newUsage });

      // Keep only the last 100 readings
      if (monitor.history.length > 100) {
        monitor.history.shift();
      }

      // Check thresholds and call callback if needed
      if (monitor.status !== 'paused' && newUsage > monitor.threshold.pause) {
        monitor.status = 'paused';
        if (callback) callback('pause');
      } else if (monitor.status === 'paused' && newUsage < monitor.threshold.resume) {
        monitor.status = 'running';
        if (callback) callback('resume');
      }
    } catch (error) {
      console.error("Error fetching GPU usage:", error);
      // Handle error appropriately, e.g., retry or fallback to default value
      monitor.currentUsage = 0; // or a default value
    }
  };

  // Start monitoring
  const intervalId = setInterval(checkGpuUsage, 2000);

  // Return the monitor object and a cleanup function
  return {
    ...monitor,
    startMonitoring: () => {
      if (monitor.status === 'idle') {
        monitor.status = 'running';
      }
    },
    stopMonitoring: () => {
      clearInterval(intervalId);
      monitor.status = 'idle';
    }
  } as GpuUsageMonitor;
}

export interface MarketCondition {
  primaryTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100%
  volatility: number; // 0-1 normalized volatility
  momentum: number; // -100 to 100, negative means bearish momentum
  supports: number[]; // Support levels
  resistances: number[]; // Resistance levels
  volumeProfile: 'INCREASING' | 'DECREASING' | 'FLAT';
  timeframe: string;
  lastUpdated: Date;
}

export interface OptimizedParameters {
  stopLossPercentage: number;
  takeProfitPercentage: number;
  entryConfidenceThreshold: number;
  leverageMultiplier: number;
  durationHoldHours: number;
  trailingStopActivationPercentage: number;
  useMarketOrders: boolean;
  tradesPerDay: number;
}

export interface AiTradingDecision {
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  timeframe: string;
  price: number;
  reasoning: string[];
  supportingIndicators: string[];
  indicators: Record<string, any>;
  leverageSuggestion: number;
  stopLossSuggestion: number;
  takeProfitSuggestion: number;
  timestamp: Date;
  optimizedParameters?: OptimizedParameters;
  marketCondition?: MarketCondition;
}

// Function to analyze a single timeframe
function analyzeSingleTimeframe(
  candles: CandleData[],
  timeframe: string
): MultiTimeframeAnalysis {
  if (candles.length < 50) {
    return {
      timeframe,
      trend: 'neutral',
      rsi: 50,
      emaStatus: 'neutral',
      marketStructure: [],
      volumeSupport: [],
      divergence: { bullish: false, bearish: false, strength: 0 },
      confidence: 0
    };
  }

  // Get close prices
  const closePrices = candles.map(c => c.close);

  // Calculate RSI
  const rsiValues = ta.calculateRSI(candles, 14);
  const currentRsi = rsiValues[rsiValues.length - 1] || 50;

  // Calculate EMAs
  const ema8 = ta.calculateEMA(closePrices, 8);
  const ema21 = ta.calculateEMA(closePrices, 21);
  const ema50 = ta.calculateEMA(closePrices, 50);

  const currentEma8 = ema8[ema8.length - 1];
  const currentEma21 = ema21[ema21.length - 1];
  const currentEma50 = ema50[ema50.length - 1];

  let emaStatus = 'neutral';

  if (currentEma8 && currentEma21 && currentEma50) {
    if (currentEma8 > currentEma21 && currentEma21 > currentEma50) {
      emaStatus = 'bullish';
    } else if (currentEma8 < currentEma21 && currentEma21 < currentEma50) {
      emaStatus = 'bearish';
    }
  }

  // Analyze market structure
  const marketStructureAnalysis = ta.analyzeMarketStructure(candles);
  const marketStructureTags: string[] = [];

  if (marketStructureAnalysis.higherHigh && marketStructureAnalysis.higherLow) {
    marketStructureTags.push('Higher High & Higher Low');
  }

  if (marketStructureAnalysis.lowerHigh && marketStructureAnalysis.lowerLow) {
    marketStructureTags.push('Lower High & Lower Low');
  }

  if (marketStructureAnalysis.breakOfStructure) {
    marketStructureTags.push('BOS Formation');
  }

  // Volume profile analysis
  const volumeProfile = ta.analyzeVolumeProfile(candles);

  // Divergence analysis
  const divergenceAnalysis = ta.detectDivergence(candles, rsiValues);

  // Detect traps
  const trapsAnalysis = ta.detectTraps(candles);

  if (trapsAnalysis.fakeout) {
    marketStructureTags.push(`Fakeout ${trapsAnalysis.fakeoutDirection === 'up' ? 'Upward' : 'Downward'}`);
  }

  if (trapsAnalysis.bullTrap) {
    marketStructureTags.push('Bull Trap');
  }

  if (trapsAnalysis.bearTrap) {
    marketStructureTags.push('Bear Trap');
  }

  // Calculate Fibonacci levels for most recent swing
  let fibLevels = null;
  if (candles.length >= 20) {
    const recentCandles = candles.slice(-20);
    const high = Math.max(...recentCandles.map(c => c.high));
    const low = Math.min(...recentCandles.map(c => c.low));
    fibLevels = ta.calculateFibonacciLevels(high, low);
  }

  // Smart Money Concept validation
  let smcValid = false;

  // Simplified SMC check (in real systems this would be much more complex)
  if (fibLevels) {
    const latestClose = candles[candles.length - 1].close;
    const nearFibLevel = Object.values(fibLevels).some(level => 
      Math.abs(latestClose - level) / level < 0.01); // Within 1% of a fib level

    const volumeAtExtremes = volumeProfile.highVolumeNodes.some(node => 
      Math.abs(latestClose - node) / node < 0.02); // High volume within 2% of current price

    smcValid = nearFibLevel && volumeAtExtremes;
  }

  if (smcValid) {
    marketStructureTags.push('SMC Valid');
  }

  // Calculate confidence based on alignment of indicators
  let confidence = 0.5; // Start neutral

  // RSI contribution
  if (currentRsi < 30) confidence += 0.1; // Oversold, bullish
  if (currentRsi > 70) confidence -= 0.1; // Overbought, bearish

  // EMA contribution
  if (emaStatus === 'bullish') confidence += 0.15;
  if (emaStatus === 'bearish') confidence -= 0.15;

  // Market structure contribution
  if (marketStructureAnalysis.trend === 'bullish') confidence += 0.2;
  if (marketStructureAnalysis.trend === 'bearish') confidence -= 0.2;

  // Divergence contribution
  if (divergenceAnalysis.bullishDivergence) confidence += 0.15 * (divergenceAnalysis.divergenceStrength / 100);
  if (divergenceAnalysis.bearishDivergence) confidence -= 0.15 * (divergenceAnalysis.divergenceStrength / 100);

  // Trap detection
  if (trapsAnalysis.bullTrap) confidence -= 0.1;
  if (trapsAnalysis.bearTrap) confidence += 0.1;

  // Smart Money Concept
  if (smcValid) confidence += 0.1;

  // Ensure confidence is between 0 and 1
  confidence = Math.max(0, Math.min(1, confidence));

  // Analyze candlestick patterns
  const candlestickPatterns = analyzeCandlestickPatterns(candles);

  return {
    timeframe,
    trend: marketStructureAnalysis.trend,
    rsi: currentRsi,
    emaStatus,
    marketStructure: marketStructureTags,
    volumeSupport: volumeProfile.highVolumeNodes,
    divergence: {
      bullish: divergenceAnalysis.bullishDivergence,
      bearish: divergenceAnalysis.bearishDivergence,
      strength: divergenceAnalysis.divergenceStrength
    },
    confidence,
    candleData: candles,
    candlestickPatterns
  };
}

// Function to evaluate alignment between timeframes
function alignmentScore(current: MultiTimeframeAnalysis, other: MultiTimeframeAnalysis): number {
  let score = 0;

  // Check trend alignment
  if (current.trend === other.trend) score += 0.2;

  // Check key levels alignment based on volume support
  const currentLevels = current.volumeSupport || [];
  const otherLevels = other.volumeSupport || [];

  const commonLevels = currentLevels.filter(level => 
    otherLevels.some(otherLevel => Math.abs(level - otherLevel) / level < 0.003)
  );

  score += Math.min(0.3, commonLevels.length * 0.1);

  // Additional alignment checks could go here

  return Math.min(score, 1);
}

// Analyze multiple timeframes
export function analyzeMultiTimeframe(
  candlesByTimeframe: Record<string, CandleData[]>
): Record<string, MultiTimeframeAnalysis> {
  const result: Record<string, MultiTimeframeAnalysis> = {};

  // First pass: analyze each timeframe independently
  for (const [timeframe, candles] of Object.entries(candlesByTimeframe)) {
    result[timeframe] = analyzeSingleTimeframe(candles, timeframe);
  }

  return result;
}

// Generate trading decision based on multi-timeframe analysis with enhanced risk management
export function generateTradingDecision(
  analyses: Record<string, MultiTimeframeAnalysis>,
  currentPrice: number,
  minLeverage: number = 10,
  maxLeverage: number = 50 // Setting maximum leverage to 50x as requested
): AiTradingDecision {
  // Weight for each timeframe (higher weight for longer timeframes)
  const timeframeWeights: Record<string, number> = {
    '1m': 0.05,
    '5m': 0.1,
    '15m': 0.5, // Increased weight for 15m as requested
    '30m': 0.2,
    '1h': 0.5, // Increased weight for 1h as requested
    '4h': 0.6,
    '1d': 0.8,
    '1w': 1.0
  };

  let weightedConfidence = 0;
  let totalWeight = 0;
  let dominantTimeframe = '';
  let highestConfidenceValue = 0;

  // Calculate weighted confidence from all timeframes
  for (const [timeframe, analysis] of Object.entries(analyses)) {
    const weight = timeframeWeights[timeframe] || 0.1;
    weightedConfidence += (analysis.confidence - 0.5) * weight; // Subtract 0.5 to center around 0
    totalWeight += weight;

    // Track the timeframe with highest confidence
    if (Math.abs(analysis.confidence - 0.5) > highestConfidenceValue) {
      highestConfidenceValue = Math.abs(analysis.confidence - 0.5);
      dominantTimeframe = timeframe;
    }

    // Apply candlestick pattern analysis for enhanced accuracy
    // Get candlestick data from the analyses
    const candleDataForTimeframe = analyses[timeframe]?.candleData;
    if (candleDataForTimeframe && Array.isArray(candleDataForTimeframe)) {
      // Analyze candlestick patterns
      const candlestickPatterns = analyzeCandlestickPatterns(candleDataForTimeframe);

      // Incorporate patterns into decision making
      if (candlestickPatterns.length > 0) {
        const { adjustedConfidence, supportingPatterns } = incorporateCandlestickAnalysis(
          candlestickPatterns,
          timeframe,
          analysis.confidence
        );

        // Adjust confidence based on candlestick patterns
        const confidenceAdjustment = (adjustedConfidence - analysis.confidence) * weight;
        weightedConfidence += confidenceAdjustment;

        // Add patterns to the analysis for reference
        analysis.candlestickPatterns = supportingPatterns;
      }
    }
  }

  // Normalize confidence back to 0-1 range
  const finalConfidence = weightedConfidence / totalWeight + 0.5;

  // Determine signal type
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  // Create reasoning array
  let reasoning: string[] = [];

  if (finalConfidence > 0.75) { // Stricter threshold for BUY signals
    signal = 'BUY';
  } else if (finalConfidence < 0.25) { // Stricter threshold for SELL signals
    signal = 'SELL';
  } else {
    // Additional check: If signal is neutral but within 5% of thresholds, consider market conditions
    // Prioritize 15m and 1h timeframes for more trading signals, but still consider 4h and 1d
    if (finalConfidence > 0.7) {
      // Check for bullish conditions in 15m, 1h timeframes
      if ((analyses['15m']?.trend === 'bullish' && analyses['1h']?.emaStatus === 'bullish') ||
          (analyses['1h']?.trend === 'bullish' && analyses['4h']?.emaStatus === 'bullish')) {
        signal = 'BUY';
        reasoning.push('Borderline signal elevated to BUY due to bullish alignment in shorter timeframes');
      }
    } else if (finalConfidence < 0.3) {
      // Check for bearish conditions in 15m, 1h timeframes
      if ((analyses['15m']?.trend === 'bearish' && analyses['1h']?.emaStatus === 'bearish') ||
          (analyses['1h']?.trend === 'bearish' && analyses['4h']?.emaStatus === 'bearish')) {
        signal = 'SELL';
        reasoning.push('Borderline signal elevated to SELL due to bearish alignment in shorter timeframes');
      }
    }
  }

  // Get dominant timeframe analysis
  const dominantAnalysis = analyses[dominantTimeframe];

  if (signal === 'BUY') {
    reasoning.push(`Strong bullish signal with ${(finalConfidence * 100).toFixed(1)}% confidence`);

    if (dominantAnalysis.rsi < 40) {
      reasoning.push(`RSI is oversold at ${dominantAnalysis.rsi.toFixed(1)} on ${dominantTimeframe} timeframe`);
    }

    if (dominantAnalysis.emaStatus === 'bullish') {
      reasoning.push(`EMAs aligned bullishly on ${dominantTimeframe} timeframe`);
    }

    if (dominantAnalysis.divergence.bullish) {
      reasoning.push(`Bullish divergence detected with ${dominantAnalysis.divergence.strength.toFixed(1)}% strength`);
    }

    if (dominantAnalysis.marketStructure.includes('Higher High & Higher Low')) {
      reasoning.push('Market structure shows higher highs and higher lows');
    }

    if (dominantAnalysis.marketStructure.includes('BOS Formation')) {
      reasoning.push('Break of structure detected, potential trend reversal');
    }

    if (dominantAnalysis.marketStructure.includes('SMC Valid')) {
      reasoning.push('Smart Money Concept validation: price at institutional interest area');
    }

    // Add candlestick pattern reasoning if available
    if (dominantAnalysis.candlestickPatterns && dominantAnalysis.candlestickPatterns.length > 0) {
      const bullishPatterns = dominantAnalysis.candlestickPatterns.filter(p => p.trend === 'BULLISH');
      if (bullishPatterns.length > 0) {
        const topPattern = bullishPatterns[0]; // Patterns are already sorted by significance
        reasoning.push(`Detected ${topPattern.pattern} candlestick pattern (${topPattern.significance}% strength)`);
      }
    }
  } else if (signal === 'SELL') {
    reasoning.push(`Strong bearish signal with ${((1 - finalConfidence) * 100).toFixed(1)}% confidence`);

    if (dominantAnalysis.rsi > 60) {
      reasoning.push(`RSI is overbought at ${dominantAnalysis.rsi.toFixed(1)} on ${dominantTimeframe} timeframe`);
    }

    if (dominantAnalysis.emaStatus === 'bearish') {
      reasoning.push(`EMAs aligned bearishly on ${dominantTimeframe} timeframe`);
    }

    if (dominantAnalysis.divergence.bearish) {
      reasoning.push(`Bearish divergence detected with ${dominantAnalysis.divergence.strength.toFixed(1)}% strength`);
    }

    if (dominantAnalysis.marketStructure.includes('Lower High & Lower Low')) {
      reasoning.push('Market structure shows lower highs and lower lows');
    }

    if (dominantAnalysis.marketStructure.includes('BOS Formation')) {
      reasoning.push('Break of structure detected, potential trend reversal');
    }

    if (dominantAnalysis.marketStructure.includes('Bull Trap')) {
      reasoning.push('Bull trap detected, false breakout to the upside');
    }

    // Add candlestick pattern reasoning if available
    if (dominantAnalysis.candlestickPatterns && dominantAnalysis.candlestickPatterns.length > 0) {
      const bearishPatterns = dominantAnalysis.candlestickPatterns.filter(p => p.trend === 'BEARISH');
      if (bearishPatterns.length > 0) {
        const topPattern = bearishPatterns[0]; // Patterns are already sorted by significance
        reasoning.push(`Detected ${topPattern.pattern} candlestick pattern (${topPattern.significance}% strength)`);
      }
    }
  } else {
    reasoning.push('No clear signal detected, market is in consolidation');
    reasoning.push(`Confidence level too low at ${(finalConfidence * 100).toFixed(1)}%`);
  }

  // List supporting indicators
  const supportingIndicators: string[] = [];

  for (const [timeframe, analysis] of Object.entries(analyses)) {
    if ((signal === 'BUY' && analysis.confidence > 0.65) || 
        (signal === 'SELL' && analysis.confidence < 0.35)) {
      supportingIndicators.push(`${timeframe} timeframe (${(analysis.confidence * 100).toFixed(1)}%)`);
    }
  }

  // Calculate suggested leverage based on confidence
  const absConfidence = signal === 'BUY' ? finalConfidence : (1 - finalConfidence);
  const leverageRange = maxLeverage - minLeverage;
  const leverageSuggestion = Math.round(minLeverage + (leverageRange * absConfidence));

  // Calculate stop loss and take profit levels
  // For simplicity, using fixed percentages, but in real systems this would be based on volatility and key levels
  let stopLossSuggestion = 0;
  let takeProfitSuggestion = 0;

  if (signal === 'BUY') {
    stopLossSuggestion = currentPrice * 0.98; // 2% below current price
    takeProfitSuggestion = currentPrice * 1.06; // 6% above current price
  } else if (signal === 'SELL') {
    stopLossSuggestion = currentPrice * 1.02; // 2% above current price
    takeProfitSuggestion = currentPrice * 0.94; // 6% below current price
  }

  // Collect indicators data for the decision
  const indicators: Record<string, any> = {
    rsi: dominantAnalysis.rsi,
    emaStatus: dominantAnalysis.emaStatus,
    marketStructure: dominantAnalysis.marketStructure,
    volumeSupport: dominantAnalysis.volumeSupport,
    divergence: dominantAnalysis.divergence,
    candlestickPatterns: dominantAnalysis.candlestickPatterns || []
  };

  // Generate market condition assessment
  const marketCondition: MarketCondition = {
    primaryTrend: dominantAnalysis.trend === 'bullish' ? 'BULLISH' : 
                 (dominantAnalysis.trend === 'bearish' ? 'BEARISH' : 'NEUTRAL'),
    strength: Math.abs(finalConfidence - 0.5) * 200, // 0-100% trend strength
    volatility: dominantAnalysis.volumeSupport.length > 0 ? 
                calculateVolatility(dominantAnalysis.candleData || [], 14) : 0.01,
    momentum: (finalConfidence - 0.5) * 200, // -100 to 100 scale
    supports: dominantAnalysis.volumeSupport,
    resistances: [], // Would be calculated from key resistance levels
    volumeProfile: dominantAnalysis.volumeSupport.length > 3 ? 'INCREASING' : 
                  (dominantAnalysis.volumeSupport.length > 0 ? 'FLAT' : 'DECREASING'),
    timeframe: dominantTimeframe,
    lastUpdated: new Date()
  };

  // Optimize parameters based on market conditions
  const optimizedParameters: OptimizedParameters = {
    stopLossPercentage: signal === 'BUY' ? 
                       (marketCondition.volatility * 100 * 3) : // ~3x the volatility for stop loss
                       (marketCondition.volatility * 100 * 2.5), // Slightly tighter for shorts
    takeProfitPercentage: signal === 'BUY' ? 
                        (marketCondition.volatility * 100 * 9) : // ~9x the volatility for take profit
                        (marketCondition.volatility * 100 * 8),  // Slightly lower for shorts
    entryConfidenceThreshold: marketCondition.strength > 75 ? 0.65 : 0.75, // Lower threshold in strong trends
    leverageMultiplier: Math.max(minLeverage, Math.min(maxLeverage, 
                        leverageSuggestion * (1 - marketCondition.volatility * 5))), // Reduce leverage in high volatility
    durationHoldHours: marketCondition.primaryTrend === 'NEUTRAL' ? 4 : 12, // Hold longer in clear trends
    trailingStopActivationPercentage: marketCondition.volatility * 100 * 4, // Activate trailing stop at ~4x volatility
    useMarketOrders: marketCondition.primaryTrend !== 'NEUTRAL', // Use market orders in clear trends
    tradesPerDay: marketCondition.strength > 50 ? 
                 (marketCondition.strength > 75 ? 10 : 7) : 5 // More trades in stronger trends
  };

  return {
    signal,
    confidence: signal === 'BUY' ? finalConfidence : (signal === 'SELL' ? (1 - finalConfidence) : 0.5),
    timeframe: dominantTimeframe,
    price: currentPrice,
    reasoning,
    supportingIndicators,
    indicators,
    leverageSuggestion,
    stopLossSuggestion,
    takeProfitSuggestion,
    timestamp: new Date(),
    optimizedParameters,
    marketCondition
  };
}

// Function to calculate Average True Range (ATR)
function calculateATR(candles: CandleData[], period: number): number {
  // Simple implementation for ATR calculation
  if (candles.length < period + 1) return 1;

  let trSum = 0;
  for (let i = 1; i < period + 1; i++) {
    const current = candles[candles.length - i];
    const prev = candles[candles.length - i - 1];

    // True Range is the greatest of:
    // 1. Current High - Current Low
    // 2. |Current High - Previous Close|
    // 3. |Current Low - Previous Close|
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );

    trSum += tr;
  }

  return trSum / period;
}

// Backtest the strategy on historical data with enhanced features
export function backtestStrategy(
  candles: CandleData[],
  initialCapital: number,
  leverage: number,
  riskPerTrade: number,
  aiStrategy: {
    useMultiTimeframe?: boolean;
    minConfidence?: number; 
    tradesPerDay?: number;
    stopLossAtr?: number;
  } = {}, // percentage of capital risked per trade
  options?: {
    useDCA?: boolean;
    dcaLevels?: number;
    dcaTriggerPercentages?: number[];
    dcaOptimization?: boolean; // Enable advanced DCA optimization
    dcaAdaptivePositioning?: boolean; // Adjust DCA entry points based on volatility
    dcaVariableAmount?: boolean; // Use variable amounts for DCA entries
    dcaReinforcement?: boolean; // Reinforce winning positions with additional DCA
    dcaIntelligentExit?: boolean; // Use partial exits for DCA positions
    stopLossPercent?: number;
    takeProfitPercent?: number;
    selectedIndicators?: string[];
    selectedStrategies?: Array<'SMC' | 'HFT' | 'AI_TREND' | 'VWAP' | 'BOLLINGER' | 'DARVAS'>;
  }
): {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  finalCapital: number;
  totalReturn: number;
  maxDrawdown: number;
  netProfit: number;
  netProfitPercent: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  finalBalance: number;
  trades: Array<{
    entryPrice: number;
    exitPrice: number;
    type: 'LONG' | 'SHORT';
    profit: number;
    profitPercentage: number;
    timestamp: number;
    entryTime?: number;
    exitTime?: number;
    dcaLevel?: number;
  }>;
} {
  if (candles.length < 50) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      finalCapital: initialCapital,
      totalReturn: 0,
      maxDrawdown: 0,
      netProfit: 0,
      netProfitPercent: 0,
      profitFactor: 0,
      maxDrawdownPercent: 0,
      finalBalance: initialCapital,
      trades: []
    };
  }

  let capital = initialCapital;
  let highWaterMark = initialCapital;
  let maxDrawdown = 0;

  const trades: Array<{
    entryPrice: number;
    exitPrice: number;
    type: 'LONG' | 'SHORT';
    profit: number;
    profitPercentage: number;
    timestamp: number;
    entryTime?: number;
    exitTime?: number;
    dcaLevel?: number;
  }> = [];

  let inPosition = false;
  let positionType: 'LONG' | 'SHORT' = 'LONG';
  let entryPrice = 0;
  let entryTime = 0;
  let positionSize = 0;

  // Process each candle as a new day/period
  for (let i = 50; i < candles.length - 1; i++) {
    // Get a window of candles for analysis
    const windowCandles = candles.slice(i - 50, i + 1);

    // Simple simulation of a decision based on RSI and EMA
    const rsiValues = ta.calculateRSI(windowCandles, 14);
    const currentRsi = rsiValues[rsiValues.length - 1] || 50;

    const closePrices = windowCandles.map(c => c.close);
    const ema8 = ta.calculateEMA(closePrices, 8);
    const ema21 = ta.calculateEMA(closePrices, 21);

    const currentEma8 = ema8[ema8.length - 1];
    const currentEma21 = ema21[ema21.length - 1];

    const currentPrice = windowCandles[windowCandles.length - 1].close;

    // Exit existing position if we have one
    if (inPosition) {
      let exitSignal = false;

      if (positionType === 'LONG') {
        // Exit long if RSI becomes overbought or EMAs cross down
        if (currentRsi > 70 || (currentEma8 && currentEma21 && currentEma8 < currentEma21)) {
          exitSignal = true;
        }
      } else {
        // Exit short if RSI becomes oversold or EMAs cross up
        if (currentRsi < 30 || (currentEma8 && currentEma21 && currentEma8 > currentEma21)) {
          exitSignal = true;
        }
      }

      if (exitSignal) {
        const exitPrice = currentPrice;

        // Calculate profit
        let profit = 0;
        if (positionType === 'LONG') {
          profit = positionSize * (exitPrice - entryPrice) / entryPrice * leverage;
        } else {
          profit = positionSize * (entryPrice - exitPrice) / entryPrice * leverage;
        }

        capital += profit;

        // Track max drawdown
        if (capital > highWaterMark) {
          highWaterMark = capital;
        } else {
          const drawdown = (highWaterMark - capital) / highWaterMark;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }

        // Record the trade
        trades.push({
          entryPrice,
          exitPrice,
          type: positionType,
          profit,
          profitPercentage: (profit / positionSize) * 100,
          timestamp: candles[i].time,
          entryTime: entryTime,
          exitTime: candles[i].time
        });

        inPosition = false;
      }
    }

    // Enter new position if not already in one
    if (!inPosition) {
      let entrySignal: 'LONG' | 'SHORT' | null = null;

      // Long signal: RSI oversold and EMAs cross up
      if (currentRsi < 30 && currentEma8 && currentEma21 && currentEma8 > currentEma21) {
        entrySignal = 'LONG';
      }
      // Short signal: RSI overbought and EMAs cross down
      else if (currentRsi > 70 && currentEma8 && currentEma21 && currentEma8 < currentEma21) {
        entrySignal = 'SHORT';
      }

      if (entrySignal) {
        entryPrice = currentPrice;
        entryTime = candles[i].time;
        positionType = entrySignal;

        // Calculate position size based on risk
        positionSize = capital * (riskPerTrade / 100);

        // Calculate ATR to adjust DCA and SL/TP
        const atrPeriod = 14;
        const atr = calculateATR(windowCandles.slice(-atrPeriod), atrPeriod);

        inPosition = true;
      }
    }
  }

  // Close any open position at the end of the test
  if (inPosition) {
    const exitPrice = candles[candles.length - 1].close;

    // Calculate profit
    let profit = 0;
    if (positionType === 'LONG') {
      profit = positionSize * (exitPrice - entryPrice) / entryPrice * leverage;
    } else {
      profit = positionSize * (entryPrice - exitPrice) / entryPrice * leverage;
    }

    capital += profit;

    // Record the trade
    trades.push({
      entryPrice,
      exitPrice,
      type: positionType,
      profit,
      profitPercentage: (profit / positionSize) * 100,
      timestamp: candles[candles.length - 1].time,
      entryTime: entryTime,
      exitTime: candles[candles.length - 1].time
    });
  }

  // Calculate statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.profit > 0).length;
  const losingTrades = trades.filter(t => t.profit <= 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalReturn = (capital - initialCapital) / initialCapital * 100;

  // Calculate profit factor (total profits / total losses)
  const totalProfit = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
  const totalLoss = Math.abs(trades.filter(t => t.profit <= 0).reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

  const netProfit = capital - initialCapital;
  const netProfitPercent = (netProfit / initialCapital) * 100;
  const maxDrawdownPercent = maxDrawdown * 100;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    finalCapital: capital,
    totalReturn,
    maxDrawdown,
    netProfit,
    netProfitPercent,
    profitFactor,
    maxDrawdownPercent,
    finalBalance: capital,
    trades
  };
}

// Calculate volatility based on price data
export function calculateVolatility(
  candles: CandleData[],
  period: number = 14
): number {
  if (candles.length < period) return 0.01; // Default if not enough data

  // Get recent candles for volatility calculation
  const recentCandles = candles.slice(-period);

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < recentCandles.length; i++) {
    const prev = recentCandles[i-1].close;
    const current = recentCandles[i].close;
    returns.push((current - prev) / prev);
  }

  // Calculate standard deviation of returns (volatility)
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const squaredDiffs = returns.map(value => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / squaredDiffs.length;
  const volatility = Math.sqrt(variance);

  return Math.max(0.005, Math.min(0.05, volatility)); // Limit volatility to reasonable range
}

// Dynamically adjust position size based on volatility and risk profile
export function calculateDynamicPositionSize(
  accountBalance: number,
  baseRiskPercentage: number, // e.g., 5%
  volatility: number,
  marketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE' = 'NEUTRAL',
  winRate: number = 0.6 // Recent win rate
): number {
  // Base position size as percentage of account
  let positionSizePercentage = baseRiskPercentage;

  // Adjust based on volatility - reduce size in high volatility, increase in low
  const volatilityFactor = 1 - (volatility * 10); // Inverse relationship
  positionSizePercentage *= Math.max(0.5, Math.min(1.5, volatilityFactor));

  // Adjust based on market condition
  if (marketCondition === 'VOLATILE') {
    positionSizePercentage *= 0.7; // Reduce position size in volatile markets
  } else if (marketCondition === 'BULLISH' || marketCondition === 'BEARISH') {
    // In clear trend, slightly increase position size if it matches our direction
    positionSizePercentage *= 1.1;
  }

  // Adjust based on recent performance (win rate)
  if (winRate > 0.7) {
    // If win rate is high, slightly increase position size
    positionSizePercentage *= 1.2;
  } else if (winRate < 0.5) {
    // If win rate is low, reduce position size
    positionSizePercentage *= 0.8;
  }

  // Ensure position size stays within reasonable limits (1-10% of balance)
  positionSizePercentage = Math.max(1, Math.min(10, positionSizePercentage));

  return (accountBalance * positionSizePercentage) / 100;
}

// Calculate DCA (Dollar Cost Average) levels with dynamic adjustments and advanced optimization
export function calculateDCALevels(
  entryPrice: number, 
  positionType: 'LONG' | 'SHORT',
  initialSize: number,
  levels: number = 3,
  volatility: number = 0.01,
  marketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE' = 'NEUTRAL',
  options?: {
    dcaOptimization?: boolean;
    dcaAdaptivePositioning?: boolean;
    dcaVariableAmount?: boolean;
    dcaReinforcement?: boolean;
    currentPnl?: number;
    priceAction?: 'RANGING' | 'TRENDING' | 'REVERSAL' | 'UNKNOWN';
    supportResistance?: number[];
  }
): Array<{level: number; price: number; amount: number; partialTakeProfit?: number; reinforcementThreshold?: number}> {
  const result = [];

  // Default options
  const useOptimization = options?.dcaOptimization !== undefined ? options.dcaOptimization : false;
  const useAdaptivePositioning = options?.dcaAdaptivePositioning !== undefined ? options.dcaAdaptivePositioning : false;
  const useVariableAmount = options?.dcaVariableAmount !== undefined ? options.dcaVariableAmount : false;
  const useReinforcement = options?.dcaReinforcement !== undefined ? options.dcaReinforcement : false;
  const priceAction = options?.priceAction || 'UNKNOWN';
  const supportResistance = options?.supportResistance || [];

  // Base percentages for DCA levels, adjusted by volatility
  let basePercentages = [0.03, 0.07, 0.12, 0.18, 0.25];
  const multiplier = positionType === 'LONG' ? -1 : 1; // Negative for long (price drops), positive for short (price rises)

  // === Advanced DCA Optimization ===
  if (useOptimization) {
    // 1. Adjust based on volatility with more precision
    const volatilityMultiplier = 1 + (volatility * 20); // Higher volatility = wider DCA levels

    // 2. Adjust based on market condition with more granularity
    if (marketCondition === 'VOLATILE') {
      // In volatile markets, make DCA levels wider and more concentrated
      basePercentages = basePercentages.map(p => p * 1.5);
    } else if (marketCondition === 'BULLISH' && positionType === 'LONG') {
      // In bullish markets for long positions, use tighter DCA intervals
      basePercentages = basePercentages.map(p => p * 0.8);
    } else if (marketCondition === 'BEARISH' && positionType === 'SHORT') {
      // In bearish markets for short positions, use tighter DCA intervals
      basePercentages = basePercentages.map(p => p * 0.8);
    }

    // 3. Adjust for price action patterns
    if (priceAction === 'RANGING') {
      // In ranging markets, use tighter and more frequent DCA levels
      basePercentages = basePercentages.map(p => p * 0.7);
    } else if (priceAction === 'TRENDING') {
      // In strongly trending markets, use wider DCA levels
      basePercentages = basePercentages.map(p => p * 1.3);
    }

    // 4. Integrate support/resistance levels if available
    if (supportResistance.length > 0 && useAdaptivePositioning) {
      // Sort support/resistance levels
      const relevantLevels = [...supportResistance].sort((a, b) => positionType === 'LONG' ? a - b : b - a);

      // Find nearest levels based on position type
      const nearestLevels = relevantLevels
        .filter(level => {
          const priceDiff = ((level - entryPrice) / entryPrice);
          return (positionType === 'LONG' && priceDiff < 0) || 
                 (positionType === 'SHORT' && priceDiff > 0);
        })
        .slice(0, Math.min(levels, relevantLevels.length));

      // If we found good support/resistance levels, use them instead of percentage-based levels
      if (nearestLevels.length > 0) {
        // Map the levels to DCA entry points, but keep at least one standard level
        basePercentages = basePercentages.slice(0, Math.max(1, levels - nearestLevels.length));

        // Add the support/resistance based entries
        for (let i = 0; i < nearestLevels.length && result.length < levels; i++) {
          const level = nearestLevels[i];
          const percentFromEntry = Math.abs((level - entryPrice) / entryPrice);

          // Only use this level if it's within reasonable range (not too close, not too far)
          if (percentFromEntry > 0.01 && percentFromEntry < 0.30) {
            // Calculate adaptive amount based on level distance
            const amountMultiplier = useVariableAmount ? 
              1 + (percentFromEntry * 5) : // Higher amount for further levels
              1 + (result.length * 0.5);   // Standard increasing amount

            const dcaAmount = initialSize * amountMultiplier;

            result.push({
              level: result.length + 1,
              price: level,
              amount: dcaAmount,
              partialTakeProfit: level * (positionType === 'LONG' ? 1.03 : 0.97) // 3% take profit from the DCA entry
            });
          }
        }
      }
    }
  }

  // Complete the remaining DCA levels using standard percentage-based approach
  const remainingLevels = levels - result.length;
  if (remainingLevels > 0) {
    // Adjust DCA spacing based on volatility
    const volatilityMultiplier = 1 + (volatility * (useOptimization ? 25 : 15)); 

    // Adjust DCA sizing based on market condition
    let amountAdjustment = 1.0;
    if (marketCondition === 'BULLISH' && positionType === 'LONG') {
      amountAdjustment = useOptimization ? 1.3 : 1.2;
    } else if (marketCondition === 'BEARISH' && positionType === 'SHORT') {
      amountAdjustment = useOptimization ? 1.3 : 1.2;
    } else if (marketCondition === 'VOLATILE') {
      amountAdjustment = useOptimization ? 0.7 : 0.8;
    }

    for (let i = 0; i < Math.min(remainingLevels, basePercentages.length); i++) {
      // Adjust percentage based on volatility
      const adjustedPercentage = basePercentages[i] * volatilityMultiplier;

      // Calculate price for this DCA level
      const dcaPrice = entryPrice * (1 + multiplier * adjustedPercentage);

      // Calculate amount for this level with variable amount strategy if enabled
      let amountMultiplier;
      if (useVariableAmount) {
        // More sophisticated variable amount calculation
        // Increase amount more for larger drops, less for smaller drops
        const levelDepth = adjustedPercentage / basePercentages[0];
        amountMultiplier = Math.pow(1.5, levelDepth) * amountAdjustment;
      } else {
        // Standard increasing amount
        amountMultiplier = (1 + (i * 0.5)) * amountAdjustment;
      }

      const dcaAmount = initialSize * amountMultiplier;

      // For reinforcement strategy (opposite of traditional DCA)
      const reinforcementThreshold = useReinforcement ? 
        dcaPrice * (positionType === 'LONG' ? 1.02 : 0.98) : undefined;

      // Add partial take profit level if optimization is enabled
      const partialTakeProfit = useOptimization ? 
        dcaPrice * (positionType === 'LONG' ? 1.03 : 0.97) : undefined;

      result.push({
        level: result.length + 1,
        price: dcaPrice,
        amount: dcaAmount,
        partialTakeProfit,
        reinforcementThreshold
      });
    }
  }

  // Sort the result properly based on position type
  result.sort((a, b) => positionType === 'LONG' ? 
    b.price - a.price : // For long positions, highest price first (so DCA triggers as price falls)
    a.price - b.price   // For short positions, lowest price first (so DCA triggers as price rises)
  );

  // Update the level numbers after sorting
  for (let i = 0; i < result.length; i++) {
    result[i].level = i + 1;
  }

  return result;
}

// Generate ChatGPT prompt for market analysis
export function generateChatGptPrompt(
  symbol: string,
  timeframe: string,
  analysis: any,
  tradeHistory: any[],
  performanceMetrics: any
): string {
  // Extract candlestick patterns if available
  let candlestickPatternsText = '';
  if (analysis.candlestickPatterns && analysis.candlestickPatterns.length > 0) {
    candlestickPatternsText = `\n- Candlestick Patterns: ${analysis.candlestickPatterns
      .map((p: any) => `${p.pattern} (${p.significance}% significance, ${p.trend} trend)`)
      .join(', ')}`;
  }

  return `
Please analyze the following cryptocurrency trading data and provide strategic recommendations:

MARKET ANALYSIS FOR ${symbol} (${timeframe} timeframe):
- Current trend: ${analysis.trend}
- RSI: ${analysis.rsi.toFixed(2)}
- EMA status: ${analysis.emaStatus}
- Market structure: ${analysis.marketStructure.join(', ')}
- Volume profile: Key levels at ${analysis.volumeSupport.map((v: number) => v.toFixed(2)).join(', ')}
- Divergences: ${analysis.divergence.bullish ? 'Bullish' : ''}${analysis.divergence.bearish ? 'Bearish' : ''} (Strength: ${analysis.divergence.strength}%)${candlestickPatternsText}

PERFORMANCE METRICS:
- Win rate: ${performanceMetrics.winRate.toFixed(2)}%
- Profit factor: ${performanceMetrics.profitFactor.toFixed(2)}
- Max drawdown: ${performanceMetrics.maxDrawdownPercent.toFixed(2)}%
- Net profit: ${performanceMetrics.netProfitPercent.toFixed(2)}%

RECENT TRADES (LAST 5):
${tradeHistory.slice(-5).map((trade, i) => 
  `${i+1}. ${trade.type} ${trade.profitPercentage >= 0 ? '✓' : '✗'} Entry: ${trade.entryPrice} Exit: ${trade.exitPrice} PnL: ${trade.profitPercentage.toFixed(2)}%`).join('\n')}

Please provide:
1. Analysis of the current market conditions
2. Suggestions for improving the trading strategy
3. Risk management advice based on the historical performance
4. Specific recommendations for the next trade (entry, stop loss, and take profit)
5. Optimal leverage suggestion based on the current volatility
`;
}