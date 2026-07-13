const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

code = code.replace(/kiwoom_watchlist_5/g, "kiwoom_watchlist_6");

fs.writeFileSync('src/components/MainTab.tsx', code);

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/kiwoom_watchlist_5/g, "kiwoom_watchlist_6"); // just in case
fs.writeFileSync('src/App.tsx', appCode);

