const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

code = code.replace(
  '    watchlist.forEach((s) => {\n      const isHeld = portfolio[s.code] !== undefined;',
  '    watchlist.forEach((s) => {\n      if (s.code.startsWith("EMPTY")) return;\n      const isHeld = portfolio[s.code] !== undefined;'
);

fs.writeFileSync('src/components/MainTab.tsx', code);
