import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cpu, Terminal, RefreshCw, Layers, CheckCircle, AlertTriangle, Play, HelpCircle } from "lucide-react";

export default function ArchitectureView() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loopState, setLoopState] = useState<"IDLE" | "REQUESTING" | "BLOCKED" | "PROCESSING" | "RELEASED">("IDLE");
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setEventLogs((prev) => [
      `[${new Date().toLocaleTimeString("ko-KR", { hour12: false })}] ${msg}`,
      ...prev.slice(0, 7),
    ]);
  };

  const steps = [
    {
      title: "1. Python 스크립트 실행 (64비트 개발자 PC)",
      desc: "개발자는 최신 64비트 Windows에서 코딩하지만, 키움 OpenAPI+는 32비트 전용 모듈입니다.",
      icon: Cpu,
      color: "border-blue-500 text-blue-400 bg-blue-950/20",
    },
    {
      title: "2. 32비트 가상 Python 환경 (인터프리터)",
      desc: "프로세스 간 메모리 격차로 인해 반드시 32비트 인터프리터로 구동하여 통신 채널을 확보해야 합니다.",
      icon: Layers,
      color: "border-teal-500 text-teal-400 bg-teal-950/20",
    },
    {
      title: "3. PyQt5 QAxWidget 로드",
      desc: "ActiveX 컴포넌트 'KHOPENAPI.KHOpenAPICtrl.1'을 인스턴스화하여 키움 서버와 세션을 바인딩합니다.",
      icon: Terminal,
      color: "border-purple-500 text-purple-400 bg-purple-950/20",
    },
    {
      title: "4. QEventLoop 동기화 처리",
      desc: "비동기 요청 후 event_loop.exec_()를 통해 실행 흐름을 일시 정지(블로킹)시켜 동기적 순서 무결성을 확보합니다.",
      icon: RefreshCw,
      color: "border-amber-500 text-amber-400 bg-amber-950/20",
    },
  ];

  const handleSimulateSync = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setEventLogs([]);
    
    // Step 1
    setActiveStep(0);
    setLoopState("REQUESTING");
    addLog("메인 스레드: TR 요청 전송 (CommRqData호출)");
    await new Promise((r) => setTimeout(r, 1500));

    // Step 2
    setActiveStep(3);
    setLoopState("BLOCKED");
    addLog("⚠️ 메인 스레드 대기: event_loop.exec_() 호출 (비동기 흐름 일시정지)");
    await new Promise((r) => setTimeout(r, 2000));

    // Step 3
    setLoopState("PROCESSING");
    addLog("콜백 스레드: OnReceiveTrData() 수신 및 실시간 주가 데이터 파싱 완료");
    await new Promise((r) => setTimeout(r, 1500));

    // Step 4
    setLoopState("RELEASED");
    addLog("⚠️ 메인 스레드 해제: event_loop.exit() 호출 (동기화 블록 해제)");
    await new Promise((r) => setTimeout(r, 1200));

    setLoopState("IDLE");
    setActiveStep(null);
    setIsRunning(false);
    addLog("자동매매 엔진: 안전하게 다음 매매 의사결정 로직 실행 진행");
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl" id="architecture-view-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            32비트 종속성 및 QEventLoop 동기화 아키텍처
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            키움증권 OpenAPI의 레거시 구조(32비트 OCX)와 비동기 콜백을 제어하는 핵심 메커니즘
          </p>
        </div>
        <button
          onClick={handleSimulateSync}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs transition-all ${
            isRunning
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50"
          }`}
          id="btn-run-loop-simulation"
        >
          <Play className="w-4 h-4" />
          QEventLoop 동기화 시뮬레이션
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Steps */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">시스템 빌드 환경 및 파이프라인</h3>
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            return (
              <motion.div
                key={idx}
                className={`p-4 border rounded-xl transition-all ${step.color} ${
                  isActive ? "ring-2 ring-offset-2 ring-offset-[#111827] ring-blue-500 scale-[1.01]" : "opacity-80"
                }`}
                animate={{ scale: isActive ? 1.01 : 1 }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-200">{step.title}</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right column: Loop Visualizer */}
        <div className="flex flex-col bg-gray-950/60 border border-gray-900 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">실시간 이벤트 루프 모니터</h3>

          <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-[10px] font-mono text-gray-500">{isRunning ? "RUNNING" : "STOPPED"}</span>
            </div>

            <div className="relative w-36 h-36 flex items-center justify-center border-4 border-dashed border-gray-800 rounded-full">
              {/* Spinner for requesting/blocked */}
              {isRunning && (
                <motion.div
                  className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Central state badge */}
              <div className="text-center z-10">
                <span className="text-[10px] font-mono text-gray-500 block mb-1">LOOP STATE</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loopState}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`px-2 py-1 rounded text-xs font-bold font-mono tracking-wider ${
                      loopState === "IDLE"
                        ? "bg-gray-900 text-gray-400 border border-gray-800"
                        : loopState === "REQUESTING"
                        ? "bg-blue-900/30 text-blue-400 border border-blue-800"
                        : loopState === "BLOCKED"
                        ? "bg-amber-950/40 text-amber-500 border border-amber-900"
                        : loopState === "PROCESSING"
                        ? "bg-teal-950/40 text-teal-400 border border-teal-900"
                        : "bg-emerald-950/40 text-emerald-400 border border-emerald-900"
                    }`}
                  >
                    {loopState}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-6 max-w-xs leading-relaxed">
              {loopState === "IDLE" && "대기 중. 시뮬레이션 버튼을 눌러보세요."}
              {loopState === "REQUESTING" && "서버로 데이터를 비동기 요청 중..."}
              {loopState === "BLOCKED" && "⚠️ exec_() 실행: 메인 스레드가 블로킹되어 콜백 수신 시까지 잠금 상태가 유지됩니다."}
              {loopState === "PROCESSING" && "이벤트 핸들러 작동: OnReceiveTrData 콜백 함수가 패킷을 수집하고 파싱합니다."}
              {loopState === "RELEASED" && "exit() 호출: 블로킹되었던 메인 이벤트 루프가 풀리며 정상적으로 순차 진행됩니다."}
            </p>
          </div>

          <div className="border-t border-gray-900 pt-4">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">실시간 런타임 로그</span>
            <div className="font-mono text-[10px] space-y-1.5 h-32 overflow-y-auto pr-1 text-gray-400 bg-black/40 p-2.5 rounded-lg border border-gray-900">
              {eventLogs.length === 0 ? (
                <span className="text-gray-600 italic">로그가 비어있습니다.</span>
              ) : (
                eventLogs.map((log, idx) => (
                  <div key={idx} className={idx === 0 ? "text-blue-400 font-semibold" : ""}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
