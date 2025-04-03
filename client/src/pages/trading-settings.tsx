import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sliders, DollarSign, BarChart, Scale, Percent } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-language";

// Zod schema for trading settings form
const tradingSettingsSchema = z.object({
  minCapitalPerTrade: z.number().min(1).max(10),
  maxCapitalPerTrade: z.number().min(5).max(15),
  capitalPerTrade: z.number().min(1).max(15),
  autoAdjustCapital: z.boolean(),
  maxLeverage: z.number().min(1).max(15),
  minLeverage: z.number().min(1).max(15),
  softStopLoss: z.number().min(1).max(50),
  targetDailyProfit: z.number().min(0.5).max(20),
  maxDailyTrades: z.number().min(1).max(50),
  minDailyTrades: z.number().min(0).max(20),
  dcaLevels: z.number().min(1).max(10),
  exchanges: z.array(z.string()).min(1),
  isActive: z.boolean(),
});

type TradingSettingsFormValues = z.infer<typeof tradingSettingsSchema>;

export default function TradingSettings() {
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch current trading settings
  const { data: tradingSettings, isLoading } = useQuery({
    queryKey: ['/api/trading-settings/1'],
  });

  // Form setup
  const form = useForm<TradingSettingsFormValues>({
    resolver: zodResolver(tradingSettingsSchema),
    defaultValues: {
      minCapitalPerTrade: 5,
      maxCapitalPerTrade: 10,
      capitalPerTrade: 5,
      autoAdjustCapital: true,
      maxLeverage: 15,  // Giảm đòn bẩy tối đa xuống 15x
      minLeverage: 10,
      softStopLoss: 10,
      targetDailyProfit: 3,
      maxDailyTrades: 10,
      minDailyTrades: 3,
      dcaLevels: 3,
      exchanges: ["binance"],
      isActive: false,
    },
  });

  // When data is loaded, update form values
  useEffect(() => {
    if (tradingSettings) {
      form.reset({
        minCapitalPerTrade: tradingSettings.minCapitalPerTrade || 5,
        maxCapitalPerTrade: tradingSettings.maxCapitalPerTrade || 10,
        capitalPerTrade: tradingSettings.capitalPerTrade,
        autoAdjustCapital: tradingSettings.autoAdjustCapital !== undefined ? tradingSettings.autoAdjustCapital : true,
        maxLeverage: tradingSettings.maxLeverage,
        minLeverage: tradingSettings.minLeverage,
        softStopLoss: tradingSettings.softStopLoss,
        targetDailyProfit: tradingSettings.targetDailyProfit,
        maxDailyTrades: tradingSettings.maxDailyTrades,
        minDailyTrades: tradingSettings.minDailyTrades,
        dcaLevels: tradingSettings.dcaLevels,
        exchanges: tradingSettings.exchange ? [tradingSettings.exchange] : ["binance"],
        isActive: tradingSettings.isActive,
      });
    }
  }, [tradingSettings, form]);

  // Update trading settings mutation
  const updateTradingSettingsMutation = useMutation({
    mutationFn: async (data: TradingSettingsFormValues) => {
      return tradingSettings
        ? apiRequest("PUT", `/api/trading-settings/${tradingSettings.id}`, data)
        : apiRequest("POST", "/api/trading-settings", { ...data, userId: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading-settings/1'] });
      toast({
        title: "Success",
        description: "Trading settings updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update trading settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: TradingSettingsFormValues) => {
    // Make sure minLeverage <= maxLeverage
    if (data.minLeverage > data.maxLeverage) {
      form.setError("minLeverage", {
        type: "manual",
        message: "Minimum leverage cannot be greater than maximum leverage",
      });
      return;
    }
    
    updateTradingSettingsMutation.mutate(data);
  };

  // Available exchanges
  const exchanges = [
    { value: "binance", label: "Binance" },
    { value: "bybit", label: "Bybit" },
    { value: "ftx", label: "FTX" },
    { value: "kraken", label: "Kraken" },
    { value: "kucoin", label: "KuCoin" },
  ];

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Trading Settings</h1>
          <p className="text-slate-400">Configure your trading parameters and risk management</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-800 mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Sliders className="mr-2 h-5 w-5 text-blue-500" />
                <CardTitle className="text-slate-200">General Settings</CardTitle>
              </div>
              <CardDescription>Configure risk management parameters</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-60">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="minCapitalPerTrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Percent className="h-4 w-4 text-blue-500" />
                              Min Capital Per Trade (%)
                            </FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={([value]) => field.onChange(value)}
                                  className="flex-1"
                                />
                              </FormControl>
                              <span className="w-12 text-center font-mono">{field.value}%</span>
                            </div>
                            <FormDescription>
                              Minimum percentage of capital per trade
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maxCapitalPerTrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Percent className="h-4 w-4 text-blue-500" />
                              Max Capital Per Trade (%)
                            </FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Slider
                                  min={5}
                                  max={15}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={([value]) => field.onChange(value)}
                                  className="flex-1"
                                />
                              </FormControl>
                              <span className="w-12 text-center font-mono">{field.value}%</span>
                            </div>
                            <FormDescription>
                              Maximum percentage of capital per trade
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="autoAdjustCapital"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Auto Adjust Capital</FormLabel>
                              <FormDescription>
                                Automatically adjust capital based on signal confidence
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
                        name="capitalPerTrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Percent className="h-4 w-4 text-blue-500" />
                              Default Capital Per Trade (%)
                            </FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={15}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={([value]) => field.onChange(value)}
                                  className="flex-1"
                                />
                              </FormControl>
                              <span className="w-12 text-center font-mono">{field.value}%</span>
                            </div>
                            <FormDescription>
                              Default percentage of capital per trade
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="softStopLoss"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Percent className="h-4 w-4 text-red-500" />
                              Soft Stop Loss (%)
                            </FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={50}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={([value]) => field.onChange(value)}
                                  className="flex-1"
                                />
                              </FormControl>
                              <span className="w-12 text-center font-mono">{field.value}%</span>
                            </div>
                            <FormDescription>
                              Maximum tolerable loss percentage per trade
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetDailyProfit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Percent className="h-4 w-4 text-green-500" />
                              Target Daily Profit (%)
                            </FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Slider
                                  min={0.5}
                                  max={20}
                                  step={0.5}
                                  value={[field.value]}
                                  onValueChange={([value]) => field.onChange(value)}
                                  className="flex-1"
                                />
                              </FormControl>
                              <span className="w-12 text-center font-mono">{field.value}%</span>
                            </div>
                            <FormDescription>
                              Target daily profit as percentage of total capital
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dcaLevels"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Scale className="h-4 w-4 text-yellow-500" />
                              DCA Levels
                            </FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={([value]) => field.onChange(value)}
                                  className="flex-1"
                                />
                              </FormControl>
                              <span className="w-12 text-center font-mono">{field.value}</span>
                            </div>
                            <FormDescription>
                              Number of dollar-cost averaging levels to use
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator className="my-4 bg-slate-700" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="minLeverage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <BarChart className="h-4 w-4 text-orange-500" />
                                Minimum Leverage
                              </FormLabel>
                              <div className="flex items-center gap-4">
                                <FormControl>
                                  <Slider
                                    min={1}
                                    max={15}
                                    step={1}
                                    value={[field.value]}
                                    onValueChange={([value]) => field.onChange(value)}
                                    className="flex-1"
                                  />
                                </FormControl>
                                <span className="w-12 text-center font-mono">{field.value}x</span>
                              </div>
                              <FormDescription>
                                Minimum leverage multiplier to use
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxLeverage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <BarChart className="h-4 w-4 text-purple-500" />
                                Maximum Leverage
                              </FormLabel>
                              <div className="flex items-center gap-4">
                                <FormControl>
                                  <Slider
                                    min={1}
                                    max={15}
                                    step={1}
                                    value={[field.value]}
                                    onValueChange={([value]) => field.onChange(value)}
                                    className="flex-1"
                                  />
                                </FormControl>
                                <span className="w-12 text-center font-mono">{field.value}x</span>
                              </div>
                              <FormDescription>
                                Maximum leverage multiplier to use
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="minDailyTrades"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Daily Trades</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="bg-slate-700 border-slate-600 text-white"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum number of trades to execute daily
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxDailyTrades"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Daily Trades</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="bg-slate-700 border-slate-600 text-white"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                Maximum number of trades to execute daily
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator className="my-4 bg-slate-700" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="exchanges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-blue-500" />
                              Exchanges
                            </FormLabel>
                            <div className="space-y-2">
                              {exchanges.map((exchange) => (
                                <div key={exchange.value} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={field.value?.includes(exchange.value)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = Array.isArray(field.value) ? field.value : [];
                                      if (checked) {
                                        field.onChange([...currentValue, exchange.value]);
                                      } else {
                                        field.onChange(currentValue.filter(
                                          (value) => value !== exchange.value
                                        ));
                                      }
                                    }}
                                  />
                                  <span>{exchange.label}</span>
                                </div>
                              ))}
                            </div>
                            <FormDescription>
                              Select exchanges to use for executing trades
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Enable Trading
                              </FormLabel>
                              <FormDescription>
                                When enabled, trading strategies will be active
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

                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={updateTradingSettingsMutation.isPending}
                    >
                      {updateTradingSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-slate-800 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-200">Risk Management</CardTitle>
              <CardDescription>Understand your trading risk profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!isLoading && (
                  <>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Max Position Size</p>
                      <p className="text-lg font-mono">
                        $
                        {(
                          10000 *
                          (form.getValues().capitalPerTrade / 100)
                        ).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {form.getValues().capitalPerTrade}% of $10,000 balance
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-1">Max Leverage Exposure</p>
                      <p className="text-lg font-mono">
                        $
                        {(
                          10000 *
                          (form.getValues().capitalPerTrade / 100) *
                          form.getValues().maxLeverage
                        ).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        With {form.getValues().maxLeverage}x leverage
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-1">Max Daily Loss</p>
                      <p className="text-lg font-mono text-red-500">
                        $
                        {(
                          10000 *
                          (form.getValues().capitalPerTrade / 100) *
                          form.getValues().maxDailyTrades *
                          (form.getValues().softStopLoss / 100)
                        ).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        If all {form.getValues().maxDailyTrades} trades hit{" "}
                        {form.getValues().softStopLoss}% stop loss
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-1">Target Daily Profit</p>
                      <p className="text-lg font-mono text-green-500">
                        $
                        {(10000 * (form.getValues().targetDailyProfit / 100)).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {form.getValues().targetDailyProfit}% of $10,000 balance
                      </p>
                    </div>

                    <Separator className="my-4 bg-slate-700" />

                    <div>
                      <p className="text-sm text-slate-400 mb-1">Risk-Reward Ratio</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xl font-mono">
                            {(
                              form.getValues().targetDailyProfit /
                              form.getValues().softStopLoss
                            ).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">Current ratio</p>
                        </div>
                        <div>
                          <p className="text-xl font-mono">
                            {form.getValues().targetDailyProfit /
                              form.getValues().softStopLoss >=
                            1
                              ? "✅ Good"
                              : "⚠️ Risky"}
                          </p>
                          <p className="text-xs text-slate-500">Evaluation</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-200">Strategy Tips</CardTitle>
              <CardDescription>Suggestions to optimize your trading</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs">
                    1
                  </div>
                  <p className="text-slate-300">
                    Use the minimum leverage for ranging markets and the maximum for trending markets.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs">
                    2
                  </div>
                  <p className="text-slate-300">
                    Consider reducing capital per trade when market volatility is high.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs">
                    3
                  </div>
                  <p className="text-slate-300">
                    Use DCA levels strategically on pullbacks for long positions and on rallies for shorts.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs">
                    4
                  </div>
                  <p className="text-slate-300">
                    A target daily profit of 3% is realistic but may require more active management.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs">
                    5
                  </div>
                  <p className="text-slate-300">
                    Consider using tighter stop losses with higher leverage to control risk.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
