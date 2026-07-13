const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

const oldMsg = `<p className="text-xs text-gray-500">
                    로컬 브릿지 연결 대기 중. 실시간 시세를 연동해 주십시오.
                  </p>`;

const newMsg = `<p className="text-xs text-gray-500">
                    {selectedStock.code.startsWith('EMPTY') ? "선택된 감시 슬롯이 비어있습니다. 종목을 등록해주세요." : "로컬 브릿지 연결 대기 중. 실시간 시세를 연동해 주십시오."}
                  </p>`;

code = code.replace(oldMsg, newMsg);

fs.writeFileSync('src/components/MainTab.tsx', code);
