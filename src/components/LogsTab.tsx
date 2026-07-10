import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ClipboardList, 
  Trash2, 
  Terminal, 
  Bell, 
  Search, 
  Filter, 
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  ShieldAlert
} from "lucide-react";
import { TradeLog } from "../types";

interface DiscordLog {
  id: string;
  timestamp: string;
  alertType: string;
  title: string;
  description: string;
  fields: { name: string; value: string; inline?: boolean }[];
  color: number;
  mentionId: string;
  sentToDiscord: boolean;
  error: string | null;
}

interface LogsTabProps {
  tradeLogs: TradeLog[];
  onClearTradeLogs: () => void;
}

export default function LogsTab({ tradeLogs, onClearTradeLogs }: LogsTabProps) {
  const [activeLogTab, setActiveLogTab] = useState<"TRADES" | "DISCORD">("TRADES");
  const [discordLogs, setDiscordLogs] = useState<DiscordLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDiscordLogs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/discord/logs");
      if (res.ok) {
        const data = await res.json();
        setDiscordLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch Discord logs:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiscordLogs();
    const interval = setInterval(fetchDiscordLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClearDiscordLogs = async () => {
    if (!window.confirm("디스코드 송출 내역을 전부 초기화하시겠습니까?")) return;
    try {
      await fetch("/api/discord/clear-logs", { method: "POST" });
      setDiscordLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter trade logs
  const filteredTradeLogs = tradeLogs.filter(log => {
    const q = searchQuery.toLowerCase();
    return (
      log.stockName.toLowerCase().includes(q) ||
      log.stockCode.includes(q) ||
      log.orderId.toLowerCase().includes(q) ||
      log.strategy.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q)
    );
  });

  // Filter discord logs
  const filteredDiscordLogs = discordLogs.filter(log => {
    const q = searchQuery.toLowerCase();
    return (
      log.title.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.alertType.toLowerCase().includes(q) ||
      (log.error && log.error.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5" id="logs-tab-root">
      {/* Sub tabs and search header */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 bg-gray-950 p-1 rounded-xl border border-gray-900 self-start">
          <button
            onClick={() => setActiveLogTab("TRADES")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeLogTab === "TRADES"
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            실시간 체결 원장 ({tradeLogs.length})
          </button>
          <button
            onClick={() => setActiveLogTab("DISCORD")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeLogTab === "DISCORD"
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            디스코드 송출 내역 ({discordLogs.length})
          </button>
        </div>

        {/* Search bar & Controls */}
        <div className="flex items-center gap-3.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeLogTab === "TRADES" ? "종목명, 코드, 주문ID 검색..." : "알림 내용, 에러코드 검색..."}
              className="w-full bg-gray-950 border border-gray-900 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={activeLogTab === "TRADES" ? onClearTradeLogs : handleClearDiscordLogs}
            className="flex items-center gap-1 px-3 py-2 bg-gray-900/60 border border-gray-800 text-gray-400 hover:text-red-400 rounded-xl text-xs font-semibold transition-all"
            title="현재 로그 비우기"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">비우기</span>
          </button>

          {activeLogTab === "DISCORD" && (
            <button
              onClick={fetchDiscordLogs}
              className={`p-2 bg-gray-900/60 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-all ${isRefreshing ? "animate-spin text-indigo-400" : ""}`}
              title="새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main logs display list */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl min-h-[400px]">
        {activeLogTab === "TRADES" ? (
          /* TRADING LEDGER VIEW */
          <div className="overflow-x-auto">
            {filteredTradeLogs.length === 0 ? (
              <div className="text-center py-24 text-xs text-gray-500 italic select-none">
                {searchQuery ? "검색 조건에 일치하는 체결 로그가 없습니다." : "체결 내역이 비어 있습니다. 메인에서 자동매매를 가동해 보세요."}
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-900 text-gray-500 text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-2">시간</th>
                    <th className="py-3 px-2">주문번호</th>
                    <th className="py-3 px-2">종목</th>
                    <th className="py-3 px-2">알고리즘 전략</th>
                    <th className="py-3 px-2">구분</th>
                    <th className="py-3 px-2 text-right">체결가</th>
                    <th className="py-3 px-2 text-right">수량</th>
                    <th className="py-3 px-2 text-right">체결금액</th>
                    <th className="py-3 px-2 text-right">수수료</th>
                    <th className="py-3 px-2 text-right text-red-500">거래세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/30">
                  {filteredTradeLogs.map((log) => {
                    const isBuy = log.action === "BUY";
                    return (
                      <tr key={log.id} className="hover:bg-gray-950/40 text-gray-300">
                        <td className="py-3 px-2 text-[10px] text-gray-500">{log.timestamp}</td>
                        <td className="py-3 px-2 text-[10px] text-indigo-400">{log.orderId}</td>
                        <td className="py-3 px-2">
                          <span className="font-bold text-gray-100">{log.stockName}</span>
                          <span className="text-[10px] text-gray-500 ml-1.5 font-normal">({log.stockCode})</span>
                        </td>
                        <td className="py-3 px-2 text-gray-400 font-sans text-[11px]">
                          {log.strategy === "LARRY_WILLIAMS" ? "래리 변동성 돌파" : log.strategy === "BOLLINGER_STOCHASTIC" ? "볼린저+스토캐스틱" : "52주 신고가 돌파"}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                            isBuy 
                              ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40" 
                              : "bg-red-950/50 text-red-400 border border-red-900/40"
                          }`}>
                            {isBuy ? "매수 (BUY)" : "매도 (SELL)"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-semibold">{log.price.toLocaleString()}원</td>
                        <td className="py-3 px-2 text-right font-semibold text-gray-400">{log.quantity.toLocaleString()}주</td>
                        <td className="py-3 px-2 text-right font-bold text-gray-100">{log.totalAmount.toLocaleString()}원</td>
                        <td className="py-3 px-2 text-right text-gray-500">{log.fee.toLocaleString()}원</td>
                        <td className="py-3 px-2 text-right text-red-500/80">{log.tax.toLocaleString()}원</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* DISCORD BOT LIVE HISTORY VIEW */
          <div className="space-y-4">
            {filteredDiscordLogs.length === 0 ? (
              <div className="text-center py-24 text-xs text-gray-500 italic select-none">
                {searchQuery ? "검색 조건에 일치하는 디스코드 알림 로그가 없습니다." : "송출된 디스코드 봇 알림 로그가 없습니다."}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {filteredDiscordLogs.map((log) => {
                  const hasError = log.error !== null;
                  return (
                    <div 
                      key={log.id} 
                      className="bg-black/30 border border-gray-900 rounded-xl p-4 transition-all hover:border-gray-800/80 border-l-4"
                      style={{ borderLeftColor: `#${log.color.toString(16).padStart(6, "0")}` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-gray-500 font-mono border-b border-gray-900 pb-2.5 mb-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `#${log.color.toString(16).padStart(6, "0")}` }} />
                          {log.timestamp} | Type: <span className="font-bold text-gray-400">{log.alertType}</span>
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {log.sentToDiscord ? (
                            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded-[4px] font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> DISCORD SENT
                            </span>
                          ) : (
                            <span className="bg-gray-900 text-gray-500 border border-gray-800 px-2 py-0.5 rounded-[4px] font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-gray-500" /> LOCAL SIMULATOR ONLY
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-gray-100 text-xs flex items-center gap-1.5">
                          {log.title}
                        </h4>
                        <p className="text-gray-400 text-xs leading-relaxed">{log.description}</p>
                      </div>

                      {/* Embed Fields Grid */}
                      {log.fields && log.fields.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 bg-black/40 border border-gray-900/50 rounded-lg p-3 mt-3">
                          {log.fields.map((f, idx) => (
                            <div key={idx} className="font-mono text-[10.5px]">
                              <span className="text-gray-500 block text-[9.5px]">{f.name}:</span>
                              <span className="text-gray-200 font-bold">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Error line */}
                      {hasError && (
                        <div className="mt-2.5 p-2 bg-red-950/20 border border-red-950/40 rounded-lg flex items-center gap-1.5 font-mono text-[10px] text-red-400">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>전송 오류: {log.error}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
