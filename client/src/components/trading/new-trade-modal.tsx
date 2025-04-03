import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { binanceClient } from "@/lib/binanceClient";
import { analyzeMultiTimeframe, generateTradingDecision } from "@/lib/aiTrading";
import { CandleData } from "@/lib/binanceClient";

// Schema for manually creating a new trade
const manualTradeSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  type: z.enum(["LONG", "SHORT"], {
    required_error: "Trade type is required",
  }),
  entryPrice: z.coerce.number().positive("Entry price must be positive"),
  amount: z.coerce.number().positive("Amount must be positive"),
  leverage: z.coerce.number().int().min(1).max(100),
  stopLoss: z.coerce.number().positive("Stop loss must be positive").optional(),
  takeProfit: z.coerce.number().positive("Take profit must be positive").optional(),
  notes: z.string().optional(),
});

// Schema for AI-assisted trade
const aiTradeSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  timeframes: z.array(z.string()).min(1, "Select at least one timeframe"),
  confidence: z.coerce.number().min(0.5).max(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  capitalPercentage: z.coerce.number().min(1).max(100),
});

type ManualTradeFormValues = z.infer<typeof manualTradeSchema>;
type AiTradeFormValues = z.infer<typeof aiTradeSchema>;

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTradeModal({ isOpen, onClose }: NewTradeModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);
  const [aiSignal, setAiSignal] = useState<any | null>(null);
  const [candlesByTimeframe, setCandlesByTimeframe] = useState<Record<string, CandleData[]>>({});

  // Trading pairs
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

  // Timeframes
  const timeframes = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" },
  ];

  // Form setup for manual trade
  const manualForm = useForm<ManualTradeFormValues>({
    resolver: zodResolver(manualTradeSchema),
    defaultValues: {
      symbol: "BTC/USDT",
      type: "LONG",
      entryPrice: 0,
      amount: 0.01,
      leverage: 10,
      notes: "",
    },
  });

  // Form setup for AI trade
  const aiForm = useForm<AiTradeFormValues>({
    resolver: zodResolver(aiTradeSchema),
    defaultValues: {
      symbol: "BTC/USDT",
      timeframes: ["1h", "4h", "1d"],
      confidence: 0.7,
      riskLevel: "medium",
      capitalPercentage: 5,
    },
  });

  // Fetch trading settings for validation
  const { data: tradingSettings } = useQuery({
    queryKey: ['/api/trading-settings/1'],
  });

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/trades", {
        ...data,
        userId: 1, // Default user ID
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/1/open'] });
      toast({
        title: "Trade Created",
        description: "Your trade has been created successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create trade: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // When symbol changes, fetch current price
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      const symbol = activeTab === "manual" 
        ? manualForm.getValues().symbol 
        : aiForm.getValues().symbol;
      
      if (symbol) {
        const price = await binanceClient.getCurrentPrice(symbol);
        if (price) {
          setCurrentPrice(price);
          if (activeTab === "manual") {
            manualForm.setValue("entryPrice", price);
          }
        }
      }
    };

    fetchCurrentPrice();
  }, [
    activeTab,
    manualForm.watch("symbol"),
    aiForm.watch("symbol")
  ]);

  // Handle manual trade form submission
  const onManualSubmit = (data: ManualTradeFormValues) => {
    // Validate stop loss for LONG trades
    if (data.type === "LONG" && data.stopLoss && data.stopLoss >= data.entryPrice) {
      manualForm.setError("stopLoss", { 
        type: "manual", 
        message: "Stop loss must be below entry price for LONG positions" 
      });
      return;
    }
    
    // Validate stop loss for SHORT trades
    if (data.type === "SHORT" && data.stopLoss && data.stopLoss <= data.entryPrice) {
      manualForm.setError("stopLoss", { 
        type: "manual", 
        message: "Stop loss must be above entry price for SHORT positions" 
      });
      return;
    }
    
    // Validate take profit for LONG trades
    if (data.type === "LONG" && data.takeProfit && data.takeProfit <= data.entryPrice) {
      manualForm.setError("takeProfit", { 
        type: "manual", 
        message: "Take profit must be above entry price for LONG positions" 
      });
      return;
    }
    
    // Validate take profit for SHORT trades
    if (data.type === "SHORT" && data.takeProfit && data.takeProfit >= data.entryPrice) {
      manualForm.setError("takeProfit", { 
        type: "manual", 
        message: "Take profit must be below entry price for SHORT positions" 
      });
      return;
    }
    
    // Create the trade
    createTradeMutation.mutate({
      ...data,
      entryTime: new Date(),
      aiSignals: null,
      indicators: null,
    });
  };

  // Generate AI signal
  const generateAiSignal = async () => {
    const data = aiForm.getValues();
    setIsGeneratingSignal(true);
    setAiSignal(null);
    
    try {
      // Fetch candles for each selected timeframe
      const candles: Record<string, CandleData[]> = {};
      for (const timeframe of data.timeframes) {
        const candleData = await binanceClient.getCandles(data.symbol, timeframe as any, 100);
        candles[timeframe] = candleData;
      }
      
      setCandlesByTimeframe(candles);
      
      // Analyze multi-timeframe data
      const analyses = analyzeMultiTimeframe(candles);
      
      // Generate trading decision
      const currentPrice = await binanceClient.getCurrentPrice(data.symbol);
      if (!currentPrice) throw new Error("Failed to fetch current price");
      
      const decision = generateTradingDecision(
        analyses,
        currentPrice,
        tradingSettings?.minLeverage || 10,
        tradingSettings?.maxLeverage || 15
      );
      
      setAiSignal(decision);
    } catch (error) {
      console.error("Error generating AI signal:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI trading signal",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSignal(false);
    }
  };

  // Place AI-generated trade
  const placeAiTrade = () => {
    if (!aiSignal) return;
    
    // Only place trade if signal is BUY or SELL (not NEUTRAL)
    if (aiSignal.signal === 'NEUTRAL') {
      toast({
        title: "Cannot Place Trade",
        description: "AI signal is neutral. Wait for a clearer BUY or SELL signal",
        variant: "destructive",
      });
      return;
    }
    
    const formData = aiForm.getValues();
    const tradeType = aiSignal.signal === 'BUY' ? 'LONG' : 'SHORT';
    
    // Calculate amount based on capital percentage and current price
    let amount = 0;
    if (currentPrice) {
      // Assume 10000 USD as default account balance if we don't have it
      const accountBalance = 10000;
      const tradeCapital = accountBalance * (formData.capitalPercentage / 100);
      amount = tradeCapital / currentPrice;
    }
    
    // Risk level affects leverage
    let leverage = aiSignal.leverageSuggestion;
    if (formData.riskLevel === 'low') {
      leverage = Math.max(tradingSettings?.minLeverage || 10, Math.floor(leverage * 0.7));
    } else if (formData.riskLevel === 'high') {
      leverage = Math.min(tradingSettings?.maxLeverage || 15, Math.floor(leverage * 1.3));
    }
    
    // Create the trade
    createTradeMutation.mutate({
      symbol: formData.symbol,
      type: tradeType,
      entryPrice: currentPrice,
      amount: amount.toFixed(5),
      leverage: leverage,
      stopLoss: aiSignal.stopLossSuggestion,
      takeProfit: aiSignal.takeProfitSuggestion,
      entryTime: new Date(),
      notes: `AI-generated ${tradeType} signal with ${(aiSignal.confidence * 100).toFixed(1)}% confidence`,
      aiSignals: {
        confidence: aiSignal.confidence,
        signalType: aiSignal.signal,
        timeframe: aiSignal.timeframe,
      },
      indicators: aiSignal.indicators,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-800 text-slate-200 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Trade</DialogTitle>
          <DialogDescription className="text-slate-400">
            Place a new trade manually or use AI assistance
          </DialogDescription>
        </DialogHeader>
        
        <Tabs
          defaultValue="manual"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "manual" | "ai")}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="manual">Manual Trade</TabsTrigger>
            <TabsTrigger value="ai">AI Assisted</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={manualForm.control}
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
                    control={manualForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Position Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="LONG" 
                                id="long" 
                                className="text-green-500 border-green-500"
                              />
                              <label 
                                htmlFor="long" 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-green-500"
                              >
                                LONG
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="SHORT" 
                                id="short"
                                className="text-red-500 border-red-500"
                              />
                              <label 
                                htmlFor="short" 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-red-500"
                              >
                                SHORT
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={manualForm.control}
                    name="entryPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="bg-slate-700 border-slate-600 text-white"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-400">
                          Current: ${currentPrice?.toFixed(2) || 'Loading...'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={manualForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.001"
                            className="bg-slate-700 border-slate-600 text-white"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        {currentPrice && (
                          <FormDescription className="text-slate-400">
                            Total: ${(field.value * currentPrice).toFixed(2)}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={manualForm.control}
                    name="leverage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leverage: {field.value}x</FormLabel>
                        <FormControl>
                          <Slider
                            min={1}
                            max={50}
                            step={1}
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            className="w-full"
                          />
                        </FormControl>
                        {currentPrice && (
                          <FormDescription className="text-slate-400">
                            Exposure: ${(field.value * manualForm.getValues().amount * currentPrice).toFixed(2)}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={manualForm.control}
                    name="stopLoss"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stop Loss ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="bg-slate-700 border-slate-600 text-white"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-400">
                          {manualForm.getValues().type === "LONG"
                            ? "Set below entry price"
                            : "Set above entry price"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={manualForm.control}
                    name="takeProfit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Take Profit ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="bg-slate-700 border-slate-600 text-white"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-400">
                          {manualForm.getValues().type === "LONG"
                            ? "Set above entry price"
                            : "Set below entry price"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={manualForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="Add trade notes or reasoning..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="bg-slate-700 border-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className={`${
                      manualForm.getValues().type === "LONG"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                    disabled={createTradeMutation.isPending}
                  >
                    {createTradeMutation.isPending ? "Creating..." : "Create Trade"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="ai">
            <Form {...aiForm}>
              <form onSubmit={(e) => { e.preventDefault(); generateAiSignal(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={aiForm.control}
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
                    control={aiForm.control}
                    name="timeframes"
                    render={() => (
                      <FormItem>
                        <FormLabel>Analysis Timeframes</FormLabel>
                        <div className="grid grid-cols-4 gap-2">
                          {timeframes.map((tf) => (
                            <FormField
                              key={tf.value}
                              control={aiForm.control}
                              name="timeframes"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={tf.value}
                                    className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-slate-700 p-2"
                                  >
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        className="accent-blue-500"
                                        checked={field.value?.includes(tf.value)}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const updatedTimeframes = checked
                                            ? [...field.value, tf.value]
                                            : field.value.filter((value) => value !== tf.value);
                                          field.onChange(updatedTimeframes);
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {tf.value}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormDescription className="text-slate-400">
                          Select multiple timeframes for multi-timeframe analysis
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={aiForm.control}
                    name="confidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Confidence: {(field.value * 100).toFixed(0)}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={0.5}
                            max={0.95}
                            step={0.05}
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription className="text-slate-400">
                          AI will only suggest trades above this confidence threshold
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={aiForm.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Risk Level</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="low" 
                                id="low" 
                                className="text-blue-500 border-blue-500"
                              />
                              <label 
                                htmlFor="low" 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-500"
                              >
                                Low
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="medium" 
                                id="medium"
                                className="text-yellow-500 border-yellow-500"
                              />
                              <label 
                                htmlFor="medium" 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-yellow-500"
                              >
                                Medium
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="high" 
                                id="high"
                                className="text-orange-500 border-orange-500"
                              />
                              <label 
                                htmlFor="high" 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-orange-500"
                              >
                                High
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={aiForm.control}
                  name="capitalPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capital Per Trade: {field.value}%</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={25}
                          step={1}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription className="text-slate-400">
                        Percentage of your capital to allocate for this trade
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {!aiSignal ? (
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isGeneratingSignal}
                  >
                    {isGeneratingSignal ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing Market...
                      </>
                    ) : (
                      "Generate AI Signal"
                    )}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Alert className={`
                      ${aiSignal.signal === 'BUY' ? 'bg-green-900/20 border-green-900' : 
                        aiSignal.signal === 'SELL' ? 'bg-red-900/20 border-red-900' : 
                        'bg-yellow-900/20 border-yellow-900'}
                    `}>
                      <AlertCircle className={`
                        h-4 w-4 ${
                          aiSignal.signal === 'BUY' ? 'text-green-500' : 
                          aiSignal.signal === 'SELL' ? 'text-red-500' : 
                          'text-yellow-500'
                        }
                      `} />
                      <AlertDescription className="text-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">
                            {aiSignal.signal === 'BUY' ? 'Strong Buy Signal' : 
                             aiSignal.signal === 'SELL' ? 'Strong Sell Signal' : 
                             'Neutral / Wait'}
                          </span>
                          <span className="text-sm">
                            Confidence: {(aiSignal.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>Timeframe: {aiSignal.timeframe}</p>
                          <p>Current Price: ${aiSignal.price.toFixed(2)}</p>
                          {aiSignal.signal !== 'NEUTRAL' && (
                            <>
                              <p>Suggested Leverage: {aiSignal.leverageSuggestion}x</p>
                              <p>Stop Loss: ${aiSignal.stopLossSuggestion.toFixed(2)}</p>
                              <p>Take Profit: ${aiSignal.takeProfitSuggestion.toFixed(2)}</p>
                            </>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="px-4 py-3 bg-slate-700/50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">AI Reasoning:</h4>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {aiSignal.reasoning.map((reason: string, index: number) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {aiSignal.signal !== 'NEUTRAL' && (
                      <div className="flex space-x-3">
                        <Button
                          type="button"
                          className="flex-1 bg-slate-700 hover:bg-slate-600"
                          onClick={() => {
                            setAiSignal(null);
                            setCandlesByTimeframe({});
                          }}
                        >
                          Generate New Signal
                        </Button>
                        <Button
                          type="button"
                          className={`flex-1 ${
                            aiSignal.signal === 'BUY' 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                          onClick={placeAiTrade}
                          disabled={createTradeMutation.isPending}
                        >
                          {createTradeMutation.isPending 
                            ? "Placing Trade..." 
                            : `Place ${aiSignal.signal === 'BUY' ? 'LONG' : 'SHORT'} Trade`
                          }
                        </Button>
                      </div>
                    )}
                    
                    {aiSignal.signal === 'NEUTRAL' && (
                      <Button
                        type="button"
                        className="w-full bg-slate-700 hover:bg-slate-600"
                        onClick={() => {
                          setAiSignal(null);
                          setCandlesByTimeframe({});
                        }}
                      >
                        Generate New Signal
                      </Button>
                    )}
                  </div>
                )}
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="bg-slate-700 border-slate-600"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
