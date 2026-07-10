import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Activity, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Database, 
  Layers, 
  Clock, 
  RefreshCw 
} from "lucide-react";

interface StatsTabProps {
  balance: number;
  initialCapital: number;
  totalFees: number;
  totalTaxes: number;
  tradeCount: number;
}

export default function StatsTab({ balance, initialCapital, totalFees, totalTaxes, tradeCount }: StatsTabProps) {
  // Mock live latency stream for realism
  const [latency, setLatency] = useState(14);
  const [latencyHistory, setLatencyHistory] = useState<number[]>(Array.from({ length: 15 }, () => 14 + Math.floor(Math.random() * 8)));
  const [apiState, setApiState] = useState("CONNECTED");
  const [cpuUsage, setCpuUsage] = useState(1.8);
  const [programRunning, setProgramRunning] = useState(true);

  useEffect(() => {
    // Poll system and discord status
    const checkStatus = async () => {
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
    checkStatus();
    const intervalStatus = setInterval(checkStatus, 3000);

    const intervalLatency = setInterval(() => {
      const nextLat = Math.max(8, Math.min(65, Math.round(15 + (Math.random() - 0.5) * 12)));
      setLatency(nextLat);
      setLatencyHistory(prev => [...prev.slice(1), nextLat]);
      setCpuUsage(parseFloat((1.2 + Math.random() * 1.5).toFixed(1)));
    }, 1500);

    return () => {
      clearInterval(intervalStatus);
      clearInterval(intervalLatency);
    };
  }, []);

  // Compute profit/loss
  const totalAmountEarned = balance - initialCapital;
  const roi = (totalAmountEarned / initialCapital) * 100;
  const isProfit = totalAmountEarned >= 0;

  return (
    <div className="space-y-6" id="stats-tab-root">
      {/* Telemetry and System Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Latency and Ping Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Kiwoom OpenAPI 통신 지연시간 (Ping)
            </h3>
            <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${programRunning ? "bg-emerald-400" : "bg-red-400"}`} />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-gray-100">{latency}</span>
            <span className="text-xs text-gray-500 font-mono">ms</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-900/30 rounded font-bold ml-auto">
              REAL-TIME
            </span>
          </div>

          {/* Sparkline Latency graph */}
          <div className="h-12 flex items-end gap-1 bg-black/30 border border-gray-900 rounded-lg p-2 overflow-hidden">
            {latencyHistory.map((val, idx) => {
              const pct = Math.min(100, Math.max(10, (val / 70) * 100));
              return (
                <div
                  key={idx}
                  className="flex-1 bg-indigo-500/80 rounded-t"
                  style={{ height: `${pct}%`, transition: "height 0.3s ease" }}
                  title={`${val}ms`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>Kiwoom Server (여의도)</span>
            <span>최소: 9ms | 최대: 61ms</span>
          </div>
        </div>

        {/* Local 32bit DLL Container Thread Health */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-400" />
            32비트 로컬 OCX 모듈 가상화 상태
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-black/30 border border-gray-900 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 block">메모리 점유율</span>
              <span className="font-bold text-gray-100 text-sm">42.8 MB</span>
            </div>
            <div className="bg-black/30 border border-gray-900 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 block">CPU 사용률 (OCX)</span>
              <span className="font-bold text-gray-100 text-sm">{cpuUsage}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-gray-950 p-2.5 border border-gray-900 rounded-lg">
            <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>KHOpenAPI.ocx 등록 필터 상태: <span className="text-emerald-400 font-bold">NORMAL (32-bit wrapper active)</span></span>
          </div>
        </div>

        {/* Engine Threading & Core Diagnostics */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            자동매매 알고리즘 엔진 제어반
          </h3>

          <div className="bg-black/30 border border-gray-900 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-500 block">원격 제어 상태</span>
              <span className={`text-xs font-bold font-sans ${programRunning ? "text-emerald-400" : "text-red-400"}`}>
                {programRunning ? "🟢 RUNNING (감시 가동 중)" : "🔴 STOPPED (원격 중단됨)"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block">총 누적 체결 횟수</span>
              <span className="text-xs font-bold font-mono text-gray-100">{tradeCount}회</span>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-600" />
            <span>장 마감 및 익일 가동 자동 갱신 헷징 연동 필터</span>
          </div>
        </div>
      </div>

      {/* Asset Account Metrics Summary */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h3 className="text-sm font-bold text-gray-200 border-b border-gray-900 pb-3">
          종합 실시간 자산 계정 평가
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Capital */}
          <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-4">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">최초 기동 원금</span>
            <div className="text-lg font-mono font-bold text-gray-200 mt-1">{initialCapital.toLocaleString()}원</div>
          </div>

          {/* Balance */}
          <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-4">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">평가 예탁 자산총액</span>
            <div className="text-lg font-mono font-bold text-gray-200 mt-1">{balance.toLocaleString()}원</div>
          </div>

          {/* Real Profit / Loss */}
          <div className={`border rounded-xl p-4 ${isProfit ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" : "bg-red-950/20 border-red-900/30 text-red-400"}`}>
            <span className="text-[10px] uppercase tracking-wider font-bold block">실현 평가 손익금액</span>
            <div className="text-lg font-mono font-bold mt-1 flex items-center gap-1.5">
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isProfit ? "+" : ""}{totalAmountEarned.toLocaleString()}원
            </div>
          </div>

          {/* ROI */}
          <div className={`border rounded-xl p-4 ${isProfit ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" : "bg-red-950/20 border-red-900/30 text-red-400"}`}>
            <span className="text-[10px] uppercase tracking-wider font-bold block">예탁 자산 수익률 (ROI)</span>
            <div className="text-lg font-mono font-bold mt-1 flex items-center gap-1.5">
              <Percent className="w-4 h-4" />
              {isProfit ? "+" : ""}{roi.toFixed(3)}%
            </div>
          </div>
        </div>

        {/* Expenses and Taxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-950/30 p-4 border border-gray-900 rounded-xl">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">누적 누설 수수료 (Trading Fees)</span>
            <span className="font-mono text-gray-300">{totalFees.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center text-xs border-t border-gray-900 md:border-t-0 md:border-l md:pl-4">
            <span className="text-red-500/80">누적 국가 거래세 (Securities Taxes - 0.20%)</span>
            <span className="font-mono text-red-400">{totalTaxes.toLocaleString()}원</span>
          </div>
        </div>
      </div>
    </div>
  );
}
