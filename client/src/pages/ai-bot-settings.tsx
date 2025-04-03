import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import TradingAnalysis from "@/components/ai/trading-analysis";
import { Cpu, Brain, Settings, TrendingUp, BarChart3, Info } from "lucide-react";

// Zod schema for bot settings form
const botSettingsSchema = z.object({
  isActive: z.boolean(),
  tradingPairs: z.array(z.string()).min(1, "Select at least one trading pair"),
  timeframes: z.array(z.string()).min(1, "Select at least one timeframe"),
  indicatorsToUse: z.array(z.string()).min(1, "Select at least one indicator"),
  minConfidenceThreshold: z.number().min(0.5).max(1),
});

type BotSettingsFormValues = z.infer<typeof botSettingsSchema>;

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
  "1m", 
  "5m", 
  "15m", 
  "30m", 
  "1h", 
  "2h", 
  "4h", 
  "1d", 
  "1w"
];

// Available technical indicators
const indicators = [
  { id: "rsi", label: "RSI (Relative Strength Index)" },
  { id: "ema", label: "EMA (Exponential Moving Average)" },
  { id: "fibonacci", label: "Fibonacci Retracement" },
  { id: "volume", label: "Volume Profile" },
  { id: "darvas", label: "Darvas Box" },
  { id: "marketStructure", label: "Market Structure" },
  { id: "smc", label: "Smart Money Concept (SMC)" },
  { id: "trap", label: "Trap Trading (Fakeouts)" },
  { id: "divergence", label: "RSI Divergence" },
];

