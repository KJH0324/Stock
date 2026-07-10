import { useState } from "react";
import { motion } from "motion/react";
import { Scale, RotateCcw, HelpCircle, Check, AlertTriangle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function RealVsVirtualSim() {
  const [initialCapital, setInitialCapital] = useState<number>(10000000); // 10 Million KRW
  const [tradesCount, setTradesCount] = useState<number>(15);
  const [grossProfitPerTrade, setGrossProfitPerTrade] = useState<number>(1.2); // 1.2% average gross return
  const [avgSlippage, setAvgSlippage] = useState<number>(0.12); // 0.12% slippage on Real

  // Calculations
  const TAX_RATE = 0.20 / 100; // 0.20% (both Real and Virtual)
  const REAL_FEE_RATE = 0.015 / 100; // 0.015%
  const MOCK_FEE_RATE = 0.350 / 100; // 0.350%

  // Virtual Calculation (No slippage)
  // Each trade: Buy fee, Sell fee, Tax on sell.
  // Net Return % per trade = Gross% - BuyFee% - SellFee% - Tax% (only on sell)
  const virtualNetReturnPerTrade = (grossProfitPerTrade / 100) - MOCK_FEE_RATE - MOCK_FEE_RATE - TAX_RATE;
  let virtualFinalCapital = initialCapital;
  for (let i = 0; i < tradesCount; i++) {
    virtualFinalCapital = virtualFinalCapital * (1 + virtualNetReturnPerTrade);
  }
  const virtualProfit = virtualFinalCapital - initialCapital;
  const virtualProfitPercent = (virtualProfit / initialCapital) * 100;

  // Real Calculation (With slippage)
  // Each trade: Buy fee + Sell fee + Tax on sell + Slippage loss on enter & exit
  const realNetReturnPerTrade = (grossProfitPerTrade / 100) - REAL_FEE_RATE - REAL_FEE_RATE - TAX_RATE - (avgSlippage / 100);
  let realFinalCapital = initialCapital;
  for (let i = 0; i < tradesCount; i++) {
    realFinalCapital = realFinalCapital * (1 + realNetReturnPerTrade);
  }
  const realProfit = realFinalCapital - initialCapital;
  const realProfitPercent = (realProfit / initialCapital) * 100;

  // Total fees paid
  const totalVirtualFees = initialCapital * MOCK_FEE_RATE * 2 * tradesCount;
  const totalRealFees = initialCapital * REAL_FEE_RATE * 2 * tradesCount;
  const totalTaxes = initialCapital * TAX_RATE * tradesCount;
  const totalSlippageLoss = initialCapital * (avgSlippage / 100) * tradesCount;

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl" id="real-vs-virtual-simulator-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            모의투자 vs 실전투자 구조적 괴리 및 수수료 격차 계산기
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            증권사가 부과하는 징벌적 수수료 차이(23.3배) 및 실전 슬리피지가 만드는 백테스트 누수 시각화
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters input column */}
        <div className="space-y-4">
          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-900 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">포트폴리오 변수 입력</h3>

            {/* Capital */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">투자 원금 (KRW)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Simulated Trades Count */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">누적 거래 횟수</span>
                <span className="font-mono text-blue-400 font-bold">{tradesCount}회</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={tradesCount}
                onChange={(e) => setTradesCount(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1 bg-gray-800 rounded-lg"
              />
            </div>

            {/* Average Gross Return */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">회당 평균 총수익률 (세전)</span>
                <span className="font-mono text-blue-400 font-bold">+{grossProfitPerTrade.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={grossProfitPerTrade}
                onChange={(e) => setGrossProfitPerTrade(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1 bg-gray-800 rounded-lg"
              />
            </div>

            {/* Slippage */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">실전 평균 슬리피지 (Slippage)</span>
                <span className="font-mono text-red-400 font-bold">{avgSlippage.toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.02"
                value={avgSlippage}
                onChange={(e) => setAvgSlippage(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1 bg-gray-800 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-gray-950/30 border border-gray-900 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-gray-300 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              수수료 구조적 비대칭성의 진실
            </h4>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              키움증권 실전 매매 수수료는 <strong>0.015%</strong>로 극히 저렴하지만, 모의투자는 과도한 초단타 스캘핑 서버 과부하를 막기 위해 일부러 <strong>0.350%</strong>라는 매우 높은 페널티 요율을 강제 적용합니다. 이 차이가 퀀트 시뮬레이션에서 격차를 야기합니다.
            </p>
          </div>
        </div>

        {/* Side-by-Side comparison cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Virtual / Mock Card */}
          <div className="bg-[#181111]/30 border border-red-950/50 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-sm font-bold text-red-400">🔴 모의투자 시나리오 (Mock Investment)</h3>
                  <span className="text-[10px] text-gray-500">No Slippage / High Fee (0.35%)</span>
                </div>
                <span className="bg-red-950/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded text-[10px] font-mono">
                  페널티 모드
                </span>
              </div>

              <div className="my-6">
                <span className="text-xs text-gray-500 block">최종 시뮬레이션 평가 금액</span>
                <span className={`text-2xl font-bold font-mono ${virtualProfit >= 0 ? "text-red-400" : "text-gray-400"}`}>
                  {Math.round(virtualFinalCapital).toLocaleString()}원
                </span>
                <span className={`text-xs font-mono font-bold block mt-1 ${virtualProfit >= 0 ? "text-red-400" : "text-gray-400"}`}>
                  {virtualProfit >= 0 ? "+" : ""}{virtualProfitPercent.toFixed(2)}% ({Math.round(virtualProfit).toLocaleString()}원)
                </span>
              </div>

              <div className="space-y-2 border-t border-red-950/20 pt-4 text-xs font-mono">
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>수수료 누적 지출 (0.35% × 2):</span>
                  <span className="text-gray-400">{Math.round(totalVirtualFees).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>거래세 지출 (0.20%):</span>
                  <span className="text-gray-400">{Math.round(totalTaxes).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>슬리피지 손실 (0%):</span>
                  <span className="text-emerald-500">0원 (체결 무조건 100%)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-red-950/10 border border-red-950 rounded-lg text-[11px] text-red-300 leading-relaxed flex gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>
                모의투자에서는 높은 수수료 때문에 <strong>스캘핑 전략의 누적 수익 곡선이 급격하게 우하향</strong>하여 실패한 전략처럼 보일 수 있으나, 실전에서는 다를 수 있습니다.
              </span>
            </div>
          </div>

          {/* Real Investment Card */}
          <div className="bg-[#111818]/30 border border-emerald-950/50 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-sm font-bold text-emerald-400">🟢 실전투자 시나리오 (Real Investment)</h3>
                  <span className="text-[10px] text-gray-500">With Slippage / Low Fee (0.015%)</span>
                </div>
                <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-mono">
                  실거래 기준
                </span>
              </div>

              <div className="my-6">
                <span className="text-xs text-gray-500 block">최종 시뮬레이션 평가 금액</span>
                <span className={`text-2xl font-bold font-mono ${realProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Math.round(realFinalCapital).toLocaleString()}원
                </span>
                <span className={`text-xs font-mono font-bold block mt-1 ${realProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {realProfit >= 0 ? "+" : ""}{realProfitPercent.toFixed(2)}% ({Math.round(realProfit).toLocaleString()}원)
                </span>
              </div>

              <div className="space-y-2 border-t border-emerald-950/20 pt-4 text-xs font-mono">
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>수수료 누적 지출 (0.015% × 2):</span>
                  <span className="text-gray-400">{Math.round(totalRealFees).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>거래세 지출 (0.20%):</span>
                  <span className="text-gray-400">{Math.round(totalTaxes).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>슬리피지 손실 (호가 밀림):</span>
                  <span className="text-red-400">{Math.round(totalSlippageLoss).toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-emerald-950/10 border border-emerald-950 rounded-lg text-[11px] text-emerald-300 leading-relaxed flex gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                실전 매매는 수수료가 극도로 낮아 유리하지만, 시장 규모에 맞지 않는 대량 주문 시 <strong>호가 갉아먹기로 인한 슬리피지(Slippage)</strong>를 헤징(TWAP 등 적용)해야 합니다.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
