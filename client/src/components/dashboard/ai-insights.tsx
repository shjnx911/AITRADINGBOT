import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu } from "lucide-react";

interface AiSignal {
  id: number;
  symbol: string;
  timeframe: string;
  signalType: string;
  confidence: number;
  indicators: {
    rsi: number;
    emaStatus: string;
    marketStructure: string[];
    volumeProfile: string;
  };
  priceAtSignal: number;
  timestamp: string;
  notes: string;
}

export default function AiInsights() {
  // Fetch latest AI signals
  const { data: signals, isLoading } = useQuery<AiSignal[]>({
    queryKey: ['/api/ai-signals'],
  });
  
  // Get most recent signal
  const latestSignal = signals && signals.length > 0 ? signals[0] : null;
  
  // RSI visualization value
  const [rsiValue, setRsiValue] = useState(50);
  
  // Update RSI value with animation
  useEffect(() => {
    if (latestSignal) {
      const targetRsi = latestSignal.indicators.rsi;
      const duration = 1000; // Animation duration in ms
      const frameRate = 60; // Frames per second
      const frames = duration / (1000 / frameRate);
      const increment = (targetRsi - rsiValue) / frames;
      
      let frame = 0;
      const interval = setInterval(() => {
        frame++;
        if (frame <= frames) {
          setRsiValue(prev => prev + increment);
        } else {
          clearInterval(interval);
          setRsiValue(targetRsi); // Ensure exact final value
        }
      }, 1000 / frameRate);
      
      return () => clearInterval(interval);
    }
  }, [latestSignal]);
  
  return (
    <Card className="bg-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-slate-200 font-semibold">AI Trading Insights</CardTitle>
        <span className="px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-400">LIVE</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full bg-slate-700" />
            <Skeleton className="h-16 w-full bg-slate-700" />
            <Skeleton className="h-16 w-full bg-slate-700" />
          </div>
        ) : !latestSignal ? (
          <div className="py-8 text-center text-slate-400">
            No AI insights available
          </div>
        ) : (
          <>
            <div className="flex items-center p-3 bg-blue-900/30 border border-blue-800 rounded-lg mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center mr-3">
                <Cpu className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">AI Recommendation</p>
                <p className="text-sm text-blue-400">{latestSignal.notes}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">RSI Analysis</p>
                  <span className="text-xs text-slate-400">{latestSignal.timeframe} Timeframe</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  {rsiValue < 30
                    ? "RSI showing oversold condition, potential bounce incoming"
                    : rsiValue > 70
                    ? "RSI showing overbought condition, potential pullback incoming"
                    : "RSI in neutral territory"}
                </p>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${rsiValue}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Oversold</span>
                  <span>Neutral</span>
                  <span>Overbought</span>
                </div>
              </div>
              
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">Market Structure</p>
                  <span className="text-xs text-slate-400">{latestSignal.timeframe} Timeframe</span>
                </div>
                <div className="flex items-center space-x-2 text-xs mb-1 flex-wrap gap-2">
                  {latestSignal.indicators.marketStructure.map((structure, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 rounded-full ${
                        structure.includes("Higher")
                          ? "bg-green-900/50 text-green-500"
                          : structure.includes("Lower")
                          ? "bg-red-900/50 text-red-500"
                          : structure.includes("BOS")
                          ? "bg-blue-900/50 text-blue-500"
                          : structure.includes("SMC")
                          ? "bg-indigo-900/50 text-indigo-500"
                          : "bg-yellow-900/50 text-yellow-500"
                      }`}
                    >
                      {structure}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {latestSignal.indicators.marketStructure.includes("Higher High & Higher Low")
                    ? "Market structure showing higher highs and higher lows, bullish trend"
                    : latestSignal.indicators.marketStructure.includes("Lower High & Lower Low")
                    ? "Market structure showing lower highs and lower lows, bearish trend"
                    : latestSignal.indicators.marketStructure.includes("BOS Formation")
                    ? "Break of structure detected, potential trend reversal"
                    : "Market structure is consolidating"}
                </p>
              </div>
              
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">Volume Profile</p>
                  <span className="text-xs text-slate-400">{latestSignal.timeframe} Timeframe</span>
                </div>
                <p className="text-xs text-slate-400">{latestSignal.indicators.volumeProfile}</p>
                {/* Simple mock volume profile visualization */}
                <div className="h-10 bg-slate-700 rounded mt-2 flex items-end">
                  <div className="h-3 w-2 bg-slate-500 mx-px"></div>
                  <div className="h-5 w-2 bg-slate-500 mx-px"></div>
                  <div className="h-7 w-2 bg-slate-500 mx-px"></div>
                  <div className="h-8 w-2 bg-slate-500 mx-px"></div>
                  <div className="h-10 w-2 bg-blue-500 mx-px"></div>
                  <div className="h-6 w-2 bg-slate-500 mx-px"></div>
                  <div className="h-4 w-2 bg-slate-500 mx-px"></div>
                  <div className="h-2 w-2 bg-slate-500 mx-px"></div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
