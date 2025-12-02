# Troubleshooting Guide

Common issues and solutions for the AI Site Builder addon.

## Quick Diagnostics

Before diving into specific issues, run these checks:

1. **Is Local running and site started?**
2. **Is an AI provider configured?**
3. **Is there internet connectivity?**
4. **Check the logs** (see [Log Locations](#log-locations))

---

## Addon Not Loading

### Addon doesn't appear in Local

**Checklist:**

1. Verify the addon folder is in the correct location:
   - **macOS**: `~/Library/Application Support/Local/addons/ai-site-builder/`
   - **Windows**: `%APPDATA%\Local\addons\ai-site-builder\`
   - **Linux**: `~/.config/Local/addons/ai-site-builder/`

2. Check required files exist:

   ```
   ai-site-builder/
   ├── package.json
   ├── lib/
   │   ├── main.js
   │   └── renderer.js
   └── node_modules/
   ```

3. Verify `package.json` has required fields:

   ```json
   {
     "productName": "AI Site Builder",
     "main": "lib/main.js",
     "renderer": "lib/renderer.js"
   }
   ```

4. Restart Local completely (quit from menu bar/system tray)

### Addon loads but shows errors

**Check console for errors:**

1. In Local: **View → Developer → Developer Tools**
2. Go to **Console** tab
3. Look for red error messages

**Common errors:**

| Error                      | Solution                    |
| -------------------------- | --------------------------- |
| `Cannot find module`       | Rebuild: `npm run build`    |
| `ipcRenderer is undefined` | Check electron context      |
| `React is not defined`     | Verify renderer entry point |

---

## AI Provider Issues

### "No AI Provider Configured"

**Solution:**

1. Open AI Site Builder settings
2. Add at least one API key (Claude, OpenAI, or Gemini)
3. Click Save/Validate
4. Return to main screen

### "Invalid API Key"

**Checklist:**

1. No extra spaces when pasting the key
2. Key hasn't expired or been revoked
3. Key has the correct permissions/scopes
4. Account has available credits/quota

**Verify key format:**

- Claude: starts with `sk-ant-`
- OpenAI: starts with `sk-`
- Gemini: starts with `AIza`

**Test the key directly:**

```bash
# Claude
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01"

# OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

### "Rate Limited"

The addon implements rate limiting to prevent API abuse:

| Operation          | Limit | Window    |
| ------------------ | ----- | --------- |
| Send Message       | 20    | 1 minute  |
| Start Conversation | 10    | 5 minutes |
| Create Site        | 5     | 5 minutes |

**Solutions:**

1. Wait a few minutes before retrying
2. Check your API provider's rate limits
3. Switch to a different provider temporarily

### "API Request Timeout"

**Causes:**

- Slow internet connection
- Provider API is overloaded
- Large request payload

**Solutions:**

1. Check internet connectivity
2. Try a simpler request
3. Check provider status pages:
   - [status.anthropic.com](https://status.anthropic.com/)
   - [status.openai.com](https://status.openai.com/)
   - [status.cloud.google.com](https://status.cloud.google.com/)

### Circuit Breaker Open

When too many requests fail, the circuit breaker prevents further calls:

**Symptoms:**

- "Service temporarily unavailable"
- Health status shows "Blocked"

**Solutions:**

1. Wait 30 seconds for automatic reset
2. Check provider status
3. Verify API key is still valid
4. Go to Settings → Reset Circuit Breakers

---

## Secure Storage Issues

### "Failed to Store API Key"

The addon uses your system's secure credential storage:

**macOS - Keychain Access:**

1. Open "Keychain Access" app
2. Search for "ai-site-builder"
3. If found, delete and re-add your key
4. Check Local has keychain access permissions

**Windows - Credential Manager:**

1. Open "Credential Manager"
2. Look under "Generic Credentials"
3. Search for "ai-site-builder"
4. Delete if corrupt and re-add

**Linux - Secret Service:**

1. Ensure `libsecret` is installed:

   ```bash
   # Ubuntu/Debian
   sudo apt install libsecret-1-0

   # Fedora
   sudo dnf install libsecret
   ```

2. Ensure a keyring daemon is running (GNOME Keyring or KWallet)

### "Keytar Load Failed"

The `keytar` native module failed to load. Fallback encrypted storage will be used.

**This is normal if:**

- Running on an unsupported platform
- Native dependencies weren't installed

**The fallback storage:**

- Uses AES-256-GCM encryption
- Stores in `~/.ai-site-builder/credentials.enc`
- Is secure but less integrated with OS

---

## OAuth Issues

### Google OAuth fails

**Checklist:**

1. Check redirect completed properly
2. Verify OAuth app is configured correctly
3. Ensure required scopes are approved
4. Try disconnecting and reconnecting

### Figma OAuth fails

**Checklist:**

1. Verify Figma token hasn't expired
2. Check file is accessible with your account
3. Ensure you have view permissions
4. Try using a personal access token instead

---

## WordPress Integration Issues

### "Failed to Apply Structure"

**Checklist:**

1. WordPress site is running in Local
2. WordPress admin is accessible
3. No plugin conflicts
4. Database is accessible

**Manual verification:**

```bash
# Navigate to site
cd ~/Local\ Sites/your-site/app/public

# Test WP-CLI
wp post list
wp option get siteurl
```

### Pages not created

**Check:**

1. WordPress isn't in maintenance mode
2. User has proper permissions
3. No post limit reached
4. Disk space available

### Navigation menu not updated

**Solutions:**

1. Clear WordPress cache
2. Check menu locations are assigned
3. Verify theme supports menus
4. Try creating menu manually first

---

## Build Issues (Development)

### "npm install" fails

```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "npm run build" fails

**TypeScript errors:**

```bash
# Check types
npm run type-check

# Common fixes
npm install  # Ensure dependencies installed
```

**Missing dependencies:**

```bash
npm ci  # Clean install from lockfile
```

### Native module issues

If `keytar` fails to build:

```bash
# macOS - Install Xcode tools
xcode-select --install

# Windows - Install build tools
npm install -g windows-build-tools

# Linux - Install build essentials
sudo apt install build-essential
```

---

## Log Locations

### Local's main logs

**macOS:**

```bash
tail -f ~/Library/Logs/local-by-flywheel/main.log
```

**Windows:**

```
%APPDATA%\Local\logs\main.log
```

**Linux:**

```bash
tail -f ~/.config/Local/logs/main.log
```

### Addon-specific logs

The addon logs to:

- Console (View → Developer → Developer Tools)
- Local's main log file

### Audit logs

Security events are logged to:

```
~/.ai-site-builder/audit.log
```

---

## Performance Issues

### Slow AI responses

**Causes:**

- Large prompts
- Provider congestion
- Network latency

**Solutions:**

1. Simplify your site description
2. Try a different provider
3. Check provider status

### High memory usage

**Solutions:**

1. Close unused browser tabs
2. Restart Local
3. Clear addon caches (Settings → Clear Caches)

---

## Getting Help

If you can't resolve the issue:

1. **Search existing issues:**
   [github.com/wpengine/ai-site-builder/issues](https://github.com/wpengine/ai-site-builder/issues)

2. **Create a new issue with:**
   - Operating system and version
   - Local version
   - Steps to reproduce
   - Error messages (from console)
   - Relevant log excerpts

3. **Community support:**
   [GitHub Discussions](https://github.com/wpengine/ai-site-builder/discussions)

---

## Diagnostic Commands

Run these to gather system info:

```bash
# Node version
node --version

# npm version
npm --version

# Local addon location
ls -la ~/Library/Application\ Support/Local/addons/  # macOS

# Check keytar
node -e "try { require('keytar'); console.log('keytar OK'); } catch(e) { console.log('keytar failed:', e.message); }"

# Validate addon structure
npm run validate-release
```
