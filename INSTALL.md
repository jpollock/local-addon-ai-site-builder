# Installation Guide

Complete installation instructions for the AI Site Builder addon for Local by Flywheel.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Method 1: Pre-built Release (Recommended)](#method-1-pre-built-release-recommended)
  - [Method 2: Build from Source](#method-2-build-from-source)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

## Prerequisites

### Required Software

1. **Local by Flywheel** (v6.0.0 or higher)
   - Download from: https://localwp.com/
   - Install and complete initial setup

2. **Node.js** (v18.0.0 or higher) - Only required for building from source
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

### Required API Keys

You need at least one API key from the following providers:

- **Anthropic Claude**: https://console.anthropic.com/
- **OpenAI GPT-4**: https://platform.openai.com/api-keys
- **Google Gemini**: https://makersuite.google.com/app/apikey

## Installation Methods

### Method 1: Pre-built Release (Recommended)

This is the easiest method for most users.

#### Step 1: Download the Latest Release

1. Go to the [Releases page](https://github.com/wpengine/local-addon-ai-site-builder/releases)
2. Download the correct package for your operating system:

   | Platform              | Architecture | Download File                             |
   | --------------------- | ------------ | ----------------------------------------- |
   | macOS (Intel)         | x64          | `ai-site-builder-vX.X.X-darwin-x64.tgz`   |
   | macOS (Apple Silicon) | arm64        | `ai-site-builder-vX.X.X-darwin-arm64.tgz` |
   | Windows               | x64          | `ai-site-builder-vX.X.X-win32-x64.tgz`    |
   | Linux                 | x64          | `ai-site-builder-vX.X.X-linux-x64.tgz`    |

   > **Note:** Choose the correct architecture for your system:
   >
   > - **macOS Intel:** Macs with Intel processors (pre-2020)
   > - **macOS Apple Silicon:** M1, M2, M3 Macs (2020 and later)
   > - Check your Mac's chip: Apple menu > About This Mac

#### Step 2: Install from Disk in Local

1. Open **Local**
2. Go to **Add-ons** (in the left sidebar)
3. Click **Install from disk** (top right)
4. Select the `.tgz` file you downloaded

#### Step 3: Enable and Relaunch

1. Find "AI Site Builder" in your installed add-ons list
2. Toggle it **ON** to enable
3. Click **Relaunch** when prompted (or quit and restart Local)

### Method 2: Build from Source

For developers or those who want to customize the addon.

#### Step 1: Clone the Repository

```bash
git clone https://github.com/wpengine/ai-site-builder.git
cd ai-site-builder
```

#### Step 2: Install Dependencies

```bash
npm install
```

This will:

- Install all required packages
- Set up Husky pre-commit hooks
- Configure development environment

#### Step 3: Build the Addon

```bash
npm run build
```

This will:

- Clean previous builds
- Compile TypeScript to JavaScript
- Generate entry points
- Create the `lib/` directory with all compiled files

#### Step 4: Verify Build Output

Ensure these files were created:

```bash
ls -la lib/
# Should show:
# - main.js
# - renderer.js
# - (other compiled files)
```

#### Step 5: Install to Local (Option A - Using Install Script)

```bash
npm run install-addon
```

The install script automatically:

- Detects your operating system
- Finds Local's addons directory
- Creates the addon folder
- Copies all necessary files
- Reports installation status

#### Step 5: Install to Local (Option B - Manual)

If the install script doesn't work, manually copy files:

```bash
# macOS
cp -r . ~/Library/Application\ Support/Local/addons/ai-site-builder/

# Windows (PowerShell)
Copy-Item -Path . -Destination "$env:APPDATA\Local\addons\ai-site-builder\" -Recurse

# Linux
cp -r . ~/.config/Local/addons/ai-site-builder/
```

#### Step 6: Restart Local

1. Quit Local completely
2. Restart Local
3. Verify the addon appears

## Configuration

### Setting Up API Keys

After installation, you need to configure at least one AI provider:

1. **Open Local by Flywheel**
2. **Navigate to AI Site Builder**
   - Look for "AI Site Builder" in the left sidebar
   - Click to open the addon interface

3. **Access Settings**
   - Click the "Settings" or "Configuration" button
   - This opens the API key configuration panel

4. **Enter Your API Key(s)**

   **For Claude (Anthropic):**
   - Label: "Anthropic API Key"
   - Get key from: https://console.anthropic.com/
   - Paste your key (starts with `sk-ant-`)

   **For OpenAI (GPT-4):**
   - Label: "OpenAI API Key"
   - Get key from: https://platform.openai.com/api-keys
   - Paste your key (starts with `sk-`)

   **For Google (Gemini):**
   - Label: "Google API Key"
   - Get key from: https://makersuite.google.com/app/apikey
   - Paste your key

5. **Select Your Preferred Provider**
   - Choose which AI provider to use by default
   - You can change this at any time

6. **Save Configuration**
   - Click "Save" or "Apply"
   - Keys are stored securely in your system keychain

### Security Notes

- API keys are stored using the system's secure credential storage (keytar)
- Keys are never logged or saved to files
- Keys are never transmitted except to the respective AI provider
- Each key is encrypted at rest

## Verification

### Verify Installation

1. **Check Addon Appears in Local**
   - Open Local
   - Look for "AI Site Builder" in the sidebar
   - If missing, check installation steps

2. **Verify Files Are Present**

   **macOS:**

   ```bash
   ls -la ~/Library/Application\ Support/Local/addons/ai-site-builder/
   ```

   **Windows (PowerShell):**

   ```powershell
   Get-ChildItem -Path "$env:APPDATA\Local\addons\ai-site-builder\"
   ```

   **Linux:**

   ```bash
   ls -la ~/.config/Local/addons/ai-site-builder/
   ```

3. **Test API Connection**
   - Open the addon
   - Create a test site plan
   - If API key is valid, you should receive AI-generated suggestions

### Expected Behavior

After successful installation and configuration:

- Addon appears in Local's sidebar
- Settings panel accepts API keys
- Creating a new site plan generates AI suggestions
- No error messages appear in console

## Troubleshooting

### Addon Doesn't Appear in Local

**Solution 1: Check Directory Location**

- Verify you placed files in the correct addons directory
- Ensure the folder is named `ai-site-builder`

**Solution 2: Check File Permissions**

```bash
# macOS/Linux - Make files readable
chmod -R 755 ~/Library/Application\ Support/Local/addons/ai-site-builder/
```

**Solution 3: Restart Local Completely**

- Quit Local (check system tray/menu bar)
- Kill any background processes
- Restart Local

**Solution 4: Check Local's Logs**

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

### API Key Errors

**"Invalid API Key" Error:**

- Verify key is correct (copy/paste from provider)
- Check key has proper permissions
- Ensure key hasn't expired
- Try regenerating the key

**"Failed to Store API Key":**

- Check keytar/keychain access permissions
- On macOS: Allow Local to access Keychain
- On Windows: Ensure Credential Manager is accessible
- On Linux: Ensure libsecret is installed

### Build Errors (Source Installation)

**"npm install" fails:**

```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors during build:**

```bash
# Ensure TypeScript is installed
npm install -D typescript@latest

# Run type check
npm run type-check
```

**Missing dependencies:**

```bash
# Reinstall all dependencies
npm ci
```

### Runtime Errors

**Addon loads but doesn't work:**

1. Check browser console in Local (View → Developer → Developer Tools)
2. Look for JavaScript errors
3. Verify `lib/main.js` and `lib/renderer.js` exist
4. Try rebuilding: `npm run build`

**API requests fail:**

1. Check internet connection
2. Verify API key is valid
3. Check provider status page:
   - Anthropic: https://status.anthropic.com/
   - OpenAI: https://status.openai.com/
   - Google: https://status.cloud.google.com/

## Uninstallation

### Method 1: Using Uninstall Script (Source Installation)

```bash
cd ai-site-builder
npm run uninstall-addon
```

### Method 2: Manual Uninstall

1. **Quit Local**

2. **Delete Addon Directory**

   **macOS:**

   ```bash
   rm -rf ~/Library/Application\ Support/Local/addons/ai-site-builder
   ```

   **Windows (PowerShell):**

   ```powershell
   Remove-Item -Path "$env:APPDATA\Local\addons\ai-site-builder" -Recurse -Force
   ```

   **Linux:**

   ```bash
   rm -rf ~/.config/Local/addons/ai-site-builder
   ```

3. **Remove API Keys (Optional)**

   API keys are stored in your system keychain. To remove them:

   **macOS:**
   - Open "Keychain Access" app
   - Search for "ai-site-builder"
   - Delete any related entries

   **Windows:**
   - Open "Credential Manager"
   - Search for "ai-site-builder"
   - Remove any related credentials

   **Linux:**
   - Keys are stored in the system keyring
   - Use your keyring manager (e.g., Seahorse) to remove them

4. **Restart Local**

## Getting Help

If you encounter issues not covered here:

1. **Check Documentation**
   - [README.md](README.md) - General documentation
   - [CHANGELOG.md](CHANGELOG.md) - Recent changes

2. **Search Existing Issues**
   - https://github.com/wpengine/ai-site-builder/issues

3. **Create New Issue**
   - Include your OS and Local version
   - Describe steps to reproduce
   - Attach relevant logs

4. **Community Support**
   - GitHub Discussions: https://github.com/wpengine/ai-site-builder/discussions

## Next Steps

After successful installation:

1. **Configure API Keys** (see [Configuration](#configuration))
2. **Create Your First Site Plan**
   - Open Local
   - Select or create a WordPress site
   - Open AI Site Builder addon
   - Follow the guided workflow
3. **Explore Features**
   - Try different AI providers
   - Experiment with site structures
   - Export plans for reference
4. **Read the Full Documentation** ([README.md](README.md))

---

**Happy Building!** 🚀
