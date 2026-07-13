const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

const formToReplace = `                  <div>
                    <label className="text-[9px] text-gray-400 block mb-1">종목 명</label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="커스텀"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 block mb-1">현재가 (기준가 고정)</label>
                    <input
                      type="number"
                      required
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="10000"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-bold transition-all mt-1"
                  >
                    수동 등록 완료하기 (기준가는 입력한 현재가로 자동 고정)
                  </button>
`;

const newForm = `                  <div className="col-span-2">
                    <label className="text-[9px] text-gray-400 block mb-1">종목 명</label>
                    <input
                      type="text"
                      required
                      readOnly
                      value={isFetchingInfo ? "불러오는 중..." : customName}
                      placeholder="종목코드를 입력하면 자동으로 불러옵니다"
                      className="w-full bg-gray-950 border border-gray-900 rounded-lg p-2 text-xs text-gray-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-bold transition-all mt-1"
                  >
                    수동 등록 완료하기 (기준가는 실시간 API로 자동 조회)
                  </button>
`;

code = code.replace(formToReplace, newForm);

// we also need to remove customPrice state entirely if it's still there
code = code.replace(/const \[customPrice, setCustomPrice\] = useState.*?;/g, "");

fs.writeFileSync('src/components/MainTab.tsx', code);
