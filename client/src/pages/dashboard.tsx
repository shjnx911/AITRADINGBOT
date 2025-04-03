import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, BarChart, Trophy, RefreshCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/stats-card";
import AccountPerformanceChart from "@/components/dashboard/account-performance-chart";
import ProfitDistributionChart from "@/components/dashboard/profit-distribution-chart";
import ActivePositionsTable from "@/components/dashboard/active-positions-table";
import RecentTrades from "@/components/dashboard/recent-trades";
import AiInsights from "@/components/dashboard/ai-insights";
import NewTradeModal from "@/components/trading/new-trade-modal";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/hooks/use-language";

export default function Dashboard() {
  const [selectedExchange, setSelectedExchange] = useState("Binance");
  const [showNewTradeModal, setShowNewTradeModal] = useState(false);
  const { t } = useTranslation();

  // Get balance history for the latest balance
  const { data: balanceHistory } = useQuery<any[]>({
    queryKey: ['/api/balance-history/1'],
  });

  // Get open trades to count them
  const { data: openTrades } = useQuery<any[]>({
    queryKey: ['/api/trades/1/open'],
  });

  // Get all trades to calculate today's trades
  const { data: allTrades } = useQuery<any[]>({
    queryKey: ['/api/trades/1'],
  });

  // Calculate statistics
  const currentBalance = balanceHistory && balanceHistory.length > 0 
    ? balanceHistory[balanceHistory.length - 1].balance
    : 0;

  const previousBalance = balanceHistory && balanceHistory.length > 1
    ? balanceHistory[balanceHistory.length - 2].balance
    : currentBalance;

  const balanceChangePercent = previousBalance === 0
    ? 0
    : ((currentBalance - previousBalance) / previousBalance) * 100;

  // Get today's profit/loss
  const today = new Date().toISOString().split('T')[0];
  const todaysTrades = allTrades?.filter(trade => 
    trade.status === 'CLOSED' && 
    trade.exitTime?.startsWith(today)
  ) || [];

  const todaysPnL = todaysTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const todaysPnLPercent = (todaysPnL / currentBalance) * 100;

  // Calculate win rate
  const closedTrades = allTrades?.filter(trade => trade.status === 'CLOSED') || [];
  const winningTrades = closedTrades.filter(trade => trade.pnl > 0) || [];
  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100
    : 0;

  // Last week win rate for comparison
  const lastWeekWinRate = winRate - 3.2; // Simulated difference for demonstration

  // Handle refresh data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/balance-history/1'] });
    queryClient.invalidateQueries({ queryKey: ['/api/trades/1/open'] });
    queryClient.invalidateQueries({ queryKey: ['/api/trades/1'] });
    queryClient.invalidateQueries({ queryKey: ['/api/ai-signals'] });
  };

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-400">Monitor your trading performance</p>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0 space-x-3">
          <div className="relative">
            <select 
              className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
            >
              <option>Binance</option>
              <option>Bybit</option>
              <option>FTX</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
          
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-slate-800 hover:bg-slate-700 text-white"
            onClick={handleRefresh}
          >
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          
          {/* New Trade button hidden as requested */}
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard
          title={t('accountBalance')}
          value={`$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={{
            value: `${balanceChangePercent > 0 ? '+' : ''}${balanceChangePercent.toFixed(1)}%`,
            isPositive: balanceChangePercent >= 0
          }}
          subtitle="Last 7 days"
          icon={<Wallet className="h-5 w-5" />}
          iconBgClass="bg-blue-500/10 text-blue-500"
        />
        
        <StatsCard
          title="Today's Profit/Loss"
          value={`${todaysPnL > 0 ? '+' : ''}$${todaysPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={{
            value: `${todaysPnLPercent > 0 ? '+' : ''}${todaysPnLPercent.toFixed(1)}%`,
            isPositive: todaysPnLPercent >= 0
          }}
          subtitle="of account balance"
          icon={<BarChart className="h-5 w-5" />}
          iconBgClass={`${todaysPnL >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
        />
        
        <StatsCard
          title={t('winRate')}
          value={`${winRate.toFixed(1)}%`}
          change={{
            value: `${winRate >= lastWeekWinRate ? '+' : ''}${(winRate - lastWeekWinRate).toFixed(1)}%`,
            isPositive: winRate >= lastWeekWinRate
          }}
          subtitle="vs last week"
          icon={<Trophy className="h-5 w-5" />}
          iconBgClass="bg-indigo-500/10 text-indigo-500"
          rightContent={
            <span className="text-xs text-slate-400">
              {winningTrades.length}/{closedTrades.length} trades won
            </span>
          }
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <AccountPerformanceChart />
        <ProfitDistributionChart />
      </div>
      
      <ActivePositionsTable />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTrades />
        <AiInsights />
      </div>

      <NewTradeModal 
        isOpen={showNewTradeModal} 
        onClose={() => setShowNewTradeModal(false)} 
      />
    </>
  );
}
