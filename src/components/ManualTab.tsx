import { useState, useEffect } from "react";
import { Stock, TradeLog, StrategyType } from "../types";
import { Search, ShoppingCart, Loader2 } from "lucide-react";

interface ManualTabProps {
  onTradeExecute: (log: TradeLog) => void;
  balance: number;
}


const STOCK_NAMES: Record<string, string> = {
  "005930": "삼성전자", "000660": "SK하이닉스", "042700": "한미반도체", "035420": "NAVER", 
  "005380": "현대차", "035720": "카카오", "068270": "셀트리온", "005490": "POSCO홀딩스",
  "000270": "기아", "373220": "LG에너지솔루션", "450080": "에코프로머티", "247540": "에코프로비엠",
  "028300": "HLB", "196170": "알테오젠", "454910": "두산로보틱스", "323410": "카카오뱅크",
  "012330": "현대모비스", "055550": "신한지주", "105560": "KB금융", "042660": "한화오션"
};
export default function ManualTab({ onTradeExecute, balance }: ManualTabProps) {
  const [stockCode, setStockCode] = useState("");
  const [stockName, setStockName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  useEffect(() => {
    if (!stockCode || stockCode.length !== 6) return;
    
    const fetchCurrentPrice = async () => {
      setIsFetchingPrice(true);
      try {
        const mode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";
        const accessToken = sessionStorage.getItem("kiwoom_access_token");
        if (!accessToken) return;

        const res = await fetch("/api/dostk/mrkcond", {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": `Bearer ${accessToken}`,
            "api-id": "ka10001",
            "x-trading-mode": mode
          },
          body: JSON.stringify({ stock_code: stockCode })
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.output?.price && parseInt(data.output.price, 10) > 0) {
            setPrice(data.output.price);
          }
          
          if (data?.output?.name) {
            setStockName(data.output.name);
          } else {
            // Fallback to POPULAR_STOCKS if API doesn't provide name
            if (STOCK_NAMES[stockCode]) setStockName(STOCK_NAMES[stockCode]);
          }

        }
      } catch (e) {
        console.error("Failed to fetch price:", e);
      } finally {
        setIsFetchingPrice(false);
      }
    };

    fetchCurrentPrice();
  }, [stockCode]);

  const handleTrade = async (action: "BUY" | "SELL") => {
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!stockCode || !quantity || !price) {
      setErrorMsg("종목코드, 단가, 수량을 모두 입력해주세요.");
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    const priceNum = parseInt(price, 10);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("수량을 올바르게 입력해주세요.");
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("단가를 올바르게 입력해주세요.");
      return;
    }

    const totalAmount = qtyNum * priceNum;
    if (action === "BUY" && totalAmount > balance) {
      setErrorMsg(`잔고가 부족합니다. (현재 잔고: ${balance.toLocaleString()}원)`);
      return;
    }

    setIsLoading(true);

    try {
      const mode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";
      const accessToken = sessionStorage.getItem("kiwoom_access_token") || "";
      const accountNo = localStorage.getItem("kiwoom_account_no") || "";
      const apiId = action === "BUY" ? "kt10000" : "kt10001";

      const orderRes = await fetch("/api/dostk/ordr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Authorization": `Bearer ${accessToken}`,
          "api-id": apiId,
          "x-trading-mode": mode
        },
        body: JSON.stringify({
          account_no: accountNo,
          stock_code: stockCode,
          qty: String(qtyNum),
          price: String(priceNum)
        })
      });

      const orderData = await orderRes.json();
      
      if (!orderRes.ok || orderData?.rt_cd !== "0") {
        throw new Error(orderData?.msg1 || "Order API request failed");
      }

      // Success, create log
      const log: TradeLog = {
        id: `manual-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        stockCode,
        stockName: stockName || stockCode,
        strategy: StrategyType.MANUAL,
        action,
        price: priceNum,
        quantity: qtyNum,
        totalAmount,
        fee: 0,
        tax: 0,
        orderId: orderData.output?.order_no || `ORD_${Date.now()}`,
        status: "COMPLETED",
      };

      onTradeExecute(log);
      setSuccessMsg(`${action === "BUY" ? "매수" : "매도"} 주문이 성공적으로 실행되었습니다. (주문번호: ${log.orderId})`);
      setQuantity("");
    } catch (err: any) {
      console.error("Order error:", err);
      setErrorMsg(err.message || "주문 전송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4 border-b border-gray-900 pb-3">
          <ShoppingCart className="w-5 h-5 text-indigo-400" />
          수동 주문
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-emerald-400">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">종목코드</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value)}
                  placeholder="예: 005930"
                  className="w-full bg-gray-950 border border-gray-900 rounded-lg py-2 pl-9 pr-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">종목명 (자동입력)</label>
              <input
                type="text"
                readOnly
                value={isFetchingPrice ? "불러오는 중..." : stockName}
                placeholder="종목코드를 입력하세요"
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            
            <div className="pt-2">
              <span className="text-xs text-gray-500 block mb-1">현재 주문 가능 잔고</span>
              <div className="text-lg font-mono text-gray-200 font-semibold bg-gray-950/50 p-3 rounded-lg border border-gray-900/50">
                {balance.toLocaleString()}원
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                주문 단가 (원)
                {isFetchingPrice && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={isFetchingPrice ? "조회중..." : "0"}
                min="0"
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">주문 수량 (주)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            
            <div className="pt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTrade("BUY")}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-900/50 p-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                매수 (BUY)
              </button>
              
              <button
                onClick={() => handleTrade("SELL")}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-500 border border-blue-900/50 p-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                매도 (SELL)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
