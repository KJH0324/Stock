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
