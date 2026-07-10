import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RefreshCw, TrendingUp, Sliders, AlertCircle, ShoppingCart, Info, TrendingDown } from "lucide-react";
import { StrategyType, Stock, TradeLog } from "../types";

// Static mock stocks with their 52-week parameters and base values
const INITIAL_STOCKS: Stock[] = [
  {
    code: "005930",
    name: "삼성전자",
    currentPrice: 72000,
    open: 71500,
    high: 72500,
    low: 71200,
    volume: 12000000,
    prevClose: 71400,
    transactionAmount: 450, // 4500억 (300억 필터 통과)
    history250dHigh: 78000,
    kValue: 0.5,
    targetPrice: 72150, // 71500 + (72500-71200)*0.5
    bbUpper: 74500,
    bbMiddle: 72000,
    bbLower: 69500,
    bbWidth: 0.07,
    stochK: 35,
    stochD: 30,
  },
  {
    code: "000660",
    name: "SK하이닉스",
    currentPrice: 175000,
    open: 171000,
    high: 177500,
    low: 170500,
    volume: 3500000,
    prevClose: 170800,
    transactionAmount: 610,
    history250dHigh: 185000,
    kValue: 0.5,
    targetPrice: 174500,
    bbUpper: 182000,
    bbMiddle: 173000,
    bbLower: 164000,
    bbWidth: 0.1,
    stochK: 15,
    stochD: 18,
  },
  {
    code: "042700",
    name: "한미반도체",
    currentPrice: 121000,
    open: 115000,
    high: 123000,
    low: 114500,
    volume: 2400000,
    prevClose: 114200,
    transactionAmount: 290,
    history250dHigh: 120000, // Trigger 52-week high breakout!
    kValue: 0.5,
    targetPrice: 119250,
    bbUpper: 124000,
    bbMiddle: 116000,
    bbLower: 108000,
    bbWidth: 0.14,
    stochK: 78,
    stochD: 72,
  },
  {
    code: "035420",
    name: "NAVER",
    currentPrice: 168000,
    open: 169000,
    high: 170000,
    low: 167500,
    volume: 800000,
    prevClose: 169200,
    transactionAmount: 135,
    history250dHigh: 215000,
    kValue: 0.5,
    targetPrice: 170250,
    bbUpper: 172000,
    bbMiddle: 169000,
    bbLower: 166000,
    bbWidth: 0.035, // Squeeze!
    stochK: 10, // Extreme oversold for swing strategy
    stochD: 9,
  }
];

