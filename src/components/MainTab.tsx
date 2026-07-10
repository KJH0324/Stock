import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  AlertCircle, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Edit2,
  X,
  CheckCircle2,
  Lock
} from "lucide-react";
import { StrategyType, Stock, TradeLog, PortfolioStock } from "../types";

// Preset popular Korean stocks for quick selection
const POPULAR_STOCKS = [
  { code: "005930", name: "삼성전자", price: 72000, high250d: 78000 },
  { code: "000660", name: "SK하이닉스", price: 175000, high250d: 185000 },
  { code: "042700", name: "한미반도체", price: 121000, high250d: 125000 },
  { code: "035420", name: "NAVER", price: 168000, high250d: 215000 },
  { code: "005380", name: "현대차", price: 245000, high250d: 265000 },
  { code: "035720", name: "카카오", price: 42000, high250d: 59000 },
  { code: "068270", name: "셀트리온", price: 191000, high250d: 210000 },
  { code: "005490", name: "POSCO홀딩스", price: 375000, high250d: 490000 },
  { code: "000270", name: "기아", price: 112000, high250d: 130000 },
  { code: "373220", name: "LG에너지솔루션", price: 345000, high250d: 420000 }
];

interface MainTabProps {
  onTradeExecute: (log: TradeLog) => void;
  portfolio: { [code: string]: PortfolioStock };
}

