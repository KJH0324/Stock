const fs = require('fs');
let code = fs.readFileSync('src/components/ManualTab.tsx', 'utf8');

const fallbackMap = `
const STOCK_NAMES: Record<string, string> = {
  "005930": "삼성전자", "000660": "SK하이닉스", "042700": "한미반도체", "035420": "NAVER", 
  "005380": "현대차", "035720": "카카오", "068270": "셀트리온", "005490": "POSCO홀딩스",
  "000270": "기아", "373220": "LG에너지솔루션", "450080": "에코프로머티", "247540": "에코프로비엠",
  "028300": "HLB", "196170": "알테오젠", "454910": "두산로보틱스", "323410": "카카오뱅크",
  "012330": "현대모비스", "055550": "신한지주", "105560": "KB금융", "042660": "한화오션"
};
`;

if (!code.includes('Record<string, string>')) {
    code = code.replace('export default function ManualTab', fallbackMap + 'export default function ManualTab');
    fs.writeFileSync('src/components/ManualTab.tsx', code);
}
