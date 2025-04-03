import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { binanceClient } from "@/lib/binanceClient";
import { useToast } from "@/hooks/use-toast";

interface Trade {
  id: number;
  userId: number;
  symbol: string;
  type: string;
  entryPrice: number;
  exitPrice: number | null;
  amount: number;
  leverage: number;
  status: string;
  pnl: number | null;
  pnlPercentage: number | null;
  entryTime: string;
  exitTime: string | null;
  stopLoss: number | null;
  takeProfit: number | null;
}

export default function ActivePositionsTable() {
  const { toast } = useToast();
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  const { data: openTrades, isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades/1/open'],
  });

  // Periodically fetch current prices for open positions
  useQuery({
    queryKey: ['currentPrices', openTrades?.map(t => t.symbol).join(',')],
    queryFn: async () => {
      if (!openTrades || openTrades.length === 0) return {};
      
      const prices: Record<string, number> = {};
      for (const trade of openTrades) {
        const price = await binanceClient.getCurrentPrice(trade.symbol);
        if (price) {
          prices[trade.symbol] = price;
        }
      }
      
      setCurrentPrices(prices);
      return prices;
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    enabled: !!openTrades && openTrades.length > 0,
  });

  // Calculate unrealized PnL
  const calculateUnrealizedPnL = (trade: Trade) => {
    const currentPrice = currentPrices[trade.symbol];
    if (!currentPrice) return { pnl: 0, pnlPercentage: 0 };
    
    let pnl = 0;
    let pnlPercentage = 0;
    
    if (trade.type === 'LONG') {
      // For longs: (current_price - entry_price) * amount * leverage
      pnl = (currentPrice - trade.entryPrice) * trade.amount * trade.leverage;
      pnlPercentage = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100 * trade.leverage;
    } else {
      // For shorts: (entry_price - current_price) * amount * leverage
      pnl = (trade.entryPrice - currentPrice) * trade.amount * trade.leverage;
      pnlPercentage = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100 * trade.leverage;
    }
    
    return { pnl, pnlPercentage };
  };

  // Close position mutation
  const closeTradeMutation = useMutation({
    mutationFn: async (trade: Trade) => {
      const currentPrice = currentPrices[trade.symbol];
      if (!currentPrice) {
        throw new Error("Cannot close trade: current price is unavailable");
      }
      
      const { pnl, pnlPercentage } = calculateUnrealizedPnL(trade);
      
      return apiRequest("PUT", `/api/trades/${trade.id}/close`, {
        exitPrice: currentPrice,
        pnl: pnl,
        pnlPercentage: pnlPercentage
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/1/open'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance-history/1'] });
      toast({
        title: "Position closed",
        description: "Your position has been closed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error closing position",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle close trade
  const handleCloseTrade = (trade: Trade) => {
    closeTradeMutation.mutate(trade);
  };

  return (
    <Card className="bg-slate-800 mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-slate-200 font-semibold">Active Positions</CardTitle>
        <Button variant="link" className="text-sm text-blue-500 hover:text-blue-400 p-0">
          View all
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full bg-slate-700" />
          ) : !openTrades || openTrades.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No active positions found
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="text-xs text-slate-400 uppercase">
                  <th className="px-4 py-2 text-left">Pair</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Entry Price</th>
                  <th className="px-4 py-2 text-left">Current Price</th>
                  <th className="px-4 py-2 text-left">Leverage</th>
                  <th className="px-4 py-2 text-left">PNL</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {openTrades.map((trade) => {
                  const { pnl, pnlPercentage } = calculateUnrealizedPnL(trade);
                  const isProfit = pnl >= 0;
                  
                  return (
                    <tr key={trade.id} className="border-t border-slate-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center mr-2">
                            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z" />
                            </svg>
                          </div>
                          <span>{trade.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.type === 'LONG' 
                            ? 'bg-green-900/50 text-green-500' 
                            : 'bg-red-900/50 text-red-500'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">${trade.entryPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono">
                        {currentPrices[trade.symbol] 
                          ? `$${currentPrices[trade.symbol].toFixed(2)}` 
                          : "Loading..."}
                      </td>
                      <td className="px-4 py-3 font-mono">{trade.leverage}x</td>
                      <td className={`px-4 py-3 font-mono ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                        {`${isProfit ? '+' : ''}$${pnl.toFixed(2)} (${isProfit ? '+' : ''}${pnlPercentage.toFixed(2)}%)`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <Button variant="secondary" size="sm" className="px-2 py-1 h-7">
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="px-2 py-1 h-7 bg-red-900/50 hover:bg-red-700 text-red-400"
                            onClick={() => handleCloseTrade(trade)}
                            disabled={closeTradeMutation.isPending}
                          >
                            Close
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
