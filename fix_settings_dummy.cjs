const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsTab.tsx', 'utf8');

code = code.replace(
  'const [accountNo, setAccountNo] = useState(() => localStorage.getItem("kiwoom_account_no") || "5023-4921-11");',
  'const [accountNo, setAccountNo] = useState(() => localStorage.getItem("kiwoom_account_no") || "");'
);

fs.writeFileSync('src/components/SettingsTab.tsx', code);
