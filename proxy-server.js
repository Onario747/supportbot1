const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require("axios");
const net = require("net");
const http = require("http");

const app = express();

// Enable JSON parsing
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "Discord Bot Proxy Server Running",
    timestamp: new Date().toISOString(),
    message: "Proxy server active - maintaining consistent IP for Discord",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Get outbound IP endpoint - shows what IP Discord will see
app.get("/get-ip", async (req, res) => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    res.json({
      outbound_ip: response.data.ip,
      timestamp: new Date().toISOString(),
      message: "This is the IP address that Discord will see",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get IP",
      message: error.message,
    });
  }
});

// Discord API proxy configuration
const discordApiProxy = createProxyMiddleware({
  target: "https://discord.com",
  changeOrigin: true,
  secure: true,
  followRedirects: true,
  ws: true, // Enable WebSocket proxying
  onProxyReq: (proxyReq, req, res) => {
    console.log(
      `Proxying ${req.method} request to: https://discord.com${req.path}`
    );

    // CRITICAL: Remove all forwarding headers so Discord only sees our proxy IP
    proxyReq.removeHeader("x-forwarded-for");
    proxyReq.removeHeader("x-real-ip");
    proxyReq.removeHeader("x-forwarded-proto");
    proxyReq.removeHeader("x-forwarded-host");
    proxyReq.removeHeader("x-forwarded-port");
    proxyReq.removeHeader("forwarded");
    proxyReq.removeHeader("cf-connecting-ip");
    proxyReq.removeHeader("true-client-ip");
    proxyReq.removeHeader("x-client-ip");
    proxyReq.removeHeader("x-cluster-client-ip");

    console.log("🚫 Stripped all forwarding headers to mask original IP");
    console.log("🎭 Discord will now see our proxy IP instead of original IP");
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Received response from Discord: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error("Proxy error:", err.message);
    res.status(500).json({
      error: "Proxy error",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  },
});

// Apply proxy middleware to Discord API routes
app.use("/api", discordApiProxy);

// SOCKS5 Proxy Server for WebSocket Gateway connections
const SOCKS_PORT = process.env.SOCKS_PORT || 1080;

const socksServer = net.createServer((clientSocket) => {
  console.log("🔌 New SOCKS5 connection established");

  clientSocket.once("data", (data) => {
    // SOCKS5 handshake
    if (data[0] === 0x05) {
      // Send method selection message (no authentication)
      clientSocket.write(Buffer.from([0x05, 0x00]));

      clientSocket.once("data", (data) => {
        // Parse connection request
        const cmd = data[1];
        const atyp = data[3];

        let targetHost, targetPort;

        if (atyp === 0x01) {
          // IPv4
          targetHost = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`;
          targetPort = data.readUInt16BE(8);
        } else if (atyp === 0x03) {
          // Domain name
          const domainLength = data[4];
          targetHost = data.slice(5, 5 + domainLength).toString();
          targetPort = data.readUInt16BE(5 + domainLength);
        }

        console.log(`🎯 SOCKS5 connecting to: ${targetHost}:${targetPort}`);

        // Connect to target (Discord Gateway)
        const targetSocket = net.connect(targetPort, targetHost, () => {
          console.log(`✅ Connected to ${targetHost}:${targetPort}`);

          // Send success response
          const response = Buffer.from([
            0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          ]);
          clientSocket.write(response);

          // Pipe data between client and target
          clientSocket.pipe(targetSocket);
          targetSocket.pipe(clientSocket);
        });

        targetSocket.on("error", (err) => {
          console.error("❌ Target connection error:", err.message);
          clientSocket.end();
        });

        clientSocket.on("error", (err) => {
          console.error("❌ Client socket error:", err.message);
          targetSocket.end();
        });
      });
    }
  });
});

socksServer.listen(SOCKS_PORT, "0.0.0.0", () => {
  console.log(` SOCKS5 proxy server running on port ${SOCKS_PORT}`);
  console.log(`   Use this for Discord Gateway WebSocket connections`);
});

// Keep-alive mechanism - prevents server from sleeping on Render
const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // Ping every 14 minutes
const PROXY_SERVER_URL =
  process.env.PROXY_SERVER_URL ||
  `http://localhost:${process.env.PORT || 3000}`;

function keepAlive() {
  setInterval(async () => {
    try {
      const response = await axios.get(`${PROXY_SERVER_URL}/health`);
      console.log(` Keep-alive ping successful: ${response.status}`);
    } catch (error) {
      console.error(` Keep-alive ping failed:`, error.message);
    }
  }, KEEP_ALIVE_INTERVAL);
}

// Start keep-alive after 5 seconds
setTimeout(() => {
  keepAlive();
  console.log(` Keep-alive mechanism started (pinging every 14 minutes)`);
}, 5000);

// Start Express server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(` Discord Bot Proxy Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Check IP: http://localhost:${PORT}/get-ip`);
  console.log(` Discord API Proxy: http://localhost:${PORT}/api/*`);
  console.log(` SOCKS5 Proxy: localhost:${SOCKS_PORT}`);
  console.log(`\n IMPORTANT: Configure your bot to use these proxy settings`);
});

// Enable WebSocket support
server.on("upgrade", discordApiProxy.upgrade);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  socksServer.close();
  server.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  socksServer.close();
  server.close();
  process.exit(0);
});
