import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cpu, Send, Copy, Check, FileText, Code, AlertTriangle, Sparkles } from "lucide-react";

const STRATEGY_TEMPLATES = [
  {
    name: "변동성 돌파 + 일봉 스크리닝",
    desc: "래리 윌리엄스의 Volatility Breakout 알고리즘을 기본 뼈대로 하되, 장 시작 전 FinanceDataReader를 이용해 최근 20일 거래량 및 이평선 정배열 상태인 코스닥 주도주만 5개 추려내어 동적 스위칭하는 전략.",
    snippet: "# 08:50 일봉 수집 및 우량 종목 스크리닝\ndef select_target_stocks():\n    # ... 전일 고가, 저가, 종가 및 k 상수 적용\n    pass",
  },
  {
    name: "스토캐스틱 초단타 스캘핑 & 슬리피지 제어",
    desc: "1분봉 기준 스토캐스틱 %K가 15 이하에서 골든크로스 시 매수하고 1.5% 익절하는 스캘핑 전략. 모의투자와 실전투자 요율을 변수로 두어 실시간 수수료 차이를 감안하고, 시장가 호가 벌어짐을 보정하기 위해 최유리 지정가(06) 주문을 사용.",
    snippet: "# 스캘핑을 위한 최유리 지정가 매수 주문 전송\ndef send_best_favorable_order(code, qty):\n    # order_type = '06' (최유리 지정가)\n    # ...\n    pass",
  },
];

export default function GeminiAdvisor() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [strategyName, setStrategyName] = useState("");
  const [description, setDescription] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleApplyTemplate = (idx: number) => {
    setSelectedTemplate(idx);
    setStrategyName(STRATEGY_TEMPLATES[idx].name);
    setDescription(STRATEGY_TEMPLATES[idx].desc);
    setCodeSnippet(STRATEGY_TEMPLATES[idx].snippet);
  };

  const handleAnalyze = async () => {
    if (!strategyName || !description) return;
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyName,
          description,
          codeSnippet,
          parameters: {
            isLiveTradingMode: true,
            throttleSafeDelay: "3.6s",
          },
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult(`⚠️ 분석 중 오류가 발생했습니다: ${data.error || "서버 통신 실패"}`);
      }
    } catch (err: any) {
      setAnalysisResult(`⚠️ 네트워크 에러가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Basic renderer for the Gemini Markdown response to make headers and lists pretty
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-bold text-gray-200 mt-4 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-blue-500 rounded" />
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-base font-extrabold text-blue-400 mt-5 mb-3 border-b border-gray-900 pb-1.5">
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ")) {
        return (
          <p key={idx} className="text-xs text-gray-300 font-semibold pl-1 mt-2 mb-1">
            {line}
          </p>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="text-xs text-gray-400 pl-4 list-disc list-inside leading-relaxed">
            {line.substring(2)}
          </li>
        );
      }
      if (line.startsWith("```")) {
        if (line.length > 3) {
          return null; // Skip code fence open lines
        }
        return <div key={idx} className="h-2" />; // Padding for code block end
      }
      // Check if it's a code block line (very basic check)
      const isCodeLine = line.startsWith("    ") || line.startsWith("def ") || line.startsWith("import ") || line.startsWith("class ") || line.includes("self.") || line.startsWith("print(");
      if (isCodeLine) {
        return (
          <div key={idx} className="font-mono text-[11px] bg-black/40 text-emerald-400/90 pl-3 leading-relaxed border-l border-emerald-900">
            {line}
          </div>
        );
      }
      return (
        <p key={idx} className="text-xs text-gray-400 leading-relaxed mt-1">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl" id="gemini-advisor-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            Gemini AI 퀀트 검증 및 안심 방어코드 생성기
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            자신만의 매매 시나리오를 입력하고, 키움 API의 TR 밴 제한 및 이벤트 역전 함정을 우회하는 최적의 Python 구현체를 설계 받으세요
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left pane: Input strategy details */}
        <div className="space-y-4">
          <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-4">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 block">추천 전략 템플릿</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {STRATEGY_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyTemplate(idx)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedTemplate === idx
                      ? "bg-purple-950/20 border-purple-500 text-purple-300"
                      : "bg-gray-900/40 border-gray-900 text-gray-400 hover:text-gray-300 hover:bg-gray-900/60"
                  }`}
                >
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {tmpl.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed line-clamp-3">
                    {tmpl.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-900 space-y-3.5">
            <div>
              <label className="text-xs text-gray-400 block mb-1">알고리즘 전략 명칭</label>
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="예: 볼린저 밴드 이평 수렴 스캘핑"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">상세 진입 및 청산 아이디어 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="진입 조건(예: 이평선 데드크로스 탈출) 및 손절선 수치를 기술하세요. 기재가 구체적일수록 꼼꼼한 키움 OCX 맞춤 큐 제어 솔루션이 설계됩니다."
                rows={4}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300 focus:outline-none focus:border-purple-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">초안 파이썬 코드 및 메모 (선택사항)</label>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="구현을 원하시는 파이썬 아이디어 혹은 조각 코드가 있다면 첨부하세요."
                rows={3}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 font-mono text-[11px] text-emerald-400/95 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !strategyName || !description}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all ${
                isLoading || !strategyName || !description
                  ? "bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/40"
              }`}
            >
              <Cpu className="w-4 h-4" />
              {isLoading ? "Gemini AI 자동 설계사 작동 중..." : "Gemini AI 검증 및 PyQt5 코드 설계 요청"}
            </button>
          </div>
        </div>

        {/* Right pane: Analysis Reports */}
        <div className="flex flex-col bg-gray-950/50 border border-gray-900 rounded-xl p-5 min-h-[350px]">
          <div className="flex items-center justify-between mb-4 border-b border-gray-900 pb-2.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-emerald-400" />
              키움 API 안전 규격 아키텍처 보고서
            </span>
            {analysisResult && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-400 hover:text-white transition-all"
                title="복사"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> 복사 완료
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> 레포트 복사
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-1.5">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center py-20 text-center"
                >
                  <Sparkles className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                  <p className="text-sm text-gray-300 font-semibold">Gemini가 퀀트 거래 규칙을 분석 중입니다...</p>
                  <p className="text-xs text-gray-500 mt-1.5 max-w-sm leading-relaxed">
                    초당 5회 TR 제한, 미확인 체결 큐(Defensive Queue) 구조, 모의투자 수수료 격차를 감안한 프로덕션 급 파이썬 소스코드를 조합해 가공하고 있습니다.
                  </p>
                </motion.div>
              ) : analysisResult ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/25 p-4 rounded-lg border border-gray-900 text-gray-300 text-xs font-sans space-y-3"
                >
                  {renderFormattedText(analysisResult)}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center py-24 text-center"
                >
                  <FileText className="w-10 h-10 text-gray-700 mb-3.5" />
                  <p className="text-xs text-gray-500">대기 중인 검증 보고서가 없습니다.</p>
                  <p className="text-[10px] text-gray-600 mt-1 max-w-xs">
                    좌측 폼을 작성하거나 추천 템플릿을 선택한 뒤 AI 검증 요청을 보내어 전문적인 기술 조언을 받아보세요.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
