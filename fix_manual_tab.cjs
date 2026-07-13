const fs = require('fs');
let code = fs.readFileSync('src/components/ManualTab.tsx', 'utf8');

code = code.replace(/<label className="text-xs text-gray-400 block mb-1">종목명 \(선택\)<\/label>\s*<input\s*type="text"\s*value=\{stockName\}\s*onChange=\{\(e\) => setStockName\(e.target.value\)\}\s*placeholder="예: 삼성전자"/,
`<label className="text-xs text-gray-400 block mb-1">종목명 (자동입력)</label>
              <input
                type="text"
                readOnly
                value={isFetchingPrice ? "불러오는 중..." : stockName}
                placeholder="종목코드를 입력하세요"`);

code = code.replace(/<input\s*type="number"\s*value=\{price\}\s*onChange=\{\(e\) => setPrice\(e.target.value\)\}\s*placeholder="0"\s*min="0"/,
`<input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={isFetchingPrice ? "조회중..." : "0"}
                min="0"`);

fs.writeFileSync('src/components/ManualTab.tsx', code);
