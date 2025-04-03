import { CandleData } from './binanceClient';

// Định nghĩa các loại mẫu hình nến
export enum CandlestickPattern {
  BULLISH_ENGULFING = "BULLISH_ENGULFING",
  BEARISH_ENGULFING = "BEARISH_ENGULFING",
  HAMMER = "HAMMER",
  INVERTED_HAMMER = "INVERTED_HAMMER",
  MORNING_STAR = "MORNING_STAR",
  EVENING_STAR = "EVENING_STAR",
  DOJI = "DOJI",
  DARK_CLOUD_COVER = "DARK_CLOUD_COVER",
  PIERCING_LINE = "PIERCING_LINE",
  THREE_WHITE_SOLDIERS = "THREE_WHITE_SOLDIERS",
  THREE_BLACK_CROWS = "THREE_BLACK_CROWS",
  BULLISH_HARAMI = "BULLISH_HARAMI",
  BEARISH_HARAMI = "BEARISH_HARAMI",
  SHOOTING_STAR = "SHOOTING_STAR",
  HANGING_MAN = "HANGING_MAN",
  TWEEZER_TOP = "TWEEZER_TOP",
  TWEEZER_BOTTOM = "TWEEZER_BOTTOM",
  SPINNING_TOP = "SPINNING_TOP",
  INSIDE_BAR = "INSIDE_BAR"
}

// Định nghĩa trạng thái xu hướng
export enum Trend {
  BULLISH = "BULLISH",
  BEARISH = "BEARISH",
  NEUTRAL = "NEUTRAL"
}

export interface PatternResult {
  pattern: CandlestickPattern;
  significance: number; // 0-100
  trend: Trend;
  candles: number[]; // Vị trí các nến trong mẫu
  description: {
    en: string;
    vi: string;
  };
}

/**
 * Hàm kiểm tra nến có phải là Doji không
 */
function isDoji(candle: CandleData): boolean {
  const bodySize = Math.abs(candle.open - candle.close);
  const totalSize = candle.high - candle.low;
  
  // Thân nến rất nhỏ (< 5% của tổng độ dài nến)
  return totalSize > 0 && bodySize / totalSize < 0.05;
}

/**
 * Hàm kiểm tra mẫu hình nến Bullish Engulfing
 */
function isBullishEngulfing(current: CandleData, previous: CandleData): boolean {
  // Nến trước đó là nến giảm giá (đỏ)
  const isPreviousBearish = previous.close < previous.open;
  
  // Nến hiện tại là nến tăng giá (xanh)
  const isCurrentBullish = current.close > current.open;
  
  // Thân nến hiện tại bao trùm thân nến trước đó
  const isEngulfing = current.open < previous.close && current.close > previous.open;
  
  return isPreviousBearish && isCurrentBullish && isEngulfing;
}

/**
 * Hàm kiểm tra mẫu hình nến Bearish Engulfing
 */
function isBearishEngulfing(current: CandleData, previous: CandleData): boolean {
  // Nến trước đó là nến tăng giá (xanh)
  const isPreviousBullish = previous.close > previous.open;
  
  // Nến hiện tại là nến giảm giá (đỏ)
  const isCurrentBearish = current.close < current.open;
  
  // Thân nến hiện tại bao trùm thân nến trước đó
  const isEngulfing = current.open > previous.close && current.close < previous.open;
  
  return isPreviousBullish && isCurrentBearish && isEngulfing;
}

/**
 * Hàm kiểm tra mẫu hình nến Hammer
 */
