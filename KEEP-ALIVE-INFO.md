# Keep-Alive Mechanism Explained

## ✅ Yes, You Have Keep-Alive!

Both your bot and proxy server now include automatic keep-alive mechanisms that ping themselves every 14 minutes to prevent Render's free tier from putting them to sleep after 15 minutes of inactivity.

## How It Works

### Bot Server (`index.js`)

```javascript
// Pings itself every 14 minutes
setInterval(async () => {
  await axios.get(SERVER_URL); // Pings http://your-bot.onrender.com
}, 14 * 60 * 1000);
```

### Proxy Server (`proxy-server.js`)

```javascript
// Pings itself every 14 minutes
setInterval(async () => {
  await axios.get(`${PROXY_SERVER_URL}/health`); // Pings http://your-proxy.onrender.com/health
}, 14 * 60 * 1000);
```

## What This Prevents

✅ **15-minute inactivity timeout** - Render won't sleep your services  
✅ **Consistent IP address** - As long as services stay running, IP stays the same  
✅ **Continuous bot operation** - Your Discord bot stays connected

## What This DOESN'T Prevent

❌ **Render maintenance restarts** - Render may restart for updates  
❌ **Deployment restarts** - When you push new code  
❌ **Manual restarts** - If you restart services manually  
❌ **Render infrastructure changes** - Rare but possible

## Environment Variables Needed

### For Proxy Server:

```env
PROXY_SERVER_URL=https://your-proxy-server.onrender.com
```

### For Bot Server:

```env
SERVER_URL=https://your-bot-server.onrender.com
```

## Monitoring Keep-Alive

Check your Render logs for these messages:

**Proxy Server:**

```
✅ Keep-alive ping successful: 200
🔄 Keep-alive mechanism started (pinging every 14 minutes)
```

**Bot Server:**

```
✅ Keep-alive ping successful: 200
🔄 Keep-alive mechanism started (pinging every 14 minutes)
```

## Why 14 Minutes?

Render's free tier sleeps services after **15 minutes** of inactivity. By pinging every **14 minutes**, we ensure there's always activity before the 15-minute threshold.

## Best Practices

1. **Set both environment variables** with your actual Render URLs
2. **Monitor logs** to ensure keep-alive is working
3. **Check `/health` endpoints** to verify services are responding
4. **For 100% uptime**: Consider upgrading to Render's paid tier or using a VPS

## Still Getting Token Expiration?

If your Discord token still expires despite keep-alive:

1. **Check if Render restarted** - Look at deployment logs
2. **Verify environment variables** - Ensure URLs are correct
3. **Consider a VPS** - For truly static IP ($3-6/month)
4. **Switch to official bot** - No IP issues, no ToS violations

## Summary

Your keep-alive mechanism **WILL prevent sleep** from inactivity, but **CANNOT prevent** all possible restarts. For maximum reliability, use a VPS with a dedicated IP address.
