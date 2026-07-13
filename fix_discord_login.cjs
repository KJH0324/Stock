const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  '    botClient = client;\n    await client.login(token);\n\n    res.json({ success: true, status: "Connected successfully" });\n  } catch (error: any) {',
  '    botClient = client;\n    // Run login asynchronously so we do not block the UI for 10 seconds\n    client.login(token).then(() => {\n      botStatusMessage = `🟢 Connected as ${client.user?.tag}`;\n    }).catch((error: any) => {\n      console.error("Discord Bot Login Failure:", error.message || error);\n      botStatusMessage = `🔴 Error: ${error.message}`;\n    });\n\n    res.json({ success: true, status: "Login initiated..." });\n  } catch (error: any) {'
);

fs.writeFileSync('server.ts', code);
console.log('Fixed discord login async');
