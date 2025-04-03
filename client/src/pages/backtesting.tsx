import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, PlayCircle, FlaskConical, Copy, AlertCircle, CheckCircleIcon, Database, Save, RefreshCw, Brain, LineChart as LineChartIcon, Cpu, MessageSquare, SplitSquareVertical } from "lucide-react";
// We'll use alternative date picker components 
import { DayPicker } from "react-day-picker";
import { format, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { backtestStrategy } from "@/lib/aiTrading";
import { binanceClient, type TimeFrame, type BacktestPeriod, type CandleData } from "@/lib/binanceClient";
import TradingChart from "@/components/common/trading-chart";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  Area,
  AreaChart
} from "recharts";

// Zod schema for backtesting form
const backtestingSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  testPeriod: z.enum(['custom', '3m', '6m', '1y', '18m', '2y']).default('6m'),
  exchange: z.string().default('binance'),
  initialCapital: z.number().min(100, "Initial capital must be at least 100"),
  leverage: z.number().min(1).max(100),
  capitalPerTrade: z.number().min(1).max(100),
  stopLossPercent: z.number().min(0.5).max(50),
  takeProfitPercent: z.number().min(0.5).max(100),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  useDCA: z.boolean().default(false),
  dcaLevels: z.number().min(1).max(10).default(3),
  dcaTriggerPercentages: z.array(z.number()).default([5, 10, 15]),
  useAiTraining: z.boolean().default(false),
  saveResultsToDb: z.boolean().default(true),
  selectedIndicators: z.array(z.string()).default([
    'rsi', 'ema', 'volume', 'marketStructure'
  ]),
  selectedStrategies: z.array(z.enum([
    'SMC', 'HFT', 'AI_TREND', 'VWAP', 'BOLLINGER', 'DARVAS'
  ])).default(['SMC', 'VWAP']),
  maxGpuUsage: z.number().min(50).max(100).default(75),
  runInParallel: z.boolean().default(false),
  useRealData: z.boolean().default(false),
  integrateWithChatGPT: z.boolean().default(false),
});

type BacktestingFormValues = z.infer<typeof backtestingSchema>;

