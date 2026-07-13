const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

code = code.replace(
  '        watchlist.map(async (s) => {\n          try {',
  '        watchlist.map(async (s) => {\n          if (s.code.startsWith("EMPTY")) return s;\n          try {'
);

fs.writeFileSync('src/components/MainTab.tsx', code);
