import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
        // Sanitize sensitive data from logs for the user endpoint
        if (path === '/api/user' && capturedJsonResponse) {
          // Only log essential user info, not sensitive data
          const safeUserData = {
            username: capturedJsonResponse.username,
            id: capturedJsonResponse.id
          };
          logLine += ` :: ${JSON.stringify(safeUserData)}`;
        } else {
          // For other endpoints, truncate the response for logging
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS try to serve the app on port 5000 first
  // If it's in use, try alternative ports
  const startServer = (port: number, maxRetries = 3, retryCount = 0) => {
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    })
    .on("error", (err: any) => {
      if (err.code === "EADDRINUSE" && retryCount < maxRetries) {
        log(`Port ${port} is in use, trying ${port + 1}...`);
        startServer(port + 1, maxRetries, retryCount + 1);
      } else {
        console.error("Failed to start server:", err);
        process.exit(1);
      }
    })
    .on("listening", () => {
      log(`serving on port ${port}`);
    });
  };

  startServer(5000);
})();
