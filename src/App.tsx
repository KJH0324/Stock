import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  Cpu, 
  Shield, 
  Layers, 
  Scale, 
  Sparkles, 
  DollarSign, 
  LineChart, 
  ClipboardList, 
  Clock, 
  CheckCircle,
  HelpCircle
} from "lucide-react";

// Types
import { TradeLog, StrategyType } from "./types";

// Sub-components
import ArchitectureView from "./components/ArchitectureView";
import ThrottlingSim from "./components/ThrottlingSim";
import OrderReversalSim from "./components/OrderReversalSim";
import StrategySimulator from "./components/StrategySimulator";
import RealVsVirtualSim from "./components/RealVsVirtualSim";
import GeminiAdvisor from "./components/GeminiAdvisor";

export default function App() {
  const [activeTab, setActiveTab] = useState<"ARCH" | "THROT" | "REVER" | "STRAT" | "REALV" | "GEM">("STRAT");
  
  // Ledger and portfolio states
  const [balance, setBalance] = useState<number>(100000000); // 100 Million KRW (1억 원)
  const [initialCapital] = useState<number>(100000000);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [isRealMode, setIsRealMode] = useState<boolean>(true); // Trading fee mode: Real (0.015%) or Virtual (0.35%)
  
  // Accumulated statistics
  const [totalFees, setTotalFees] = useState<number>(0);
  const [totalTaxes, setTotalTaxes] = useState<number>(0);

  const handleTradeExecute = (newLog: TradeLog) => {
    // Determine fee rate and tax rates
    const feeRate = isRealMode ? 0.00015 : 0.0035; // 0.015% or 0.35%
    const taxRate = newLog.action === "SELL" ? 0.0020 : 0; // 0.20% tax on sales

    const transactionFee = Math.round(newLog.totalAmount * feeRate);
    const transactionTax = Math.round(newLog.totalAmount * taxRate);

    // Update log
    const computedLog: TradeLog = {
      ...newLog,
      fee: transactionFee,
      tax: transactionTax,
    };

    setTradeLogs((prev) => [computedLog, ...prev]);

    // Update balance
    if (newLog.action === "BUY") {
      setBalance((prev) => prev - newLog.totalAmount - transactionFee);
    } else {
      setBalance((prev) => prev + newLog.totalAmount - transactionFee - transactionTax);
    }

    // Accumulate metrics
    setTotalFees((prev) => prev + transactionFee);
    setTotalTaxes((prev) => prev + transactionTax);
  };

  const handleResetLedger = () => {
    setBalance(100000000);
    setTradeLogs([]);
    setTotalFees(0);
    setTotalTaxes(0);
  };

  // Profit calculations
  const netProfit = balance - initialCapital;
  const netProfitPercent = (netProfit / initialCapital) * 100;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 font-sans" id="applet-main-body">
      {/* Top Banner - Header */}
      <header className="border-b border-gray-900 bg-[#0d131f]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-emerald-600 to-blue-600 rounded-xl shadow-lg shadow-emerald-950/20">
            <LineChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-gray-100 flex items-center gap-1.5">
              키움 OpenAPI+ 퀀트 자동매매 시뮬레이션 및 아키텍처 대시보드
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">
              Kiwoom OpenAPI Stock Auto-Trading Architecture & Strategy Simulator
            </p>
          </div>
        </div>

        {/* Global configuration */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-950/80 rounded-lg p-1 border border-gray-900 text-xs">
            <button
              onClick={() => setIsRealMode(true)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                isRealMode
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              실전 수수료 (0.015%)
            </button>
            <button
              onClick={() => setIsRealMode(false)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                !isRealMode
                  ? "bg-amber-600 text-white shadow-md shadow-amber-950/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              모의 수수료 (0.35%)
            </button>
          </div>

          <button
            onClick={handleResetLedger}
            className="px-3 py-1.5 rounded-lg border border-gray-900 hover:border-gray-700 hover:bg-gray-900/40 text-xs font-semibold text-gray-400 hover:text-white transition-all"
            id="btn-reset-ledger"
          >
            대시보드 초기화
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Dynamic statistics section */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-section">
          {/* Capital Card */}
          <div className="bg-[#111827] border border-gray-900 rounded-2xl p-4.5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-medium">
              <span>총 자산 잔고 (Balance)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-100">
              {Math.round(balance).toLocaleString()}원
            </div>
            <p className="text-[10px] text-gray-500 mt-1">원금: {initialCapital.toLocaleString()}원 기준</p>
          </div>

          {/* Profit Card */}
          <div className="bg-[#111827] border border-gray-900 rounded-2xl p-4.5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-medium">
              <span>누적 정산 수익률 (ROI)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {netProfit >= 0 ? "+" : ""}{netProfitPercent.toFixed(2)}%
            </div>
            <p className={`text-[10px] mt-1 font-mono font-medium ${netProfit >= 0 ? "text-emerald-500/80" : "text-red-400/80"}`}>
              {netProfit >= 0 ? "+" : ""}{Math.round(netProfit).toLocaleString()}원
            </p>
          </div>

          {/* Fees paid card */}
          <div className="bg-[#111827] border border-gray-900 rounded-2xl p-4.5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-medium">
              <span>증권사 매매수수료 누적 지출</span>
              <Scale className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-200">
              {totalFees.toLocaleString()}원
            </div>
            <p className="text-[10px] text-gray-500 mt-1">적용 모드: {isRealMode ? "실전 0.015%" : "모의 0.350%"}</p>
          </div>

          {/* Taxes paid card */}
          <div className="bg-[#111827] border border-gray-900 rounded-2xl p-4.5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-medium">
              <span>국가 거래세 지출 (0.20%)</span>
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-200">
              {totalTaxes.toLocaleString()}원
            </div>
            <p className="text-[10px] text-gray-500 mt-1">유가증권 및 코스닥 매도 자동 차감</p>
          </div>
        </section>

        {/* Tab Selection Row */}
        <section className="flex flex-wrap gap-2 border-b border-gray-900 pb-3" id="tab-navigation">
          <button
            onClick={() => setActiveTab("STRAT")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "STRAT"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30"
                : "bg-gray-900/40 text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-900/60"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            실시간 퀀트 알고리즘
          </button>

          <button
            onClick={() => setActiveTab("ARCH")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ARCH"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                : "bg-gray-900/40 text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-900/60"
            }`}
          >
            <Cpu className="w-4 h-4" />
            32비트 & 이벤트 동기화
          </button>

          <button
            onClick={() => setActiveTab("THROT")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "THROT"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-950/30"
                : "bg-gray-900/40 text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-900/60"
            }`}
          >
            <Shield className="w-4 h-4" />
            초당 TR 제한 (스로틀링)
          </button>

          <button
            onClick={() => setActiveTab("REVER")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "REVER"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30"
                : "bg-gray-900/40 text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-900/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            비동기 체결역전 방어
          </button>

          <button
            onClick={() => setActiveTab("REALV")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "REALV"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/30"
                : "bg-gray-900/40 text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-900/60"
            }`}
          >
            <Scale className="w-4 h-4" />
            모의 vs 실전 수익성 괴리
          </button>

          <button
            onClick={() => setActiveTab("GEM")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "GEM"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-950/30"
                : "bg-gray-900/40 text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-900/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Gemini AI 퀀트 검증기
          </button>
        </section>

        {/* Selected Tab content container */}
        <section id="tab-content" className="min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "ARCH" && <ArchitectureView />}
              {activeTab === "THROT" && <ThrottlingSim />}
              {activeTab === "REVER" && <OrderReversalSim />}
              {activeTab === "STRAT" && <StrategySimulator onTradeExecute={handleTradeExecute} />}
              {activeTab === "REALV" && <RealVsVirtualSim />}
              {activeTab === "GEM" && <GeminiAdvisor />}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Global Live Trades Ledger / Log section */}
        <section className="bg-[#111827] border border-gray-900 rounded-2xl p-6 shadow-2xl" id="ledger-section">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-900">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              시뮬레이터 통합 매매 거래 원장 (Live Ledger)
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              Total Transactions: {tradeLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto min-h-[150px] max-h-[300px]">
            {tradeLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs italic">
                체결된 거래 내역이 아직 없습니다. '실시간 퀀트 알고리즘' 탭에서 알고리즘 매수 신호가 잡히거나 조건이 충족되면 원장이 즉각 갱신됩니다.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-900 text-gray-500 font-medium">
                    <th className="py-2.5 px-3">시간</th>
                    <th className="py-2.5 px-3">주식명</th>
                    <th className="py-2.5 px-3">거래종류</th>
                    <th className="py-2.5 px-3 text-right">체결가</th>
                    <th className="py-2.5 px-3 text-right">수량</th>
                    <th className="py-2.5 px-3 text-right">체결대금</th>
                    <th className="py-2.5 px-3 text-right">수수료</th>
                    <th className="py-2.5 px-3 text-right">거래세</th>
                    <th className="py-2.5 px-3 text-right">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/40 font-mono text-[11px] text-gray-300">
                  {tradeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-900/20 transition-all">
                      <td className="py-2 px-3 text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {log.timestamp}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-200">
                        {log.stockName} <span className="text-[9px] text-gray-500 font-normal">({log.stockCode})</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.action === "BUY" 
                            ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40" 
                            : "bg-red-950/50 text-red-400 border border-red-900/40"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold">{log.price.toLocaleString()}원</td>
                      <td className="py-2 px-3 text-right">{log.quantity.toLocaleString()}주</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-200">
                        {log.totalAmount.toLocaleString()}원
                      </td>
                      <td className="py-2 px-3 text-right text-amber-500/90">{log.fee.toLocaleString()}원</td>
                      <td className="py-2 px-3 text-right text-blue-400/90">{log.tax.toLocaleString()}원</td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/20 px-1 rounded flex items-center gap-1 justify-end">
                          <CheckCircle className="w-3 h-3" /> MATCHED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* Modern, minimalist footer */}
      <footer className="border-t border-gray-950 bg-black/40 py-6 text-center text-[11px] text-gray-600">
        &copy; 2026 Kiwoom OpenAPI Algorithmic Strategy Simulator. Powered by Gemini Flash.
      </footer>
    </div>
  );
}
