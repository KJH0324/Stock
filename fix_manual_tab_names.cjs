const fs = require('fs');
let code = fs.readFileSync('src/components/ManualTab.tsx', 'utf8');

// The string was: const found = POPULAR_STOCKS.find(s => s.code === stockCode);
// If it's still there, replace it.

code = code.replace(/const found = POPULAR_STOCKS\.find\(s => s\.code === stockCode\);\n\s*if \(found\) setStockName\(found\.name\);/, 'if (STOCK_NAMES[stockCode]) setStockName(STOCK_NAMES[stockCode]);');

fs.writeFileSync('src/components/ManualTab.tsx', code);
