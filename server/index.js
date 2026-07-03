import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "1mb" }));

// simple in-memory rate limit per IP — swap for something durable before
// you have real multi-user traffic, this just stops accidental hammering
const hits = new Map();
const RATE_LIMIT = 60; // requests per minute
app.use((req, res, next) => {
  const now = Date.now();
  const windowStart = now - 60_000;
  const key = req.ip;
  const arr = (hits.get(key) || []).filter((t) => t > windowStart);
  arr.push(now);
  hits.set(key, arr);
  if (arr.length > RATE_LIMIT) return res.status(429).json({ error: "Rate limit exceeded" });
  next();
});

app.post("/api/claude", async (req, res) => {
  const { system, message } = req.body || {};
  if (!system || !message) return res.status(400).json({ error: "system and message are required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "Upstream model call failed" });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    res.json({ text: textBlock ? textBlock.text : "" });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy request failed" });
  }
});

app.get("/healthz", (req, res) => res.send("ok"));

// serve the built frontend
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server listening on port ${port}`));