function isHammer(candle: CandleData): boolean {
  const bodySize = Math.abs(candle.open - candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  
  // Bóng dưới ít nhất gấp 2 lần thân nến
  const hasLongLowerShadow = lowerShadow >= 2 * bodySize;
  
  // Bóng trên rất nhỏ hoặc không có
  const hasShortUpperShadow = upperShadow <= 0.1 * bodySize;
  
  return hasLongLowerShadow && hasShortUpperShadow;
}

/**
 * Hàm kiểm tra mẫu hình nến Inverted Hammer
 */
function isInvertedHammer(candle: CandleData): boolean {
  const bodySize = Math.abs(candle.open - candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  
  // Bóng trên ít nhất gấp 2 lần thân nến
  const hasLongUpperShadow = upperShadow >= 2 * bodySize;
  
  // Bóng dưới rất nhỏ hoặc không có
  const hasShortLowerShadow = lowerShadow <= 0.1 * bodySize;
  
  return hasLongUpperShadow && hasShortLowerShadow;
}

/**
 * Hàm kiểm tra mẫu hình nến Morning Star
 */
function isMorningStar(candles: CandleData[], index: number): boolean {
  if (index < 2) return false;
  
  const first = candles[index - 2];
  const middle = candles[index - 1];
  const last = candles[index];
  
  const isFirstBearish = first.close < first.open;
  const isLastBullish = last.close > last.open;
  
  // Nến giữa có thân nhỏ
  const middleBodySize = Math.abs(middle.open - middle.close);
  const firstBodySize = Math.abs(first.open - first.close);
  const isMiddleSmall = middleBodySize < 0.3 * firstBodySize;
  
  // Nến cuối mở cửa trong vùng thân nến giữa và đóng cửa gần đỉnh nến đầu
  const isLastClosingHigh = last.close > (first.open + first.close) / 2;
  
  return isFirstBearish && isMiddleSmall && isLastBullish && isLastClosingHigh;
}

/**
 * Hàm kiểm tra mẫu hình nến Evening Star
 */
function isEveningStar(candles: CandleData[], index: number): boolean {
  if (index < 2) return false;
  
  const first = candles[index - 2];
  const middle = candles[index - 1];
  const last = candles[index];
  
  const isFirstBullish = first.close > first.open;
  const isLastBearish = last.close < last.open;
  
  // Nến giữa có thân nhỏ
  const middleBodySize = Math.abs(middle.open - middle.close);
  const firstBodySize = Math.abs(first.open - first.close);
  const isMiddleSmall = middleBodySize < 0.3 * firstBodySize;
  
  // Nến cuối mở cửa trong vùng thân nến giữa và đóng cửa gần đáy nến đầu
  const isLastClosingLow = last.close < (first.open + first.close) / 2;
  
  return isFirstBullish && isMiddleSmall && isLastBearish && isLastClosingLow;
}

/**
 * Hàm kiểm tra mẫu hình nến Three White Soldiers
 */
function isThreeWhiteSoldiers(candles: CandleData[], index: number): boolean {
  if (index < 2) return false;
  
  const first = candles[index - 2];
  const second = candles[index - 1];
  const third = candles[index];
  
  // Cả ba nến đều là nến tăng (xanh)
  const allBullish = first.close > first.open && 
                      second.close > second.open && 
                      third.close > third.open;
  
  // Mỗi nến mở cửa trong phạm vi thân nến trước đó và đóng cửa cao hơn
  const properOpening = second.open > first.open && second.open < first.close &&
                        third.open > second.open && third.open < second.close;
  
  // Mỗi nến đóng cửa cao hơn nến trước đó
  const higherClosing = second.close > first.close && third.close > second.close;
  
  // Bóng trên của mỗi nến tương đối nhỏ
  const smallUpperShadows = (first.high - first.close) < 0.2 * (first.close - first.open) &&
                            (second.high - second.close) < 0.2 * (second.close - second.open) &&
                            (third.high - third.close) < 0.2 * (third.close - third.open);
  
  return allBullish && properOpening && higherClosing && smallUpperShadows;
}

/**
 * Hàm kiểm tra mẫu hình nến Three Black Crows
 */
function isThreeBlackCrows(candles: CandleData[], index: number): boolean {
  if (index < 2) return false;
  
  const first = candles[index - 2];
  const second = candles[index - 1];
  const third = candles[index];
  
  // Cả ba nến đều là nến giảm (đỏ)
  const allBearish = first.close < first.open && 
                     second.close < second.open && 
                     third.close < third.open;
  
  // Mỗi nến mở cửa trong phạm vi thân nến trước đó và đóng cửa thấp hơn
  const properOpening = second.open < first.open && second.open > first.close &&
                        third.open < second.open && third.open > second.close;
  
  // Mỗi nến đóng cửa thấp hơn nến trước đó
  const lowerClosing = second.close < first.close && third.close < second.close;
  
  // Bóng dưới của mỗi nến tương đối nhỏ
  const smallLowerShadows = (first.close - first.low) < 0.2 * (first.open - first.close) &&
                            (second.close - second.low) < 0.2 * (second.open - second.close) &&
                            (third.close - third.low) < 0.2 * (third.open - third.close);
  
  return allBearish && properOpening && lowerClosing && smallLowerShadows;
}

/**
 * Hàm tính toán mức độ quan trọng của mẫu hình
 */
function calculateSignificance(
  pattern: CandlestickPattern, 
  candles: CandleData[], 
  index: number,
  prevTrend: Trend
): number {
  // Trọng số cơ bản của mẫu hình
  const baseSignificance: {[key in CandlestickPattern]: number} = {
    [CandlestickPattern.BULLISH_ENGULFING]: 75,
    [CandlestickPattern.BEARISH_ENGULFING]: 75,
    [CandlestickPattern.HAMMER]: 65,
    [CandlestickPattern.INVERTED_HAMMER]: 60,
    [CandlestickPattern.MORNING_STAR]: 85,
    [CandlestickPattern.EVENING_STAR]: 85,
    [CandlestickPattern.DOJI]: 40,
    [CandlestickPattern.DARK_CLOUD_COVER]: 65,
    [CandlestickPattern.PIERCING_LINE]: 65,
    [CandlestickPattern.THREE_WHITE_SOLDIERS]: 90,
    [CandlestickPattern.THREE_BLACK_CROWS]: 90,
    [CandlestickPattern.BULLISH_HARAMI]: 60,
    [CandlestickPattern.BEARISH_HARAMI]: 60,
    [CandlestickPattern.SHOOTING_STAR]: 70,
    [CandlestickPattern.HANGING_MAN]: 70,
    [CandlestickPattern.TWEEZER_TOP]: 65,
    [CandlestickPattern.TWEEZER_BOTTOM]: 65,
    [CandlestickPattern.SPINNING_TOP]: 35,
    [CandlestickPattern.INSIDE_BAR]: 55
  };

  let significance = baseSignificance[pattern] || 50;
  
  // Điều chỉnh mức độ quan trọng dựa trên xu hướng trước đó
  const patternTrend = getPatternTrend(pattern);
  
  // Nếu mẫu hình đảo ngược xu hướng, tăng mức độ quan trọng
  if (patternTrend !== Trend.NEUTRAL && patternTrend !== prevTrend) {
    significance += 10;
  }
  
  // Điều chỉnh dựa trên khối lượng giao dịch (volume)
  const currentVolume = candles[index].volume || 0;
  if (index > 0) {
    const prevVolume = candles[index - 1].volume || 0;
    if (currentVolume > prevVolume * 1.5) {
      significance += 10; // Khối lượng giao dịch tăng mạnh
    }
  }
  
  // Giới hạn trong phạm vi 0-100
  return Math.min(100, Math.max(0, significance));
}

/**
 * Hàm xác định xu hướng của mẫu hình
 */
function getPatternTrend(pattern: CandlestickPattern): Trend {
  switch (pattern) {
    case CandlestickPattern.BULLISH_ENGULFING:
    case CandlestickPattern.HAMMER:
    case CandlestickPattern.MORNING_STAR:
    case CandlestickPattern.PIERCING_LINE:
    case CandlestickPattern.THREE_WHITE_SOLDIERS:
    case CandlestickPattern.BULLISH_HARAMI:
    case CandlestickPattern.TWEEZER_BOTTOM:
      return Trend.BULLISH;
      
    case CandlestickPattern.BEARISH_ENGULFING:
    case CandlestickPattern.EVENING_STAR:
    case CandlestickPattern.DARK_CLOUD_COVER:
    case CandlestickPattern.THREE_BLACK_CROWS:
    case CandlestickPattern.BEARISH_HARAMI:
    case CandlestickPattern.SHOOTING_STAR:
    case CandlestickPattern.HANGING_MAN:
    case CandlestickPattern.TWEEZER_TOP:
      return Trend.BEARISH;
      
    case CandlestickPattern.DOJI:
    case CandlestickPattern.INVERTED_HAMMER:
    case CandlestickPattern.SPINNING_TOP:
    case CandlestickPattern.INSIDE_BAR:
      return Trend.NEUTRAL;
      
    default:
      return Trend.NEUTRAL;
  }
}

/**
 * Hàm lấy mô tả mẫu hình (song ngữ)
 */
function getPatternDescription(pattern: CandlestickPattern): {en: string, vi: string} {
  switch (pattern) {
    case CandlestickPattern.BULLISH_ENGULFING:
      return {
        en: "A bullish reversal pattern where a large green candle completely engulfs the previous red candle, signaling potential uptrend.",
        vi: "Mẫu hình đảo chiều tăng giá với nến xanh lớn bao trùm hoàn toàn nến đỏ trước đó, báo hiệu xu hướng tăng tiềm năng."
      };
    case CandlestickPattern.BEARISH_ENGULFING:
      return {
        en: "A bearish reversal pattern where a large red candle completely engulfs the previous green candle, signaling potential downtrend.",
        vi: "Mẫu hình đảo chiều giảm giá với nến đỏ lớn bao trùm hoàn toàn nến xanh trước đó, báo hiệu xu hướng giảm tiềm năng."
      };
    case CandlestickPattern.HAMMER:
      return {
        en: "A bullish reversal pattern with a small body and a long lower shadow, indicating potential support level and uptrend.",
        vi: "Mẫu hình đảo chiều tăng giá với thân nhỏ và bóng dưới dài, cho thấy vùng hỗ trợ tiềm năng và xu hướng tăng."
      };
    case CandlestickPattern.INVERTED_HAMMER:
      return {
        en: "A potential reversal pattern with a small body and a long upper shadow, may indicate bullish reversal after downtrend.",
        vi: "Mẫu hình đảo chiều tiềm năng với thân nhỏ và bóng trên dài, có thể báo hiệu đảo chiều tăng sau xu hướng giảm."
      };
    case CandlestickPattern.MORNING_STAR:
      return {
        en: "A strong bullish reversal pattern consisting of three candles: a large bearish, a small-bodied, and a large bullish candle.",
        vi: "Mẫu hình đảo chiều tăng mạnh gồm ba nến: một nến giảm lớn, một nến thân nhỏ và một nến tăng lớn."
      };
    case CandlestickPattern.EVENING_STAR:
      return {
        en: "A strong bearish reversal pattern consisting of three candles: a large bullish, a small-bodied, and a large bearish candle.",
        vi: "Mẫu hình đảo chiều giảm mạnh gồm ba nến: một nến tăng lớn, một nến thân nhỏ và một nến giảm lớn."
      };
    case CandlestickPattern.DOJI:
      return {
        en: "A neutral pattern with a very small or non-existent body, indicating market indecision and potential reversal.",
        vi: "Mẫu hình trung tính với thân rất nhỏ hoặc không có thân, chỉ ra sự lưỡng lự của thị trường và khả năng đảo chiều."
      };
    case CandlestickPattern.THREE_WHITE_SOLDIERS:
      return {
        en: "A strong bullish reversal pattern consisting of three consecutive bullish candles, each closing higher than the previous.",
        vi: "Mẫu hình đảo chiều tăng mạnh gồm ba nến tăng liên tiếp, mỗi nến đóng cửa cao hơn nến trước."
      };
    case CandlestickPattern.THREE_BLACK_CROWS:
      return {
        en: "A strong bearish reversal pattern consisting of three consecutive bearish candles, each closing lower than the previous.",
        vi: "Mẫu hình đảo chiều giảm mạnh gồm ba nến giảm liên tiếp, mỗi nến đóng cửa thấp hơn nến trước."
      };
    default:
      return {
        en: "Candlestick pattern indicating potential market movement.",
        vi: "Mẫu hình nến chỉ báo tiềm năng chuyển động thị trường."
      };
  }
}

/**
 * Hàm xác định xu hướng hiện tại dựa trên giá gần đây
 */
function determineCurrentTrend(candles: CandleData[], lookback: number = 10): Trend {
  if (candles.length < lookback) {
    return Trend.NEUTRAL;
  }
  
  const start = Math.max(0, candles.length - lookback);
  const startPrice = candles[start].close;
  const endPrice = candles[candles.length - 1].close;
  
  const priceChange = ((endPrice - startPrice) / startPrice) * 100;
  
  if (priceChange > 3) {
    return Trend.BULLISH;
  } else if (priceChange < -3) {
    return Trend.BEARISH;
  } else {
    return Trend.NEUTRAL;
  }
}

/**
 * Hàm phân tích các mẫu hình nến từ dữ liệu nến
 */
export function analyzeCandlestickPatterns(candles: CandleData[]): PatternResult[] {
  if (candles.length < 3) {
    return [];
  }
  
  const results: PatternResult[] = [];
  const prevTrend = determineCurrentTrend(candles);
  
  // Phân tích từng nến
  for (let i = 2; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    const beforePrevious = candles[i - 2];
    
    // Kiểm tra các mẫu hình
    
    // Doji
    if (isDoji(current)) {
      results.push({
        pattern: CandlestickPattern.DOJI,
        significance: calculateSignificance(CandlestickPattern.DOJI, candles, i, prevTrend),
        trend: Trend.NEUTRAL,
        candles: [i],
        description: getPatternDescription(CandlestickPattern.DOJI)
      });
    }
    
    // Bullish Engulfing
    if (isBullishEngulfing(current, previous)) {
      results.push({
        pattern: CandlestickPattern.BULLISH_ENGULFING,
        significance: calculateSignificance(CandlestickPattern.BULLISH_ENGULFING, candles, i, prevTrend),
        trend: Trend.BULLISH,
        candles: [i-1, i],
        description: getPatternDescription(CandlestickPattern.BULLISH_ENGULFING)
      });
    }
    
    // Bearish Engulfing
    if (isBearishEngulfing(current, previous)) {
      results.push({
        pattern: CandlestickPattern.BEARISH_ENGULFING,
        significance: calculateSignificance(CandlestickPattern.BEARISH_ENGULFING, candles, i, prevTrend),
        trend: Trend.BEARISH,
        candles: [i-1, i],
        description: getPatternDescription(CandlestickPattern.BEARISH_ENGULFING)
      });
    }
    
    // Hammer
    if (isHammer(current)) {
      results.push({
        pattern: CandlestickPattern.HAMMER,
        significance: calculateSignificance(CandlestickPattern.HAMMER, candles, i, prevTrend),
        trend: Trend.BULLISH,
        candles: [i],
        description: getPatternDescription(CandlestickPattern.HAMMER)
      });
    }
    
    // Inverted Hammer
    if (isInvertedHammer(current)) {
      results.push({
        pattern: CandlestickPattern.INVERTED_HAMMER,
        significance: calculateSignificance(CandlestickPattern.INVERTED_HAMMER, candles, i, prevTrend),
        trend: Trend.NEUTRAL,
        candles: [i],
        description: getPatternDescription(CandlestickPattern.INVERTED_HAMMER)
      });
    }
    
    // Morning Star
    if (isMorningStar(candles, i)) {
      results.push({
        pattern: CandlestickPattern.MORNING_STAR,
        significance: calculateSignificance(CandlestickPattern.MORNING_STAR, candles, i, prevTrend),
        trend: Trend.BULLISH,
        candles: [i-2, i-1, i],
        description: getPatternDescription(CandlestickPattern.MORNING_STAR)
      });
    }
    
    // Evening Star
    if (isEveningStar(candles, i)) {
      results.push({
        pattern: CandlestickPattern.EVENING_STAR,
        significance: calculateSignificance(CandlestickPattern.EVENING_STAR, candles, i, prevTrend),
        trend: Trend.BEARISH,
        candles: [i-2, i-1, i],
        description: getPatternDescription(CandlestickPattern.EVENING_STAR)
      });
    }
    
    // Three White Soldiers
    if (i >= 2 && isThreeWhiteSoldiers(candles, i)) {
      results.push({
        pattern: CandlestickPattern.THREE_WHITE_SOLDIERS,
        significance: calculateSignificance(CandlestickPattern.THREE_WHITE_SOLDIERS, candles, i, prevTrend),
        trend: Trend.BULLISH,
        candles: [i-2, i-1, i],
        description: getPatternDescription(CandlestickPattern.THREE_WHITE_SOLDIERS)
      });
    }
    
    // Three Black Crows
    if (i >= 2 && isThreeBlackCrows(candles, i)) {
      results.push({
        pattern: CandlestickPattern.THREE_BLACK_CROWS,
        significance: calculateSignificance(CandlestickPattern.THREE_BLACK_CROWS, candles, i, prevTrend),
        trend: Trend.BEARISH,
        candles: [i-2, i-1, i],
        description: getPatternDescription(CandlestickPattern.THREE_BLACK_CROWS)
      });
    }
  }
  
  // Sắp xếp kết quả theo mức độ quan trọng giảm dần
  return results.sort((a, b) => b.significance - a.significance);
}

/**
 * Tích hợp kết quả phân tích mẫu hình vào quyết định giao dịch
 */
export function incorporateCandlestickAnalysis(
  patterns: PatternResult[], 
  timeframe: string,
  currentConfidence: number
): { 
  adjustedConfidence: number, 
  supportingPatterns: PatternResult[] 
} {
  if (!patterns.length) {
    return { adjustedConfidence: currentConfidence, supportingPatterns: [] };
  }
  
  let confidenceAdjustment = 0;
  const supportingPatterns: PatternResult[] = [];
  
  // Trọng số timeframe
  const timeframeWeight: {[key: string]: number} = {
    '1h': 0.6,
    '4h': 0.85,
    '1d': 1.0,
    '1w': 1.2
  };
  
  const weight = timeframeWeight[timeframe] || 0.5;
  
  // Chỉ xem xét các mẫu hình có significance cao
  const significantPatterns = patterns
    .filter(p => p.significance > 60)
    .slice(0, 3); // Tối đa 3 mẫu hình quan trọng nhất
  
  significantPatterns.forEach(pattern => {
    supportingPatterns.push(pattern);
    
    // Tính điều chỉnh dựa trên mẫu hình và xu hướng
    const adjustmentBase = (pattern.significance - 60) / 100;
    
    // Nếu mẫu hình tăng và confidence hiện tại > 0, tăng confidence
    if (pattern.trend === Trend.BULLISH && currentConfidence > 0) {
      confidenceAdjustment += adjustmentBase * weight;
    } 
    // Nếu mẫu hình giảm và confidence hiện tại < 0, tăng độ tin cậy (theo hướng âm)
    else if (pattern.trend === Trend.BEARISH && currentConfidence < 0) {
      confidenceAdjustment -= adjustmentBase * weight;
    }
    // Nếu mẫu hình mâu thuẫn với confidence hiện tại, giảm độ tin cậy
    else if ((pattern.trend === Trend.BULLISH && currentConfidence < 0) || 
             (pattern.trend === Trend.BEARISH && currentConfidence > 0)) {
      confidenceAdjustment -= adjustmentBase * weight * 0.5;
    }
  });
  
  // Điều chỉnh giới hạn trong khoảng [-0.25, 0.25]
  confidenceAdjustment = Math.max(-0.25, Math.min(0.25, confidenceAdjustment));
  
  const adjustedConfidence = currentConfidence + confidenceAdjustment;
  
  return { 
    adjustedConfidence: Math.max(-1, Math.min(1, adjustedConfidence)), 
    supportingPatterns 
  };
}