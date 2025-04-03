
import { SUPPORTED_EXCHANGES } from './exchangeConstants';

export interface ExchangeCredentials {
  apiKey: string;
  secretKey: string;
  testnet: boolean;
  passphrase?: string; // Required for some exchanges like OKX and KuCoin
}

export interface ExchangeConfig {
  // Core exchange credentials
  binance: ExchangeCredentials;
  telegram: {
    botToken: string;
    chatId: string;
    notifications: {
      trades: boolean;
      signals: boolean;
      alerts: boolean;
      dailySummary: boolean;
    };
  };
  
  // Optional exchanges
  bybit?: ExchangeCredentials;
  okx?: ExchangeCredentials & {
    passphrase: string; // OKX requires passphrase
  };
  kucoin?: ExchangeCredentials & {
    passphrase: string; // KuCoin requires passphrase
  };
  bitget?: ExchangeCredentials;
  
  // Multi-exchange settings
  preferredExchange?: typeof SUPPORTED_EXCHANGES[number];
  multiExchangeMode?: 'BEST_PRICE' | 'SPLIT_ORDERS' | 'ARBITRAGE' | 'PREFERRED_ONLY';
  exchangePriority?: Array<typeof SUPPORTED_EXCHANGES[number]>;
}

export const defaultConfig: ExchangeConfig = {
  binance: {
    apiKey: process.env.BINANCE_TESTNET_API_KEY || '',
    secretKey: process.env.BINANCE_TESTNET_SECRET_KEY || '',
    testnet: true
  },
  telegram: {
    botToken: '',
    chatId: '',
    notifications: {
      trades: true,
      signals: true, 
      alerts: true,
      dailySummary: true
    }
  },
  preferredExchange: 'BINANCE',
  multiExchangeMode: 'PREFERRED_ONLY',
  exchangePriority: ['BINANCE', 'BYBIT', 'OKX', 'KUCOIN', 'BITGET']
};

export function validateExchangeConfig(config: Partial<ExchangeConfig>): string[] {
  const errors: string[] = [];
  
  // Check preferred exchange if specified
  const preferredExchange = config.preferredExchange || 'BINANCE';
  
  // Validate based on preferred exchange
  switch (preferredExchange) {
    case 'BINANCE':
      if (!config.binance?.apiKey) {
        errors.push('Binance API key is required');
      }
      if (!config.binance?.secretKey) {
        errors.push('Binance secret key is required');
      }
      break;
    case 'BYBIT':
      if (!config.bybit?.apiKey) {
        errors.push('Bybit API key is required when Bybit is set as preferred exchange');
      }
      if (!config.bybit?.secretKey) {
        errors.push('Bybit secret key is required when Bybit is set as preferred exchange');
      }
      break;
    case 'OKX':
      if (!config.okx?.apiKey) {
        errors.push('OKX API key is required when OKX is set as preferred exchange');
      }
      if (!config.okx?.secretKey) {
        errors.push('OKX secret key is required when OKX is set as preferred exchange');
      }
      if (!config.okx?.passphrase) {
        errors.push('OKX passphrase is required when OKX is set as preferred exchange');
      }
      break;
    case 'KUCOIN':
      if (!config.kucoin?.apiKey) {
        errors.push('KuCoin API key is required when KuCoin is set as preferred exchange');
      }
      if (!config.kucoin?.secretKey) {
        errors.push('KuCoin secret key is required when KuCoin is set as preferred exchange');
      }
      if (!config.kucoin?.passphrase) {
        errors.push('KuCoin passphrase is required when KuCoin is set as preferred exchange');
      }
      break;
    case 'BITGET':
      if (!config.bitget?.apiKey) {
        errors.push('Bitget API key is required when Bitget is set as preferred exchange');
      }
      if (!config.bitget?.secretKey) {
        errors.push('Bitget secret key is required when Bitget is set as preferred exchange');
      }
      break;
  }
  
  // Multi-exchange mode validation
  if (config.multiExchangeMode && config.multiExchangeMode !== 'PREFERRED_ONLY') {
    // If using split orders or best price, we need at least 2 exchanges configured
    let configuredExchangeCount = 0;
    if (config.binance?.apiKey && config.binance?.secretKey) configuredExchangeCount++;
    if (config.bybit?.apiKey && config.bybit?.secretKey) configuredExchangeCount++;
    if (config.okx?.apiKey && config.okx?.secretKey && config.okx?.passphrase) configuredExchangeCount++;
    if (config.kucoin?.apiKey && config.kucoin?.secretKey && config.kucoin?.passphrase) configuredExchangeCount++;
    if (config.bitget?.apiKey && config.bitget?.secretKey) configuredExchangeCount++;
    
    if (configuredExchangeCount < 2 && 
        (config.multiExchangeMode === 'BEST_PRICE' || 
         config.multiExchangeMode === 'SPLIT_ORDERS' || 
         config.multiExchangeMode === 'ARBITRAGE')) {
      errors.push(`At least two exchanges must be configured for ${config.multiExchangeMode} mode`);
    }
    
    if (config.multiExchangeMode === 'ARBITRAGE' && configuredExchangeCount < 3) {
      errors.push('At least three exchanges must be configured for ARBITRAGE mode');
    }
  }
  
  // Telegram validation
  if (config.telegram) {
    if (!config.telegram.botToken) {
      errors.push('Telegram bot token is required if telegram is configured');
    }
    if (!config.telegram.chatId) {
      errors.push('Telegram chat ID is required if telegram is configured');
    }
  }
  
  return errors;
}

// Create exchange client based on exchange type
export function createExchangeClient(
  exchangeType: typeof SUPPORTED_EXCHANGES[number], 
  config: ExchangeConfig
) {
  switch (exchangeType) {
    case 'BINANCE':
      if (!config.binance) throw new Error('Binance configuration missing');
      return createBinanceClient(config.binance);
    case 'BYBIT':
      if (!config.bybit) throw new Error('Bybit configuration missing');
      return createBybitClient(config.bybit);
    case 'OKX':
      if (!config.okx) throw new Error('OKX configuration missing');
      return createOkxClient(config.okx);
    case 'KUCOIN':
      if (!config.kucoin) throw new Error('KuCoin configuration missing');
      return createKucoinClient(config.kucoin);
    case 'BITGET':
      if (!config.bitget) throw new Error('Bitget configuration missing');
      return createBitgetClient(config.bitget);
    case 'TESTNET':
      return createTestnetClient();
    default:
      throw new Error(`Unsupported exchange: ${exchangeType}`);
  }
}

// This is a placeholder - actual implementation would be in separate files
function createBinanceClient(credentials: ExchangeCredentials) {
  return { type: 'BINANCE', ...credentials, initialized: true };
}

function createBybitClient(credentials: ExchangeCredentials) {
  return { type: 'BYBIT', ...credentials, initialized: true };
}

function createOkxClient(credentials: ExchangeCredentials & { passphrase: string }) {
  return { type: 'OKX', ...credentials, initialized: true };
}

function createKucoinClient(credentials: ExchangeCredentials & { passphrase: string }) {
  return { type: 'KUCOIN', ...credentials, initialized: true };
}

function createBitgetClient(credentials: ExchangeCredentials) {
  return { type: 'BITGET', ...credentials, initialized: true };
}

function createTestnetClient() {
  return { type: 'TESTNET', initialized: true, testnet: true };
}
