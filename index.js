const { Client } = require("discord.js-selfbot-v13");
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { SocksProxyAgent } = require("socks-proxy-agent");

// Proxy configuration - use SOCKS5 proxy to maintain consistent IP
const PROXY_HOST = process.env.PROXY_HOST || "localhost";
const PROXY_PORT = process.env.PROXY_PORT || "1080";
const USE_PROXY = process.env.USE_PROXY === "true";

let clientOptions = {
  checkUpdate: false,
};

// Add proxy configuration if enabled
if (USE_PROXY) {
  const proxyUrl = `socks5://${PROXY_HOST}:${PROXY_PORT}`;
  const agent = new SocksProxyAgent(proxyUrl);

  clientOptions.proxy = proxyUrl;
  clientOptions.ws = {
    agent: agent,
  };

  console.log(`🎭 Proxy enabled: ${proxyUrl}`);
  console.log(`   Discord will see the proxy server's IP, not your local IP`);
} else {
  console.log(`⚠️  Proxy disabled - using direct connection`);
}

const client = new Client(clientOptions);

// REPLACE THESE WITH YOUR ACTUAL CHANNEL IDs
const GENERAL_CHANNEL_ID = "1442214025839771743";
const TICKET_CHANNEL_ID = "1442521865573634088";

// Web server for Render (required for free tier)
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Discord bot is running! ✅");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// Keep-alive mechanism - prevents server from sleeping
const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // Ping every 14 minutes
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

function keepAlive() {
  setInterval(async () => {
    try {
      const response = await axios.get(SERVER_URL);
      console.log(`✅ Keep-alive ping successful: ${response.status}`);
    } catch (error) {
      console.error(`❌ Keep-alive ping failed:`, error.message);
    }
  }, KEEP_ALIVE_INTERVAL);
}

setTimeout(() => {
  keepAlive();
  console.log(`🔄 Keep-alive mechanism started (pinging every 14 minutes)`);
}, 5000);

client.on("ready", async () => {
  console.log(`${client.user.username} is ready!`);
});

client.on("guildMemberAdd", async (member) => {
  try {
    // Send welcome message to General channel
    try {
      const generalChannel = await client.channels
        .fetch(GENERAL_CHANNEL_ID)
        .catch(() => null);

      if (generalChannel) {
        const welcomeMessage = await generalChannel.send(
          `Hello ${member} :wave:! Welcome to **${member.guild.name}**. If you need assistance, please react with 🎫 below to create a support ticket.`
        );

        await welcomeMessage.react("🎫");
        console.log(`Sent welcome message with reaction to ${member.user.tag}`);
      } else {
        console.error(
          `Could not access general channel: ${GENERAL_CHANNEL_ID}`
        );
      }
    } catch (err) {
      console.error(`Error sending to general channel: ${err.message}`);
    }
  } catch (error) {
    console.error(`Unexpected error in guildMemberAdd:`, error.message);
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  // Ignore reactions from the bot itself
  if (user.id === client.user.id) return;

  // Check if the reaction is the ticket emoji
  if (reaction.emoji.name === "🎫") {
    const guild = reaction.message.guild;
    if (!guild) return;

    // Logic to ensure this is a ticket creation request
    // For example, only allow if the message is from the bot and contains specific text
    if (reaction.message.author.id !== client.user.id) return;
    if (!reaction.message.content.includes("create a support ticket")) return;

    // Find next ticket number
    const ticketChannels = guild.channels.cache.filter((c) =>
      c.name.startsWith("ticket-")
    );
    const ticketCount = ticketChannels.size;
    const ticketNumber = String(ticketCount + 1).padStart(3, "0");
    const channelName = `ticket-${ticketNumber}`;

    try {
      // Create the ticket channel
      const ticketChannel = await guild.channels.create(channelName, {
        type: "GUILD_TEXT",
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: ["VIEW_CHANNEL"],
          },
          {
            id: user.id,
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"],
          },
          // Admins implicitly have access, but we can add specific roles if needed
        ],
      });

      // Send welcome message inside the ticket
      await ticketChannel.send(
        `Welcome ${user}! Please tell us your problem, and a support staff member will be with you shortly.`
      );

      // Try to remove the reaction from the original message to indicate acknowledgment
      // (Only works if bot has MANAGE_MESSAGES permission)
      try {
        await reaction.users.remove(user);
      } catch (err) {
        console.log("Could not remove user reaction (missing permission)");
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  }
});

client.on("messageCreate", async (message) => {
  // Ignore messages from the bot itself
  if (message.author.id === client.user.id) return;

  // Ignore support auto-reply for specific server
  if (message.guild?.id === "1442214024967360754") return;

  const content = message.content.toLowerCase();
  // Keywords to detect
  const keywords = [
    "help",
    "support",
    "assistance",
    "ticket",
    "issue",
    "error",
    "bug",
    "problem",
    "fix",
    "question",
  ];

  if (keywords.some((word) => content.includes(word))) {
    try {
      // REPLACE THIS WITH YOUR ACTUAL SERVER LINK
      const supportLink = "https://discord.gg/rQezfkBh";

      const reply = await message.reply(
        `Hello. I noticed you may require assistance. You can submit a support ticket for professional help in our support server: ${supportLink}`
      );

      setTimeout(async () => {
        try {
          await reply.delete();
          console.log("Deleted support reply after 20 seconds");
        } catch (err) {
          if (err.code !== 10008) {
            console.error("Failed to delete reply:", err.message);
          }
        }
      }, 20000);
    } catch (error) {
      console.error(
        `Failed to reply with support link: ${error.message} (Code: ${error.code})`
      );
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
