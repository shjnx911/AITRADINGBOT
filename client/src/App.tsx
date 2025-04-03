import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TradingHistory from "@/pages/trading-history";
import AiBotSettings from "@/pages/ai-bot-settings";
import TradingSettings from "@/pages/trading-settings";
import Backtesting from "@/pages/backtesting";
import Sidebar from "@/components/ui/sidebar";
import { useState, createContext } from "react";

// Create language context
export type Language = 'en' | 'vi';
export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
}>({
  language: 'en',
  setLanguage: () => {},
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/history" component={TradingHistory} />
      <Route path="/ai-settings" component={AiBotSettings} />
      <Route path="/trading-settings" component={TradingSettings} />
      <Route path="/backtesting" component={Backtesting} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en');

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageContext.Provider value={{ language, setLanguage }}>
        <div className="dark bg-slate-900 text-slate-200 font-sans min-h-screen">
          <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
              {/* Đã tắt chức năng chuyển đổi ngôn ngữ */}
              <Router />
            </main>
          </div>
          <Toaster />
        </div>
      </LanguageContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
