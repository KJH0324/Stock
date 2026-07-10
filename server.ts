import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini SDK with custom User-Agent as specified in guidelines
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("⚠️ GEMINI_API_KEY is not configured or uses placeholder. Gemini capabilities will be unavailable.");
}

// API Routes
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { strategyName, description, parameters, codeSnippet } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: "Gemini API is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
      });
    }

    const prompt = `
You are an expert quantitative trading engineer specializing in the Korean stock market and the Kiwoom OpenAPI+ framework in Python.
Evaluate the following trading strategy proposal and provide a comprehensive architectural review, risk assessment, and production-ready Python (pykiwoom or PyQt5) implementation.

Strategy Name: ${strategyName || "Unnamed Strategy"}
User's Description: ${description || "No description provided."}
Key Parameters: ${JSON.stringify(parameters || {})}
Custom Code/Ideas: ${codeSnippet || "None provided."}

Analyze this proposal carefully. Your review MUST directly incorporate the critical constraints and principles detailed in the Kiwoom OpenAPI technical paper:
1. TR Throttling Mitigation: Explain how to structure TR queries (e.g. daily charts, balance queries) using a Leaky/Token Bucket and continuous delay (3.6s intervals for historical data requests) to prevent blockages.
2. Async Reversal Phenomenon Defense: Warn against key errors when OnReceiveChejanData (Execution) is received before OnReceiveTrData (Order Confirmation) in high-volatility scenarios. Detail how to implement an "Unconfirmed Execution Queue" (미확인 체결 큐) using a Python dictionary structure to handle out-of-order events.
3. Tax & Fee Realities: Standard trading fees in production are extremely low (0.015% per transaction, 0.030% round trip), while Mock Investment (모의투자) enforces a penal 0.350% fee (0.700% round trip). Explain how this impacts backtesting results. Mention that selling incurs a 0.20% tax (KOSPI includes 0.05% transaction tax + 0.15% special tax, KOSDAQ is 0.20% transaction tax).
4. Market Impact & TWAP: For large order volumes, simple market orders create slippage. Suggest TWAP (Time-Weighted Average Price) split execution or Best Favorable Price orders (최유리 지정가).

Provide your response in structured Markdown with clean Korean text. The structure should be:
1. **전략 위험 분석 및 아키텍처 리뷰 (Risk & Architecture Review)**: Critically assess throttling, event loop, and reverse-order transaction issues.
2. **모의 vs 실전 수익성 괴리 경고 (Virtual vs Real Gap Assessment)**: Concrete calculations based on fees/taxes/slippage.
3. **프로덕션 급 Python 구현 코드 (Production Python Code)**: A clean, complete, fully commented Python PyQt5/pykiwoom code snippet implementing the strategy safely. Include:
   - Event Loop (QEventLoop) synchronization wrappers.
   - Leaky bucket throttling safe call utility.
   - Unconfirmed Execution Queue storage to prevent KeyErrors during event reversal.
   - The strategy logic itself.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Internal server error during analysis." });
  }
});

// Market Sentiment Analysis Route
app.post("/api/market/sentiment", async (req, res) => {
  try {
    const { stocks, activeStrategy } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: "Gemini API is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
      });
    }

    const prompt = `
      당신은 전문 퀀트 투자 애널리스트입니다. 아래 제공된 실시간 감시 종목 데이터와 현재 선택된 전략(${activeStrategy})을 기반으로 시장 통찰력을 제공해주세요.
      
      [감시 종목 데이터]
      ${JSON.stringify(stocks, null, 2)}
      
      다음 형식으로 응답해주세요 (JSON 아님, 마크다운 형식):
      1. **시장 종합 의견**: 현재 전반적인 변동성과 추세에 대한 짧은 요약.
      2. **전략 적합도**: 현재 장세가 ${activeStrategy} 전략에 얼마나 유리한지 (0~100점).
      3. **종목별 특이사항**: 급등/급락 징후가 보이거나 기술적 지표가 특이한 종목 언급.
      4. **리스크 권고**: 현재 시점에서 주의해야 할 매매 리스크.
      
      간결하고 전문적인 톤으로 작성해주세요. 한국어로 응답하세요.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini Market Sentiment Error:", error);
    res.status(500).json({ error: error.message || "Market analysis failed." });
  }
});

// Discord alert log storage and global application state
const discordLogs: any[] = [];
let isProgramRunning = true;
let botStatusMessage = "Disconnected (비활성)";
let botClient: any = null;
let botClientId = "";
let botClientSecret = "";

