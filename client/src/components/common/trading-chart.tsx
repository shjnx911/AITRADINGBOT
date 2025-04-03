import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, isUTCTimestamp } from 'lightweight-charts';

interface CandleData {
  time: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

interface Trade {
  entryPrice: number;
  exitPrice: number;
  type: 'LONG' | 'SHORT';
  timestamp: number;
}

interface TradingChartProps {
  candles: CandleData[];
  trades: Trade[];
  symbol: string;
  timeframe: string;
}

const TradingChart = ({ candles, trades, symbol, timeframe }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candles.length) return;

    // Make sure to clean up any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#1e293b' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      timeScale: {
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#475569',
      },
      crosshair: {
        mode: 0,
        vertLine: {
          width: 1,
          color: '#6b7280',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#6b7280',
          style: 2,
        },
      },
    });

    // Create candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Format candle data for the chart
    const formattedCandles = candles.map(candle => ({
      time: isUTCTimestamp(candle.time) ? candle.time : candle.time / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(formattedCandles);
    candleSeriesRef.current = candleSeries;

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#60a5fa',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const formattedVolume = candles.map(candle => ({
      time: isUTCTimestamp(candle.time) ? candle.time : candle.time / 1000,
      value: candle.volume,
      color: candle.close >= candle.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));

    volumeSeries.setData(formattedVolume);
    volumeSeriesRef.current = volumeSeries;

    // Add trade markers
    if (trades && trades.length > 0) {
      // Long entry markers
      const longEntries = trades
        .filter(trade => trade.type === 'LONG')
        .map(trade => ({
          time: isUTCTimestamp(trade.timestamp) ? trade.timestamp : trade.timestamp / 1000,
          position: 'belowBar',
          color: '#10b981',
          shape: 'arrowUp',
          text: 'LONG',
          size: 1,
        }));

      if (longEntries.length > 0) {
        candleSeries.setMarkers(longEntries);
      }

      // Short entry markers
      const shortEntries = trades
        .filter(trade => trade.type === 'SHORT')
        .map(trade => ({
          time: isUTCTimestamp(trade.timestamp) ? trade.timestamp : trade.timestamp / 1000,
          position: 'aboveBar',
          color: '#ef4444',
          shape: 'arrowDown',
          text: 'SHORT',
          size: 1,
        }));

      if (shortEntries.length > 0) {
        candleSeries.setMarkers([...longEntries, ...shortEntries]);
      }

      // Draw trade lines
      trades.forEach(trade => {
        if (trade.exitPrice) {
          const color = trade.type === 'LONG' 
            ? (trade.exitPrice > trade.entryPrice ? '#10b981' : '#ef4444')
            : (trade.exitPrice < trade.entryPrice ? '#10b981' : '#ef4444');
            
          candleSeries.createPriceLine({
            price: trade.entryPrice,
            color: '#60a5fa',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `${trade.type} Entry`,
          });
          
          candleSeries.createPriceLine({
            price: trade.exitPrice,
            color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `${trade.type} Exit`,
          });
        }
      });
    }

    // Fit all data
    chart.timeScale().fitContent();

    // Add window resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles, trades]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z" />
              </svg>
            </div>
            <span className="font-semibold">{symbol}</span>
            <span className="ml-2 text-sm text-slate-400">{timeframe}</span>
          </div>
          <div className="text-sm text-slate-400">
            {candles.length > 0 ? `${new Date(candles[0].time).toLocaleDateString()} - ${new Date(candles[candles.length - 1].time).toLocaleDateString()}` : ''}
          </div>
        </div>
      </div>
      <div ref={chartContainerRef} className="flex-1" />
    </div>
  );
};

export default TradingChart;
