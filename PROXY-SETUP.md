# Discord Bot Proxy Setup - Static IP Solution

This setup allows your Discord selfbot to maintain a consistent IP address by routing all connections through a proxy server, preventing token expiration due to IP changes.

## ⚠️ Important Warnings

1. **Selfbots violate Discord's Terms of Service** - Use at your own risk
2. **This solution requires TWO separate Render services** (or one VPS)
3. **Render's free tier has limitations** - IP may still change on service restarts

## 🏗️ Architecture

```
Your Bot (index.js)
    ↓ (SOCKS5 Proxy)
Proxy Server (proxy-server.js)
    ↓ (Single IP to Discord)
Discord Gateway
```

The proxy server strips all forwarding headers and presents a single IP to Discord, similar to your CCPayment example.

## 📦 Installation

```bash
npm install
```

This installs:

- `socks-proxy-agent` - For SOCKS5 proxy support
- `http-proxy-middleware` - For HTTP/HTTPS proxying
- `concurrently` - To run both servers locally

## 🚀 Deployment Options

### Option 1: Two Render Services (Recommended for Render)

#### Step 1: Deploy Proxy Server

1. Create a new Web Service on Render
2. Connect your repository
3. Configure:

   - **Name**: `discord-proxy-server`
   - **Build Command**: `npm install`
   - **Start Command**: `node proxy-server.js`
   - **Environment Variables**:
     - `PORT=3000`
     - `SOCKS_PORT=1080`

4. Deploy and note the URL (e.g., `https://discord-proxy-server.onrender.com`)

#### Step 2: Deploy Bot Service

1. Create another Web Service on Render
2. Connect the same repository
3. Configure:
   - **Name**: `discord-bot`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Environment Variables**:
     - `DISCORD_TOKEN=your_token_here`
     - `PORT=3001`
     - `USE_PROXY=true`
     - `PROXY_HOST=discord-proxy-server.onrender.com`
     - `PROXY_PORT=1080`
     - `SERVER_URL=https://discord-bot.onrender.com`

### Option 2: Single VPS (Best for Static IP)

For a truly static IP, use a VPS provider:

**Recommended Providers:**

- DigitalOcean ($4-6/month)
- Vultr ($2.50-6/month)
- Linode/Akamai ($5/month)

**Setup on VPS:**

```bash
# Clone your repository
git clone <your-repo>
cd supportbotarmy

# Install dependencies
npm install

# Install PM2 for process management
npm install -g pm2

# Start proxy server
pm2 start proxy-server.js --name discord-proxy

# Start bot (connects through local proxy)
pm2 start index.js --name discord-bot

# Save PM2 configuration
pm2 save
pm2 startup
```

**Environment Variables (.env):**

```env
DISCORD_TOKEN=your_token_here
PORT=3000
USE_PROXY=true
PROXY_HOST=localhost
PROXY_PORT=1080
```

### Option 3: Local Development

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your token
nano .env

# Run both servers simultaneously
npm run start:both

# Or run separately:
# Terminal 1:
npm run proxy

# Terminal 2:
npm start
```

## 🔍 Verification

### Check Proxy IP

Visit your proxy server's `/get-ip` endpoint:

```
https://your-proxy-server.onrender.com/get-ip
```

This shows the IP that Discord will see.

### Check Bot Status

Visit your bot server's root endpoint:

```
https://your-bot-server.onrender.com/
```

Should show "Discord bot is running! ✅"

### Monitor Logs

Watch for these messages:

```
🎭 Proxy enabled: socks5://your-proxy:1080
   Discord will see the proxy server's IP, not your local IP
```

## 🛠️ How It Works

1. **SOCKS5 Proxy**: Your bot connects to Discord's WebSocket gateway through a SOCKS5 proxy
2. **Header Stripping**: The proxy removes all forwarding headers (X-Forwarded-For, etc.)
3. **Single IP**: Discord only sees the proxy server's IP address
4. **Consistent Identity**: As long as the proxy server doesn't restart, the IP remains stable

## ⚠️ Limitations on Render

- **Free tier restarts**: Services restart after 15 minutes of inactivity
- **IP may change**: On service restart, Render may assign a new IP
- **Not truly static**: Only consistent while the service is running

## 💡 Best Solution

For a truly static IP that won't expire your token:

1. **Use a VPS** with a dedicated IP address
2. **Or switch to an official Discord bot** (no IP issues, no ToS violations)

## 🔧 Troubleshooting

### Bot can't connect to proxy

- Ensure proxy server is running first
- Check `PROXY_HOST` and `PROXY_PORT` are correct
- Verify firewall allows port 1080

### Token still expiring

- Render may have restarted your proxy (new IP)
- Check proxy logs for restarts
- Consider upgrading to a paid VPS

### Connection errors

- Check proxy server logs: `https://your-proxy.onrender.com/health`
- Verify Discord token is valid
- Ensure `USE_PROXY=true` in environment

## 📊 Monitoring

Both servers include health check endpoints:

- Proxy: `GET /health`
- Proxy IP: `GET /get-ip`
- Bot: `GET /`

Set up monitoring to alert you if services go down.

## 🔐 Security Notes

- Never commit `.env` file to git
- Keep your Discord token secret
- Use environment variables for all sensitive data
- Monitor for unusual activity

## 📝 Alternative: Convert to Official Bot

The most reliable solution is to convert to an official Discord bot:

```javascript
// Instead of selfbot
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
```

Benefits:

- ✅ No ToS violations
- ✅ No IP-based token expiration
- ✅ Better stability
- ✅ More features available
- ✅ Works on free hosting

Let me know if you'd like help converting to an official bot instead!
