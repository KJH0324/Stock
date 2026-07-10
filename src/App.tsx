import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LineChart, 
  Activity, 
  FileSpreadsheet, 
  Settings, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Power
} from "lucide-react";

// Types
import { TradeLog, PortfolioStock } from "./types";

// New modular Tab components
import MainTab from "./components/MainTab";
import StatsTab from "./components/StatsTab";
import LogsTab from "./components/LogsTab";
import SettingsTab from "./components/SettingsTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<"MAIN" | "STATS" | "LOGS" | "SETTINGS">("MAIN");
  
  // Real-time account details
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem("kiwoom_sim_balance");
    return saved ? parseInt(saved) : 100000000; // 1억 원 (100M KRW)
  });
  const [initialCapital, setInitialCapital] = useState<number>(() => {
    const saved = localStorage.getItem("kiwoom_sim_initial_capital");
    return saved ? parseInt(saved) : 100000000;
  });
  
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>(() => {
    const saved = localStorage.getItem("kiwoom_sim_tradelogs");
    return saved ? JSON.parse(saved) : [];
  });

  // Track multi-stock portfolios
  const [portfolio, setPortfolio] = useState<{ [code: string]: PortfolioStock }>(() => {
    const saved = localStorage.getItem("kiwoom_sim_portfolio");
    return saved ? JSON.parse(saved) : {};
  });

  // Unified fee rate setup
  const [customFeeRate, setCustomFeeRate] = useState<number>(() => {
    const saved = localStorage.getItem("kiwoom_custom_fee_rate");
    // Default to 0.00% if real-mode often has fee waiver, but let's default to 0.35% for mock
    const tradingMode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";
    if (saved) return parseFloat(saved);
    return tradingMode === "REAL" ? 0.0000 : 0.0035; 
  });

  const [totalFees, setTotalFees] = useState<number>(() => {
    const saved = localStorage.getItem("kiwoom_sim_total_fees");
    return saved ? parseInt(saved) : 0;
  });

  const [totalTaxes, setTotalTaxes] = useState<number>(() => {
    const saved = localStorage.getItem("kiwoom_sim_total_taxes");
    return saved ? parseInt(saved) : 0;
  });

  const [engineStatus, setEngineStatus] = useState<boolean>(true);

  const [apiConnected, setApiConnected] = useState<boolean>(true); // Kiwoom REST API Direct Connection Mode is active

  const [tradingMode, setTradingMode] = useState<string>(() => {
    return localStorage.getItem("kiwoom_trading_mode") || "MOCK";
  });

  // Keep tradingMode in sync when we navigate back from Settings Tab
  useEffect(() => {
    setTradingMode(localStorage.getItem("kiwoom_trading_mode") || "MOCK");
  }, [activeTab]);

  // Synchronize with Kiwoom OpenAPI REST API on mount and tab transitions
  useEffect(() => {
    const loadKiwoomAssets = async () => {
      try {
        const appkey = localStorage.getItem("kiwoom_api_key") || "";
        const secretkey = localStorage.getItem("kiwoom_api_secret") || "";
        const accountNo = localStorage.getItem("kiwoom_account_no") || "";
        const mode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";

        // 1. Request access token via au10001
        const tokenRes = await fetch("/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "x-trading-mode": mode
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
            appkey,
            secretkey
          })
        });

        if (!tokenRes.ok) throw new Error("OAuth token acquisition failed");
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (accessToken) {
          sessionStorage.setItem("kiwoom_access_token", accessToken);

          // 2. Query Estimated Asset Lookup (kt00003)
          const acntRes = await fetch("/api/dostk/acnt", {
            method: "POST",
            headers: {
              "Content-Type": "application/json;charset=UTF-8",
              "Authorization": `Bearer ${accessToken}`,
              "api-id": "kt00003",
              "x-trading-mode": mode
            },
            body: JSON.stringify({
              account_no: accountNo,
              pwd: ""
            })
          });

          if (acntRes.ok) {
            const acntData = await acntRes.json();
            if (acntData && acntData.output && acntData.output.est_ast_amt) {
              const apiBalance = parseInt(acntData.output.est_ast_amt);
              setBalance(apiBalance);
              localStorage.setItem("kiwoom_sim_balance", apiBalance.toString());
              
              if (acntData.output.dps) {
                const apiInitial = parseInt(acntData.output.dps);
                setInitialCapital(apiInitial);
                localStorage.setItem("kiwoom_sim_initial_capital", apiInitial.toString());
              }
              return; // Loaded successfully via OpenAPI
            }
          }
        }
      } catch (err) {
        console.error("Failed to load real-time Kiwoom assets via OpenAPI:", err);
      }

      // Local fallback if OAuth/API is not configured or offline
      const savedBalance = localStorage.getItem("kiwoom_sim_balance");
      if (savedBalance) {
        setBalance(parseInt(savedBalance));
      }
    };

    loadKiwoomAssets();
  }, [activeTab]);

  // Profit/Loss Monitoring logic
  useEffect(() => {
    if (!engineStatus) return;

    // Daily Profit Target Halt
    const profitTarget = parseInt(localStorage.getItem("kiwoom_daily_profit_target") || "9999999999");
    const currentProfit = balance - initialCapital;
    
    if (currentProfit >= profitTarget) {
      handleToggleEngine();
      dispatchHaltAlert("PROFIT_TARGET_REACHED", currentProfit);
    }

    // Max Cumulative Loss Halt
    const lossLimit = parseInt(localStorage.getItem("kiwoom_discord_loss_limit") || "50000000");
    if (currentProfit <= -lossLimit) {
      handleToggleEngine();
      dispatchHaltAlert("LOSS_LIMIT_REACHED", currentProfit);
    }
  }, [balance, engineStatus]);

  const dispatchHaltAlert = (reason: string, profit: number) => {
    const webhookUrl = localStorage.getItem("kiwoom_discord_webhook") || "";
    const alarmChannelId = localStorage.getItem("kiwoom_discord_alarm_channel_id") || "";
    const mentionId = localStorage.getItem("kiwoom_discord_mention") || "";

    const isProfit = reason === "PROFIT_TARGET_REACHED";
    
    fetch("/api/discord/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl,
        mentionId,
        channelId: alarmChannelId,
        title: isProfit ? "🎯 [목표 수익 달성] 자동 매매 종료" : "🚨 [최대 손실 제한] 비상 가동 중지",
        description: isProfit 
          ? `설정하신 일일 목표 수익(${profit.toLocaleString()}원)에 도달하여 금일 매매를 안전하게 종료합니다.`
          : `누적 손실이 제한선(-${Math.abs(profit).toLocaleString()}원)을 초과하여 자산 보호를 위해 가동을 즉시 중단합니다.`,
        alertType: "SYSTEM_HALT",
        color: isProfit ? 0x10b981 : 0xef4444,
        fields: [
          { name: "종료 사유", value: reason, inline: true },
          { name: "현재 실현 손익", value: `${profit.toLocaleString()}원`, inline: true },
          { name: "엔진 상태", value: "OFF (강제 중지)", inline: true }
        ]
      })
    }).catch(e => console.error(e));
  };

  // Auto-save changes to localStorage to ensure absolute persistence and synchronize with server-side REST API
  useEffect(() => {
    localStorage.setItem("kiwoom_sim_balance", balance.toString());
    localStorage.setItem("kiwoom_sim_tradelogs", JSON.stringify(tradeLogs));
    localStorage.setItem("kiwoom_sim_portfolio", JSON.stringify(portfolio));
    localStorage.setItem("kiwoom_sim_total_fees", totalFees.toString());
    localStorage.setItem("kiwoom_sim_total_taxes", totalTaxes.toString());

    // Sync client assets with server API to maintain absolute consistency
    fetch("/api/account/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance })
    }).catch((err) => console.error("API Balance Update error:", err));
  }, [balance, tradeLogs, portfolio, totalFees, totalTaxes]);

  // Check Discord remotely halted status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          setEngineStatus(data.isProgramRunning);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleEngine = async () => {
    try {
      const res = await fetch("/api/system/toggle", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setEngineStatus(data.isProgramRunning);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTradeExecute = (newLog: TradeLog) => {
    // 1. Calculate Fees & Taxes
    const feeRate = customFeeRate;
    const taxRate = newLog.action === "SELL" ? 0.0020 : 0; // 0.20% Securities tax

    const computedFee = Math.round(newLog.totalAmount * feeRate);
    const computedTax = Math.round(newLog.totalAmount * taxRate);

    const logEntry: TradeLog = {
      ...newLog,
      fee: computedFee,
      tax: computedTax
    };

    // Update Logs list
    setTradeLogs((prev) => [logEntry, ...prev]);

    // 2. Adjust Portfolio & Balance
    let nextBalance = balance;
    if (newLog.action === "BUY") {
      nextBalance = balance - newLog.totalAmount - computedFee;
      
      // Add position
      setPortfolio((prev) => {
        const copy = { ...prev };
        if (copy[newLog.stockCode]) {
          const existing = copy[newLog.stockCode];
          const newQty = existing.quantity + newLog.quantity;
          const avgPrice = Math.round((existing.quantity * existing.purchasePrice + newLog.totalAmount) / newQty);
          copy[newLog.stockCode] = {
            ...existing,
            quantity: newQty,
            purchasePrice: avgPrice,
            currentPrice: newLog.price,
            highestPriceSincePurchase: Math.max(existing.highestPriceSincePurchase, newLog.price),
            stopLossPrice: newLog.stopLossPrice || existing.stopLossPrice,
            takeProfitPrice: newLog.takeProfitPrice || existing.takeProfitPrice
          };
        } else {
          copy[newLog.stockCode] = {
            code: newLog.stockCode,
            name: newLog.stockName,
            quantity: newLog.quantity,
            purchasePrice: newLog.price,
            currentPrice: newLog.price,
            highestPriceSincePurchase: newLog.price,
            targetPrice: newLog.price,
            stopLossPrice: newLog.stopLossPrice,
            takeProfitPrice: newLog.takeProfitPrice
          };
        }
        return copy;
      });
    } else {
      // SELL Position
      nextBalance = balance + newLog.totalAmount - computedFee - computedTax;
      
      // Fully liquidate held position
      setPortfolio((prev) => {
        const copy = { ...prev };
        delete copy[newLog.stockCode];
        return copy;
      });
    }

    setBalance(nextBalance);
    setTotalFees((prev) => prev + computedFee);
    setTotalTaxes((prev) => prev + computedTax);

    // 3. Dispatch Live Discord Reports
    const webhookUrl = localStorage.getItem("kiwoom_discord_webhook") || "";
    const logChannelId = localStorage.getItem("kiwoom_discord_log_channel_id") || "";
    const mentionId = localStorage.getItem("kiwoom_discord_mention") || "";

    const isBuy = newLog.action === "BUY";
    const title = isBuy 
      ? `📈 [자동매수 완료] ${newLog.stockName} (${newLog.stockCode})` 
      : `📉 [자동매도 완료] ${newLog.stockName} (${newLog.stockCode})`;

    const description = isBuy
      ? "알고리즘 상방 저항 돌파가 감지되어 매수 체결(선조치) 후 보고 드립니다."
      : "알고리즘 이탈/낙폭제한선이 감지되어 매도 청산(선조치) 후 보고 드립니다.";

    fetch("/api/discord/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl,
        mentionId,
        channelId: logChannelId,
        title,
        description,
        alertType: isBuy ? "TRADE_BUY" : "TRADE_SELL",
        color: isBuy ? 0x10b981 : 0xef4444,
        fields: [
          { name: "종목구분", value: `${newLog.stockName} (${newLog.stockCode})`, inline: true },
          { name: "체결방식", value: isBuy ? "시장가 매수 (BUY)" : "시장가 매도 (SELL)", inline: true },
          { name: "체결단가", value: `${newLog.price.toLocaleString()}원`, inline: true },
          { name: "체결수량", value: `${newLog.quantity.toLocaleString()}주`, inline: true },
          { name: "정산총액", value: `${newLog.totalAmount.toLocaleString()}원`, inline: true },
          { name: "처리구분", value: "알고리즘 선조치 완료", inline: true }
        ]
      })
    }).catch(err => console.error("Discord send failed:", err));

    // Excessive cumulative loss alert
    const lossLimitStr = localStorage.getItem("kiwoom_discord_loss_limit") || "500000";
    const lossLimit = parseInt(lossLimitStr);
    const currentLoss = nextBalance - initialCapital;

    if (currentLoss < 0 && Math.abs(currentLoss) >= lossLimit) {
      const alarmChannelId = localStorage.getItem("kiwoom_discord_alarm_channel_id") || "";
      fetch("/api/discord/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl,
          mentionId,
          channelId: alarmChannelId,
          title: "🚨 [임계 경보] 누적 허용 손실액 돌파",
          description: `가용한 누적 허용 손실 임계값(-${lossLimit.toLocaleString()}원)이 소진되었습니다. 긴급 원격 관찰을 가동하십시오.`,
          alertType: "RISK_ALERT",
          color: 0xef4444,
          fields: [
            { name: "현재 누적 정산 손익", value: `${Math.round(currentLoss).toLocaleString()}원`, inline: true },
            { name: "최대 허용 한계값", value: `-${lossLimit.toLocaleString()}원`, inline: true },
            { name: "평가 계정 자산액", value: `${Math.round(nextBalance).toLocaleString()}원`, inline: true }
          ]
        })
      }).catch(err => console.error(err));
    }
  };

  const handleResetLedger = () => {
    if (!window.confirm("주의: 실제 주식 거래 원장 및 누적 자산 데이터를 초기화하고 기본 원금(1억원) 기준으로 재설정하시겠습니까?")) return;
    setBalance(100000000);
    setTradeLogs([]);
    setPortfolio({});
    setTotalFees(0);
    setTotalTaxes(0);
    localStorage.removeItem("kiwoom_sim_balance");
    localStorage.removeItem("kiwoom_sim_tradelogs");
    localStorage.removeItem("kiwoom_sim_portfolio");
    localStorage.removeItem("kiwoom_sim_total_fees");
    localStorage.removeItem("kiwoom_sim_total_taxes");
  };

  const handleFeeRateChange = (newRate: number) => {
    setCustomFeeRate(newRate);
    localStorage.setItem("kiwoom_custom_fee_rate", newRate.toString());
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans" id="app-container">
      {/* Mini App Titlebar */}
      <header className="border-b border-gray-900 bg-[#0c1221] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow shadow-indigo-900/50">
            K
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-gray-100 flex items-center gap-1.5">
              Kiwoom REST API 실시간 오토트레이더
            </h1>
            <p className="text-[10px] text-gray-500 font-mono">DIRECT PRIVATE LOCAL CLIENT v3.0.0</p>
          </div>
        </div>

        {/* Global Connection Badges */}
        <div className="flex items-center gap-3">
          {/* Kiwoom REST API Connection Indicator */}
          <div
            className="px-3 py-1.5 rounded-lg border border-indigo-900/50 bg-indigo-950/40 text-indigo-400 text-[11px] font-bold flex items-center gap-1.5"
            title="키움증권 REST API 서버와 직접 연결을 나타냅니다 (보안 통신 활성화)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            키움 REST API: DIRECT
          </div>

          {/* Engine on/off button */}
          <button
            onClick={handleToggleEngine}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              engineStatus
                ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/80"
                : "bg-red-950/40 border-red-900/50 text-red-400 hover:bg-red-950/80"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {engineStatus ? "감시 가동 중" : "감시 중단됨"}
          </button>

          <div className="px-3 py-1.5 bg-gray-950 border border-gray-900 text-gray-500 font-mono text-[10.5px] rounded-lg">
            ACCOUNT NO: <span className="text-gray-300 font-bold">{localStorage.getItem("kiwoom_account_no") || "미등록"}</span>
          </div>
        </div>
      </header>

      {/* Main Tabs Navigator */}
      <div className="bg-[#0b101c] px-6 border-b border-gray-900/60 flex gap-2">
        <button
          onClick={() => setActiveTab("MAIN")}
          className={`px-4 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "MAIN"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <LineChart className="w-4 h-4" />
          메인 거래보드
        </button>

        <button
          onClick={() => setActiveTab("STATS")}
          className={`px-4 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "STATS"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <Activity className="w-4 h-4" />
          실시간 스탯
        </button>

        <button
          onClick={() => setActiveTab("LOGS")}
          className={`px-4 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "LOGS"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          거래 원장/로그
        </button>

        <button
          onClick={() => setActiveTab("SETTINGS")}
          className={`px-4 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "SETTINGS"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <Settings className="w-4 h-4" />
          시스템 설정
        </button>
      </div>

      {/* Main Scrollable Canvas */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "MAIN" && (
              <MainTab 
                onTradeExecute={handleTradeExecute}
                portfolio={portfolio}
                balance={balance}
              />
            )}

            {activeTab === "STATS" && (
              <StatsTab 
                balance={balance}
                initialCapital={initialCapital}
                totalFees={totalFees}
                totalTaxes={totalTaxes}
                tradeCount={tradeLogs.length}
              />
            )}

            {activeTab === "LOGS" && (
              <LogsTab 
                tradeLogs={tradeLogs}
                onClearTradeLogs={handleResetLedger}
              />
            )}

            {activeTab === "SETTINGS" && (
              <SettingsTab 
                currentFeeRate={customFeeRate}
                onFeeRateChange={handleFeeRateChange}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Footer bar */}
      <footer className="border-t border-gray-900 bg-[#070b13] px-6 py-3.5 flex justify-between text-[10px] text-gray-600 font-mono select-none">
        <span>RUNNING PORT: 3000 | PRIVATE LOCAL ENGINE COMPLIANT</span>
        <span>COPYRIGHT © KIWOOM QUANT SYSTEM. ALL RIGHTS RESERVED.</span>
      </footer>
    </div>
  );
}
