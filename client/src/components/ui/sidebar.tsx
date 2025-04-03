import { useState, useContext } from "react";
import { useLocation, Link } from "wouter";
import { LanguageContext } from "../../App";
import { 
  BarChart3, 
  History, 
  Cpu, 
  Sliders, 
  FlaskConical,
  Menu,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { language } = useContext(LanguageContext);
  
  // Menu labels based on language
  const menuLabels = {
    en: {
      dashboard: "Dashboard",
      tradingHistory: "Trading History",
      aiSettings: "AI Bot Settings",
      tradingSettings: "Trading Settings",
      backtesting: "Backtesting",
      botStatus: "BOT STATUS",
      active: "ACTIVE",
      openPositions: "Open positions:",
      todayTrades: "Today's trades:",
      dailyPL: "Daily P/L:"
    },
    vi: {
      dashboard: "Bảng điều khiển",
      tradingHistory: "Lịch sử giao dịch",
      aiSettings: "Cài đặt Bot AI",
      tradingSettings: "Cài đặt giao dịch",
      backtesting: "Kiểm tra lại",
      botStatus: "TRẠNG THÁI BOT",
      active: "ĐANG HOẠT ĐỘNG",
      openPositions: "Vị thế mở:",
      todayTrades: "Giao dịch hôm nay:",
      dailyPL: "Lãi/lỗ hôm nay:"
    }
  };
  
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={`
        w-full md:w-64 bg-slate-800 z-50
        ${isOpen ? 'fixed inset-y-0 left-0' : 'hidden'} 
        md:block md:relative md:min-h-screen p-4 flex flex-col
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Cpu className="text-blue-500 h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">CryptoTrader<span className="text-blue-500">Pro</span></h1>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="space-y-1 flex-1">
          <div 
            onClick={() => window.location.href = '/'}
            className={`flex items-center px-4 py-3 rounded-md font-medium cursor-pointer ${
              location === "/" 
                ? "text-blue-500 bg-slate-700" 
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <BarChart3 className="mr-3 h-5 w-5" />
            <span>{menuLabels[language].dashboard}</span>
          </div>
          
          <div 
            onClick={() => window.location.href = '/history'}
            className={`flex items-center px-4 py-3 rounded-md font-medium cursor-pointer ${
              location === "/history" 
                ? "text-blue-500 bg-slate-700" 
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <History className="mr-3 h-5 w-5" />
            <span>{menuLabels[language].tradingHistory}</span>
          </div>
          
          <div 
            onClick={() => window.location.href = '/ai-settings'}
            className={`flex items-center px-4 py-3 rounded-md font-medium cursor-pointer ${
              location === "/ai-settings" 
                ? "text-blue-500 bg-slate-700" 
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Cpu className="mr-3 h-5 w-5" />
            <span>{menuLabels[language].aiSettings}</span>
          </div>
          
          <div 
            onClick={() => window.location.href = '/trading-settings'}
            className={`flex items-center px-4 py-3 rounded-md font-medium cursor-pointer ${
              location === "/trading-settings" 
                ? "text-blue-500 bg-slate-700" 
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Sliders className="mr-3 h-5 w-5" />
            <span>{menuLabels[language].tradingSettings}</span>
          </div>
          
          <div 
            onClick={() => window.location.href = '/backtesting'}
            className={`flex items-center px-4 py-3 rounded-md font-medium cursor-pointer ${
              location === "/backtesting" 
                ? "text-blue-500 bg-slate-700" 
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            <FlaskConical className="mr-3 h-5 w-5" />
            <span>{menuLabels[language].backtesting}</span>
          </div>
        </nav>
        
        <div className="border-t border-slate-700 pt-4 mt-4">
          <div className="bg-slate-700 p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-400">{menuLabels[language].botStatus}</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-900 text-green-400">{menuLabels[language].active}</span>
            </div>
            <div className="text-xs text-slate-400">
              <div className="flex justify-between mb-1">
                <span>{menuLabels[language].openPositions}</span>
                <span className="font-mono">2</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>{menuLabels[language].todayTrades}</span>
                <span className="font-mono">7</span>
              </div>
              <div className="flex justify-between">
                <span>{menuLabels[language].dailyPL}</span>
                <span className="font-mono text-green-500">+2.8%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium">JD</div>
          <div className="ml-3">
            <p className="text-sm font-medium">John Doe</p>
            <p className="text-xs text-slate-400">Trader</p>
          </div>
        </div>
      </aside>
      
      {/* Mobile menu button - outside the sidebar */}
      <button 
        className="md:hidden fixed bottom-4 right-4 z-30 bg-blue-600 text-white p-3 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>
    </>
  );
}
