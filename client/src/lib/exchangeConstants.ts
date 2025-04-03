// Exchange settings and constants

export const SUPPORTED_EXCHANGES = ['BINANCE', 'BYBIT', 'OKX', 'KUCOIN', 'BITGET', 'TESTNET'];

export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

export const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'AVAX/USDT', 'DOT/USDT'];

export interface ExchangeConfig {
  name: string;
  fees: {
    maker: number;
    taker: number;
    funding?: {
      interval: string; // e.g. '8h'
      average: number;  // average funding rate
    };
  };
  leverageOptions: number[];
  futures: boolean;
  margin: boolean;
  maxLeverage: number;
  minLeverage: number;
  webhookSupport: boolean;
  telegram: boolean; // Indicates if the exchange supports Telegram notifications
  apiInfo?: {
    endpointUrl: string;
    wsEndpoint?: string; // WebSocket endpoint
    hasTestnet: boolean;
    testnetUrl?: string;
    requiresSignature: boolean;
    rateLimit: {
      requestsPerMinute: number;
      orderRateLimit: number;
    };
    authentication: 'HMAC' | 'JWT' | 'API_KEY_ONLY';
  };
  features: {
    dcaSupport: boolean;
    trailingStopLoss: boolean;
    takeProfitLevels: boolean;
    marketOrders: boolean;
    limitOrders: boolean;
    stopOrders: boolean;
    historicalData: boolean;
    algorithmicOrders: boolean;
  };
  withdrawalFees: Record<string, number>; // Currency -> Fee amount
  minimumTrade: Record<string, number>; // Currency -> Minimum trade size
}

