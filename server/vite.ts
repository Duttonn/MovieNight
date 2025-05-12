import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Don't exit the process for URI malformed errors
        if (msg.includes('URI malformed')) {
          viteLogger.error(`URI malformed error: ${msg}`, options);
          return;
        }
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Add error handling middleware for Vite
  app.use((req, res, next) => {
    try {
      // Try to decode the URL to catch malformed URIs before they reach Vite
      if (req.url) {
        try {
          decodeURI(req.url);
        } catch (e) {
          // If URL is malformed, use a sanitized version
          log(`Malformed URL detected: ${req.url}`, "vite-error-handler");
          req.url = encodeURI(req.url).replace(/%25/g, '%');
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  });
  
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    let url = req.originalUrl;

    try {
      // Sanitize URL before processing
      try {
        decodeURI(url);
      } catch (e) {
        url = '/'; // Redirect to home if URL is malformed
        log(`Malformed URL in catch-all handler, redirecting to home`, "vite-handler");
      }

      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // Keep the original src path as defined in index.html
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