export default function Backtesting() {
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [candles, setCandles] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Available trading pairs
  const tradingPairs = [
    "BTC/USDT", 
    "ETH/USDT", 
    "SOL/USDT", 
    "BNB/USDT", 
    "ADA/USDT", 
    "XRP/USDT",
    "DOT/USDT",
    "DOGE/USDT",
    "AVAX/USDT",
    "LINK/USDT"
  ];
  
  // Available timeframes
  const timeframes = [
    { value: "15m", label: "15 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "2h", label: "2 Hours" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" },
    { value: "1w", label: "1 Week" }
  ];

  // Get default dates (last 30 days)
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  
  // Form setup
  const form = useForm<BacktestingFormValues>({
    resolver: zodResolver(backtestingSchema),
    defaultValues: {
      symbol: "BTC/USDT",
      timeframe: "1d",
      initialCapital: 10000,
      leverage: 10,
      capitalPerTrade: 5,
      stopLossPercent: 5,
      takeProfitPercent: 15,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      useDCA: true,
      dcaLevels: 3,
      selectedIndicators: ['RSI', 'EMA', 'MACD', 'VOLUME', 'DIVERGENCE', 'PATTERN'],
      selectedStrategies: ['SMC', 'HFT', 'AI_TREND', 'VWAP', 'BOLLINGER', 'DARVAS'],
    },
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Save backtest results to database
  const saveBacktestMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/backtest-results', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Backtest results saved",
        description: "Results have been saved to your account",
        variant: "default",
      });
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/backtest-results'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save results",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Run backtest
  const handleBacktest = async (values: BacktestingFormValues) => {
    setIsBacktesting(true);
    setBacktestResults(null);
    
    try {
      let candleData: CandleData[] = [];
      
      // Fetch historical data based on period selection
      if (values.testPeriod === 'custom' && values.startDate && values.endDate) {
        // Custom date range
        const startTime = values.startDate.getTime();
        const endTime = values.endDate.getTime();
        
        candleData = await binanceClient.getBacktestData(
          values.symbol,
          values.timeframe as TimeFrame,
          startTime,
          endTime,
          values.exchange
        );
      } else if (values.testPeriod !== 'custom') {
        // Predefined period
        toast({
          title: "Fetching historical data",
          description: `Downloading ${values.testPeriod} of ${values.symbol} data...`,
          variant: "default",
        });
        
        // Use the new BacktestPeriod based download
        candleData = await binanceClient.getBacktestDataByPeriod(
          values.symbol,
          values.timeframe as TimeFrame,
          values.testPeriod as BacktestPeriod,
          values.exchange
        );
      } else {
        // Fallback to last 30 days if neither is properly specified
        const endTime = Date.now();
        const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // 30 days
        
        candleData = await binanceClient.getBacktestData(
          values.symbol,
          values.timeframe as TimeFrame,
          startTime,
          endTime,
          values.exchange
        );
      }
      
      if (candleData.length === 0) {
        toast({
          title: "No data available",
          description: "Could not retrieve historical data for the selected period",
          variant: "destructive",
        });
        setIsBacktesting(false);
        return;
      }
      
      toast({
        title: "Data loaded successfully",
        description: `Loaded ${candleData.length} candles for analysis`,
        variant: "default",
      });
      
      setCandles(candleData);
      
      // Run backtest with the fetched data
      const results = backtestStrategy(
        candleData,
        values.initialCapital,
        values.leverage,
        values.capitalPerTrade,
        {
          useMultiTimeframe: true,
          minConfidence: 0.6,
          tradesPerDay: 5,
          stopLossAtr: 1.5
        },
        {
          useDCA: values.useDCA,
          dcaLevels: values.dcaLevels,
          dcaTriggerPercentages: values.dcaTriggerPercentages,
          stopLossPercent: values.stopLossPercent,
          takeProfitPercent: values.takeProfitPercent,
          selectedIndicators: values.selectedIndicators,
          selectedStrategies: values.selectedStrategies
        }
      );
      
      setBacktestResults(results);
      
      // Save results to database if option is enabled
      if (values.saveResultsToDb) {
        saveBacktestMutation.mutate({
          userId: 1, // Use actual user ID from auth
          symbol: values.symbol,
          timeframe: values.timeframe,
          exchange: values.exchange,
          initialCapital: values.initialCapital,
          finalCapital: results.finalBalance,
          totalTrades: results.trades.length,
          winRate: results.winRate,
          profitFactor: results.profitFactor,
          netProfit: results.netProfit,
          netProfitPercent: results.netProfitPercent,
          maxDrawdown: results.maxDrawdown,
          maxDrawdownPercent: results.maxDrawdownPercent,
          startTime: candleData[0].time,
          endTime: candleData[candleData.length - 1].time,
          config: {
            leverage: values.leverage,
            capitalPerTrade: values.capitalPerTrade,
            stopLossPercent: values.stopLossPercent,
            takeProfitPercent: values.takeProfitPercent,
            useDCA: values.useDCA,
            dcaLevels: values.dcaLevels,
            dcaTriggerPercentages: values.dcaTriggerPercentages,
            selectedStrategies: values.selectedStrategies,
            runInParallel: values.runInParallel,
            useRealData: values.useRealData,
            integrateWithChatGPT: values.integrateWithChatGPT,
            maxGpuUsage: values.maxGpuUsage
          },
          trades: results.trades.map((t: any) => ({
            entryTime: t.entryTime,
            exitTime: t.exitTime,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            type: t.type,
            profit: t.profit,
            profitPercent: t.profitPercentage
          }))
        });
      }
      
      // Scroll to results
      setTimeout(() => {
        chartRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Backtest error:", error);
      toast({
        title: "Backtest failed",
        description: "There was an error running the backtest",
        variant: "destructive",
      });
    } finally {
      setIsBacktesting(false);
    }
  };
  
  // Format trades for chart display
  const formatTradesForChart = (trades: any[]) => {
    if (!trades || trades.length === 0) return [];
    
    return trades.map((trade, index) => ({
      tradeNumber: index + 1,
      profit: trade.profit,
      type: trade.type,
      profitPercentage: trade.profitPercentage,
      color: trade.profit >= 0 ? "#10B981" : "#EF4444",
    }));
  };
  
  // Format balance history for chart display
  const formatBalanceHistory = (trades: any[], initialCapital: number) => {
    if (!trades || trades.length === 0) return [];
    
    let balance = initialCapital;
    const history = [{ trade: 0, balance, timestamp: 0 }];
    
    trades.forEach((trade, index) => {
      balance += trade.profit;
      history.push({
        trade: index + 1,
        balance,
        timestamp: trade.timestamp,
      });
    });
    
    return history;
  };
  
  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Backtesting</h1>
          <p className="text-slate-400">Test your trading strategies with historical data</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-slate-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <FlaskConical className="mr-2 h-5 w-5 text-blue-500" />
              <CardTitle className="text-slate-200">Backtest Configuration</CardTitle>
            </div>
            <CardDescription>Configure parameters for strategy testing</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleBacktest)} className="space-y-6">
                <Tabs defaultValue="basic" className="mb-4">
                  <TabsList className="bg-slate-700 w-full grid grid-cols-2">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trading Pair</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Select symbol" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                {tradingPairs.map((pair) => (
                                  <SelectItem key={pair} value={pair}>
                                    {pair}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="timeframe"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timeframe</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Select timeframe" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                {timeframes.map((tf) => (
                                  <SelectItem key={tf.value} value={tf.value}>
                                    {tf.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="testPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Period</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                <SelectItem value="custom">Custom Date Range</SelectItem>
                                <SelectItem value="3m">Last 3 Months</SelectItem>
                                <SelectItem value="6m">Last 6 Months</SelectItem>
                                <SelectItem value="1y">Last 1 Year</SelectItem>
                                <SelectItem value="18m">Last 18 Months</SelectItem>
                                <SelectItem value="2y">Last 2 Years</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {form.watch('testPeriod') === 'custom' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Start Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="bg-slate-700 border-slate-600 text-white pl-3 text-left font-normal"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <DayPicker
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("2018-01-01")
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>End Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="bg-slate-700 border-slate-600 text-white pl-3 text-left font-normal"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <DayPicker
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => 
                                      date > new Date() || 
                                      (form.watch('startDate') && date < form.watch('startDate'))
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <FormField
                        control={form.control}
                        name="exchange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exchange</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Select exchange" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                <SelectItem value="binance">Binance</SelectItem>
                                <SelectItem value="bybit">Bybit</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="initialCapital"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Capital ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="bg-slate-700 border-slate-600 text-white"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="useAiTraining"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  <div className="flex items-center">
                                    <Brain className="mr-2 h-4 w-4 text-purple-500" />
                                    AI-Enhanced Analysis
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Use AI to analyze market structure and patterns
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      
                        <FormField
                          control={form.control}
                          name="saveResultsToDb"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  <div className="flex items-center">
                                    <Database className="mr-2 h-4 w-4 text-blue-500" />
                                    Save Results
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Store backtest results in your account
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="integrateWithChatGPT"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  <div className="flex items-center">
                                    <MessageSquare className="mr-2 h-4 w-4 text-green-500" />
                                    ChatGPT Integration
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Use ChatGPT for market analysis and strategy improvement
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="runInParallel"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  <div className="flex items-center">
                                    <SplitSquareVertical className="mr-2 h-4 w-4 text-purple-500" />
                                    Parallel Execution
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Run backtest alongside real trading for continuous training
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="maxGpuUsage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max GPU Usage: {field.value}%</FormLabel>
                            <FormControl>
                              <Slider
                                min={50}
                                max={100}
                                step={5}
                                value={[field.value]}
                                onValueChange={([value]) => field.onChange(value)}
                                className="w-full"
                              />
                            </FormControl>
                            <FormDescription>
                              Backtest will pause if GPU usage exceeds this limit and resume when below 30%
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="selectedStrategies"
                        render={() => (
                          <FormItem>
                            <div className="mb-2">
                              <FormLabel className="text-base">Trading Strategies</FormLabel>
                              <FormDescription>
                                Select which strategies to test
                              </FormDescription>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                              {['SMC', 'HFT', 'AI_TREND', 'VWAP', 'BOLLINGER', 'DARVAS'].map((strategy) => (
                                <FormField
                                  key={strategy}
                                  control={form.control}
                                  name="selectedStrategies"
                                  render={({ field }) => {
                                    return (
                                      <FormItem 
                                        key={strategy} 
                                        className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-slate-700 p-2"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(strategy)}
                                            onCheckedChange={(checked) => {
                                              // Kiểm tra xem field.value có phải là mảng không
                                              const currentValue = Array.isArray(field.value) ? field.value : [];
                                              
                                              return checked
                                                ? field.onChange([...currentValue, strategy])
                                                : field.onChange(
                                                    currentValue.filter(
                                                      (value) => value !== strategy
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {strategy === 'SMC' ? 'Smart Money Concepts' : 
                                           strategy === 'HFT' ? 'High Frequency Trading' : 
                                           strategy === 'AI_TREND' ? 'AI Trend Following' : 
                                           strategy === 'VWAP' ? 'VWAP' : 
                                           strategy === 'BOLLINGER' ? 'Bollinger Bands' : 
                                           strategy.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); })}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="selectedIndicators"
                        render={() => (
                          <FormItem>
                            <div className="mb-2">
                              <FormLabel className="text-base">Technical Indicators</FormLabel>
                              <FormDescription>
                                Select which indicators to use for strategy testing
                              </FormDescription>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {['rsi', 'ema', 'macd', 'volume', 'bollingerBands', 'fibonacciRetracement', 'marketStructure', 'divergence'].map((indicator) => (
                                <FormField
                                  key={indicator}
                                  control={form.control}
                                  name="selectedIndicators"
                                  render={({ field }) => {
                                    return (
                                      <FormItem 
                                        key={indicator} 
                                        className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-slate-700 p-2"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(indicator)}
                                            onCheckedChange={(checked) => {
                                              // Kiểm tra xem field.value có phải là mảng không
                                              const currentValue = Array.isArray(field.value) ? field.value : [];
                                              
                                              return checked
                                                ? field.onChange([...currentValue, indicator])
                                                : field.onChange(
                                                    currentValue.filter(
                                                      (value) => value !== indicator
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer capitalize">
                                          {indicator === 'rsi' ? 'RSI' : 
                                           indicator === 'ema' ? 'EMA' : 
                                           indicator === 'macd' ? 'MACD' : 
                                           indicator.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); })}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="leverage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leverage: {field.value}x</FormLabel>
                          <FormControl>
                            <Slider
                              min={1}
                              max={100}
                              step={1}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="capitalPerTrade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capital Per Trade: {field.value}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={1}
                              max={100}
                              step={1}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="stopLossPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stop Loss: {field.value}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0.5}
                              max={50}
                              step={0.5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="takeProfitPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Take Profit: {field.value}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0.5}
                              max={100}
                              step={0.5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="useDCA"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Use Dollar-Cost Averaging (DCA)
                          </FormLabel>
                          <FormDescription>
                            Enable DCA for improving entry prices
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("useDCA") && (
                    <FormField
                      control={form.control}
                      name="dcaLevels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DCA Levels: {field.value}</FormLabel>
                          <FormControl>
                            <Slider
                              min={1}
                              max={10}
                              step={1}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="w-full"
                            />
                          </FormControl>
                          <FormDescription>
                            Number of DCA levels to use in the strategy
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date Range</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="bg-slate-700 border-slate-600 text-white flex justify-between"
                            >
                              <span>
                                {format(form.getValues().startDate, "PPP")} to{" "}
                                {format(form.getValues().endDate, "PPP")}
                              </span>
                              <CalendarIcon className="ml-2 h-4 w-4" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
                          <div className="p-3">
                            <div className="flex justify-center">
                              <DayPicker
                                mode="range"
                                selected={{
                                  from: form.getValues().startDate,
                                  to: form.getValues().endDate,
                                }}
                                onSelect={(range) => {
                                  if (range?.from) {
                                    form.setValue("startDate", range.from);
                                  }
                                  if (range?.to) {
                                    form.setValue("endDate", range.to);
                                  }
                                }}
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                className="mt-4 bg-slate-700"
                                onClick={() => {
                                  // Close popover
                                  document.body.click();
                                }}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto flex items-center justify-center"
                  disabled={isBacktesting}
                >
                  {isBacktesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running Backtest...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-5 w-5" />
                      Run Backtest
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-200">Backtesting Guidelines</CardTitle>
            <CardDescription>Tips for effective backtesting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <p className="text-slate-300">
                  Past performance is not indicative of future results. Backtesting has inherent limitations.
                </p>
              </div>
              
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <p className="text-slate-300">
                  Tests should cover different market conditions (bull, bear, and sideways).
                </p>
              </div>
              
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <p className="text-slate-300">
                  Consider transaction fees and slippage for more realistic results.
                </p>
              </div>
              
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <p className="text-slate-300">
                  Start with longer timeframes for strategy validation, then move to shorter ones.
                </p>
              </div>
              
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <p className="text-slate-300">
                  Avoid over-optimization that works only on historical data but fails in live trading.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {backtestResults && (
        <div ref={chartRef}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Total Return</p>
                    <p className={`text-2xl font-mono ${backtestResults.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {backtestResults.totalReturn >= 0 ? '+' : ''}
                      {backtestResults.totalReturn.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Final Capital</p>
                    <p className="text-2xl font-mono">
                      ${backtestResults.finalCapital.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Win Rate</p>
                    <p className="text-2xl font-mono">
                      {((backtestResults.winningTrades / backtestResults.totalTrades) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {backtestResults.winningTrades} / {backtestResults.totalTrades} trades
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200">Trade Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Maximum Drawdown</p>
                    <p className="text-2xl font-mono text-red-500">
                      {(backtestResults.maxDrawdown * 100).toFixed(2)}%
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Average Win</p>
                    <p className="text-2xl font-mono text-green-500">
                      ${backtestResults.trades
                        .filter(t => t.profit > 0)
                        .reduce((sum, t) => sum + t.profit, 0) / 
                        backtestResults.winningTrades || 0
                      }.toFixed(2)
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Average Loss</p>
                    <p className="text-2xl font-mono text-red-500">
                      ${backtestResults.trades
                        .filter(t => t.profit <= 0)
                        .reduce((sum, t) => sum + t.profit, 0) / 
                        backtestResults.losingTrades || 0
                      }.toFixed(2)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200">Profit Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formatTradesForChart(backtestResults.trades)}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis 
                        dataKey="tradeNumber" 
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
                      />
                      <Bar 
                        dataKey="profit" 
                        radius={[4, 4, 0, 0]}
                      >
                        {backtestResults.trades.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card className="bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formatBalanceHistory(backtestResults.trades, form.getValues().initialCapital)}
                      margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="trade" 
                        label={{ value: 'Trade Number', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
                        tick={{ fill: '#9CA3AF' }}
                      />
                      <YAxis
                        label={{ value: 'Account Balance ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                        tick={{ fill: '#9CA3AF' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          borderColor: '#374151',
                          color: '#F9FAFB' 
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                      />
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
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200">Price Chart & Trades</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px]">
                  <TradingChart
                    candles={candles}
                    trades={backtestResults.trades}
                    symbol={form.getValues().symbol}
                    timeframe={form.getValues().timeframe}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
