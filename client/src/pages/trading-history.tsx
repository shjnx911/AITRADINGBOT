import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, RefreshCcw, ArrowUpDown, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";

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
  notes: string | null;
  aiSignals: any | null;
  indicators: any | null;
}

export default function TradingHistory() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof Trade>("entryTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades/1'],
  });
  
  // Filter and sort trades
  const filteredTrades = trades
    ? trades
        .filter(
          (trade) =>
            (filter === "all" ||
              (filter === "open" && trade.status === "OPEN") ||
              (filter === "closed" && trade.status === "CLOSED")) &&
            (search === "" ||
              trade.symbol.toLowerCase().includes(search.toLowerCase()) ||
              trade.notes?.toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          // Handle comparison for different types
          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;
          
          if (typeof aValue === "number" && typeof bValue === "number") {
            return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
          }
          
          if (typeof aValue === "string" && typeof bValue === "string") {
            return sortDirection === "asc"
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }
          
          return 0;
        })
    : [];
  
  // Toggle sort direction when clicking the same field
  const handleSort = (field: keyof Trade) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  // Refresh data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/trades/1'] });
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Trading History</h1>
          <p className="text-slate-400">View and analyze your past trades</p>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0 space-x-3">
          <Button
            variant="outline"
            size="sm"
            className={`bg-slate-800 border-slate-700 hover:bg-slate-700 text-white ${
              filter === "all" ? "bg-slate-700" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            All Trades
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`bg-slate-800 border-slate-700 hover:bg-slate-700 text-white ${
              filter === "open" ? "bg-slate-700" : ""
            }`}
            onClick={() => setFilter("open")}
          >
            Open Positions
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`bg-slate-800 border-slate-700 hover:bg-slate-700 text-white ${
              filter === "closed" ? "bg-slate-700" : ""
            }`}
            onClick={() => setFilter("closed")}
          >
            Closed Trades
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            onClick={handleRefresh}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </header>
      
      <Card className="bg-slate-800 mb-6">
        <CardHeader className="flex flex-row items-center pb-2">
          <CardTitle className="text-slate-200 font-semibold">Trading Records</CardTitle>
          <div className="ml-auto flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Search trades..."
                className="pl-8 bg-slate-700 border-slate-600 text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <CalendarRange className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-700">
            <div className="overflow-x-auto">
              {isLoading ? (
                <Skeleton className="h-[400px] w-full bg-slate-700" />
              ) : filteredTrades.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  {search
                    ? "No trades match your search criteria"
                    : filter === "open"
                    ? "No open positions found"
                    : filter === "closed"
                    ? "No closed trades found"
                    : "No trading history found"}
                </div>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("symbol")}
                      >
                        <div className="flex items-center">
                          Symbol
                          {sortField === "symbol" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("type")}
                      >
                        <div className="flex items-center">
                          Type
                          {sortField === "type" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("entryPrice")}
                      >
                        <div className="flex items-center">
                          Entry Price
                          {sortField === "entryPrice" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("exitPrice")}
                      >
                        <div className="flex items-center">
                          Exit Price
                          {sortField === "exitPrice" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("leverage")}
                      >
                        <div className="flex items-center">
                          Leverage
                          {sortField === "leverage" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("pnl")}
                      >
                        <div className="flex items-center">
                          P/L
                          {sortField === "pnl" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("entryTime")}
                      >
                        <div className="flex items-center">
                          Entry Time
                          {sortField === "entryTime" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("exitTime")}
                      >
                        <div className="flex items-center">
                          Exit Time
                          {sortField === "exitTime" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status
                          {sortField === "status" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredTrades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center mr-2">
                              <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z" />
                              </svg>
                            </div>
                            {trade.symbol}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              trade.type === "LONG"
                                ? "bg-green-900/50 text-green-500"
                                : "bg-red-900/50 text-red-500"
                            }`}
                          >
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          ${trade.entryPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          {trade.exitPrice
                            ? `$${trade.exitPrice.toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          {trade.leverage}x
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          {trade.pnl ? (
                            <span
                              className={
                                trade.pnl > 0 ? "text-green-500" : "text-red-500"
                              }
                            >
                              {trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)}{" "}
                              ({trade.pnlPercentage ? (
                                <>
                                  {trade.pnlPercentage > 0 ? "+" : ""}
                                  {trade.pnlPercentage.toFixed(2)}%
                                </>
                              ) : (
                                "-"
                              )})
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                          {formatDate(trade.entryTime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                          {trade.exitTime ? formatDate(trade.exitTime) : "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              trade.status === "OPEN"
                                ? "bg-blue-900/50 text-blue-400"
                                : "bg-gray-900/50 text-gray-400"
                            }`}
                          >
                            {trade.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 font-semibold">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[150px] w-full bg-slate-700" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Trades:</span>
                    <span className="font-mono font-medium">
                      {trades?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Winning Trades:</span>
                    <span className="font-mono font-medium text-green-500">
                      {trades?.filter((t) => (t.pnl || 0) > 0).length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Losing Trades:</span>
                    <span className="font-mono font-medium text-red-500">
                      {trades?.filter((t) => (t.pnl || 0) < 0).length || 0}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Win Rate:</span>
                    <span className="font-mono font-medium">
                      {trades && trades.length > 0
                        ? (
                            (trades.filter((t) => (t.pnl || 0) > 0).length /
                              trades.filter((t) => t.status === "CLOSED")
                                .length) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg. Profit:</span>
                    <span className="font-mono font-medium text-green-500">
                      $
                      {trades && trades.filter((t) => (t.pnl || 0) > 0).length > 0
                        ? (
                            trades
                              .filter((t) => (t.pnl || 0) > 0)
                              .reduce((sum, t) => sum + (t.pnl || 0), 0) /
                            trades.filter((t) => (t.pnl || 0) > 0).length
                          ).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg. Loss:</span>
                    <span className="font-mono font-medium text-red-500">
                      $
                      {trades && trades.filter((t) => (t.pnl || 0) < 0).length > 0
                        ? (
                            trades
                              .filter((t) => (t.pnl || 0) < 0)
                              .reduce((sum, t) => sum + (t.pnl || 0), 0) /
                            trades.filter((t) => (t.pnl || 0) < 0).length
                          ).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 font-semibold">Trade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[150px] w-full bg-slate-700" />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Position Types</span>
                    <span className="text-sm text-slate-400">
                      {trades?.filter((t) => t.type === "LONG").length || 0} Long /{" "}
                      {trades?.filter((t) => t.type === "SHORT").length || 0} Short
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                    {trades && trades.length > 0 && (
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${
                            (trades.filter((t) => t.type === "LONG").length /
                              trades.length) *
                            100
                          }%`,
                        }}
                      ></div>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Leverage Used</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[10, 15, 20, 25, "25+"].map((lev, i) => (
                      <div key={i} className="text-center">
                        <div className="h-16 bg-slate-700 rounded-md relative overflow-hidden">
                          {trades && trades.length > 0 && (
                            <div
                              className="absolute bottom-0 w-full bg-blue-500"
                              style={{
                                height: `${
                                  ((i < 4
                                    ? trades.filter((t) => t.leverage === lev)
                                        .length
                                    : trades.filter((t) => t.leverage > 25)
                                        .length) /
                                    trades.length) *
                                  100
                                }%`,
                              }}
                            ></div>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {typeof lev === "number" ? `${lev}x` : lev}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