export const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  BINANCE: {
    name: 'Binance',
    fees: {
      maker: 0.0002, // 0.02%
      taker: 0.0004, // 0.04%
      funding: {
        interval: '8h',
        average: 0.0001 // 0.01% average
      }
    },
    leverageOptions: [1, 2, 3, 5, 10, 20, 50, 125],
    futures: true,
    margin: true,
    maxLeverage: 125,
    minLeverage: 1,
    webhookSupport: true,
    telegram: true,
    apiInfo: {
      endpointUrl: 'https://api.binance.com',
      wsEndpoint: 'wss://stream.binance.com:9443/ws',
      hasTestnet: true,
      testnetUrl: 'https://testnet.binancefuture.com',
      requiresSignature: true,
      rateLimit: {
        requestsPerMinute: 1200,
        orderRateLimit: 100
      },
      authentication: 'HMAC'
    },
    features: {
      dcaSupport: true,
      trailingStopLoss: true,
      takeProfitLevels: true,
      marketOrders: true,
      limitOrders: true,
      stopOrders: true,
      historicalData: true,
      algorithmicOrders: true
    },
    withdrawalFees: {
      'BTC': 0.0005,
      'ETH': 0.005,
      'USDT': 1.0,
      'USDC': 1.0
    },
    minimumTrade: {
      'BTC/USDT': 0.0001,
      'ETH/USDT': 0.001,
      'SOL/USDT': 0.01,
      'XRP/USDT': 1,
      'BNB/USDT': 0.01
    }
  },
  BYBIT: {
    name: 'Bybit',
    fees: {
      maker: 0.0001, // 0.01%
      taker: 0.0006, // 0.06%
      funding: {
        interval: '8h',
        average: 0.0001
      }
    },
    leverageOptions: [1, 2, 3, 5, 10, 20, 50, 100],
    futures: true,
    margin: true,
    maxLeverage: 100,
    minLeverage: 1,
    webhookSupport: true,
    telegram: true,
    apiInfo: {
      endpointUrl: 'https://api.bybit.com',
      wsEndpoint: 'wss://stream.bybit.com/v5/public/linear',
      hasTestnet: true,
      testnetUrl: 'https://api-testnet.bybit.com',
      requiresSignature: true,
      rateLimit: {
        requestsPerMinute: 600,
        orderRateLimit: 60
      },
      authentication: 'HMAC'
    },
    features: {
      dcaSupport: true,
      trailingStopLoss: true,
      takeProfitLevels: true,
      marketOrders: true,
      limitOrders: true,
      stopOrders: true,
      historicalData: true,
      algorithmicOrders: true
    },
    withdrawalFees: {
      'BTC': 0.0005,
      'ETH': 0.005,
      'USDT': 1.0,
      'USDC': 1.0
    },
    minimumTrade: {
      'BTC/USDT': 0.0001,
      'ETH/USDT': 0.01,
      'SOL/USDT': 0.1,
      'XRP/USDT': 10,
      'BNB/USDT': 0.01
    }
  },
  OKX: {
    name: 'OKX',
    fees: {
      maker: 0.0002, // 0.02%
      taker: 0.0005, // 0.05%
      funding: {
        interval: '8h',
        average: 0.00015
      }
    },
    leverageOptions: [1, 3, 5, 10, 20, 50, 75, 100],
    futures: true,
    margin: true,
    maxLeverage: 100,
    minLeverage: 1,
    webhookSupport: false,
    telegram: true,
    apiInfo: {
      endpointUrl: 'https://www.okx.com',
      wsEndpoint: 'wss://ws.okx.com:8443/ws/v5/public',
      hasTestnet: true,
      testnetUrl: 'https://www.okx.com/api/v5/demos',
      requiresSignature: true,
      rateLimit: {
        requestsPerMinute: 300,
        orderRateLimit: 20
      },
      authentication: 'HMAC'
    },
    features: {
      dcaSupport: true,
      trailingStopLoss: true,
      takeProfitLevels: true,
      marketOrders: true,
      limitOrders: true,
      stopOrders: true,
      historicalData: true,
      algorithmicOrders: false
    },
    withdrawalFees: {
      'BTC': 0.0008,
      'ETH': 0.006,
      'USDT': 1.2,
      'USDC': 1.5
    },
    minimumTrade: {
      'BTC/USDT': 0.0001,
      'ETH/USDT': 0.01,
      'SOL/USDT': 0.5,
      'XRP/USDT': 20,
      'BNB/USDT': 0.05
    }
  },
  KUCOIN: {
    name: 'KuCoin',
    fees: {
      maker: 0.0002, // 0.02%
      taker: 0.0006, // 0.06%
      funding: {
        interval: '8h',
        average: 0.00012
      }
    },
    leverageOptions: [1, 2, 3, 5, 10, 20, 50],
    futures: true,
    margin: true,
    maxLeverage: 50,
    minLeverage: 1,
    webhookSupport: false,
    telegram: true,
    apiInfo: {
      endpointUrl: 'https://api.kucoin.com',
      wsEndpoint: 'wss://push-stream.kucoin.com/endpoint',
      hasTestnet: true,
      testnetUrl: 'https://api-sandbox.kucoin.com',
      requiresSignature: true,
      rateLimit: {
        requestsPerMinute: 180,
        orderRateLimit: 30
      },
      authentication: 'HMAC'
    },
    features: {
      dcaSupport: true,
      trailingStopLoss: true,
      takeProfitLevels: true,
      marketOrders: true,
      limitOrders: true,
      stopOrders: true,
      historicalData: true,
      algorithmicOrders: false
    },
    withdrawalFees: {
      'BTC': 0.0004,
      'ETH': 0.004,
      'USDT': 2.0,
      'USDC': 2.0
    },
    minimumTrade: {
      'BTC/USDT': 0.0001,
      'ETH/USDT': 0.01,
      'SOL/USDT': 0.1,
      'XRP/USDT': 10,
      'BNB/USDT': 0.01
    }
  },
  BITGET: {
    name: 'Bitget',
    fees: {
      maker: 0.0002, // 0.02%
      taker: 0.0006, // 0.06%
      funding: {
        interval: '8h',
        average: 0.0001
      }
    },
    leverageOptions: [1, 3, 5, 10, 20, 50, 100, 125],
    futures: true,
    margin: true,
    maxLeverage: 125,
    minLeverage: 1,
    webhookSupport: false,
    telegram: true,
    apiInfo: {
      endpointUrl: 'https://api.bitget.com',
      wsEndpoint: 'wss://ws.bitget.com/mix/v1/stream',
      hasTestnet: false,
      requiresSignature: true,
      rateLimit: {
        requestsPerMinute: 150,
        orderRateLimit: 20
      },
      authentication: 'HMAC'
    },
    features: {
      dcaSupport: true,
      trailingStopLoss: true,
      takeProfitLevels: true,
      marketOrders: true,
      limitOrders: true,
      stopOrders: true,
      historicalData: true,
      algorithmicOrders: false
    },
    withdrawalFees: {
      'BTC': 0.0005,
      'ETH': 0.005,
      'USDT': 1.0,
      'USDC': 1.0
    },
    minimumTrade: {
      'BTC/USDT': 0.0001,
      'ETH/USDT': 0.001,
      'SOL/USDT': 0.01,
      'XRP/USDT': 5,
      'BNB/USDT': 0.01
    }
  },
  TESTNET: {
    name: 'Testnet',
    fees: {
      maker: 0,
      taker: 0,
      funding: {
        interval: '8h',
        average: 0
      }
    },
    leverageOptions: [1, 2, 3, 5, 10, 20, 50, 100],
    futures: true,
    margin: true,
    maxLeverage: 100,
    minLeverage: 1,
    webhookSupport: false,
    telegram: true,
    apiInfo: {
      endpointUrl: 'https://testnet.binancefuture.com',
      wsEndpoint: 'wss://stream.binancefuture.com/ws',
      hasTestnet: true,
      requiresSignature: true,
      rateLimit: {
        requestsPerMinute: 2400,
        orderRateLimit: 300
      },
      authentication: 'HMAC'
    },
    features: {
      dcaSupport: true,
      trailingStopLoss: true,
      takeProfitLevels: true,
      marketOrders: true,
      limitOrders: true,
      stopOrders: true,
      historicalData: true,
      algorithmicOrders: true
    },
    withdrawalFees: {
      'BTC': 0,
      'ETH': 0,
      'USDT': 0,
      'USDC': 0
    },
    minimumTrade: {
      'BTC/USDT': 0.0001,
      'ETH/USDT': 0.001,
      'SOL/USDT': 0.01,
      'XRP/USDT': 1,
      'BNB/USDT': 0.01
    }
  }
};