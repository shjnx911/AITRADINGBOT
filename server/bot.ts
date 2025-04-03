import { storage } from "./storage";
import { MultiExchangeClient } from "@/lib/multiExchangeClient";
import { ExchangeConfig } from "@/lib/exchangeSettings"; // Import ExchangeConfig

async function startTradingBot() {
    console.log("Starting trading bot...");

    // Get bot settings
    const botSettings = await storage.getBotSettings(1);
    if (!botSettings || !botSettings.isActive) {
        console.log("Bot is not active or settings not found");
        return;
    }

    // Tạo ExchangeConfig từ botSettings (bạn cần ánh xạ các trường từ botSettings sang ExchangeConfig)
    const exchangeConfig: ExchangeConfig = {
        multiExchangeMode: botSettings.multiExchangeMode,
        preferredExchange: botSettings.preferredExchange,
        exchangePriority: botSettings.exchangePriority ? botSettings.exchangePriority.split(',') : [],
        binance: botSettings.binanceApiKey && botSettings.binanceSecretKey ? {
            apiKey: botSettings.binanceApiKey,
            secretKey: botSettings.binanceSecretKey,
            testnet: botSettings.binanceTestnet,
        } : undefined,
        bybit: botSettings.bybitApiKey && botSettings.bybitSecretKey ? {
            apiKey: botSettings.bybitApiKey,
            secretKey: botSettings.bybitSecretKey,
            testnet: botSettings.bybitTestnet,
        } : undefined,
        okx: botSettings.okxApiKey && botSettings.okxSecretKey && botSettings.okxPassphrase ? {
            apiKey: botSettings.okxApiKey,
            secretKey: botSettings.okxSecretKey,
            passphrase: botSettings.okxPassphrase,
            testnet: botSettings.okxTestnet,
        } : undefined,
        kucoin: botSettings.kucoinApiKey && botSettings.kucoinSecretKey && botSettings.kucoinPassphrase ? {
            apiKey: botSettings.kucoinApiKey,
            secretKey: botSettings.kucoinSecretKey,
            passphrase: botSettings.kucoinPassphrase,
            testnet: botSettings.kucoinTestnet,
        } : undefined,
        bitget: botSettings.bitgetApiKey && botSettings.bitgetSecretKey ? {
            apiKey: botSettings.bitgetApiKey,
            secretKey: botSettings.bitgetSecretKey,
            testnet: botSettings.bitgetTestnet,
        } : undefined,
    };

    // Initialize exchange client with settings by creating an instance
    const client = new MultiExchangeClient(exchangeConfig);

    // Start monitoring trading pairs
    for (const pair of botSettings.tradingPairs) {
        console.log(`Monitoring ${pair}...`);
        // Add trading logic here
    }
}

if (require.main === module) {
    startTradingBot().catch(console.error);
}