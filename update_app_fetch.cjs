const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/stockCode: code,/g, 'code: code, name: h.name || code, currentPrice: price, targetPrice: price,');

fs.writeFileSync('src/App.tsx', code);
