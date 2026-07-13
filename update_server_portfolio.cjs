const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add serverPortfolio tracking
code = code.replace(
  "let serverBalance = 100000000; // 100M KRW",
  "let serverBalance = 100000000; // 100M KRW\nlet serverPortfolio: { [code: string]: any } = {};"
);

// 2. Add kt00002 to /api/dostk/acnt
const kt00002Str = `
    if (apiId === "kt00002") {
      // Stock Holdings lookup
      const holdingList = Object.values(serverPortfolio);
      return res.json({
        rt_cd: "0",
        msg_cd: "0000",
        msg1: "보유주식 잔고 조회 완료 (SIMULATED)",
        output: holdingList
      });
    }

    if (apiId === "kt00003") {
`;
code = code.replace('    if (apiId === "kt00003") {', kt00002Str);

// 3. Update ordr endpoint to modify serverPortfolio
const orderSimStr = `
    const isBuy = apiId === "kt10000";
    const qty = parseInt(req.body.qty || "0", 10);
    const price = parseInt(req.body.price || "0", 10);
    const stockCode = req.body.stock_code;
    const totalAmount = qty * price;
    
    if (isBuy) {
      if (serverBalance >= totalAmount) {
        serverBalance -= totalAmount;
        if (!serverPortfolio[stockCode]) {
          serverPortfolio[stockCode] = {
            stockCode,
            quantity: qty,
            purchasePrice: price,
            highestPriceSincePurchase: price
          };
        } else {
          const p = serverPortfolio[stockCode];
          const totalQty = p.quantity + qty;
          const newAvg = ((p.quantity * p.purchasePrice) + (qty * price)) / totalQty;
          p.quantity = totalQty;
          p.purchasePrice = newAvg;
        }
      }
    } else {
      if (serverPortfolio[stockCode] && serverPortfolio[stockCode].quantity >= qty) {
        serverBalance += totalAmount;
        serverPortfolio[stockCode].quantity -= qty;
        if (serverPortfolio[stockCode].quantity === 0) {
          delete serverPortfolio[stockCode];
        }
      }
    }

    res.json({
`;
code = code.replace("    res.json({\n      rt_cd: \"0\",", orderSimStr + "      rt_cd: \"0\",");

fs.writeFileSync('server.ts', code);
