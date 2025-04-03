import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { Link } from "wouter";

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
}

export default function RecentTrades() {
  // Fetch closed trades
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades/1'],
  });
  
  // Get only closed trades, sorted by exit time (most recent first)
  const closedTrades = trades
    ? trades
        .filter(trade => trade.status === "CLOSED" && trade.exitTime)
        .sort((a, b) => {
          if (!a.exitTime || !b.exitTime) return 0;
          return new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime();
        })
        .slice(0, 3) // Get only 3 most recent
    : [];
  
  // Format time to display in a readable format
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Calculate amount in USD
  const getAmount = (trade: Trade) => {
    return (trade.amount * trade.entryPrice).toFixed(2);
  };
  
  return (
    <Card className="bg-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-slate-200 font-semibold">Recent Trades</CardTitle>
        <Link href="/history">
          <Button variant="link" className="text-sm text-blue-500 hover:text-blue-400 p-0">
            View history
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full bg-slate-700" />
            <Skeleton className="h-16 w-full bg-slate-700" />
            <Skeleton className="h-16 w-full bg-slate-700" />
          </div>
        ) : closedTrades.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No recent trades found
          </div>
        ) : (
          <div className="space-y-3">
            {closedTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mr-3">
                    <BarChart3 className="text-blue-500 h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {trade.symbol}{" "}
                      <span
                        className={
                          trade.type === "LONG" ? "text-green-500" : "text-red-500"
                        }
                      >
                        {trade.type}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {trade.exitTime
                        ? `Closed at ${formatTime(trade.exitTime)}`
                        : "Active"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono ${
                      (trade.pnl || 0) > 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {(trade.pnl || 0) > 0 ? "+" : ""}$
                    {Math.abs(trade.pnl || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">
                    from ${getAmount(trade)} ({(trade.pnlPercentage || 0).toFixed(1)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
