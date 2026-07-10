export enum StrategyType {
  LARRY_WILLIAMS = "LARRY_WILLIAMS",
  BOLLINGER_STOCHASTIC = "BOLLINGER_STOCHASTIC",
  BREAKOUT_52WEEK = "BREAKOUT_52WEEK",
}

export interface Stock {
  code: string;
  name: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
  transactionAmount: number; // in billion KRW (억 원)
  history250dHigh: number; // 52-week high (250-day peak)
  
  // Larry Williams Volatility Breakout values
  kValue: number;
  targetPrice: number;
  
  // Bollinger Bands (20, 2) values
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number; // For Squeeze detection
  
  // Stochastic Oscillator (14, 3, 3)
  stochK: number;
  stochD: number;
}

export interface TradeLog {
  id: string;
  timestamp: string;
  stockCode: string;
  stockName: string;
  strategy: StrategyType;
  action: "BUY" | "SELL";
  price: number;
  quantity: number;
  totalAmount: number;
  fee: number;
  tax: number;
  orderId: string;
  status: "CONFIRMED" | "UNCONFIRMED_REVERSAL" | "COMPLETED";
}

export interface PortfolioStock {
  code: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  highestPriceSincePurchase: number; // for trailing stop
  targetPrice: number; // for breakout
}

export interface ThrottlingMetrics {
  secondLimit: number;
  minuteLimit: number;
  hourLimit: number;
  secondCount: number;
  minuteCount: number;
  hourCount: number;
  isBlocked: boolean;
  blockReason: string;
}

export interface SimulationConfig {
  mode: "REAL" | "VIRTUAL";
  initialCapital: number;
  balance: number;
  portfolio: { [code: string]: PortfolioStock };
  tradingFeeRate: number; // REAL: 0.015%, VIRTUAL: 0.350%
  taxRate: number; // 0.20%
  slippageMultiplier: number; // REAL: 0.05% - 0.20%, VIRTUAL: 0%
  useTWAP: boolean;
}
