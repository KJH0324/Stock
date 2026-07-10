import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Play, RotateCcw, AlertOctagon, HelpCircle, Server, Check } from "lucide-react";

interface QueuedRequest {
  id: string;
  stockName: string;
  type: string;
  status: "WAITING" | "PROCESSING" | "COMPLETED" | "PENALIZED";
}

export default function ThrottlingSim() {
  const [throttlingEnabled, setThrottlingEnabled] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [secCount, setSecCount] = useState(0);
  const [minCount, setMinCount] = useState(0);
  const [penaltyActive, setPenaltyActive] = useState(false);
  const [requests, setRequests] = useState<QueuedRequest[]>([]);
  const [processedCount, setProcessedCount] = useState(0);

  const requestTimer = useRef<NodeJS.Timeout | null>(null);
  const secondWindowTimer = useRef<NodeJS.Timeout | null>(null);

  // Monitor second-level limits (max 5 per sec)
  useEffect(() => {
    secondWindowTimer.current = setInterval(() => {
      setSecCount(0);
    }, 1000);

    return () => {
      if (secondWindowTimer.current) clearInterval(secondWindowTimer.current);
    };
  }, []);

  // Watch for penalty trigger
  useEffect(() => {
    if (secCount > 5 && !throttlingEnabled) {
      setPenaltyActive(true);
      setIsSimulating(false);
      if (requestTimer.current) clearInterval(requestTimer.current);
      
      // Update remaining WAITING requests to PENALIZED
      setRequests((prev) =>
        prev.map((r) => (r.status === "WAITING" ? { ...r, status: "PENALIZED" } : r))
      );
    }
  }, [secCount, throttlingEnabled]);

  const handleStartSimulation = () => {
    if (isSimulating || penaltyActive) return;
    setIsSimulating(true);
    setProcessedCount(0);

    // Generate 15 stock query requests
    const stocksToQuery = [
      "삼성전자", "SK하이닉스", "LG에너지솔루션", "삼성바이오로직스", "현대차",
      "기아", "셀트리온", "KB금융", "신한지주", "POSCO홀딩스",
      "NAVER", "카카오", "삼성물산", "삼성SDI", "LG화학"
    ];

    const initialRequests: QueuedRequest[] = stocksToQuery.map((name, idx) => ({
      id: `req-${idx}-${Date.now()}`,
      stockName: name,
      type: "주가 기본정보 조회 (TR)",
      status: "WAITING",
    }));

    setRequests(initialRequests);

    let currentIndex = 0;
    const processDelay = throttlingEnabled ? 1000 : 80; // 1s with throttling (simulating Token Bucket sleep), 80ms without throttling (spamming!)

    const processNext = () => {
      if (currentIndex >= initialRequests.length) {
        setIsSimulating(false);
        if (requestTimer.current) clearInterval(requestTimer.current);
        return;
      }

      const reqToProcess = initialRequests[currentIndex];
      
      // Change status to PROCESSING
      setRequests((prev) =>
        prev.map((r, idx) => (idx === currentIndex ? { ...r, status: "PROCESSING" } : r))
      );

      // Trigger counts
      setSecCount((prev) => prev + 1);
      setMinCount((prev) => prev + 1);

      setTimeout(() => {
        setRequests((prev) =>
          prev.map((r, idx) => (idx === currentIndex ? { ...r, status: "COMPLETED" } : r))
        );
        setProcessedCount((prev) => prev + 1);
      }, processDelay / 2);

      currentIndex++;
      
      // Schedule next item
      if (currentIndex < initialRequests.length) {
        requestTimer.current = setTimeout(processNext, processDelay);
      } else {
        setIsSimulating(false);
      }
    };

    // Begin processing
    requestTimer.current = setTimeout(processNext, 100);
  };

  const handleReset = () => {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    setIsSimulating(false);
    setRequests([]);
    setSecCount(0);
    setMinCount(0);
    setPenaltyActive(false);
    setProcessedCount(0);
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl" id="throttling-simulator-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            초당 TR 제한 및 Leaky Bucket 스로틀링 시뮬레이터
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            키움 OpenAPI+의 엄격한 과부하 방지 규칙(초당 5건 초과 시 차단)과 방어 큐(Delay Queue)의 필요성
          </p>
        </div>
        <div className="flex items-center gap-3 bg-gray-950 p-1.5 rounded-lg border border-gray-900">
          <button
            onClick={() => {
              if (isSimulating) return;
              setThrottlingEnabled(true);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              throttlingEnabled
                ? "bg-amber-600 text-white shadow-md shadow-amber-950/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
            disabled={isSimulating}
          >
            스로틀링 큐 켜기
          </button>
          <button
            onClick={() => {
              if (isSimulating) return;
              setThrottlingEnabled(false);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !throttlingEnabled
                ? "bg-red-600/95 text-white shadow-md shadow-red-950/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
            disabled={isSimulating}
          >
            끄기 (위험 노출)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Controls and indicators */}
        <div className="space-y-4">
          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-900 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">주요 카운터 & 상태</h3>

            {/* Sec bar */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-gray-400">초당 TR 요청 수 (임계치: 5건)</span>
                <span className={`font-bold ${secCount > 5 ? "text-red-500 animate-pulse" : "text-gray-200"}`}>
                  {secCount} / 5
                </span>
              </div>
              <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${secCount > 5 ? "bg-red-500" : "bg-amber-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((secCount / 5) * 100, 100)}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
            </div>

            {/* Total progress */}
            <div className="pt-2 border-t border-gray-900 flex justify-between text-xs">
              <span className="text-gray-400">완료된 요청 수</span>
              <span className="font-mono text-gray-200 font-semibold">{processedCount} / 15</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleStartSimulation}
                disabled={isSimulating || penaltyActive}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                  isSimulating || penaltyActive
                    ? "bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/30"
                }`}
              >
                <Play className="w-4 h-4" />
                시뮬레이션 시작
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

          {/* Status Box */}
          <AnimatePresence mode="wait">
            {penaltyActive ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 flex gap-3 items-start"
              >
                <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-400">🚨 시스템 강제 차단 발생 (과부하)</h4>
                  <p className="text-xs text-red-300 mt-1 leading-relaxed">
                    초당 5건의 TR 한계를 초과하였습니다! 키움증권 서버에서 <strong>IP 임시 밴 및 강제 접속종료</strong> 패널티를 부여해 대시보드가 마비되었습니다. 우측 큐를 비우고 다시 시작하세요.
                  </p>
                </div>
              </motion.div>
            ) : isSimulating ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 flex gap-3 items-start"
              >
                <Server className="w-5 h-5 text-blue-400 animate-pulse flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-300">{throttlingEnabled ? "🛡️ 안전 스로틀링 작동 중" : "🔥 무방비 스팸 모드 작동 중"}</h4>
                  <p className="text-xs text-blue-400 mt-1 leading-relaxed">
                    {throttlingEnabled 
                      ? "Leaky Bucket 지연 큐가 각 요청 사이에 인위적 대기 시간을 조절하여 초당 호출 수 한도를 5건 이하로 절대 보존하고 있습니다."
                      : "위험! 스로틀링 대기 제어문 없이 과속으로 연속 TR을 송신 중입니다. 서버 응답 제한 임계치를 곧 터치할 위험이 있습니다."}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-950/40 border border-gray-900 rounded-xl p-4 flex gap-3 items-start"
              >
                <HelpCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-gray-300">지연 대기 큐의 금융학적 당위성</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    실제 실전매매에서 전 종목 일봉/분봉 수집 시 아무 장치 없이 루프문을 돌리면 즉각적인 강제 연결 종료 팝업을 직면합니다. <strong>time.sleep(3.6)</strong> 등을 활용해 의도적인 초당 스펙 트래픽 분리가 필수적입니다.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Interactive Request Queue */}
        <div className="lg:col-span-2 flex flex-col bg-gray-950/40 border border-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-gray-900 pb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">메모리 대기 큐 및 전송 현황</span>
            <span className="text-[10px] text-gray-500 font-mono">Total: {requests.length} Requests</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[310px] space-y-2 pr-1 min-h-[220px]">
            {requests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <Server className="w-10 h-10 text-gray-700 mb-2" />
                <p className="text-xs text-gray-500">대기 중인 주식 정보 조회(TR)가 없습니다.</p>
                <p className="text-[10px] text-gray-600 mt-1">상단의 시뮬레이션 시작 버튼을 눌러주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requests.map((req, idx) => (
                  <motion.div
                    key={req.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      req.status === "WAITING"
                        ? "bg-gray-900/30 border-gray-900 text-gray-500"
                        : req.status === "PROCESSING"
                        ? "bg-blue-950/20 border-blue-500 text-blue-300 ring-1 ring-blue-500/20"
                        : req.status === "COMPLETED"
                        ? "bg-emerald-950/10 border-emerald-900 text-emerald-400"
                        : "bg-red-950/20 border-red-900 text-red-400"
                    }`}
                    layout
                  >
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <span className="text-gray-500 font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded">
                          TR {idx + 1}
                        </span>
                        {req.stockName}
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-0.5">{req.type}</span>
                    </div>

                    <div className="text-[10px] font-mono">
                      {req.status === "WAITING" && <span className="text-gray-600 italic">WAITING</span>}
                      {req.status === "PROCESSING" && (
                        <span className="text-blue-400 font-semibold animate-pulse">PROCESSING</span>
                      )}
                      {req.status === "COMPLETED" && (
                        <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> SUCCESS
                        </span>
                      )}
                      {req.status === "PENALIZED" && (
                        <span className="text-red-500 font-bold animate-bounce">BLOCKED</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
