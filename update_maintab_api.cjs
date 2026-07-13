const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

const apiCallBuyStr = `
            const mode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";
            const accessToken = sessionStorage.getItem("kiwoom_access_token") || "";
            const accountNo = localStorage.getItem("kiwoom_account_no") || "";
            
            fetch("/api/dostk/ordr", {
              method: "POST",
              headers: {
                "Content-Type": "application/json;charset=UTF-8",
                "Authorization": \`Bearer \${accessToken}\`,
                "api-id": "kt10000",
                "x-trading-mode": mode
              },
              body: JSON.stringify({
                account_no: accountNo,
                stock_code: s.code,
                qty: String(tradeQty),
                price: String(s.currentPrice)
              })
            }).then(res => res.json()).then(orderData => {
              if (orderData?.rt_cd === "0") {
                const log: TradeLog = {
                  id: \`trade-buy-\${Date.now()}-\${s.code}\`,
                  timestamp: simTime,
                  stockCode: s.code,
                  stockName: s.name,
                  strategy: activeStrategy,
                  action: "BUY",
                  price: s.currentPrice,
                  quantity: tradeQty,
                  totalAmount: s.currentPrice * tradeQty,
                  fee: 0,
                  tax: 0,
                  orderId: orderData.output?.order_no || \`ORD_BUY_\${Date.now().toString().slice(-6)}\`,
                  status: "COMPLETED",
                  stopLossPrice: slPrice,
                  takeProfitPrice: tpPrice
                };
                onTradeExecute(log);
              }
            }).catch(console.error);
`;

const replaceBuy = `
            const log: TradeLog = {
              id: \`trade-buy-\${Date.now()}-\${s.code}\`,
              timestamp: simTime,
              stockCode: s.code,
              stockName: s.name,
              strategy: activeStrategy,
              action: "BUY",
              price: s.currentPrice,
              quantity: tradeQty,
              totalAmount: s.currentPrice * tradeQty,
              fee: 0,
              tax: 0,
              orderId: \`ORD_BUY_\${Date.now().toString().slice(-6)}\`,
              status: "COMPLETED",
              stopLossPrice: slPrice,
              takeProfitPrice: tpPrice
            };
            onTradeExecute(log);
`;
code = code.replace(replaceBuy, apiCallBuyStr);

const apiCallSellStr = `
          const mode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";
          const accessToken = sessionStorage.getItem("kiwoom_access_token") || "";
          const accountNo = localStorage.getItem("kiwoom_account_no") || "";
          
          fetch("/api/dostk/ordr", {
            method: "POST",
            headers: {
              "Content-Type": "application/json;charset=UTF-8",
              "Authorization": \`Bearer \${accessToken}\`,
              "api-id": "kt10001",
              "x-trading-mode": mode
            },
            body: JSON.stringify({
              account_no: accountNo,
              stock_code: s.code,
              qty: String(pStock.quantity),
              price: String(s.currentPrice)
            })
          }).then(res => res.json()).then(orderData => {
            if (orderData?.rt_cd === "0") {
              const log: TradeLog = {
                id: \`trade-sell-\${Date.now()}-\${s.code}\`,
                timestamp: simTime,
                stockCode: s.code,
                stockName: s.name,
                strategy: activeStrategy,
                action: "SELL",
                price: s.currentPrice,
                quantity: pStock.quantity,
                totalAmount: s.currentPrice * pStock.quantity,
                fee: 0,
                tax: 0,
                orderId: orderData.output?.order_no || \`ORD_SELL_\${Date.now().toString().slice(-6)}\`,
                status: "COMPLETED",
              };
              onTradeExecute(log);
            }
          }).catch(console.error);
`;

const replaceSell = `
          const log: TradeLog = {
            id: \`trade-sell-\${Date.now()}-\${s.code}\`,
            timestamp: simTime,
            stockCode: s.code,
            stockName: s.name,
            strategy: activeStrategy,
            action: "SELL",
            price: s.currentPrice,
            quantity: pStock.quantity,
            totalAmount: s.currentPrice * pStock.quantity,
            fee: 0,
            tax: 0,
            orderId: \`ORD_SELL_\${Date.now().toString().slice(-6)}\`,
            status: "COMPLETED",
          };
          onTradeExecute(log);
`;

code = code.replace(replaceSell, apiCallSellStr);

fs.writeFileSync('src/components/MainTab.tsx', code);