export default function StrategySimulator({ onTradeExecute }: { onTradeExecute: (log: TradeLog) => void }) {
  const [activeStrategy, setActiveStrategy] = useState<StrategyType>(StrategyType.LARRY_WILLIAMS);
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [selectedStock, setSelectedStock] = useState<Stock>(INITIAL_STOCKS[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [kParam, setKParam] = useState<number>(0.5);
  const [simTime, setSimTime] = useState<string>("09:00:00");
  const [simMinutes, setSimMinutes] = useState(540); // Minutes from 00:00 (540 = 09:00 AM)
  const [chartData, setChartData] = useState<number[]>(Array.from({ length: 20 }, () => selectedStock.currentPrice));
  const [heldStock, setHeldStock] = useState<{ code: string; buyPrice: number; qty: number; peakPrice: number } | null>(null);

  const prevStockRef = useRef<string>(selectedStock.code);

  // Synchronize parameter across selected stock
  useEffect(() => {
    setStocks((prev) =>
      prev.map((s) => {
        if (s.code === selectedStock.code) {
          const target = s.open + (s.high - s.low) * kParam;
          return { ...s, kValue: kParam, targetPrice: target };
        }
        return s;
      })
    );
  }, [kParam, selectedStock.code]);

  // Handle stock selection change
  useEffect(() => {
    if (prevStockRef.current !== selectedStock.code) {
      setChartData(Array.from({ length: 20 }, () => selectedStock.currentPrice));
      prevStockRef.current = selectedStock.code;
    }
  }, [selectedStock]);

  // Simulate time and live prices
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Advance time by 3 simulated minutes
      setSimMinutes((prev) => {
        const next = prev + 3;
        if (next >= 920) { // 15:20 close risk auto check
          // Auto close overnight positions as per Volatility Breakout rules
          if (heldStock) {
            const currentPrice = selectedStock.currentPrice;
            const log: TradeLog = {
              id: `trade-${Date.now()}`,
              timestamp: "15:20:00",
              stockCode: heldStock.code,
              stockName: selectedStock.name,
              strategy: activeStrategy,
              action: "SELL",
              price: currentPrice,
              quantity: heldStock.qty,
              totalAmount: currentPrice * heldStock.qty,
              fee: 0, // calculated downstream
              tax: 0,
              orderId: `ORD_CLOSE_${Date.now()}`,
              status: "COMPLETED",
            };
            onTradeExecute(log);
            setHeldStock(null);
          }
          return 540; // reset to 09:00 AM
        }
        return next;
      });

      // Update Simulated stock prices with subtle random walk
      setStocks((prev) =>
        prev.map((s) => {
          const changePercent = (Math.random() - 0.49) * 0.015; // slightly upward bias or volatile random walk
          const newPrice = Math.round(s.currentPrice * (1 + changePercent));
          const dailyHigh = Math.max(s.high, newPrice);
          const dailyLow = Math.min(s.low, newPrice);
          
          // Re-calculate indicators
          const target = s.open + (dailyHigh - dailyLow) * s.kValue;
          
          // Squeeze and Bollinger bands movement
          const bbWidthModifier = s.bbWidth * (1 + (Math.random() - 0.5) * 0.1);
          const bbMiddle = Math.round(s.bbMiddle * 0.999 + newPrice * 0.001);
          const bbUpper = Math.round(bbMiddle * (1 + bbWidthModifier));
          const bbLower = Math.round(bbMiddle * (1 - bbWidthModifier));

          // Stochastic updates
          let nextK = s.stochK + (Math.random() - 0.5) * 12;
          nextK = Math.max(2, Math.min(98, nextK));
          const nextD = Math.round(s.stochD * 0.7 + nextK * 0.3);

          return {
            ...s,
            currentPrice: newPrice,
            high: dailyHigh,
            low: dailyLow,
            targetPrice: target,
            bbUpper,
            bbMiddle,
            bbLower,
            stochK: Math.round(nextK),
            stochD: Math.round(nextD),
          };
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, heldStock, selectedStock, activeStrategy, onTradeExecute]);

  // Handle individual stock price stream and automatic triggers
  useEffect(() => {
    const updatedSelected = stocks.find((s) => s.code === selectedStock.code);
    if (!updatedSelected) return;
    
    setSelectedStock(updatedSelected);
    setChartData((prev) => [...prev.slice(1), updatedSelected.currentPrice]);

    // Active Strategy triggers
    if (activeStrategy === StrategyType.LARRY_WILLIAMS && !heldStock) {
      // Buy trigger: currentPrice >= targetPrice
      if (updatedSelected.currentPrice >= updatedSelected.targetPrice) {
        const qty = Math.floor(10000000 / updatedSelected.currentPrice); // Mock buy amount of 10M KRW
        if (qty > 0) {
          const log: TradeLog = {
            id: `trade-buy-${Date.now()}`,
            timestamp: simTime,
            stockCode: updatedSelected.code,
            stockName: updatedSelected.name,
            strategy: activeStrategy,
            action: "BUY",
            price: updatedSelected.currentPrice,
            quantity: qty,
            totalAmount: updatedSelected.currentPrice * qty,
            fee: 0,
            tax: 0,
            orderId: `ORD_BUY_${Date.now()}`,
            status: "COMPLETED",
          };
          onTradeExecute(log);
          setHeldStock({
            code: updatedSelected.code,
            buyPrice: updatedSelected.currentPrice,
            qty,
            peakPrice: updatedSelected.currentPrice,
          });
        }
      }
    }

    if (activeStrategy === StrategyType.BOLLINGER_STOCHASTIC) {
      if (!heldStock) {
        // Buy condition: Price below BB Lower AND Stochastic K & D < 20 AND Golden Cross (K > D)
        if (
          updatedSelected.currentPrice <= updatedSelected.bbLower &&
          updatedSelected.stochK < 25 &&
          updatedSelected.stochK > updatedSelected.stochD
        ) {
          const qty = Math.floor(10000000 / updatedSelected.currentPrice);
          if (qty > 0) {
            const log: TradeLog = {
              id: `trade-buy-${Date.now()}`,
              timestamp: simTime,
              stockCode: updatedSelected.code,
              stockName: updatedSelected.name,
              strategy: activeStrategy,
              action: "BUY",
              price: updatedSelected.currentPrice,
              quantity: qty,
              totalAmount: updatedSelected.currentPrice * qty,
              fee: 0,
              tax: 0,
              orderId: `ORD_BUY_${Date.now()}`,
              status: "COMPLETED",
            };
            onTradeExecute(log);
            setHeldStock({
              code: updatedSelected.code,
              buyPrice: updatedSelected.currentPrice,
              qty,
              peakPrice: updatedSelected.currentPrice,
            });
          }
        }
      } else {
        // Sell condition: Price reaches BB Upper OR Stochastic K & D > 80 AND Dead Cross (K < D)
        if (
          updatedSelected.currentPrice >= updatedSelected.bbUpper ||
          (updatedSelected.stochK > 75 && updatedSelected.stochK < updatedSelected.stochD)
        ) {
          const log: TradeLog = {
            id: `trade-sell-${Date.now()}`,
            timestamp: simTime,
            stockCode: heldStock.code,
            stockName: updatedSelected.name,
            strategy: activeStrategy,
            action: "SELL",
            price: updatedSelected.currentPrice,
            quantity: heldStock.qty,
            totalAmount: updatedSelected.currentPrice * heldStock.qty,
            fee: 0,
            tax: 0,
            orderId: `ORD_SELL_${Date.now()}`,
            status: "COMPLETED",
          };
          onTradeExecute(log);
          setHeldStock(null);
        }
      }
    }

    if (activeStrategy === StrategyType.BREAKOUT_52WEEK) {
      if (!heldStock) {
        // Buy condition: 52-week breakout with transactionAmount > 300 billion (30B cutoff)
        if (
          updatedSelected.currentPrice >= updatedSelected.history250dHigh &&
          updatedSelected.transactionAmount >= 250 // billion KRW filter
        ) {
          const qty = Math.floor(10000000 / updatedSelected.currentPrice);
          if (qty > 0) {
            const log: TradeLog = {
              id: `trade-buy-${Date.now()}`,
              timestamp: simTime,
              stockCode: updatedSelected.code,
              stockName: updatedSelected.name,
              strategy: activeStrategy,
              action: "BUY",
              price: updatedSelected.currentPrice,
              quantity: qty,
              totalAmount: updatedSelected.currentPrice * qty,
              fee: 0,
              tax: 0,
              orderId: `ORD_BUY_${Date.now()}`,
              status: "COMPLETED",
            };
            onTradeExecute(log);
            setHeldStock({
              code: updatedSelected.code,
              buyPrice: updatedSelected.currentPrice,
              qty,
              peakPrice: updatedSelected.currentPrice,
            });
          }
        }
      } else {
        // Update peak price
        const currentPeak = Math.max(heldStock.peakPrice, updatedSelected.currentPrice);
        if (currentPeak > heldStock.peakPrice) {
          setHeldStock((prev) => prev ? { ...prev, peakPrice: currentPeak } : null);
        }

        // Trailing Stop trigger: Sell immediately if dropped by 3% or more from peak price
        const trailingStopPrice = currentPeak * 0.97; // 3% stop loss threshold
        if (updatedSelected.currentPrice <= trailingStopPrice) {
          const log: TradeLog = {
            id: `trade-sell-${Date.now()}`,
            timestamp: simTime,
            stockCode: heldStock.code,
            stockName: updatedSelected.name,
            strategy: activeStrategy,
            action: "SELL",
            price: updatedSelected.currentPrice,
            quantity: heldStock.qty,
            totalAmount: updatedSelected.currentPrice * heldStock.qty,
            fee: 0,
            tax: 0,
            orderId: `ORD_SELL_TS_${Date.now()}`,
            status: "COMPLETED",
          };
          onTradeExecute(log);
          setHeldStock(null);
        }
      }
    }

  }, [stocks, selectedStock.code, activeStrategy, heldStock, simTime]);

  // Format time properly from minutes
  useEffect(() => {
    const hours = Math.floor(simMinutes / 60);
    const mins = simMinutes % 60;
    const pad = (num: number) => num.toString().padStart(2, "0");
    setSimTime(`${pad(hours)}:${pad(mins)}:00`);
  }, [simMinutes]);

  // Compute graphic variables for canvas representation
  const maxVal = Math.max(...chartData) * 1.01;
  const minVal = Math.min(...chartData) * 0.99;
  const valRange = maxVal - minVal || 100;

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl" id="strategy-simulator-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            논문 기반 3대 퀀트 알고리즘 실시간 엔진
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            수학적 규칙과 지표(볼린저 밴드, 스토캐스틱, 52주 고점, 변동성 돌파)를 바탕으로 구동되는 전략 테스터
          </p>
        </div>

        {/* Sim state controls */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-gray-950 rounded-lg border border-gray-900 font-mono text-xs text-emerald-400">
            📊 SIMULATED TIME: <span className="font-bold">{simTime}</span>
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg transition-all border ${
              isPlaying 
                ? "bg-amber-600/10 text-amber-500 border-amber-500/20 hover:bg-amber-600/20" 
                : "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500"
            }`}
            title={isPlaying ? "일시정지" : "계속"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation for strategies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
        <button
          onClick={() => {
            setActiveStrategy(StrategyType.LARRY_WILLIAMS);
            setHeldStock(null);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeStrategy === StrategyType.LARRY_WILLIAMS
              ? "bg-blue-950/20 border-blue-500 text-blue-300"
              : "bg-gray-900/30 border-gray-900 text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">STRATEGY 1</div>
          <h3 className="text-sm font-semibold">래리 윌리엄스 변동성 돌파</h3>
          <p className="text-[10px] text-gray-400 mt-1">
            전일 변동폭 × k 돌파 시 즉각 진입 및 15:20 당일 청산 (오버나이트 헷징)
          </p>
        </button>

        <button
          onClick={() => {
            setActiveStrategy(StrategyType.BOLLINGER_STOCHASTIC);
            setHeldStock(null);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeStrategy === StrategyType.BOLLINGER_STOCHASTIC
              ? "bg-purple-950/20 border-purple-500 text-purple-300"
              : "bg-gray-900/30 border-gray-900 text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-1">STRATEGY 2</div>
          <h3 className="text-sm font-semibold">볼린저 밴드 + 스토캐스틱</h3>
          <p className="text-[10px] text-gray-400 mt-1">
            밴드 하단 이탈 과매도 지점 + Stochastic 골든 크로스 반등 시점 포착 진입
          </p>
        </button>

        <button
          onClick={() => {
            setActiveStrategy(StrategyType.BREAKOUT_52WEEK);
            setHeldStock(null);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeStrategy === StrategyType.BREAKOUT_52WEEK
              ? "bg-amber-950/20 border-amber-500 text-amber-300"
              : "bg-gray-900/30 border-gray-900 text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">STRATEGY 3</div>
          <h3 className="text-sm font-semibold">52주 신고가 돌파 + 트레일링 스탑</h3>
          <p className="text-[10px] text-gray-400 mt-1">
            250일 역사적 신고가 돌파(거래금액 300억 초과) + 최고점 대비 3% 하락 청산
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left pane: Stocks Selector & Params */}
        <div className="space-y-4">
          <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-4">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 block">감시 및 포착 대상 주식</span>
            <div className="space-y-2">
              {stocks.map((stock) => {
                const isSelected = stock.code === selectedStock.code;
                return (
                  <button
                    key={stock.code}
                    onClick={() => setSelectedStock(stock)}
                    className={`w-full p-2.5 rounded-lg border flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? "bg-gray-900 border-gray-700 text-white"
                        : "bg-transparent border-transparent hover:bg-gray-900/30 text-gray-400"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{stock.name}</div>
                      <span className="text-[10px] text-gray-500 font-mono">{stock.code}</span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="font-semibold">{stock.currentPrice.toLocaleString()}원</div>
                      <span className="text-[9px] text-gray-500">대금: {stock.transactionAmount}억</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strategy config fields */}
          <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-4 space-y-4">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">전략 환경 변수 조정</span>

            {activeStrategy === StrategyType.LARRY_WILLIAMS && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">변동성 돌파 상수 (k)</span>
                  <span className="font-mono text-blue-400 font-bold">{kParam.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={kParam}
                  onChange={(e) => setKParam(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1 bg-gray-800 rounded-lg"
                />
                <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                  k 값이 낮을수록 돌파 포지션 진입이 잦아지고, 높을수록 보수적이고 안전한 돌파만을 필터링합니다. (통상 0.5가 권장됩니다.)
                </div>
              </div>
            )}

            {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-gray-900/40 p-2 border border-gray-900 rounded text-xs text-purple-300">
                  <span>밴드 폭 수축 상태</span>
                  <span className="font-mono font-bold">
                    {selectedStock.bbWidth < 0.05 ? "⚡ SQUEEZE (에너지 압축)" : "NORMAL"}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 leading-relaxed">
                  볼린저 밴드 간격이 밀집(Squeeze)된 주식은 곧 강력한 시세 수렴 및 확산 폭발 모멘텀을 분출하게 됩니다.
                </div>
              </div>
            )}

            {activeStrategy === StrategyType.BREAKOUT_52WEEK && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-gray-900 pb-2 text-[11px]">
                  <span className="text-gray-500">250일 역사적 고점</span>
                  <span className="font-mono text-amber-500 font-semibold">{selectedStock.history250dHigh.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between border-b border-gray-900 pb-2 text-[11px]">
                  <span className="text-gray-500">트레일링스탑 임계값</span>
                  <span className="font-mono text-red-400 font-semibold">최고점 대비 -3%</span>
                </div>
                <div className="text-[10px] text-gray-500 leading-relaxed mt-2">
                  52주 신고가 종목은 매물 장벽이 완전히 허물어진 유체역학적 폭등 기질이 있으나 낙폭 역시 깊으므로, 최고점 대비 3% 강제 청산(Trailing Stop)을 반드시 연동합니다.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Custom Charting Board */}
        <div className="lg:col-span-3 bg-gray-950/60 border border-gray-900 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-200">{selectedStock.name} 실시간 차트</h3>
                <span className="text-[10px] font-mono text-gray-500">{selectedStock.code}</span>
              </div>
              
              {heldStock ? (
                <div className="px-3 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 rounded-full text-xs font-bold animate-pulse flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  보유 중: {heldStock.buyPrice.toLocaleString()}원 ({heldStock.qty}주)
                </div>
              ) : (
                <div className="px-3 py-1 bg-gray-900 text-gray-500 border border-gray-800 rounded-full text-xs font-medium">
                  보유 자산 없음 (관망 상태)
                </div>
              )}
            </div>

            {/* Custom SVG Line Chart */}
            <div className="w-full h-56 bg-black/40 border border-gray-900 rounded-lg p-2.5 relative">
              <svg className="w-full h-full overflow-visible">
                {/* Draw Bollinger Bands underlay if active */}
                {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
                  <>
                    {/* Fill band channel */}
                    <polygon
                      points={chartData
                        .map((val, idx) => {
                          const x = (idx / 19) * 100 + "%";
                          // scale upper and lower bands dynamically relative to price
                          const upperPrice = selectedStock.bbUpper;
                          const lowerPrice = selectedStock.bbLower;
                          const scaleVal = (val: number) => 100 - ((val - minVal) / valRange) * 100;
                          return `${(idx / 19) * 350},${scaleVal(upperPrice)}`;
                        })
                        .join(" ")}
                      className="fill-purple-500/5 stroke-none"
                    />
                    
                    {/* Upper BB line */}
                    <line
                      x1="0%"
                      y1={`${100 - ((selectedStock.bbUpper - minVal) / valRange) * 100}%`}
                      x2="100%"
                      y2={`${100 - ((selectedStock.bbUpper - minVal) / valRange) * 100}%`}
                      className="stroke-purple-800/60 stroke-1 stroke-dasharray-[2_4]"
                    />
                    <text
                      x="98%"
                      y={`${100 - ((selectedStock.bbUpper - minVal) / valRange) * 100}%`}
                      className="fill-purple-400/70 text-[9px] font-mono text-right"
                      alignmentBaseline="middle"
                      textAnchor="end"
                    >
                      BB Upper
                    </text>

                    {/* Lower BB line */}
                    <line
                      x1="0%"
                      y1={`${100 - ((selectedStock.bbLower - minVal) / valRange) * 100}%`}
                      x2="100%"
                      y2={`${100 - ((selectedStock.bbLower - minVal) / valRange) * 100}%`}
                      className="stroke-purple-800/60 stroke-1"
                    />
                    <text
                      x="98%"
                      y={`${100 - ((selectedStock.bbLower - minVal) / valRange) * 100}%`}
                      className="fill-purple-400/70 text-[9px] font-mono text-right"
                      alignmentBaseline="middle"
                      textAnchor="end"
                    >
                      BB Lower
                    </text>
                  </>
                )}

                {/* Draw Volatility target price line if active */}
                {activeStrategy === StrategyType.LARRY_WILLIAMS && (
                  <>
                    <line
                      x1="0%"
                      y1={`${100 - ((selectedStock.targetPrice - minVal) / valRange) * 100}%`}
                      x2="100%"
                      y2={`${100 - ((selectedStock.targetPrice - minVal) / valRange) * 100}%`}
                      className="stroke-blue-500 stroke-1.5 stroke-dasharray-[4_3]"
                    />
                    <text
                      x="98%"
                      y={`${100 - ((selectedStock.targetPrice - minVal) / valRange) * 100}%`}
                      className="fill-blue-400 text-[10px] font-semibold"
                      alignmentBaseline="middle"
                      textAnchor="end"
                    >
                      돌파선 {selectedStock.targetPrice.toLocaleString()}원
                    </text>
                  </>
                )}

                {/* Draw 250d historical high if active */}
                {activeStrategy === StrategyType.BREAKOUT_52WEEK && (
                  <>
                    <line
                      x1="0%"
                      y1={`${100 - ((selectedStock.history250dHigh - minVal) / valRange) * 100}%`}
                      x2="100%"
                      y2={`${100 - ((selectedStock.history250dHigh - minVal) / valRange) * 100}%`}
                      className="stroke-amber-500 stroke-1.5"
                    />
                    <text
                      x="98%"
                      y={`${100 - ((selectedStock.history250dHigh - minVal) / valRange) * 100}%`}
                      className="fill-amber-400 text-[10px] font-semibold"
                      alignmentBaseline="middle"
                      textAnchor="end"
                    >
                      52주 신고가 기준 {selectedStock.history250dHigh.toLocaleString()}원
                    </text>

                    {/* Draw Trailing Stop Dotted boundary if holding */}
                    {heldStock && (
                      <>
                        <line
                          x1="0%"
                          y1={`${100 - (((heldStock.peakPrice * 0.97) - minVal) / valRange) * 100}%`}
                          x2="100%"
                          y2={`${100 - (((heldStock.peakPrice * 0.97) - minVal) / valRange) * 100}%`}
                          className="stroke-red-500 stroke-1 stroke-dasharray-[3_3]"
                        />
                        <text
                          x="98%"
                          y={`${100 - (((heldStock.peakPrice * 0.97) - minVal) / valRange) * 100}%`}
                          className="fill-red-400 text-[9px] font-mono"
                          alignmentBaseline="middle"
                          textAnchor="end"
                        >
                          Trailing Stop ({(heldStock.peakPrice * 0.97).toLocaleString()}원)
                        </text>
                      </>
                    )}
                  </>
                )}

                {/* Grid lines */}
                <line x1="0%" y1="25%" x2="100%" y2="25%" className="stroke-gray-900 stroke-1" />
                <line x1="0%" y1="50%" x2="100%" y2="50%" className="stroke-gray-900 stroke-1" />
                <line x1="0%" y1="75%" x2="100%" y2="75%" className="stroke-gray-900 stroke-1" />

                {/* Chart main price line */}
                <path
                  d={chartData
                    .map((val, idx) => {
                      const x = (idx / 19) * 100 + "%";
                      const y = 100 - ((val - minVal) / valRange) * 100 + "%";
                      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                    })
                    .join(" ")}
                  className={`fill-none stroke-2 ${
                    activeStrategy === StrategyType.LARRY_WILLIAMS
                      ? "stroke-blue-400"
                      : activeStrategy === StrategyType.BOLLINGER_STOCHASTIC
                      ? "stroke-purple-400"
                      : "stroke-amber-400"
                  }`}
                />
              </svg>
            </div>
          </div>

          {/* Underlay panel for Stochastic oscillator if strategy 2 is active */}
          {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
            <div className="mt-4 bg-black/20 p-3 rounded-lg border border-gray-900/60">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-purple-400/90 font-bold">Stochastic Oscillator (14, 3, 3)</span>
                <span className="font-mono text-gray-400">
                  %K: <strong className="text-purple-300">{selectedStock.stochK}</strong> | %D:{" "}
                  <strong className="text-purple-400">{selectedStock.stochD}</strong>
                </span>
              </div>
              <div className="h-10 bg-black/60 rounded relative flex items-center">
                {/* Draw oversold/overbought guidelines */}
                <div className="absolute top-[20%] left-0 right-0 border-t border-gray-950 border-dashed" />
                <div className="absolute bottom-[20%] left-0 right-0 border-t border-gray-950 border-dashed" />
                
                {/* Live %K and %D indicators represented beautifully as horizontal metrics */}
                <div className="w-full px-3 flex gap-4 text-[11px] font-mono justify-around">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-purple-500 rounded-full" />
                    <span className="text-gray-400">%K: {selectedStock.stochK}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-purple-300 rounded-full" />
                    <span className="text-gray-400">%D: {selectedStock.stochD}</span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    selectedStock.stochK <= 20 
                      ? "bg-purple-950 text-purple-400 border border-purple-900 animate-pulse" 
                      : "text-gray-600 bg-gray-900"
                  }`}>
                    {selectedStock.stochK <= 20 ? "OVERSOLD (과매도 구간)" : "NEUTRAL"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Educational strategic guidelines */}
          <div className="mt-4 flex gap-2 items-start bg-gray-900/40 p-3 rounded-lg border border-gray-900 text-xs text-gray-400 leading-relaxed">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              {activeStrategy === StrategyType.LARRY_WILLIAMS && (
                <p>
                  <strong>돌파 매수 조건</strong>: 장중 체결단가가 돌파선(전일 고점-저점 차이 × k)을 상향 돌파 시, 강한 모멘텀 추종이 입증된 것으로 간주해 전량 시장가 매수 진입합니다. 야간 낙폭 우려를 피하고자 15:20분 전량 일괄 매도 정리가 수반됩니다.
                </p>
              )}
              {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
                <p>
                  <strong>반등 매수 조건</strong>: 가격이 볼린저 밴드 하한선 이하에서 하향 이탈하며 극대적 지지 구간에 도달하고, Stochastic 보조 지표 %K 가 20 이하 극심한 과매도 상태에서 %D 선을 아래에서 위로 치솟는 골든크로스를 낼 때 진입합니다.
                </p>
              )}
              {activeStrategy === StrategyType.BREAKOUT_52WEEK && (
                <p>
                  <strong>역사적 돌파 매수</strong>: 당일 거래대금이 최소 300억 원 이상 폭발하고 주가가 250일 역사적 전고점을 완벽히 제압하여 전방 악성 매물 대기 물량을 소화해 낸 최강 주도주 위주로 편입합니다. 최고가 대비 3% 이탈 시 Trailing Stop으로 긴급 방어합니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
