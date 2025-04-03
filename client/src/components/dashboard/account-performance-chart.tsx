import { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface BalanceHistoryItem {
  id: number;
  userId: number;
  balance: number;
  timestamp: string;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
}

export default function AccountPerformanceChart() {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  
  const { data: balanceHistory, isLoading } = useQuery<BalanceHistoryItem[]>({
    queryKey: ['/api/balance-history/1'],
  });

  // Filter data based on selected time range
  const getFilteredData = () => {
    if (!balanceHistory) return [];
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (timeRange) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      default:
        // ALL - no filtering
        return balanceHistory.map(item => ({
          date: formatDate(item.timestamp),
          balance: item.balance,
          fullDate: new Date(item.timestamp).toISOString(),
        }));
    }
    
    return balanceHistory
      .filter(item => new Date(item.timestamp) >= cutoffDate)
      .map(item => ({
        date: formatDate(item.timestamp),
        balance: item.balance,
        fullDate: new Date(item.timestamp).toISOString(),
      }));
  };

  const filteredData = getFilteredData();
  
  // Calculate starting balance for the reference line
  const startingBalance = filteredData.length > 0 ? filteredData[0].balance : 0;
  
  return (
    <Card className="bg-slate-800 col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-slate-200 font-semibold">Account Performance</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant={timeRange === '1D' ? 'default' : 'secondary'}
            className={`px-2 py-1 h-8 text-xs ${timeRange === '1D' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => setTimeRange('1D')}
          >
            1D
          </Button>
          <Button 
            variant={timeRange === '1W' ? 'default' : 'secondary'}
            className={`px-2 py-1 h-8 text-xs ${timeRange === '1W' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => setTimeRange('1W')}
          >
            1W
          </Button>
          <Button 
            variant={timeRange === '1M' ? 'default' : 'secondary'}
            className={`px-2 py-1 h-8 text-xs ${timeRange === '1M' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => setTimeRange('1M')}
          >
            1M
          </Button>
          <Button 
            variant={timeRange === 'ALL' ? 'default' : 'secondary'}
            className={`px-2 py-1 h-8 text-xs ${timeRange === 'ALL' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => setTimeRange('ALL')}
          >
            ALL
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-[250px] w-full bg-slate-700" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            No data available for the selected time range
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  tickLine={{ stroke: '#4B5563' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  tickLine={{ stroke: '#4B5563' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    borderColor: '#374151',
                    color: '#F9FAFB' 
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <ReferenceLine y={startingBalance} stroke="#6B7280" strokeDasharray="3 3" />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 3, stroke: '#3B82F6', fill: '#1E3A8A' }}
                  activeDot={{ r: 5, stroke: '#3B82F6', fill: '#1E3A8A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
