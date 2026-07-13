const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

const defaultWatchlistStr = `
const DEFAULT_WATCHLIST: Stock[] = Array.from({ length: 5 }).map((_, idx) => ({
  code: \`EMPTY\${idx}\`,
  name: "비어있음",
  currentPrice: 0,
  open: 0,
  high: 0,
  low: 0,
  volume: 0,
  prevClose: 0,
  transactionAmount: 0,
  history250dHigh: 0,
  maxVolumePerSecond: 0,
  kValue: 0.5,
  targetPrice: 0,
  bbUpper: 0,
  bbMiddle: 0,
  bbLower: 0,
  bbWidth: 0,
  stochK: 0,
  stochD: 0
}));
`;

code = code.replace(/const DEFAULT_WATCHLIST: Stock\[\] = POPULAR_STOCKS\.slice\(0, 5\)\.map\(\(preset, idx\) => \(\{[\s\S]*?\}\)\);/, defaultWatchlistStr);

fs.writeFileSync('src/components/MainTab.tsx', code);
