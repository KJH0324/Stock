const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

// Remove the global isBridgeConnected
code = code.replace(/const isBridgeConnected = false;/g, "");

// In watchlist map
code = code.replace(
  /isBridgeConnected \? \`\$\{stock.currentPrice/g,
  "stock.currentPrice > 0 ? \\`${stock.currentPrice"
);
code = code.replace(
  /\!isBridgeConnected \? "text-gray-500"/g,
  "stock.currentPrice === 0 ? \"text-gray-500\""
);
code = code.replace(
  /isBridgeConnected \? \`\$\{dailyChange/g,
  "stock.currentPrice > 0 ? \\`${dailyChange"
);

// In selectedStock area
code = code.replace(
  /\{\!isBridgeConnected \?/g,
  "{selectedStock.currentPrice === 0 ?"
);
code = code.replace(
  /isBridgeConnected \? selectedStock.stochK/g,
  "selectedStock.currentPrice > 0 ? selectedStock.stochK"
);
code = code.replace(
  /isBridgeConnected \? selectedStock.stochD/g,
  "selectedStock.currentPrice > 0 ? selectedStock.stochD"
);

// In portfolio map
code = code.replace(
  /isBridgeConnected \? \`\$\{currentPrice\.toLocaleString/g,
  "currentPrice > 0 ? \\`${currentPrice.toLocaleString"
);
code = code.replace(
  /isBridgeConnected \? \`\$\{totalCurrentAmount\.toLocaleString/g,
  "currentPrice > 0 ? \\`${totalCurrentAmount.toLocaleString"
);
code = code.replace(
  /isBridgeConnected \? \`\$\{pStock\.highestPriceSincePurchase\.toLocaleString/g,
  "currentPrice > 0 ? \\`${pStock.highestPriceSincePurchase.toLocaleString"
);
code = code.replace(
  /\!isBridgeConnected \? "text-gray-500"/g,
  "currentPrice === 0 ? \"text-gray-500\""
);
code = code.replace(
  /isBridgeConnected \? \`\$\{isProfit/g,
  "currentPrice > 0 ? \\`${isProfit"
);

fs.writeFileSync('src/components/MainTab.tsx', code);
