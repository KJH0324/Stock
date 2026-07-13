const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  '      rt_cd: "0",\n      msg_cd: "0000",\n      msg1: `Order ${apiId} Executed (SIMULATED)`,\n      output: {}',
  '      rt_cd: "0",\n      msg_cd: "0000",\n      msg1: `Order ${apiId} Executed (SIMULATED)`,\n      output: { order_no: "SIM" + Date.now().toString().slice(-6) }'
);

fs.writeFileSync('server.ts', code);
