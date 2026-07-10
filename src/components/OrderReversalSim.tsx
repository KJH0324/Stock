import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Play, RotateCcw, FileCode, CheckCircle, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";

interface LogMessage {
  id: string;
  type: "INFO" | "SUCCESS" | "ERROR" | "WARNING" | "SYSTEM";
  msg: string;
}

export default function OrderReversalSim() {
  const [engineType, setEngineType] = useState<"STANDARD" | "DEFENSIVE">("DEFENSIVE");
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [unconfirmedQueue, setUnconfirmedQueue] = useState<{ [orderId: string]: any }>({});
  const [confirmedOrders, setConfirmedOrders] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasCrashed, setHasCrashed] = useState(false);

  const addLog = (type: "INFO" | "SUCCESS" | "ERROR" | "WARNING" | "SYSTEM", msg: string) => {
    setLogs((prev) => [
      { id: `log-${Date.now()}-${Math.random()}`, type, msg },
      ...prev,
    ]);
  };

  const handleSimulateTrade = async () => {
    if (isSimulating || hasCrashed) return;
    setIsSimulating(true);
    setLogs([]);
    setUnconfirmedQueue({});
    setConfirmedOrders([]);

    const orderId = "ORD_2026_0710_09";
    
    addLog("SYSTEM", "⚡ 한미반도체 시장가 매수 주문 전송 (SendOrder 호출)...");
    await new Promise((r) => setTimeout(r, 1000));

    addLog("INFO", "🚨 초고속 변동성 장세 돌입: 네트워크 경로 병목으로 트랜잭션 순서가 역전되었습니다.");
    await new Promise((r) => setTimeout(r, 1200));

    // Event 1: OnReceiveChejanData (Execution) arrives FIRST!
    addLog("WARNING", `🔔 OnReceiveChejanData 수신! [체결수량: 100주 / 체결단가: 125,000원 / 주문번호: ${orderId}]`);
    
    if (engineType === "STANDARD") {
      // Standard engine naively tries to access memory dictionary directly
      await new Promise((r) => setTimeout(r, 1000));
      addLog("ERROR", `❌ KeyError: '${orderId}' - 메인 메모리 딕셔너리에 매칭되는 주문 기록이 없습니다.`);
      addLog("ERROR", `⚠️ [CRASH] 예외 발생으로 자동매매 프로그램의 메인 루프 스레드가 영구 중단되었습니다!`);
      setHasCrashed(true);
      setIsSimulating(false);
      return;
    } else {
      // Defensive engine puts it in the unconfirmed queue
      await new Promise((r) => setTimeout(r, 1000));
      addLog("SYSTEM", `🛡️ [미확인 체결 큐 저장] 주문번호 '${orderId}'를 임시 큐에 바인딩 완료 (방어코드 작동)`);
      setUnconfirmedQueue((prev) => ({
        ...prev,
        [orderId]: {
          stockName: "한미반도체",
          quantity: 100,
          price: 125000,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    }

    await new Promise((r) => setTimeout(r, 1500));

    // Event 2: OnReceiveTrData (Order registration) arrives LATER!
    addLog("INFO", `🔔 OnReceiveTrData 수신! [주문번호 발급 확인: ${orderId}]`);
    
    await new Promise((r) => setTimeout(r, 1000));
    addLog("INFO", `🔍 로컬 DB/메모리에 주문 ID '${orderId}' 등록 및 기록 매핑 작업 시도...`);

    // Defensive lookup
    setUnconfirmedQueue((prev) => {
      const queueCopy = { ...prev };
      if (queueCopy[orderId]) {
        addLog("SUCCESS", `✨ [방어 성공] 임시 큐에 매칭 대기 중이던 '${orderId}' 체결 데이터를 회수하여 정상 통합!`);
        addLog("SUCCESS", `📊 잔고 갱신 완료: 한미반도체 100주 계좌 가치 정상 업데이트 완료.`);
        delete queueCopy[orderId];
        setConfirmedOrders([orderId]);
      } else {
        addLog("INFO", `📦 미확인 체결 큐에 없음. 통상적인 순서대로 등록 프로세스 완료.`);
      }
      return queueCopy;
    });

    setIsSimulating(false);
  };

  const handleReset = () => {
    setLogs([]);
    setUnconfirmedQueue({});
    setConfirmedOrders([]);
    setHasCrashed(false);
    setIsSimulating(false);
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl" id="reversal-simulator-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            비동기 이벤트 역전 현상 (Event Reversal) 및 미확인 체결 큐
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            장 초반 폭증장에서 발생하는 체결 데이터 선(先) 수신 문제와 이를 예방하는 방어적 프로그래밍 기법
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-950 p-1.5 rounded-lg border border-gray-900">
          <button
            onClick={() => {
              if (isSimulating) return;
              setEngineType("DEFENSIVE");
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              engineType === "DEFENSIVE"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
            disabled={isSimulating}
          >
            방어형 엔진 (Defensive Queue)
          </button>
          <button
            onClick={() => {
              if (isSimulating) return;
              setEngineType("STANDARD");
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              engineType === "STANDARD"
                ? "bg-red-950/45 text-red-400 border border-red-900/30"
                : "text-gray-400 hover:text-gray-200"
            }`}
            disabled={isSimulating}
          >
            기본형 엔진 (Naive Dict)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Visual workflow comparison */}
        <div className="space-y-4">
          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-900 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">주문 라이프사이클 시뮬레이터</h3>

            <div className="space-y-2.5">
              {/* Event 1 Box */}
              <div className="border border-gray-800 bg-[#0c1017] p-2.5 rounded-lg text-xs relative overflow-hidden">
                <span className="absolute top-1.5 right-2 font-mono text-[9px] bg-red-900/30 text-red-400 px-1 py-0.2 rounded font-bold">1순위 도달</span>
                <div className="font-semibold text-gray-300">OnReceiveChejanData (체결)</div>
                <div className="text-gray-500 text-[10px] mt-0.5">실제 거래 체결 내역 즉시 통보</div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-gray-600 rotate-90" />
              </div>

              {/* Event 2 Box */}
              <div className="border border-gray-800 bg-[#0c1017] p-2.5 rounded-lg text-xs relative">
                <span className="absolute top-1.5 right-2 font-mono text-[9px] bg-blue-900/30 text-blue-400 px-1 py-0.2 rounded font-bold">2순위 지연</span>
                <div className="font-semibold text-gray-300">OnReceiveTrData (주문번호 확인)</div>
                <div className="text-gray-500 text-[10px] mt-0.5">서버의 정식 주문번호 할당 데이터</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSimulateTrade}
                disabled={isSimulating || hasCrashed}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                  isSimulating || hasCrashed
                    ? "bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed"
                    : engineType === "DEFENSIVE"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"
                    : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/30"
                }`}
              >
                <Play className="w-4 h-4" />
                역전 트레이드 발생시키기
              </button>
              <button
                onClick={handleReset}
                className="p-2.5 rounded-lg border border-gray-800 hover:bg-gray-900 hover:text-white transition-all text-gray-400"
                title="초기화"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-gray-950/30 border border-gray-900 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-gray-300 flex items-center gap-1">
              <FileCode className="w-4 h-4 text-blue-400" />
              파이썬 방어 코드 핵심 원리
            </h4>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              체결 정보가 들어왔으나 로컬 변수나 DB에 해당 <code>OrderId</code>가 존재하지 않을 때, 에러를 내지 않고 <strong>임시 미확인 체결 딕셔너리(unconfirmed_chejan_queue)</strong>에 적재합니다. 추후 TrData가 도착했을 때 해당 데이터가 임시 큐에 있는지 상시 탐색 후 통합합니다.
            </p>
          </div>
        </div>

        {/* Middle/Right: Live logs & Memory visualization */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Active Memory States */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unconfirmed Queue State */}
            <div className="bg-gray-950/50 border border-gray-900 rounded-xl p-4 flex flex-col h-[130px]">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">미확인 체결 큐 (Unconfirmed Queue)</span>
              <div className="flex-1 flex items-center justify-center font-mono text-xs bg-black/40 border border-gray-900 rounded-lg p-2 overflow-y-auto">
                {Object.keys(unconfirmedQueue).length === 0 ? (
                  <span className="text-gray-600 italic">큐가 비어있음 (정상 상태)</span>
                ) : (
                  <div className="w-full text-[11px] space-y-1">
                    {Object.entries(unconfirmedQueue).map(([id, item]: [string, any]) => (
                      <div key={id} className="flex justify-between text-amber-400">
                        <span>{id} ({item.stockName})</span>
                        <span className="font-bold">{item.quantity}주 대기 중</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Confirmed Memory Dictionary State */}
            <div className="bg-gray-950/50 border border-gray-900 rounded-xl p-4 flex flex-col h-[130px]">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">매칭 완료 주문 리스트 (Memory DB)</span>
              <div className="flex-1 flex items-center justify-center font-mono text-xs bg-black/40 border border-gray-900 rounded-lg p-2 overflow-y-auto">
                {confirmedOrders.length === 0 ? (
                  <span className="text-gray-600 italic">매칭된 자산 정보가 없음</span>
                ) : (
                  <div className="w-full text-[11px] space-y-1 text-emerald-400">
                    {confirmedOrders.map((id) => (
                      <div key={id} className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {id}
                        </span>
                        <span className="font-bold bg-emerald-950/30 px-1 py-0.2 border border-emerald-900 rounded text-[9px]">매칭 완료</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 flex flex-col bg-gray-950/50 border border-gray-900 rounded-xl p-4 min-h-[200px]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">트레이딩 이벤트 추적 로그</span>
            <div className="flex-1 font-mono text-xs space-y-2 h-44 overflow-y-auto bg-black/40 border border-gray-900 p-3 rounded-lg pr-1">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic text-center py-12">
                  시뮬레이션을 구동하여 아키텍처 예외 유무를 확인하세요.
                </div>
              ) : (
                logs.map((log) => {
                  let color = "text-gray-400";
                  if (log.type === "SYSTEM") color = "text-blue-400 font-semibold";
                  if (log.type === "SUCCESS") color = "text-emerald-400 font-bold";
                  if (log.type === "WARNING") color = "text-amber-400";
                  if (log.type === "ERROR") color = "text-red-500 font-extrabold animate-pulse";
                  return (
                    <div key={log.id} className={`${color} leading-relaxed flex items-start gap-1.5`}>
                      <span className="text-gray-600 select-none">▶</span>
                      <span>{log.msg}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
