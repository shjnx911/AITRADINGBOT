import { EXCHANGE_CONFIGS } from './exchangeConstants';
import { ExchangeConfig, createExchangeClient } from './exchangeSettings';

// Unified interface for all exchange clients
export interface UnifiedExchangeClient {
    exchange: string;
    credentials: {
        apiKey: string;
        secretKey: string;
        testnet: boolean;
        passphrase?: string;
    };

    // Market data methods
    getPrice(symbol: string): Promise<number>;
    getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
    getKlines(symbol: string, timeframe: string, limit?: number): Promise<Kline[]>;

    // Trading methods
    createOrder(params: OrderParams): Promise<Order>;
    cancelOrder(orderId: string, symbol: string): Promise<boolean>;
    getOpenOrders(symbol?: string): Promise<Order[]>;
    getOrderStatus(orderId: string, symbol: string): Promise<Order>;

    // Account methods
    getBalance(): Promise<Balance[]>;
    getPositions(symbol?: string): Promise<Position[]>;

    // Exchange-specific features
    supportsFeature(feature: string): boolean;

    // Initialize and validate connection
    initialize(): Promise<boolean>;
    testConnection(): Promise<boolean>;
}

// Các interface OrderBook, Kline, OrderParams, Order, Balance, Position giữ nguyên như bạn đã định nghĩa

// Multi-exchange client that can work with multiple exchanges
export class MultiExchangeClient {
    private clients: Map<string, UnifiedExchangeClient> = new Map();
    private config: ExchangeConfig;
    private mode: 'BEST_PRICE' | 'SPLIT_ORDERS' | 'ARBITRAGE' | 'PREFERRED_ONLY';
    private preferredExchange: string;
    private exchangePriority: string[];

    constructor(config: ExchangeConfig) {
        this.config = config;
        this.mode = config.multiExchangeMode || 'PREFERRED_ONLY';
        this.preferredExchange = config.preferredExchange || 'BINANCE';
        this.exchangePriority = config.exchangePriority || ['BINANCE', 'BYBIT', 'OKX', 'KUCOIN', 'BITGET'];

        // Initialize available exchanges
        this.initializeExchanges();
    }

    private async initializeExchanges() {
        // Create client for each configured exchange
        if (this.config.binance?.apiKey && this.config.binance?.secretKey) {
            const client = createExchangeClient('BINANCE', this.config) as UnifiedExchangeClient;
            this.clients.set('BINANCE', client);
            // Gọi initialize trên client nếu nó có (điều này phụ thuộc vào createExchangeClient)
            if (client && typeof client.initialize === 'function') {
                await client.initialize().catch(error => console.error('Failed to initialize Binance:', error));
            }
        }

        if (this.config.bybit?.apiKey && this.config.bybit?.secretKey) {
            const client = createExchangeClient('BYBIT', this.config) as UnifiedExchangeClient;
            this.clients.set('BYBIT', client);
            if (client && typeof client.initialize === 'function') {
                await client.initialize().catch(error => console.error('Failed to initialize Bybit:', error));
            }
        }

        if (this.config.okx?.apiKey && this.config.okx?.secretKey && this.config.okx?.passphrase) {
            const client = createExchangeClient('OKX', this.config) as UnifiedExchangeClient;
            this.clients.set('OKX', client);
            if (client && typeof client.initialize === 'function') {
                await client.initialize().catch(error => console.error('Failed to initialize OKX:', error));
            }
        }

        if (this.config.kucoin?.apiKey && this.config.kucoin?.secretKey && this.config.kucoin?.passphrase) {
            const client = createExchangeClient('KUCOIN', this.config) as UnifiedExchangeClient;
            this.clients.set('KUCOIN', client);
            if (client && typeof client.initialize === 'function') {
                await client.initialize().catch(error => console.error('Failed to initialize Kucoin:', error));
            }
        }

        if (this.config.bitget?.apiKey && this.config.bitget?.secretKey) {
            const client = createExchangeClient('BITGET', this.config) as UnifiedExchangeClient;
            this.clients.set('BITGET', client);
            if (client && typeof client.initialize === 'function') {
                await client.initialize().catch(error => console.error('Failed to initialize Bitget:', error));
            }
        }

        // If no exchange is configured, use testnet
        if (this.clients.size === 0) {
            const client = createExchangeClient('TESTNET', this.config) as UnifiedExchangeClient;
            this.clients.set('TESTNET', client);
            this.preferredExchange = 'TESTNET';
            if (client && typeof client.initialize === 'function') {
                await client.initialize().catch(error => console.error('Failed to initialize Testnet:', error));
            }
        }
    }

    // Các phương thức khác của MultiExchangeClient giữ nguyên

    // Test all connections
    async testConnections(): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const [exchange, client] of this.clients.entries()) {
            try {
                if (typeof client.testConnection === 'function') {
                    results[exchange] = await client.testConnection();
                } else {
                    console.warn(`Client for ${exchange} does not implement testConnection.`);
                    results[exchange] = false;
                }
            } catch (error) {
                console.error(`Connection test failed for ${exchange}:`, error);
                results[exchange] = false;
            }
        }

        return results;
    }
}

// Interface for arbitrage opportunities
export interface ArbitrageOpportunity {
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    profitPercent: number;
    direction: string;
}