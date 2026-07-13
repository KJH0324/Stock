const fs = require('fs');

// 1. ManualTab.tsx
let manualCode = fs.readFileSync('src/components/ManualTab.tsx', 'utf8');
const manualNameFallback = `
          if (data?.output?.name) {
            setStockName(data.output.name);
          } else {
            // Fallback to POPULAR_STOCKS if API doesn't provide name
            const found = POPULAR_STOCKS.find(s => s.code === stockCode);
            if (found) setStockName(found.name);
          }
`;
manualCode = manualCode.replace(/if \(data\?\.output\?\.name\) \{\s*setStockName\(data\.output\.name\);\s*\}/, manualNameFallback);

// Add POPULAR_STOCKS import to ManualTab if needed
if (!manualCode.includes('POPULAR_STOCKS')) {
    // We can just define a mini map or we can import it if it's exported. It's not exported from MainTab.
    // Let's just define a quick fallback map inside ManualTab.
    const fallbackMap = `
const STOCK_NAMES: Record<string, string> = {
  "005930": "삼성전자", "000660": "SK하이닉스", "042700": "한미반도체", "035420": "NAVER", 
  "005380": "현대차", "035720": "카카오", "068270": "셀트리온", "005490": "POSCO홀딩스",
  "000270": "기아", "373220": "LG에너지솔루션", "450080": "에코프로머티", "247540": "에코프로비엠",
  "028300": "HLB", "196170": "알테오젠", "454910": "두산로보틱스", "323410": "카카오뱅크",
  "012330": "현대모비스", "055550": "신한지주", "105560": "KB금융", "042660": "한화오션"
};
`;
    manualCode = manualCode.replace('export default function ManualTab', fallbackMap + 'export default function ManualTab');
    
    // Replace the POPULAR_STOCKS fallback we just inserted with STOCK_NAMES
    manualCode = manualCode.replace('const found = POPULAR_STOCKS.find(s => s.code === stockCode);\n            if (found) setStockName(found.name);', 
    'if (STOCK_NAMES[stockCode]) setStockName(STOCK_NAMES[stockCode]);');
}

fs.writeFileSync('src/components/ManualTab.tsx', manualCode);

// 2. MainTab.tsx
let mainCode = fs.readFileSync('src/components/MainTab.tsx', 'utf8');
const mainNameFallback = `
          if (data?.output?.name) {
            setCustomName(data.output.name);
          } else {
            const found = POPULAR_STOCKS.find(s => s.code === customCode);
            if (found) {
              setCustomName(found.name);
            } else {
              setCustomName("");
            }
          }
`;
mainCode = mainCode.replace(/if \(data\?\.output\?\.name\) \{\s*setCustomName\(data\.output\.name\);\s*\} else \{\s*setCustomName\(""\);\s*\}/, mainNameFallback);
fs.writeFileSync('src/components/MainTab.tsx', mainCode);