// API Route to dispatch Discord notifications (via bot client or webhook)
app.post("/api/discord/alert", async (req, res) => {
  try {
    const { webhookUrl, mentionId, title, description, fields, color, alertType, channelId } = req.body;
    
    const formattedFields = fields || [];
    const embedColor = color || 0x10b981; // default to emerald green
    const mentionString = mentionId ? `<@${mentionId}> ` : "";

    const timestamp = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const fullTimestampIso = new Date().toISOString();

    const logEntry = {
      id: `discord-${Date.now()}`,
      timestamp,
      alertType: alertType || "INFO",
      title,
      description,
      fields: formattedFields,
      color: embedColor,
      mentionId,
      sentToDiscord: false,
      error: null as string | null
    };

    // Build the Discord Embed object
    const embedPayload = {
      title: title || "알림",
      description: description || "설명 없음",
      color: embedColor,
      fields: formattedFields,
      timestamp: fullTimestampIso,
      footer: {
        text: "Kiwoom OpenAPI+ Local Client Server"
      }
    };

    let sentSuccessfully = false;

    // 1. Try sending via Discord Bot Client if initialized and channelId is supplied
    if (botClient && botClient.readyAt && channelId) {
      try {
        const channel = await botClient.channels.fetch(channelId);
        if (channel && typeof channel.send === "function") {
          await channel.send({
            content: `${mentionString}🚨 **[Kiwoom Auto-Trader 선조치 보고]**\n알고리즘 매매가 지체 없이 체결 처리된 후 디스코드 로그 채널로 전송된 보고서입니다.`,
            embeds: [embedPayload]
          });
          sentSuccessfully = true;
          logEntry.sentToDiscord = true;
        }
      } catch (botErr: any) {
        console.error("Failed to send message via Discord Bot Client:", botErr);
        logEntry.error = `Bot Error: ${botErr.message}`;
      }
    }

    // 2. Fallback or double-post via Webhook URL if provided
    if (!sentSuccessfully && webhookUrl && webhookUrl.startsWith("http")) {
      try {
        const payload = {
          content: `${mentionString}🚨 **[Kiwoom Auto-Trader 선조치 보고]**\n알고리즘 매매가 지체 없이 체결 처리된 후 디스코드 로그 채널로 전송된 보고서입니다.`,
          embeds: [embedPayload]
        };

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          sentSuccessfully = true;
          logEntry.sentToDiscord = true;
        } else {
          const text = await response.text();
          logEntry.error = logEntry.error 
            ? `${logEntry.error} | Webhook HTTP Error: ${response.status} - ${text}` 
            : `Webhook HTTP Error: ${response.status} - ${text}`;
        }
      } catch (err: any) {
        logEntry.error = logEntry.error 
          ? `${logEntry.error} | Webhook Connection Error: ${err.message}` 
          : `Webhook Connection Error: ${err.message}`;
      }
    }

    if (!sentSuccessfully && !webhookUrl && !channelId) {
      logEntry.error = "Webhook URL 및 Discord 채널 ID가 미등록되었습니다. (시뮬레이터 로컬 로그 저장)";
    }

    // Add to logs and keep max 100 entries
    discordLogs.unshift(logEntry);
    if (discordLogs.length > 100) {
      discordLogs.pop();
    }

    res.json({ success: true, log: logEntry });
  } catch (error: any) {
    console.error("Discord Alert Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to dispatch alert." });
  }
});

// Configure or Register Discord Bot Client Dynamically
app.post("/api/config/discord-bot", async (req, res) => {
  try {
    const { token, clientId, clientSecret, guildId, logChannelId, alarmChannelId } = req.body;

    botClientId = clientId || "";
    botClientSecret = clientSecret || "";

    if (!token) {
      if (botClient) {
        botClient.destroy();
        botClient = null;
      }
      botStatusMessage = "Disconnected (비활성)";
      return res.json({ success: true, status: botStatusMessage });
    }

    // Re-initialize Discord Client
    if (botClient) {
      botClient.destroy();
      botClient = null;
    }

    const { Client, GatewayIntentBits } = await import("discord.js");
    
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    client.on("ready", () => {
      console.log(`🤖 Discord bot running as: ${client.user?.tag}`);
      botStatusMessage = `🟢 Connected as ${client.user?.tag}`;
    });

    client.on("messageCreate", async (message: any) => {
      if (message.author.bot) return;

      // Filter by Guild if provided
      if (guildId && message.guildId !== guildId) return;

      const content = message.content.trim().toLowerCase();

      if (content === "!stop" || content === "!중단") {
        isProgramRunning = false;
        await message.reply("🛑 **[Kiwoom Auto-Trader]** 디스코드 원격 중단 명령이 수신되었습니다. 즉시 실시간 감시 스케줄 및 시뮬레이션을 전면 정지합니다.");
      } else if (content === "!start" || content === "!재개") {
        isProgramRunning = true;
        await message.reply("▶️ **[Kiwoom Auto-Trader]** 원격 기동 명령 수신. 실시간 오토트레이더 감시 상태를 다시 시작합니다.");
      } else if (content === "!status" || content === "!상태") {
        await message.reply(`🤖 **[Kiwoom Auto-Trader 실시간 진단 보고]**\n- **엔진가동 상태**: ${isProgramRunning ? "🟢 RUNNING (정상 기동 중)" : "🔴 STOPPED (원격 제어 정지됨)"}\n- **로그 수신 채널 ID**: \`${logChannelId || "미등록"}\`\n- **경보 수신 채널 ID**: \`${alarmChannelId || "미등록"}\``);
      }
    });

    botClient = client;
    await client.login(token);

    res.json({ success: true, status: "Connected successfully" });
  } catch (error: any) {
    console.error("Discord Bot Login Failure:", error);
    botStatusMessage = `🔴 Error: ${error.message}`;
    res.json({ success: false, error: error.message });
  }
});