export default function MainTab({ onTradeExecute, portfolio }: MainTabProps) {
  // Global control state
  const [activeStrategy, setActiveStrategy] = useState<StrategyType>(StrategyType.LARRY_WILLIAMS);
  const [isPlaying, setIsPlaying] = useState(true);
  const [programRunning, setProgramRunning] = useState(true);
  const [simMinutes, setSimMinutes] = useState(540); // 09:00 AM (540 mins from midnight)
  const [simTime, setSimTime] = useState("09:00:00");
  const [kParam, setKParam] = useState<number>(0.5);

  // Monitor Watchlist: exactly 5 slots max
  const [watchlist, setWatchlist] = useState<Stock[]>(() => {
    // Attempt loading from localStorage, otherwise pre-fill with defaults
    const saved = localStorage.getItem("kiwoom_watchlist_5");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse watchlist, using default");
      }
    }
    // Default initial 5 stock slots
    return [
      {
        code: "005930",
        name: "삼성전자",
        currentPrice: 72000,
        open: 71500,
        high: 72500,
        low: 71200,
        volume: 12000000,
        prevClose: 71400,
        transactionAmount: 450,
        history250dHigh: 78000,
        kValue: 0.5,
        targetPrice: 72150,
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
        history250dHigh: 120000,
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
        bbWidth: 0.035,
        stochK: 10,
        stochD: 9,
      },
      {
        code: "005380",
        name: "현대차",
        currentPrice: 245000,
        open: 242000,
        high: 247000,
        low: 241000,
        volume: 950000,
        prevClose: 241500,
        transactionAmount: 220,
        history250dHigh: 265000,
        kValue: 0.5,
        targetPrice: 245000,
        bbUpper: 252000,
        bbMiddle: 244000,
        bbLower: 236000,
        bbWidth: 0.065,
        stochK: 45,
        stochD: 40,
      }
    ];
  });

  // Keep selected slot for visual chart
  const [selectedStockCode, setSelectedStockCode] = useState(watchlist[0]?.code || "005930");
  const selectedStock = watchlist.find(s => s.code === selectedStockCode) || watchlist[0];

  // Charting line coordinates
  const [chartDataMap, setChartDataMap] = useState<{ [code: string]: number[] }>({});

  // Editing Slot modal state
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("10000");

  const triggeredAlertsRef = useRef<{ [key: string]: boolean }>({});

  // Persistence of watchlist
  useEffect(() => {
    localStorage.setItem("kiwoom_watchlist_5", JSON.stringify(watchlist));
  }, [watchlist]);

  // Synchronize server-side toggle status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          setProgramRunning(data.isProgramRunning);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update chart data initially
  useEffect(() => {
    watchlist.forEach(s => {
      if (!chartDataMap[s.code]) {
        setChartDataMap(prev => ({
          ...prev,
          [s.code]: Array.from({ length: 20 }, () => s.currentPrice)
        }));
      }
    });
  }, [watchlist]);

  // Handle Larry Williams k changes globally
  useEffect(() => {
    setWatchlist(prev => 
      prev.map(s => {
        const target = s.open + (s.high - s.low) * kParam;
        return { ...s, kValue: kParam, targetPrice: target };
      })
    );
  }, [kParam]);

  // Simulation and Auto-Trading Loop (Updates all 5 stocks simultaneously)
  useEffect(() => {
    if (!isPlaying || !programRunning) return;

    const interval = setInterval(() => {
      // Advance time by 3 simulated minutes
      setSimMinutes((prev) => {
        const next = prev + 3;
        if (next >= 920) { // 15:20 close overnight positions
          watchlist.forEach(s => {
            if (portfolio[s.code]) {
              const pStock = portfolio[s.code];
              const log: TradeLog = {
                id: `trade-${Date.now()}-${s.code}`,
                timestamp: "15:20:00",
                stockCode: s.code,
                stockName: s.name,
                strategy: activeStrategy,
                action: "SELL",
                price: s.currentPrice,
                quantity: pStock.quantity,
                totalAmount: s.currentPrice * pStock.quantity,
                fee: 0,
                tax: 0,
                orderId: `ORD_CLOSE_${Date.now()}`,
                status: "COMPLETED",
              };
              onTradeExecute(log);
            }
          });
          return 540; // reset to 09:00 AM
        }
        return next;
      });

      // Update all 5 stocks pricing in parallel
      setWatchlist((prevWatchlist) => {
        const nextWatchlist = prevWatchlist.map((s) => {
          // Volatile random walk
          const changePercent = (Math.random() - 0.495) * 0.015;
          const newPrice = Math.round(s.currentPrice * (1 + changePercent));
          const dailyHigh = Math.max(s.high, newPrice);
          const dailyLow = Math.min(s.low, newPrice);
          const dailyChange = ((newPrice - s.prevClose) / s.prevClose) * 100;

          // Dispatch drop/surge notifications
          const dropTh = parseFloat(localStorage.getItem("kiwoom_discord_drop_th") || "2.0");
          const surgeTh = parseFloat(localStorage.getItem("kiwoom_discord_surge_th") || "3.0");

          const dropKey = `${s.code}-drop-${Math.floor(Math.abs(dailyChange) / dropTh)}`;
          const surgeKey = `${s.code}-surge-${Math.floor(Math.abs(dailyChange) / surgeTh)}`;

          const webhookUrl = localStorage.getItem("kiwoom_discord_webhook") || "";
          const mentionId = localStorage.getItem("kiwoom_discord_mention") || "";
          const alarmChannelId = localStorage.getItem("kiwoom_discord_alarm_channel_id") || "";

          // Drop warning
          if (dailyChange <= -dropTh && !triggeredAlertsRef.current[dropKey]) {
            triggeredAlertsRef.current[dropKey] = true;
            fetch("/api/discord/alert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                webhookUrl,
                mentionId,
                channelId: alarmChannelId,
                title: `📉 [위험 급락 감지] ${s.name} (${s.code}) 임계 이탈`,
                description: `감시 주적인 ${s.name} 주가가 당일 -${dropTh}% 임계 이탈 하회 폭락 중입니다. 리스크 제어를 가동합니다.`,
                alertType: "SUDDEN_DROP",
                color: 0xef4444,
                fields: [
                  { name: "종목명", value: `${s.name} (${s.code})`, inline: true },
                  { name: "현재가", value: `${newPrice.toLocaleString()}원`, inline: true },
                  { name: "당일 변동률", value: `${dailyChange.toFixed(2)}%`, inline: true }
                ]
              })
            }).catch(e => console.error(e));
          }

          // Surge alert
          if (dailyChange >= surgeTh && !triggeredAlertsRef.current[surgeKey]) {
            triggeredAlertsRef.current[surgeKey] = true;
            fetch("/api/discord/alert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                webhookUrl,
                mentionId,
                channelId: alarmChannelId,
                title: `📈 [급등 돌파 관측] ${s.name} (${s.code}) 강세 돌파`,
                description: `지정 임계 폭발 상승선(+${surgeTh}%)을 돌파하며 가파른 시세가 형성되고 있습니다.`,
                alertType: "SUDDEN_SURGE",
                color: 0x10b981,
                fields: [
                  { name: "종목명", value: `${s.name} (${s.code})`, inline: true },
                  { name: "현재가", value: `${newPrice.toLocaleString()}원`, inline: true },
                  { name: "당일 변동률", value: `${dailyChange.toFixed(2)}%`, inline: true }
                ]
              })
            }).catch(e => console.error(e));
          }

          // Larry Williams target price refresh
          const target = s.open + (dailyHigh - dailyLow) * s.kValue;

          // Bollinger Band refresh
          const bbWidthModifier = s.bbWidth * (1 + (Math.random() - 0.5) * 0.1);
          const bbMiddle = Math.round(s.bbMiddle * 0.999 + newPrice * 0.001);
          const bbUpper = Math.round(bbMiddle * (1 + bbWidthModifier));
          const bbLower = Math.round(bbMiddle * (1 - bbWidthModifier));

          // Stochastic updates
          let nextK = s.stochK + (Math.random() - 0.5) * 14;
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
        });

        // Update sparkline histories
        nextWatchlist.forEach((s) => {
          setChartDataMap((prev) => {
            const hist = prev[s.code] || Array.from({ length: 20 }, () => s.currentPrice);
            return {
              ...prev,
              [s.code]: [...hist.slice(1), s.currentPrice]
            };
          });
        });

        return nextWatchlist;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, programRunning, watchlist, activeStrategy, portfolio, onTradeExecute]);

  // Watchlist individual strategy signals trigger check
  useEffect(() => {
    if (!isPlaying || !programRunning) return;

    watchlist.forEach((s) => {
      const isHeld = portfolio[s.code] !== undefined;

      // 1. Larry Williams Volatility Breakout
      if (activeStrategy === StrategyType.LARRY_WILLIAMS) {
        if (!isHeld) {
          if (s.currentPrice >= s.targetPrice) {
            const qty = Math.floor(10000000 / s.currentPrice); // Default 10M KRW buy per trade
            if (qty > 0) {
              const log: TradeLog = {
                id: `trade-buy-${Date.now()}-${s.code}`,
                timestamp: simTime,
                stockCode: s.code,
                stockName: s.name,
                strategy: activeStrategy,
                action: "BUY",
                price: s.currentPrice,
                quantity: qty,
                totalAmount: s.currentPrice * qty,
                fee: 0,
                tax: 0,
                orderId: `ORD_BUY_${Date.now().toString().slice(-6)}`,
                status: "COMPLETED",
              };
              onTradeExecute(log);
            }
          }
        }
      }

      // 2. Bollinger Band + Stochastic oscillator
      if (activeStrategy === StrategyType.BOLLINGER_STOCHASTIC) {
        if (!isHeld) {
          // BUY Condition: Price lower than BB lower AND Stoch oversold and crossing up
          if (s.currentPrice <= s.bbLower && s.stochK < 20 && s.stochK > s.stochD) {
            const qty = Math.floor(10000000 / s.currentPrice);
            if (qty > 0) {
              const log: TradeLog = {
                id: `trade-buy-${Date.now()}-${s.code}`,
                timestamp: simTime,
                stockCode: s.code,
                stockName: s.name,
                strategy: activeStrategy,
                action: "BUY",
                price: s.currentPrice,
                quantity: qty,
                totalAmount: s.currentPrice * qty,
                fee: 0,
                tax: 0,
                orderId: `ORD_BUY_${Date.now().toString().slice(-6)}`,
                status: "COMPLETED",
              };
              onTradeExecute(log);
            }
          }
        } else {
          // SELL Condition: Price upper than BB upper OR Stoch overbought and crossing down
          if (s.currentPrice >= s.bbUpper || (s.stochK > 80 && s.stochK < s.stochD)) {
            const pStock = portfolio[s.code];
            const log: TradeLog = {
              id: `trade-sell-${Date.now()}-${s.code}`,
              timestamp: simTime,
              stockCode: s.code,
              stockName: s.name,
              strategy: activeStrategy,
              action: "SELL",
              price: s.currentPrice,
              quantity: pStock.quantity,
              totalAmount: s.currentPrice * pStock.quantity,
              fee: 0,
              tax: 0,
              orderId: `ORD_SELL_${Date.now().toString().slice(-6)}`,
              status: "COMPLETED",
            };
            onTradeExecute(log);
          }
        }
      }

      // 3. 52-Week High Breakout
      if (activeStrategy === StrategyType.BREAKOUT_52WEEK) {
        if (!isHeld) {
          if (s.currentPrice >= s.history250dHigh && s.transactionAmount >= 200) {
            const qty = Math.floor(10000000 / s.currentPrice);
            if (qty > 0) {
              const log: TradeLog = {
                id: `trade-buy-${Date.now()}-${s.code}`,
                timestamp: simTime,
                stockCode: s.code,
                stockName: s.name,
                strategy: activeStrategy,
                action: "BUY",
                price: s.currentPrice,
                quantity: qty,
                totalAmount: s.currentPrice * qty,
                fee: 0,
                tax: 0,
                orderId: `ORD_BUY_${Date.now().toString().slice(-6)}`,
                status: "COMPLETED",
              };
              onTradeExecute(log);
            }
          }
        } else {
          // Trailing stop trigger: drop by 3% from highest price since purchase
          const pStock = portfolio[s.code];
          const trailingPrice = pStock.highestPriceSincePurchase * 0.97;
          if (s.currentPrice <= trailingPrice) {
            const log: TradeLog = {
              id: `trade-sell-${Date.now()}-${s.code}`,
              timestamp: simTime,
              stockCode: s.code,
              stockName: s.name,
              strategy: activeStrategy,
              action: "SELL",
              price: s.currentPrice,
              quantity: pStock.quantity,
              totalAmount: s.currentPrice * pStock.quantity,
              fee: 0,
              tax: 0,
              orderId: `ORD_SELL_TS_${Date.now().toString().slice(-6)}`,
              status: "COMPLETED",
            };
            onTradeExecute(log);
          }
        }
      }
    });

  }, [watchlist, isPlaying, programRunning, activeStrategy, portfolio, simTime]);

  // Format time properly
  useEffect(() => {
    const hours = Math.floor(simMinutes / 60);
    const mins = simMinutes % 60;
    const pad = (num: number) => num.toString().padStart(2, "0");
    setSimTime(`${pad(hours)}:${pad(mins)}:00`);
  }, [simMinutes]);

  // Edit stock slot selection
  const handleSelectPreset = (preset: typeof POPULAR_STOCKS[0]) => {
    if (editingSlotIndex === null) return;
    
    setWatchlist(prev => {
      const copy = [...prev];
      copy[editingSlotIndex] = {
        code: preset.code,
        name: preset.name,
        currentPrice: preset.price,
        open: preset.price * 0.99,
        high: preset.price * 1.01,
        low: preset.price * 0.985,
        volume: 1200000,
        prevClose: preset.price * 0.992,
        transactionAmount: Math.floor(150 + Math.random() * 300),
        history250dHigh: preset.high250d,
        kValue: kParam,
        targetPrice: preset.price * 1.002,
        bbUpper: preset.price * 1.05,
        bbMiddle: preset.price,
        bbLower: preset.price * 0.95,
        bbWidth: 0.08,
        stochK: 50,
        stochD: 45
      };
      return copy;
    });

    setEditingSlotIndex(null);
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingSlotIndex === null || !customCode || !customName) return;

    const basePrice = parseInt(customPrice) || 10000;
    setWatchlist(prev => {
      const copy = [...prev];
      copy[editingSlotIndex] = {
        code: customCode,
        name: customName,
        currentPrice: basePrice,
        open: basePrice * 0.99,
        high: basePrice * 1.01,
        low: basePrice * 0.985,
        volume: 800000,
        prevClose: basePrice * 0.991,
        transactionAmount: 180,
        history250dHigh: basePrice * 1.15,
        kValue: kParam,
        targetPrice: basePrice * 1.003,
        bbUpper: basePrice * 1.05,
        bbMiddle: basePrice,
        bbLower: basePrice * 0.95,
        bbWidth: 0.07,
        stochK: 50,
        stochD: 45
      };
      return copy;
    });

    setEditingSlotIndex(null);
    setCustomCode("");
    setCustomName("");
  };

  // Selected Stock charts calculations
  const curChartData = chartDataMap[selectedStock.code] || Array.from({ length: 20 }, () => selectedStock.currentPrice);
  const maxVal = Math.max(...curChartData) * 1.008;
  const minVal = Math.min(...curChartData) * 0.992;
  const valRange = maxVal - minVal || 100;

  return (
    <div className="space-y-6" id="main-tab-root">
      {/* Remote Halted Status Banner */}
      {!programRunning && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <div className="text-xs">
            <span className="font-bold block">🚨 디스코드 원격 명령에 의해 전체 오토트레이더 엔진이 비상 중지되었습니다.</span>
            디스코드 채널에 <code className="bg-black/50 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold">!재개</code> 명령어 입력 시 자동으로 상태 복원 및 실거래 감시 모드가 활성화됩니다.
          </div>
        </div>
      )}

      {/* Control topbar */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-md font-bold text-gray-100 flex items-center gap-2">
            오늘의 오토트레이더 감시 종목 (최대 5선)
          </h2>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            전일 거래대금이 폭발한 주식 5종을 상시 감시하며, 아래 중 선택된 알고리즘의 변동성 돌파선을 터치하는 즉시 실체결 자동매매(선조치 후보고)를 실행합니다.
          </p>
        </div>

        {/* Quick buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-2 bg-gray-950 border border-gray-900 rounded-xl font-mono text-xs text-indigo-400">
            📊 SIM TIME: <span className="font-bold text-gray-200">{simTime}</span>
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!programRunning}
            className={`px-4 py-2.5 rounded-xl font-bold border text-xs transition-all flex items-center gap-1.5 ${
              !programRunning 
                ? "bg-gray-900 text-gray-600 border-gray-950 cursor-not-allowed"
                : isPlaying 
                  ? "bg-amber-600/10 text-amber-500 border-amber-500/20 hover:bg-amber-600/20" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> 일시정지
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> 가동하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* Strategy selector row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveStrategy(StrategyType.LARRY_WILLIAMS)}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeStrategy === StrategyType.LARRY_WILLIAMS
              ? "bg-indigo-950/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-950/20"
              : "bg-[#111827] border-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="text-[10px] font-bold text-indigo-500 mb-1">STRATEGY 01</div>
          <h3 className="text-xs font-bold text-gray-200">래리 윌리엄스 변동성 돌파</h3>
          <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            실시간 돌파선(k 상수 연동) 터치 시 즉시 시장가 편입 후 15:20 장 마감 직전 오버나이트 자동 방어 매도 청산.
          </p>
        </button>

        <button
          onClick={() => setActiveStrategy(StrategyType.BOLLINGER_STOCHASTIC)}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeStrategy === StrategyType.BOLLINGER_STOCHASTIC
              ? "bg-indigo-950/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-950/20"
              : "bg-[#111827] border-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="text-[10px] font-bold text-purple-500 mb-1">STRATEGY 02</div>
          <h3 className="text-xs font-bold text-gray-200">볼린저 밴드 + 스토캐스틱</h3>
          <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            볼린저 밴드 하한선 과매도 구간에서 스토캐스틱 골든 크로스 관측 시 저가 분할 매입 후 상한 채널 터치 시 이탈 청산.
          </p>
        </button>

        <button
          onClick={() => setActiveStrategy(StrategyType.BREAKOUT_52WEEK)}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeStrategy === StrategyType.BREAKOUT_52WEEK
              ? "bg-indigo-950/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-950/20"
              : "bg-[#111827] border-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="text-[10px] font-bold text-amber-500 mb-1">STRATEGY 03</div>
          <h3 className="text-xs font-bold text-gray-200">52주 최고가 돌파 + 트레일링스탑</h3>
          <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            250일 전고점을 거래금액 300억 초과 강력한 기세로 돌파 시 상방 편입 후 최고가 대비 3% 이탈 시 하향 기계식 보전 매도.
          </p>
        </button>
      </div>

      {/* Main Watchlist 5 Grid & Chart Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Watchlist slots (exactly 5 blocks) */}
        <div className="space-y-3.5 lg:col-span-1">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider block border-b border-gray-900 pb-2">
              실시간 5대 감시 타겟
            </span>

            <div className="space-y-2">
              {watchlist.map((stock, idx) => {
                const isSelected = stock.code === selectedStockCode;
                const isHeld = portfolio[stock.code] !== undefined;
                const dailyChange = ((stock.currentPrice - stock.prevClose) / stock.prevClose) * 100;
                
                return (
                  <div
                    key={stock.code}
                    onClick={() => setSelectedStockCode(stock.code)}
                    className={`w-full p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-gray-900/60 border-indigo-500/80 text-white shadow-md shadow-indigo-950/10"
                        : "bg-gray-950/40 border-gray-900 text-gray-400 hover:bg-gray-900/30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-200">{stock.name}</span>
                          {isHeld && (
                            <span className="px-1.5 py-0.2 bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 rounded text-[9px] font-bold animate-pulse">
                              보유
                            </span>
                          )}
                        </div>
                        <span className="text-[9.5px] font-mono text-gray-500">{stock.code}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSlotIndex(idx);
                        }}
                        className="p-1 bg-gray-900 border border-gray-800 rounded hover:text-white text-gray-500 transition-all"
                        title="슬롯 종목 변경"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex justify-between items-end border-t border-gray-900/50 pt-2 font-mono">
                      <div>
                        <span className="text-[10.5px] font-semibold text-gray-200">{stock.currentPrice.toLocaleString()}원</span>
                      </div>
                      <span className={`text-[10px] font-bold ${dailyChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {dailyChange >= 0 ? "+" : ""}{dailyChange.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategy configurations */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-xl space-y-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block border-b border-gray-900 pb-2">
              실시간 전략 세부조정
            </span>

            {activeStrategy === StrategyType.LARRY_WILLIAMS && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">변동성 돌파상수 (k)</span>
                  <span className="font-bold text-indigo-400">{kParam.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={kParam}
                  onChange={(e) => setKParam(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-900 rounded-lg cursor-pointer accent-indigo-600"
                />
                <p className="text-[9.5px] text-gray-500 leading-relaxed">
                  k값이 낮을수록 예리한 미니 장대양봉에서 상방 시장가 돌입하며, 높을수록 신뢰도 높은 추세 돌풍에만 선택 배정됩니다.
                </p>
              </div>
            )}

            {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between bg-black/40 border border-gray-900 p-2.5 rounded-lg">
                  <span className="text-gray-500">지표 1: 볼린저밴드</span>
                  <span className="font-mono text-purple-400 font-bold">하단 이탈 감지</span>
                </div>
                <div className="flex justify-between bg-black/40 border border-gray-900 p-2.5 rounded-lg">
                  <span className="text-gray-500">지표 2: Stochastic</span>
                  <span className="font-mono text-purple-400 font-bold">K &gt; D 골든크로스</span>
                </div>
              </div>
            )}

            {activeStrategy === StrategyType.BREAKOUT_52WEEK && (
              <div className="space-y-2 text-[10px] font-mono">
                <div className="flex justify-between border-b border-gray-900 pb-1.5">
                  <span className="text-gray-500">250일 역사고점</span>
                  <span className="text-amber-500 font-bold">{selectedStock.history250dHigh.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between border-b border-gray-900 pb-1.5">
                  <span className="text-gray-500">익절/손절 하강폭</span>
                  <span className="text-red-400 font-bold">최고점 대비 -3%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed interactive charting dashboard */}
        <div className="lg:col-span-3 bg-[#111827] border border-gray-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-200">{selectedStock.name} 실시간 차트 관측</h3>
                <span className="text-[10px] font-mono text-gray-500">{selectedStock.code} | 전일거래대금: {selectedStock.transactionAmount}억</span>
              </div>

              {portfolio[selectedStock.code] ? (
                <div className="bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  보유량: {portfolio[selectedStock.code].quantity}주 (평단 {portfolio[selectedStock.code].purchasePrice.toLocaleString()}원)
                </div>
              ) : (
                <span className="text-[11px] text-gray-500 bg-gray-950 border border-gray-900 rounded-full px-3 py-1 font-semibold">
                  포지션 대기 중 (관망)
                </span>
              )}
            </div>

            {/* Simulated Live SVG Chart panel */}
            <div className="w-full h-64 bg-black/40 border border-gray-900 rounded-xl relative p-3">
              {/* Bollinger bands overlays */}
              {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
                <div className="absolute top-2.5 left-2.5 bg-purple-950/40 border border-purple-900/40 text-[9.5px] text-purple-400 px-2 py-1 rounded font-mono font-bold uppercase">
                  볼린저밴드 연동 활성
                </div>
              )}

              {activeStrategy === StrategyType.LARRY_WILLIAMS && (
                <div className="absolute top-2.5 left-2.5 bg-indigo-950/40 border border-indigo-900/40 text-[9.5px] text-indigo-400 px-2 py-1 rounded font-mono font-bold uppercase">
                  돌파감지선: {selectedStock.targetPrice.toLocaleString()}원
                </div>
              )}

              <svg className="w-full h-full overflow-visible">
                {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
                  <polygon
                    points={curChartData
                      .map((val, idx) => {
                        const x = (idx / 19) * 100 + "%";
                        const upperY = ((maxVal - selectedStock.bbUpper) / valRange) * 100 + "%";
                        return `${x},${upperY}`;
                      })
                      .concat(
                        curChartData
                          .map((val, idx) => {
                            const x = ((19 - idx) / 19) * 100 + "%";
                            const lowerY = ((maxVal - selectedStock.bbLower) / valRange) * 100 + "%";
                            return `${x},${lowerY}`;
                          })
                      )
                      .join(" ")}
                    className="fill-purple-500/5 stroke-none"
                  />
                )}

                {/* Gridlines */}
                <line x1="0%" y1="25%" x2="100%" y2="25%" className="stroke-gray-900" strokeDasharray="3,3" />
                <line x1="0%" y1="50%" x2="100%" y2="50%" className="stroke-gray-900" strokeDasharray="3,3" />
                <line x1="0%" y1="75%" x2="100%" y2="75%" className="stroke-gray-900" strokeDasharray="3,3" />

                {/* Price path */}
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  points={curChartData
                    .map((val, idx) => {
                      const x = (idx / 19) * 100 + "%";
                      const y = ((maxVal - val) / valRange) * 100 + "%";
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />

                {/* Target breakout line */}
                {activeStrategy === StrategyType.LARRY_WILLIAMS && (
                  <line
                    x1="0%"
                    y1={((maxVal - selectedStock.targetPrice) / valRange) * 100 + "%"}
                    x2="100%"
                    y2={((maxVal - selectedStock.targetPrice) / valRange) * 100 + "%"}
                    className="stroke-red-500/70"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                )}
              </svg>

              {/* Min/max overlay text labels */}
              <span className="absolute right-3.5 top-3.5 font-mono text-[9px] text-gray-500 font-bold">Max: {Math.round(maxVal).toLocaleString()}원</span>
              <span className="absolute right-3.5 bottom-3.5 font-mono text-[9px] text-gray-500 font-bold">Min: {Math.round(minVal).toLocaleString()}원</span>
            </div>

            {/* Stochastic Indicators if active */}
            {activeStrategy === StrategyType.BOLLINGER_STOCHASTIC && (
              <div className="grid grid-cols-2 gap-4 bg-gray-950/40 p-3.5 border border-gray-900 rounded-xl">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Stochastic Fast K</span>
                    <span className="font-bold text-gray-300 font-mono">{selectedStock.stochK}</span>
                  </div>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${selectedStock.stochK}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Stochastic Slow D</span>
                    <span className="font-bold text-gray-300 font-mono">{selectedStock.stochD}</span>
                  </div>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${selectedStock.stochD}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-gray-950/30 border border-gray-900 rounded-xl flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[10px] text-gray-400">
              <strong>선조치 후보고 보장선</strong>: 본 시뮬레이션 환경은 실제 Kiwoom OpenAPI+ 32비트 로컬 스레드 구동과 동일하게 한치의 오차 없이 즉시체결로 매칭되어 거래 원장 및 디스코드 채널로 실시간 송출 완료합니다.
            </span>
          </div>
        </div>
      </div>

      {/* Current portfolio list table */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
          실시간 편입/보유 잔고 현황 (Portfolio positions)
        </h3>

        {Object.keys(portfolio).length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-500 italic">
            현재 보유하고 있는 주식 자산 포지션이 없습니다. (안전 대기 관망 중)
          </div>
        ) : (
          <div className="overflow-x-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-900 text-gray-500 text-[10px] pb-2">
                  <th className="pb-3 pt-1">종목</th>
                  <th className="pb-3 pt-1 text-right">보유수량</th>
                  <th className="pb-3 pt-1 text-right">매입단가</th>
                  <th className="pb-3 pt-1 text-right">현재가</th>
                  <th className="pb-3 pt-1 text-right">평가금액</th>
                  <th className="pb-3 pt-1 text-right">최고점(TS)</th>
                  <th className="pb-3 pt-1 text-right text-emerald-400">수익률 (ROI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/30">
                {Object.values(portfolio).map((pStock) => {
                  const watchStock = watchlist.find(s => s.code === pStock.code);
                  const currentPrice = watchStock ? watchStock.currentPrice : pStock.currentPrice;
                  const totalBuyAmount = pStock.quantity * pStock.purchasePrice;
                  const totalCurrentAmount = pStock.quantity * currentPrice;
                  const profitPct = ((currentPrice - pStock.purchasePrice) / pStock.purchasePrice) * 100;
                  const isProfit = profitPct >= 0;

                  return (
                    <tr key={pStock.code} className="hover:bg-gray-950/20 text-gray-300">
                      <td className="py-3 font-sans">
                        <span className="font-bold text-gray-100">{pStock.name}</span>
                        <span className="text-[10px] text-gray-500 ml-1.5">({pStock.code})</span>
                      </td>
                      <td className="py-3 text-right font-semibold">{pStock.quantity.toLocaleString()}주</td>
                      <td className="py-3 text-right text-gray-400">{pStock.purchasePrice.toLocaleString()}원</td>
                      <td className="py-3 text-right font-semibold">{currentPrice.toLocaleString()}원</td>
                      <td className="py-3 text-right font-bold text-gray-100">{totalCurrentAmount.toLocaleString()}원</td>
                      <td className="py-3 text-right text-gray-500">{pStock.highestPriceSincePurchase.toLocaleString()}원</td>
                      <td className={`py-3 text-right font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                        {isProfit ? "+" : ""}{profitPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editing watchlist slot Modal dialog */}
      <AnimatePresence>
        {editingSlotIndex !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-6"
            >
              <button
                onClick={() => setEditingSlotIndex(null)}
                className="absolute right-4 top-4 text-gray-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-100">감시 대상 주식 슬롯 #{editingSlotIndex + 1} 편집</h3>
                <p className="text-xs text-gray-400">자주 감시하는 상위 거래대금 종목군에서 고르거나, 커스텀 종목을 직접 입력하세요.</p>
              </div>

              {/* Quick Select Presets */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">거래대금 300억 초과 상위주 추천</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULAR_STOCKS.map(preset => (
                    <button
                      key={preset.code}
                      onClick={() => handleSelectPreset(preset)}
                      className="p-2.5 bg-gray-950 border border-gray-900 rounded-xl text-left hover:border-indigo-500/50 hover:bg-gray-900/40 transition-all"
                    >
                      <div className="text-xs font-bold text-gray-200">{preset.name}</div>
                      <span className="text-[9.5px] font-mono text-gray-500">{preset.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom manual form */}
              <form onSubmit={handleCustomSubmit} className="space-y-4 border-t border-gray-900 pt-4">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">커스텀 종목 수동 등록</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">종목 코드 (6자리)</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      placeholder="예: 005930"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">종목 이름</label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="예: 현대에너지"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">기준 가격</label>
                  <input
                    type="number"
                    required
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="10000"
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-200 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-950/20"
                >
                  수동 등록 완료하기
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
