import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface Trade {
  id: number;
  userId: number;
  symbol: string;
  type: string;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  leverage: number;
  status: string;
  pnl: number;
  pnlPercentage: number;
  entryTime: string;
  exitTime: string;
}

// Group trades by day and calculate profit
function processTrades(trades: Trade[]) {
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  // Initialize with last 7 days
  const dailyProfits = last7Days.map(day => ({
    date: day,
    profit: 0,
    trades: 0
  }));
  
  // Group trades by day
  trades.forEach(trade => {
    if (trade.status === 'CLOSED' && trade.exitTime) {
      const tradeDate = new Date(trade.exitTime).toISOString().split('T')[0];
      const dayIndex = dailyProfits.findIndex(d => d.date === tradeDate);
      
      if (dayIndex !== -1) {
        dailyProfits[dayIndex].profit += trade.pnl || 0;
        dailyProfits[dayIndex].trades += 1;
      }
    }
  });
  
  // Format for display
  return dailyProfits.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    profit: Number(day.profit.toFixed(2)),
    trades: day.trades
  }));
}

export default function ProfitDistributionChart() {
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades/1'],
  });
  
  const data = trades ? processTrades(trades) : [];
  
  return (
    <Card className="bg-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-slate-200 font-semibold">Daily Profit Distribution</CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full bg-slate-700" />
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            No profit data available for the past 7 days
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    borderColor: '#374151',
                    color: '#F9FAFB' 
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit/Loss']}
                  labelFormatter={(label) => `Day: ${label}`}
                />
                <Bar 
                  dataKey="profit" 
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
