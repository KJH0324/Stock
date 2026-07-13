const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

code = code.replace(
  '전일거래대금: {selectedStock.transactionAmount}억',
  '전일거래대금: {selectedStock.transactionAmount === 0 ? "N/A" : `${selectedStock.transactionAmount}억`}'
);

fs.writeFileSync('src/components/MainTab.tsx', code);
