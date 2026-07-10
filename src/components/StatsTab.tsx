import { TrendingUp, TrendingDown, Percent } from "lucide-react";

interface StatsTabProps {
  balance: number;
  initialCapital: number;
  totalFees: number;
  totalTaxes: number;
  tradeCount: number;
}

export default function StatsTab({ balance, initialCapital, totalFees, totalTaxes, tradeCount }: StatsTabProps) {
  // Compute profit/loss
  const totalAmountEarned = balance - initialCapital;
  const roi = (totalAmountEarned / initialCapital) * 100;
  const isProfit = totalAmountEarned >= 0;

  return (
    <div className="space-y-6" id="stats-tab-root">
      {/* Asset Account Metrics Summary */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-900 pb-3">
          <h3 className="text-sm font-bold text-gray-200">
            종합 실시간 자산 계정 평가
          </h3>
          <span className="text-[11px] font-mono text-gray-500">
            총 누적 체결 횟수: <span className="text-indigo-400 font-bold">{tradeCount}회</span>
          </span>
        </div>

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
