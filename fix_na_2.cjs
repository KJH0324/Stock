const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

code = code.replace(
  '최대거래량/초: {preset.maxVolumePerSecond.toLocaleString()}주',
  '최대거래량/초: {preset.maxVolumePerSecond === 0 ? "N/A" : `${preset.maxVolumePerSecond.toLocaleString()}주`}'
);

fs.writeFileSync('src/components/MainTab.tsx', code);
