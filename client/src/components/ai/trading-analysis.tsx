import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { binanceClient, CandleData, TimeFrame } from "@/lib/binanceClient";
import { calculateRSI, calculateEMA, analyzeMarketStructure } from "@/lib/technicalAnalysis";

interface AiSignal {
  id: number;
  symbol: string;
  timeframe: string;
  signalType: string;
  confidence: number;
  indicators: any;
  priceAtSignal: number;
  timestamp: string;
  notes: string;
}

export default function TradingAnalysis() {
  const [symbol, setSymbol] = useState<string>("BTC/USDT");
  const [timeframe, setTimeframe] = useState<TimeFrame>("4h");
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch latest AI signals
  const { data: signals } = useQuery<AiSignal[]>({
    queryKey: ['/api/ai-signals'],
  });
  
  // Fetch candle data
  useEffect(() => {
    const fetchCandles = async () => {
      setIsLoading(true);
      try {
        const candleData = await binanceClient.getCandles(symbol, timeframe, 100);
        setCandles(candleData);
      } catch (error) {
        console.error("Error fetching candles:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCandles();
  }, [symbol, timeframe]);
  
  // Get analysis results
  const getAnalysis = () => {
    if (candles.length === 0) return null;
    
    const closePrices = candles.map(c => c.close);
    const rsiValues = calculateRSI(candles, 14);
    const currentRsi = rsiValues[rsiValues.length - 1] || 50;
    
    const ema8 = calculateEMA(closePrices, 8);
    const ema21 = calculateEMA(closePrices, 21);
    const currentEma8 = ema8[ema8.length - 1];
    const currentEma21 = ema21[ema21.length - 1];
    
    let emaStatus = 'neutral';
    if (currentEma8 && currentEma21) {
      emaStatus = currentEma8 > currentEma21 ? 'bullish' : 'bearish';
    }
    
    const marketStructureAnalysis = analyzeMarketStructure(candles);
    
    const currentPrice = candles[candles.length - 1].close;
    
    return {
      rsi: currentRsi,
      emaStatus,
      marketStructure: marketStructureAnalysis,
      currentPrice,
    };
  };
  
  const analysis = getAnalysis();
  
  // Find matching signal
  const matchingSignal = signals?.find(
    signal => signal.symbol === symbol && signal.timeframe === timeframe
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <select 
            className="bg-slate-700 border border-slate-600 rounded text-sm p-1"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="SOL/USDT">SOL/USDT</option>
          </select>
          
          <select 
            className="bg-slate-700 border border-slate-600 rounded text-sm p-1"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeFrame)}
          >
            <option value="1h">1H</option>
            <option value="4h">4H</option>
            <option value="1d">1D</option>
          </select>
        </div>
        
        <Badge 
          variant="outline" 
          className="bg-blue-900/30 text-blue-400 border-blue-800"
        >
          {isLoading ? "Analyzing..." : "Live Analysis"}
        </Badge>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full bg-slate-700" />
          <Skeleton className="h-20 w-full bg-slate-700" />
          <Skeleton className="h-16 w-full bg-slate-700" />
        </div>
      ) : analysis ? (
        <div className="space-y-3">
          <Card className="p-3 bg-slate-700/50 border-slate-600">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Price</span>
              <span className="font-mono">${analysis.currentPrice.toFixed(2)}</span>
            </div>
          </Card>
          
          <Card className="p-3 bg-slate-700/50 border-slate-600">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Technical Indicators</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>RSI (14)</span>
                  <span className={`font-mono ${
                    analysis.rsi < 30 ? 'text-green-500' : 
                    analysis.rsi > 70 ? 'text-red-500' : 
                    'text-slate-300'
                  }`}>
                    {analysis.rsi.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full ${
                      analysis.rsi < 30 ? 'bg-green-500' : 
                      analysis.rsi > 70 ? 'bg-red-500' : 
                      'bg-blue-500'
                    }`}
                    style={{ width: `${analysis.rsi}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-xs">
                <span>EMA Trend</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    analysis.emaStatus === 'bullish' ? 'bg-green-900/30 text-green-500 border-green-800' : 
                    analysis.emaStatus === 'bearish' ? 'bg-red-900/30 text-red-500 border-red-800' : 
                    'bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {analysis.emaStatus.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex justify-between text-xs">
                <span>Market Structure</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    analysis.marketStructure.trend === 'bullish' ? 'bg-green-900/30 text-green-500 border-green-800' : 
                    analysis.marketStructure.trend === 'bearish' ? 'bg-red-900/30 text-red-500 border-red-800' : 
                    'bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {analysis.marketStructure.trend.toUpperCase()}
                </Badge>
              </div>
            </div>
          </Card>
          
          {matchingSignal && (
            <Card className="p-3 bg-blue-900/20 border-blue-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">AI Signal</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    matchingSignal.signalType === 'BUY' ? 'bg-green-900/30 text-green-500 border-green-800' : 
                    matchingSignal.signalType === 'SELL' ? 'bg-red-900/30 text-red-500 border-red-800' : 
                    'bg-yellow-900/30 text-yellow-500 border-yellow-800'
                  }`}
                >
                  {matchingSignal.signalType}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mb-2">{matchingSignal.notes}</p>
              <div className="flex justify-between text-xs">
                <span>Confidence Level</span>
                <span className="font-mono">{(matchingSignal.confidence * 100).toFixed(1)}%</span>
              </div>
            </Card>
          )}
          
          <div className="text-xs text-slate-400">
            Updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-slate-400">
          No analysis data available
        </div>
      )}
    </div>
  );
}
