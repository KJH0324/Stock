const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let serverProcess = null;
let mainWindow = null;

function startExpressServer() {
  // Start the compiled production Express server (dist/server.cjs) or the TypeScript development server
  const isProd = app.isPackaged;
  const serverPath = isProd 
    ? path.join(__dirname, "dist", "server.cjs") 
    : path.join(__dirname, "server.ts");

  console.log(`Starting server from: ${serverPath}`);

  if (isProd) {
    serverProcess = spawn("node", [serverPath], {
      env: { ...process.env, NODE_ENV: "production" }
    });
  } else {
    // In dev, we assume standard npm run dev is running, 
    // or we can run tsx directly
    serverProcess = spawn("npx", ["tsx", serverPath], {
      env: { ...process.env, NODE_ENV: "development" }
    });
  }

  serverProcess.stdout.on("data", (data) => {
    console.log(`[Express]: ${data}`);
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`[Express Error]: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "Kiwoom OpenAPI Algorithmic Strategy Simulator",
    icon: path.join(__dirname, "public", "favicon.ico"), // standard icon fallback
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Clean local program appearance without ugly native menu bar
  });

  // Wait 1.5 seconds for server to start before loading
  setTimeout(() => {
    mainWindow.loadURL("http://localhost:3000");
  }, 1500);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startExpressServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});
