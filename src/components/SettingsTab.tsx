import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Settings, 
  ShieldAlert, 
  Check, 
  HelpCircle, 
  Key, 
  Server, 
  Bell, 
  DollarSign,
  TrendingDown,
  TrendingUp,
  Sliders,
  Cpu
} from "lucide-react";

interface SettingsTabProps {
  onFeeRateChange: (rate: number) => void;
  currentFeeRate: number;
}

export default function SettingsTab({ onFeeRateChange, currentFeeRate }: SettingsTabProps) {
  // Persisted state hooks
  const [tradingMode, setTradingMode] = useState(() => localStorage.getItem("kiwoom_trading_mode") || "MOCK");
  const [accountNo, setAccountNo] = useState(() => localStorage.getItem("kiwoom_account_no") || "5023-4921-11");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("kiwoom_api_key") || "");
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem("kiwoom_api_secret") || "");
  const [certPassword, setCertPassword] = useState(() => localStorage.getItem("kiwoom_cert_password") || "");

  // Discord Bot
  const [discordToken, setDiscordToken] = useState(() => localStorage.getItem("kiwoom_discord_token") || "");
  const [discordClientId, setDiscordClientId] = useState(() => localStorage.getItem("kiwoom_discord_client_id") || "");
  const [discordClientSecret, setDiscordClientSecret] = useState(() => localStorage.getItem("kiwoom_discord_client_secret") || "");
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("kiwoom_discord_webhook") || "");
  const [guildId, setGuildId] = useState(() => localStorage.getItem("kiwoom_discord_guild_id") || "");
  const [logChannelId, setLogChannelId] = useState(() => localStorage.getItem("kiwoom_discord_log_channel_id") || "");
  const [alarmChannelId, setAlarmChannelId] = useState(() => localStorage.getItem("kiwoom_discord_alarm_channel_id") || "");
  const [mentionId, setMentionId] = useState(() => localStorage.getItem("kiwoom_discord_mention") || "");

  // Risk & Thresholds
  const [lossLimit, setLossLimit] = useState(() => localStorage.getItem("kiwoom_discord_loss_limit") || "500000");
  const [dropThreshold, setDropThreshold] = useState(() => localStorage.getItem("kiwoom_discord_drop_th") || "2.0");
  const [surgeThreshold, setSurgeThreshold] = useState(() => localStorage.getItem("kiwoom_discord_surge_th") || "3.0");
  const [dailyProfitTarget, setDailyProfitTarget] = useState(() => localStorage.getItem("kiwoom_daily_profit_target") || "1000000");
  const [tradingStartTime, setTradingStartTime] = useState(() => localStorage.getItem("kiwoom_trading_start") || "09:00");
  const [tradingEndTime, setTradingEndTime] = useState(() => localStorage.getItem("kiwoom_trading_end") || "15:30");

  // Custom Fee Rate input (unifying mock and real)
  const [customFeePercent, setCustomFeePercent] = useState((currentFeeRate * 100).toFixed(3));

  // Saving states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [botStatusText, setBotStatusText] = useState("Disconnected (비활성)");

  // Check backend Discord bot status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          setBotStatusText(data.botStatus);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
  }, []);

  const handleSaveSettings = async () => {
    // Save to localStorage
    localStorage.setItem("kiwoom_trading_mode", tradingMode);
    localStorage.setItem("kiwoom_account_no", accountNo);
    localStorage.setItem("kiwoom_api_key", apiKey);
    localStorage.setItem("kiwoom_api_secret", apiSecret);
    localStorage.setItem("kiwoom_cert_password", certPassword);

    localStorage.setItem("kiwoom_discord_token", discordToken);
    localStorage.setItem("kiwoom_discord_client_id", discordClientId);
    localStorage.setItem("kiwoom_discord_client_secret", discordClientSecret);
    localStorage.setItem("kiwoom_discord_webhook", webhookUrl);
    localStorage.setItem("kiwoom_discord_guild_id", guildId);
    localStorage.setItem("kiwoom_discord_log_channel_id", logChannelId);
    localStorage.setItem("kiwoom_discord_alarm_channel_id", alarmChannelId);
    localStorage.setItem("kiwoom_discord_mention", mentionId);

    localStorage.setItem("kiwoom_discord_loss_limit", lossLimit);
    localStorage.setItem("kiwoom_discord_drop_th", dropThreshold);
    localStorage.setItem("kiwoom_discord_surge_th", surgeThreshold);
    localStorage.setItem("kiwoom_daily_profit_target", dailyProfitTarget);
    localStorage.setItem("kiwoom_trading_start", tradingStartTime);
    localStorage.setItem("kiwoom_trading_end", tradingEndTime);

    // Apply custom fee rate
    const parsedFee = parseFloat(customFeePercent) / 100;
    if (!isNaN(parsedFee) && parsedFee >= 0) {
      onFeeRateChange(parsedFee);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    // Dynamic Server discord.js bot synchronization
    setBotLoading(true);
    try {
      const res = await fetch("/api/config/discord-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: discordToken,
          clientId: discordClientId,
          clientSecret: discordClientSecret,
          guildId,
          logChannelId,
          alarmChannelId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBotStatusText(discordToken ? "🟢 Connected as Bot" : "Disconnected (비활성)");
        } else {
          setBotStatusText(`🔴 Error: ${data.error}`);
        }
      }
    } catch (err: any) {
      setBotStatusText(`🔴 Connection Error: ${err.message}`);
    } finally {
      setBotLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="settings-tab-root">
      {/* Intro info card */}
      <div className="bg-[#1e1b4b]/20 border border-indigo-900/40 rounded-2xl p-5 flex items-start gap-4">
        <Server className="w-10 h-10 text-indigo-400 shrink-0 mt-1" />
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-indigo-300">독립 로컬 구동환경 설정 매니저</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            키움 OpenAPI 모듈과 디스코드 봇은 모두 귀하의 Windows PC 상에서 독립적으로 백그라운드 구동됩니다.
            아래에 입력하신 계좌 정보, API 보안 키, 디스코드 봇 크레덴셜은 브라우저 세션 및 로컬 스토리지를 통해 안전하게 영구 저장되어 유지됩니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Kiwoom OpenAPI & Trading Settings */}
        <div className="space-y-6">
          {/* Kiwoom Block */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2 border-b border-gray-900 pb-3">
              <Key className="w-4.5 h-4.5 text-indigo-400" />
              키움 OpenAPI 및 계좌 연동 설정
            </h3>

            {/* Trading Mode Radio */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5 font-medium">거래 구동 환경</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTradingMode("MOCK");
                    setCustomFeePercent("0.350"); // Autofill virtual fee
                  }}
                  className={`py-2 px-3.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    tradingMode === "MOCK"
                      ? "bg-indigo-950/40 border-indigo-500 text-indigo-300"
                      : "bg-gray-900/40 border-gray-900 text-gray-400 hover:text-gray-300"
                  }`}
                >
                  모의투자 모드 (Mock Mode)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTradingMode("REAL");
                    setCustomFeePercent("0.000"); // Autofill real exempt fee
                  }}
                  className={`py-2 px-3.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    tradingMode === "REAL"
                      ? "bg-emerald-950/40 border-emerald-500 text-emerald-400"
                      : "bg-gray-900/40 border-gray-900 text-gray-400 hover:text-gray-300"
                  }`}
                >
                  실전매매 모드 (Real Mode)
                </button>
              </div>
            </div>

            {/* Account Number */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">키움 증권 계좌번호</label>
              <input
                type="text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="예: 5023-4921-11"
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* API Key */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">키움 API Key (선택)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Secret Key"
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">API Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="API Secret String"
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Password Certificate */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">공인인증서 비밀번호</label>
              <input
                type="password"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Unified Trading Fee Setting */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2 border-b border-gray-900 pb-3">
              <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
              수수료 요율 통제 설정
            </h3>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">시뮬레이션 거래 수수료율</label>
                <span className="text-[10px] text-emerald-400 font-mono">완전 면제계좌 완벽 대응</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={customFeePercent}
                  onChange={(e) => setCustomFeePercent(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 pr-10 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-600">%</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                사용자님의 증권 계좌가 <strong>실거래 수수료 평생 면제</strong> 조건인 경우, 격차 보정을 위해 요율을 <code className="bg-black text-emerald-400 px-1 py-0.2 rounded text-[9px]">0.000%</code> 또는 유관기관 요율 수준인 <code className="bg-black text-emerald-400 px-1 py-0.2 rounded text-[9px]">0.003%</code>로 직접 제어하여 모의투자와 동일한 결과를 확보할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Discord Bot, Channels, Limits */}
        <div className="space-y-6">
          {/* Discord configuration block */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2 border-b border-gray-900 pb-3">
              <Bell className="w-4.5 h-4.5 text-indigo-400" />
              디스코드 봇 & 알림 발송망 설정
            </h3>

            {/* Token */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-400">Discord Bot Token (명령어 중단용)</label>
                <span className="text-[9px] text-gray-500 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-900 font-mono">
                  {botStatusText}
                </span>
              </div>
              <input
                type="password"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
                placeholder="MzIxNDM4Mjk... (봇 토큰)"
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                토큰 입력 시 디스코드 내에서 <code className="text-indigo-400 font-mono">!중단</code> 또는 <code className="text-indigo-400 font-mono">!재개</code> 명령을 감지하여 실시간 프로그램을 중단할 수 있습니다.
              </span>
            </div>

            {/* Discord Bot Client ID & Client Secret */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Discord Client ID (애플리케이션 ID)</label>
                <input
                  type="text"
                  value={discordClientId}
                  onChange={(e) => setDiscordClientId(e.target.value)}
                  placeholder="예: 1109431..."
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Discord Client Secret (시크릿 ID)</label>
                <input
                  type="password"
                  value={discordClientSecret}
                  onChange={(e) => setDiscordClientSecret(e.target.value)}
                  placeholder="Secret String"
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Dynamic Bot Invite Link */}
            {discordClientId && (
              <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 flex justify-between items-center">
                <span className="text-[10px] text-gray-400">간편 봇 초대 링크가 생성되었습니다:</span>
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${discordClientId}&permissions=8&scope=bot`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] transition-all"
                >
                  서버에 봇 초대하기 ↗
                </a>
              </div>
            )}

            {/* Webhook URL */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Discord Webhook URL (경보/로그 공통)</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-[10px] text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Discord Guild & Channel IDs */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">서버 ID (Guild ID)</label>
                <input
                  type="text"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="예: 1109431..."
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-[10px] text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">체결 로그 채널 ID</label>
                <input
                  type="text"
                  value={logChannelId}
                  onChange={(e) => setLogChannelId(e.target.value)}
                  placeholder="체결 로그 전용"
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-[10px] text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">비상 경보 채널 ID</label>
                <input
                  type="text"
                  value={alarmChannelId}
                  onChange={(e) => setAlarmChannelId(e.target.value)}
                  placeholder="중대한 경보 전용"
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-[10px] text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Mention user ID */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">경보 시 태그할 디스코드 유저 ID (선택)</label>
              <input
                type="text"
                value={mentionId}
                onChange={(e) => setMentionId(e.target.value)}
                placeholder="예: 4128942194218"
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Limits and safety block */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2 border-b border-gray-900 pb-3">
              <ShieldAlert className="w-4.5 h-4.5 text-orange-400" />
              리스크 관리 및 임계 통제선 설정
            </h3>

            {/* Loss limit */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">누적 최대 허용 손실 기준액</label>
              <div className="relative">
                <input
                  type="number"
                  value={lossLimit}
                  onChange={(e) => setLossLimit(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 pr-12 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-500">KRW (원)</span>
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">기준 초과 손실 발생 시 즉시 감시가 원격 정지되며 자동 일괄 청산(선조치) 보고가 송출됩니다.</span>
            </div>

            {/* Drop / Surge Threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">장중 급락 경보선</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={dropThreshold}
                    onChange={(e) => setDropThreshold(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 pr-8 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-500">%</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">장중 급등 포착선</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={surgeThreshold}
                    onChange={(e) => setSurgeThreshold(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 pr-8 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-500">%</span>
                </div>
              </div>
            </div>

            {/* Daily Profit Target & Trading Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">일일 목표 익절 금액 (KRW)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={dailyProfitTarget}
                    onChange={(e) => setDailyProfitTarget(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 pr-12 font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-600">₩</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">매매 자동 종료 시간</label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={tradingStartTime}
                    onChange={(e) => setTradingStartTime(e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-[10px] text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-gray-600 self-center">~</span>
                  <input
                    type="time"
                    value={tradingEndTime}
                    onChange={(e) => setTradingEndTime(e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-900 rounded-lg p-2 font-mono text-[10px] text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Row */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveSettings}
          disabled={botLoading}
          className="w-full sm:w-auto px-10 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2"
        >
          {botLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {saveSuccess ? "로컬 PC 크레덴셜 영구 저장 완료!" : "모든 설정 저장 및 환경 동기화"}
        </button>
      </div>
    </div>
  );
}