// Retrieve System and Discord Status
app.get("/api/system/status", (req, res) => {
  res.json({
    isProgramRunning,
    botStatus: botStatusMessage,
    logCount: discordLogs.length
  });
});

// Toggle running state manually from client console
app.post("/api/system/toggle", (req, res) => {
  isProgramRunning = !isProgramRunning;
  res.json({ success: true, isProgramRunning });
});

// Server-side account assets storage with dynamic fallback
let serverBalance = 100000000; // 100M KRW
let serverInitialCapital = 100000000;

// POST /oauth2/token - Kiwoom OpenAPI Access Token Request (au10001)
app.post("/oauth2/token", async (req, res) => {
  try {
    const { grant_type, appkey, secretkey } = req.body;
    const tradingMode = req.headers["x-trading-mode"] || "MOCK";
    const baseDomain = tradingMode === "REAL" ? "https://api.kiwoom.com" : "https://mockapi.kiwoom.com";

    // If keys are valid/not simulated placeholders, forward to actual Kiwoom OAuth
    if (appkey && secretkey && appkey !== "MY_API_KEY" && !appkey.startsWith("simulated_") && appkey.trim() !== "") {
      console.log(`Forwarding OAuth token request to Kiwoom (${tradingMode})...`);
      const response = await fetch(`${baseDomain}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8"
        },
        body: JSON.stringify({ grant_type, appkey, secretkey })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // High-fidelity fallback simulated token response
    console.log(`Serving simulated OAuth token for appkey: ${appkey || "default"}...`);
    res.json({
      access_token: `simulated_access_token_kiwoom_${Date.now()}`,
      token_type: "Bearer",
      expires_in: 86400
    });
  } catch (error: any) {
    console.error("OAuth token proxy error:", error);
    res.status(500).json({ error: error.message || "Failed to process token request" });
  }
});

// POST /api/dostk/acnt - Kiwoom Domestic Stock Accounts & Balances
app.post("/api/dostk/acnt", async (req, res) => {
  try {
    const apiId = req.headers["api-id"] as string;
    const authorization = req.headers["authorization"] as string;
    const tradingMode = req.headers["x-trading-mode"] as string || "MOCK";
    const baseDomain = tradingMode === "REAL" ? "https://api.kiwoom.com" : "https://mockapi.kiwoom.com";

    // If we have a real non-simulated Bearer token, proxy to Kiwoom OpenAPI
    if (authorization && !authorization.includes("simulated_") && authorization.trim() !== "") {
      console.log(`Proxying real TR ${apiId} to Kiwoom (${tradingMode})...`);
      const response = await fetch(`${baseDomain}/api/dostk/acnt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Authorization": authorization,
          "api-id": apiId
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // High-fidelity fallback simulated output for account/balances
    console.log(`Serving high-fidelity simulation for account TR ${apiId}...`);
    
    if (apiId === "ka00001") {
      // Account lookup
      return res.json({
        rt_cd: "0",
        msg_cd: "0000",
        msg1: "계좌번호 조회 완료 (SIMULATED)",
        output: [
          { account_no: req.body.account_no || "5012345610", account_name: "키움위탁기본계좌" }
        ]
      });
    }

    if (apiId === "kt00001") {
      // Deposit details status
      return res.json({
        rt_cd: "0",
        msg_cd: "0000",
        msg1: "예수금 상세현황 조회 완료 (SIMULATED)",
        output: {
          dps: String(serverBalance),
          ord_psbl_cash: String(serverBalance)
        }
      });
    }

    if (apiId === "kt00003") {
      // Estimated asset lookup (추정자산조회요청)
      return res.json({
        rt_cd: "0",
        msg_cd: "0000",
        msg1: "추정자산 조회 완료 (SIMULATED)",
        output: {
          dps: String(serverBalance),
          tot_evl_amt: String(serverBalance),
          est_ast_amt: String(serverBalance),
          real_pnl: "0"
        }
      });
    }

    if (apiId === "kt00004" || apiId === "kt00018") {
      // Account evaluation status / evaluation balance details
      return res.json({
        rt_cd: "0",
        msg_cd: "0000",
        msg1: "계좌평가현황 조회 완료 (SIMULATED)",
        output: {
          tot_evl_amt: String(serverBalance),
          tot_pnl_amt: "0",
          tot_pnl_rt: "0.00"
        },
        output2: []
      });
    }

    // Catch-all response
    res.json({
      rt_cd: "0",
      msg_cd: "0000",
      msg1: `TR ${apiId} 완료 (SIMULATED)`,
      output: {}
    });

  } catch (error: any) {
    console.error(`TR ${req.headers["api-id"]} proxy error:`, error);
    res.status(500).json({ error: error.message || "Failed to proxy TR call" });
  }
});

// POST /api/dostk/ordr - Kiwoom Domestic Stock Trading & Orders
app.post("/api/dostk/ordr", async (req, res) => {
  try {
    const apiId = req.headers["api-id"] as string;
    const authorization = req.headers["authorization"] as string;
    const tradingMode = req.headers["x-trading-mode"] as string || "MOCK";
    const baseDomain = tradingMode === "REAL" ? "https://api.kiwoom.com" : "https://mockapi.kiwoom.com";

    if (authorization && !authorization.includes("simulated_") && authorization.trim() !== "") {
      console.log(`Proxying real Order TR ${apiId} to Kiwoom (${tradingMode})...`);
      const response = await fetch(`${baseDomain}/api/dostk/ordr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Authorization": authorization,
          "api-id": apiId
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // High-fidelity fallback simulated order output
    console.log(`Serving high-fidelity simulation for order TR ${apiId}...`);
    const { stock_code, qty, price } = req.body;
    
    res.json({
      rt_cd: "0",
      msg_cd: "0000",
      msg1: "주문 접수가 성공적으로 완료되었습니다 (SIMULATED)",
      output: {
        order_no: `ORD_${Date.now().toString().slice(-6)}`,
        stock_code: stock_code || "005930",
        quantity: String(qty || 1),
        price: String(price || 50000)
      }
    });
  } catch (error: any) {
    console.error(`Order TR proxy error:`, error);
    res.status(500).json({ error: error.message || "Failed to process order" });
  }
});

// POST /api/dostk/mrkcond - Market Conditions & Stock Info
app.post("/api/dostk/mrkcond", async (req, res) => {
  try {
    const apiId = req.headers["api-id"] as string;
    const authorization = req.headers["authorization"] as string;
    const tradingMode = req.headers["x-trading-mode"] as string || "MOCK";
    const baseDomain = tradingMode === "REAL" ? "https://api.kiwoom.com" : "https://mockapi.kiwoom.com";

    if (authorization && !authorization.includes("simulated_") && authorization.trim() !== "") {
      const response = await fetch(`${baseDomain}/api/dostk/mrkcond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Authorization": authorization,
          "api-id": apiId
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    res.json({
      rt_cd: "0",
      msg_cd: "0000",
      msg1: `Market Condition ${apiId} (SIMULATED)`,
      output: {}
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dostk/chart - Stock Charts & Candlestick Data
app.post("/api/dostk/chart", async (req, res) => {
  try {
    const apiId = req.headers["api-id"] as string;
    const authorization = req.headers["authorization"] as string;
    const tradingMode = req.headers["x-trading-mode"] as string || "MOCK";
    const baseDomain = tradingMode === "REAL" ? "https://api.kiwoom.com" : "https://mockapi.kiwoom.com";

    if (authorization && !authorization.includes("simulated_") && authorization.trim() !== "") {
      const response = await fetch(`${baseDomain}/api/dostk/chart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Authorization": authorization,
          "api-id": apiId
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    res.json({
      rt_cd: "0",
      msg_cd: "0000",
      msg1: `Chart data ${apiId} (SIMULATED)`,
      output: []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Synchronize or update account assets from client actions
app.post("/api/account/update", (req, res) => {
  const { balance, initialCapital } = req.body;
  if (typeof balance === "number") {
    serverBalance = balance;
  }
  if (typeof initialCapital === "number") {
    serverInitialCapital = initialCapital;
  }
  res.json({
    success: true,
    balance: serverBalance,
    initialCapital: serverInitialCapital
  });
});

// Retrieve Discord Alert Logs
app.get("/api/discord/logs", (req, res) => {
  res.json({ logs: discordLogs });
});

// Clear Discord Alert Logs
app.post("/api/discord/clear-logs", (req, res) => {
  discordLogs.length = 0;
  res.json({ success: true });
});

async function start() {
  // Configure Vite middleware in development or serve static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Kiwoom Auto-Trading Simulator running on port ${PORT}`);
  });
}

start();
