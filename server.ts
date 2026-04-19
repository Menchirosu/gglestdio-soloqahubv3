import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { config } from "dotenv";
config({ path: ".env.local" });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.APP_URL || false)
        : '*',
    },
  });
  const preferredPort = Number(process.env.PORT || 3001);

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    next();
  });

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/lumie-bot", express.json(), async (req, res) => {
    const { postText, hasImage, hasUrl } = req.body as {
      postText: string;
      hasImage: boolean;
      hasUrl: boolean;
    };
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "Bot unavailable" });
      return;
    }

    const isBugLike = /expected|actual|steps|reproduc|click|button|error|fail|broken|crash|throw/i.test(postText);
    const systemPrompt = isBugLike
      ? "You are Lumie, a QA-focused AI assistant in a team bug wall. The engineer shared a bug thought. Give one concise repro hypothesis and one test angle to try. Under 55 words. Casual, specific, no preamble."
      : "You are Lumie, a QA-focused AI assistant in a team bug wall. Share one brief observation about the pattern, risk, or insight you see in this post. Under 40 words. Casual, specific, no preamble.";

    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          system: systemPrompt,
          messages: [{ role: "user", content: String(postText) }],
        }),
      });
      if (!upstream.ok) {
        res.status(502).json({ error: "Upstream error" });
        return;
      }
      const data = await upstream.json() as { content?: { text: string }[] };
      const reply = data.content?.[0]?.text ?? "";
      res.json({ reply });
    } catch {
      res.status(502).json({ error: "Bot error" });
    }
  });

  // Socket.io
  io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("duck-race-start", (data) => {
      io.emit("duck-race-start", data);
    });
    socket.on("duck-race-update", (data) => {
      io.emit("duck-race-update", data);
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listenOnPort = (port: number) => {
    httpServer.removeAllListeners("error");
    httpServer.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        const nextPort = port + 1;
        console.warn(`Port ${port} is in use. Retrying on http://localhost:${nextPort}`);
        listenOnPort(nextPort);
        return;
      }

      throw error;
    });

    httpServer.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  };

  listenOnPort(preferredPort);
}

startServer();
