import { useContext } from 'react';
import { LanguageContext, Language } from '../App';

// Các bản dịch cho tiếng Việt và tiếng Anh
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Dashboard
    "dashboard": "Dashboard",
    "overview": "Overview",
    "balance": "Balance",
    "profit": "Profit",
    "trades": "Trades",
    "signals": "Signals",
    "open_positions": "Open Positions",
    "trading_history": "Trading History",
    "recent_trades": "Recent Trades",
    "ai_signals": "AI Signals",
    "market_overview": "Market Overview",
    
    // Trading Settings
    "trading_settings": "Trading Settings",
    "capital_per_trade": "Capital Per Trade",
    "max_leverage": "Maximum Leverage",
    "min_leverage": "Minimum Leverage",
    "stop_loss": "Stop Loss",
    "target_daily_profit": "Target Daily Profit",
    "max_daily_trades": "Max Daily Trades",
    "min_daily_trades": "Min Daily Trades",
    "dca_levels": "DCA Levels",
    "exchange": "Exchange",
    "is_active": "Is Active",
    "save_settings": "Save Settings",
    
    // Backtesting
    "backtesting": "Backtesting",
    "symbol": "Trading Pair",
    "timeframe": "Timeframe",
    "test_period": "Test Period",
    "initial_capital": "Initial Capital",
    "leverage": "Leverage",
    "use_dca": "Use DCA",
    "dca_trigger_percentages": "DCA Trigger Percentages",
    "start_date": "Start Date",
    "end_date": "End Date",
    "run_backtest": "Run Backtest",
    "backtest_results": "Backtest Results",
    "total_trades": "Total Trades",
    "winning_trades": "Winning Trades",
    "losing_trades": "Losing Trades",
    "win_rate": "Win Rate",
    "profit_factor": "Profit Factor",
    "net_profit": "Net Profit",
    "max_drawdown": "Max Drawdown",
    "basic_settings": "Basic Settings",
    "advanced_settings": "Advanced Settings",
    "trading_strategies": "Trading Strategies",
    "technical_indicators": "Technical Indicators",
    "smart_money_concepts": "Smart Money Concepts",
    "high_frequency_trading": "High Frequency Trading",
    "ai_trend_following": "AI Trend Following",
    "bollinger_bands": "Bollinger Bands",
    
    // AI Bot Settings
    "ai_bot_settings": "AI Bot Settings",
    "auto_trading": "Auto Trading",
    "bot_status": "Bot Status",
    "risk_management": "Risk Management",
    "trading_hours": "Trading Hours",
    "allowed_symbols": "Allowed Symbols",
    "minimum_confidence": "Minimum Confidence",
    "use_ai_training": "Use AI Training",
    "max_gpu_usage": "Max GPU Usage",
    "run_in_parallel": "Run In Parallel",
    "use_real_data": "Use Real Data",
    "integrate_with_chatgpt": "Integrate With ChatGPT"
  },
  vi: {
    // Dashboard
    "dashboard": "Bảng điều khiển",
    "overview": "Tổng quan",
    "balance": "Số dư",
    "profit": "Lợi nhuận",
    "trades": "Giao dịch",
    "signals": "Tín hiệu",
    "open_positions": "Vị thế mở",
    "trading_history": "Lịch sử giao dịch",
    "recent_trades": "Giao dịch gần đây",
    "ai_signals": "Tín hiệu AI",
    "market_overview": "Tổng quan thị trường",
    
    // Trading Settings
    "trading_settings": "Cài đặt giao dịch",
    "capital_per_trade": "Vốn mỗi giao dịch",
    "max_leverage": "Đòn bẩy tối đa",
    "min_leverage": "Đòn bẩy tối thiểu",
    "stop_loss": "Cắt lỗ",
    "target_daily_profit": "Lợi nhuận mục tiêu hàng ngày",
    "max_daily_trades": "Số giao dịch tối đa mỗi ngày",
    "min_daily_trades": "Số giao dịch tối thiểu mỗi ngày",
    "dca_levels": "Số cấp trung bình giá",
    "exchange": "Sàn giao dịch",
    "is_active": "Đang hoạt động",
    "save_settings": "Lưu cài đặt",
    
    // Backtesting
    "backtesting": "Kiểm thử",
    "symbol": "Cặp giao dịch",
    "timeframe": "Khung thời gian",
    "test_period": "Khoảng thời gian kiểm thử",
    "initial_capital": "Vốn ban đầu",
    "leverage": "Đòn bẩy",
    "use_dca": "Sử dụng DCA",
    "dca_trigger_percentages": "Phần trăm kích hoạt DCA",
    "start_date": "Ngày bắt đầu",
    "end_date": "Ngày kết thúc",
    "run_backtest": "Chạy kiểm thử",
    "backtest_results": "Kết quả kiểm thử",
    "total_trades": "Tổng số giao dịch",
    "winning_trades": "Giao dịch thắng",
    "losing_trades": "Giao dịch thua",
    "win_rate": "Tỷ lệ thắng",
    "profit_factor": "Hệ số lợi nhuận",
    "net_profit": "Lợi nhuận ròng",
    "max_drawdown": "Rút vốn tối đa",
    "basic_settings": "Cài đặt cơ bản",
    "advanced_settings": "Cài đặt nâng cao",
    "trading_strategies": "Chiến lược giao dịch",
    "technical_indicators": "Chỉ báo kỹ thuật",
    "smart_money_concepts": "Khái niệm tiền thông minh",
    "high_frequency_trading": "Giao dịch tần suất cao",
    "ai_trend_following": "Theo xu hướng AI",
    "bollinger_bands": "Dải Bollinger",
    
    // AI Bot Settings
    "ai_bot_settings": "Cài đặt Bot AI",
    "auto_trading": "Giao dịch tự động",
    "bot_status": "Trạng thái Bot",
    "risk_management": "Quản lý rủi ro",
    "trading_hours": "Giờ giao dịch",
    "allowed_symbols": "Cặp giao dịch cho phép",
    "minimum_confidence": "Độ tin cậy tối thiểu",
    "use_ai_training": "Sử dụng huấn luyện AI",
    "max_gpu_usage": "Sử dụng GPU tối đa",
    "run_in_parallel": "Chạy song song",
    "use_real_data": "Sử dụng dữ liệu thật",
    "integrate_with_chatgpt": "Tích hợp với ChatGPT"
  }
};

export function useTranslation() {
  const { language } = useContext(LanguageContext);
  
  const t = (key: string): string => {
    // Nếu có bản dịch cho ngôn ngữ hiện tại, trả về bản dịch
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    
    // Nếu không có bản dịch, sử dụng key làm giá trị mặc định
    return key;
  };
  
  return { t, language };
}