import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { DEFAULT_WATCHLISTS, registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { scheduleZhNameUpdate } from "./stockService";
import { startLiveSettlementScheduler } from "./liveTrading/service";
import { logBackendEvent, LogLevel, LogCategory } from "./services/backendLogService";

const app = express();
const httpServer = createServer(app);

if (process.env.NODE_ENV === "production") {
  // Behind Caddy/Nginx in production, trust X-Forwarded-* so secure cookies work.
  app.set("trust proxy", 1);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
    sessionID?: string;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Session middleware
const sessionSecret = process.env.SESSION_SECRET || "dev-secret-key-change-in-production";

// Fail fast if SESSION_SECRET is not set in production
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    name: "connect.sid",
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);
  const defaultSymbols = Object.values(DEFAULT_WATCHLISTS)
    .flatMap((list) => list.tickers)
    .map((symbol) => symbol.toUpperCase());
  scheduleZhNameUpdate(defaultSymbols, "zh");
  startLiveSettlementScheduler();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);
    
    // Log to backend logs
    logBackendEvent(
      LogLevel.ERROR,
      LogCategory.ERROR,
      `Internal server error: ${message}`,
      {
        status,
        stack: err.stack,
        path: _req.path,
        method: _req.method,
      },
      undefined,
      _req,
    ).catch(console.error);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      // reusePort is not supported on Windows.
      ...(process.platform !== "win32" ? { reusePort: true } : {}),
    },
    () => {
      log(`serving on port ${port}`);
      
      // Log server startup to backend logs
      logBackendEvent(
        LogLevel.INFO,
        LogCategory.SYSTEM,
        `Server started successfully on port ${port}`,
        {
          port,
          nodeEnv: process.env.NODE_ENV || "development",
          platform: process.platform,
        },
      ).catch(console.error);
    },
  );
})();
