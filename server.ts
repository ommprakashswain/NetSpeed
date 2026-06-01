import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import si from "systeminformation";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/api/speed", async (req, res) => {
    try {
      const stats = await si.networkStats();
      let rx = 0;
      let tx = 0;
      
      for (const stat of stats) {
        if (stat.operstate === 'up' || stat.rx_bytes > 0) {
          // Sometimes tx_sec can be negative due to counter resets, taking absolute or max of 0
          rx += Math.max(0, stat.rx_sec || 0);
          tx += Math.max(0, stat.tx_sec || 0);
        }
      }
      
      res.json({
        downloadMs: rx, 
        uploadMs: tx
      });
    } catch (e) {
      res.json({ downloadMs: 0, uploadMs: 0 });
    }
  });

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Warm up the systeminformation network stats to get valid per-sec rates
    si.networkStats().catch(() => {});
  });
}

startServer();