export default function AiBotSettings() {
  const { toast } = useToast();
  
  // Fetch current bot settings
  const { data: botSettings, isLoading } = useQuery({
    queryKey: ['/api/bot-settings/1'],
  });
  
  // Form setup
  const form = useForm<BotSettingsFormValues>({
    resolver: zodResolver(botSettingsSchema),
    defaultValues: {
      isActive: false,
      tradingPairs: [],
      timeframes: [],
      indicatorsToUse: [],
      minConfidenceThreshold: 0.7,
    },
  });
  
  // When data is loaded, update form values
  useEffect(() => {
    if (botSettings) {
      form.reset({
        isActive: botSettings.isActive,
        tradingPairs: botSettings.tradingPairs,
        timeframes: botSettings.timeframes,
        indicatorsToUse: botSettings.indicatorsToUse,
        minConfidenceThreshold: botSettings.minConfidenceThreshold,
      });
    }
  }, [botSettings, form]);
  
  // Update bot settings mutation
  const updateBotSettingsMutation = useMutation({
    mutationFn: async (data: BotSettingsFormValues) => {
      return botSettings
        ? apiRequest("PUT", `/api/bot-settings/${botSettings.id}`, data)
        : apiRequest("POST", "/api/bot-settings", { ...data, userId: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-settings/1'] });
      toast({
        title: "Success",
        description: "Bot settings updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update bot settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Toggle bot active status mutation
  const toggleBotActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!botSettings) return;
      return apiRequest("PUT", `/api/bot-settings/${botSettings.id}/toggle`, {
        isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot-settings/1'] });
      toast({
        title: "Success",
        description: form.getValues().isActive
          ? "Bot activated successfully"
          : "Bot deactivated successfully",
      });
    },
    onError: (error) => {
      form.setValue("isActive", !form.getValues().isActive); // Revert toggle
      toast({
        title: "Error",
        description: `Failed to toggle bot status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: BotSettingsFormValues) => {
    updateBotSettingsMutation.mutate(data);
  };
  
  // Handle bot status toggle
  const handleBotStatusToggle = (checked: boolean) => {
    form.setValue("isActive", checked);
    toggleBotActiveMutation.mutate(checked);
  };
  
  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Bot Settings</h1>
          <p className="text-slate-400">Configure and train your AI trading assistant</p>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0 space-x-3">
          {!isLoading && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">Bot Status:</span>
              <Switch
                checked={form.getValues().isActive}
                onCheckedChange={handleBotStatusToggle}
                disabled={toggleBotActiveMutation.isPending}
              />
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  form.getValues().isActive
                    ? "bg-green-900 text-green-400"
                    : "bg-red-900 text-red-400"
                }`}
              >
                {form.getValues().isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          )}
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Settings className="mr-2 h-5 w-5 text-blue-500" />
                <CardTitle className="text-slate-200">Bot Configuration</CardTitle>
              </div>
              <CardDescription>Configure how the AI trading bot operates</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-60">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="tradingPairs"
                        render={() => (
                          <FormItem>
                            <FormLabel>Trading Pairs</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              {tradingPairs.map((pair) => (
                                <FormField
                                  key={pair}
                                  control={form.control}
                                  name="tradingPairs"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={pair}
                                        className="flex items-center space-x-2 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(pair)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, pair])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== pair
                                                    )
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {pair}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="timeframes"
                        render={() => (
                          <FormItem>
                            <FormLabel>Analysis Timeframes</FormLabel>
                            <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
                              {timeframes.map((timeframe) => (
                                <FormField
                                  key={timeframe}
                                  control={form.control}
                                  name="timeframes"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={timeframe}
                                        className="flex items-center space-x-2 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(timeframe)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, timeframe])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== timeframe
                                                    )
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {timeframe}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="indicatorsToUse"
                        render={() => (
                          <FormItem>
                            <FormLabel>Technical Indicators</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {indicators.map((indicator) => (
                                <FormField
                                  key={indicator.id}
                                  control={form.control}
                                  name="indicatorsToUse"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={indicator.id}
                                        className="flex items-center space-x-2 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(indicator.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, indicator.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== indicator.id
                                                    )
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {indicator.label}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="minConfidenceThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Confidence Threshold: {(field.value * 100).toFixed(0)}%</FormLabel>
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
                            <FormDescription>
                              AI will only execute trades when confidence level is above this threshold
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="pt-4">
                        <Button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={updateBotSettingsMutation.isPending}
                        >
                          {updateBotSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="bg-slate-800 mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Brain className="mr-2 h-5 w-5 text-indigo-500" />
                <CardTitle className="text-slate-200">AI Capabilities</CardTitle>
              </div>
              <CardDescription>Current AI model capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Multi-timeframe Analysis</span>
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 rounded-full">Enabled</span>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "90%" }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Pattern Recognition</span>
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 rounded-full">Enabled</span>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "85%" }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Fibonacci Analysis</span>
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 rounded-full">Enabled</span>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "92%" }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Smart Money Concept</span>
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 rounded-full">Enabled</span>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "80%" }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Volume Analysis</span>
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 rounded-full">Enabled</span>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "88%" }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Trap Detection</span>
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 rounded-full">Enabled</span>
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                </div>
                
                <Separator className="my-4 bg-slate-700" />
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">AI Performance Score</span>
                    <p className="text-xs text-slate-400">Based on backtesting results</p>
                  </div>
                  <div className="text-lg font-bold text-indigo-400">85/100</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
                <CardTitle className="text-slate-200">Latest Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <TradingAnalysis />
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div>
        <Card className="bg-slate-800">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Info className="mr-2 h-5 w-5 text-yellow-500" />
              <CardTitle className="text-slate-200">Important Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-4 text-slate-300">
              <p>
                The AI trading bot uses a combination of technical analysis methods and machine learning to identify potential trading opportunities. While the bot is designed to optimize trading decisions, please note the following:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Past performance is not indicative of future results</li>
                <li>Always monitor the bot's activities and be ready to intervene manually if needed</li>
                <li>Use the backtesting feature to evaluate the bot's strategy before deploying with real funds</li>
                <li>Regular updates and learning will improve the AI's performance over time</li>
                <li>Consider starting with smaller position sizes when first enabling the bot</li>
              </ul>
              <p>
                For optimal performance, make sure the bot settings align with your trading goals and risk tolerance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
