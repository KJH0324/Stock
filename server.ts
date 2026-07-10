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
