# Welcome Message Fix - Unknown User Issue

## 🔍 Problem Explained

You're seeing two different behaviors:

1. ✅ **"Hello @Onari George! Welcome to Support Ticket"** - Working correctly
2. ❌ **"Hello @unknown-user! Welcome to Akademi Crypto"** - Showing unknown user

## 🎯 Root Causes

### 1. Multiple Servers Issue

Your bot is in **multiple Discord servers** and sending welcome messages to **all of them** using the same hardcoded channel ID. This causes:

- Messages sent to wrong servers
- Different server names appearing in messages

### 2. Selfbot API Limitations

Selfbots have **limited access** to member data compared to official bots:

- ✅ **Some servers**: Full member data available → Shows real username
- ❌ **Other servers**: Limited data → Shows "unknown-user"
- This depends on server settings and your permissions

## ✅ Solutions Implemented

### Solution 1: Limit to One Server Only

Set the `SUPPORT_SERVER_ID` to only send welcome messages in YOUR server:

```javascript
const SUPPORT_SERVER_ID = "1442214024967360754"; // Your server ID
```

**How to get your server ID:**

1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server name
3. Click "Copy ID"
4. Paste it in the code

### Solution 2: Better Member Data Fetching

The code now:

1. **Fetches member data** explicitly with `await member.fetch()`
2. **Tries multiple fallbacks** for username:
   - `member.user.tag` (username#1234)
   - `member.user.username` (just username)
   - `member.displayName` (server nickname)
   - `"new member"` (final fallback)

### Solution 3: Smart Channel Detection

Instead of hardcoded channel ID, it now:

1. **Searches for channel by name** ("general" or "welcome") in the current server
2. **Falls back to hardcoded ID** if not found

## 🚀 How to Use

### Option A: One Server Only (Recommended)

```javascript
// In index.js, line 39
const SUPPORT_SERVER_ID = "YOUR_SERVER_ID_HERE";
```

This will:

- ✅ Only send welcome messages in YOUR server
- ✅ Ignore all other servers
- ✅ Prevent wrong server names

### Option B: All Servers

```javascript
// In index.js, line 39
const SUPPORT_SERVER_ID = null; // Keep as null
```

This will:

- Send welcome messages in ALL servers your bot is in
- May show "unknown-user" in some servers (selfbot limitation)

## ⚠️ Why "Unknown User" Still Happens

Even with these fixes, you might still see "unknown-user" because:

1. **Selfbot API Restrictions**: Discord limits what selfbots can see
2. **Server Privacy Settings**: Some servers hide member data
3. **Timing Issues**: Member data might not be available immediately

## 🎯 Best Practice

**Use Option A** (one server only):

```javascript
const SUPPORT_SERVER_ID = "1442214024967360754";
```

This ensures:

- Messages only sent in your support server
- Correct server name always shown
- Better control over bot behavior

## 📝 Testing

After setting `SUPPORT_SERVER_ID`:

1. Have someone join your support server
2. Check logs for: `Sent welcome message with reaction to [username] in [server name]`
3. Verify the mention works in Discord

If someone joins a different server, you'll see:

```
Ignoring member join in [Other Server] (not support server)
```

## 🔧 Alternative: Convert to Official Bot

For 100% reliable member data, convert to an official Discord bot:

- ✅ Full access to member data
- ✅ No "unknown-user" issues
- ✅ No ToS violations
- ✅ Better stability

Let me know if you'd like help converting!
