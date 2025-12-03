# AI Site Builder User Guide

A comprehensive guide to using the AI Site Builder addon for Local by WP Engine.

## Table of Contents

- [Getting Started](#getting-started)
- [Setting Up AI Providers](#setting-up-ai-providers)
- [Creating Your First Site](#creating-your-first-site)
- [The Site Building Workflow](#the-site-building-workflow)
- [Figma Integration](#figma-integration)
- [Understanding AI Suggestions](#understanding-ai-suggestions)
- [Reviewing and Customizing Structure](#reviewing-and-customizing-structure)
- [Applying Changes to WordPress](#applying-changes-to-wordpress)
- [Tips and Best Practices](#tips-and-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Before using AI Site Builder, ensure you have:

1. **Local by WP Engine** installed (v6.0.0+)
2. **A WordPress site** created in Local
3. **An API key** from at least one AI provider:
   - [Anthropic Claude](https://console.anthropic.com/)
   - [OpenAI GPT-4](https://platform.openai.com/api-keys)
   - [Google Gemini](https://makersuite.google.com/app/apikey)

### Opening AI Site Builder

1. Launch **Local by WP Engine**
2. Select a WordPress site from your sites list
3. Look for **AI Site Builder** in the left sidebar or site tools
4. Click to open the addon interface

---

## Setting Up AI Providers

Before building sites, configure at least one AI provider.

### Accessing Settings

1. Open AI Site Builder
2. Click the **Settings** or **gear icon**
3. Navigate to the **AI Providers** section

### Configuring Claude (Anthropic)

1. Get your API key from [console.anthropic.com](https://console.anthropic.com/)
2. In Settings, find the **Claude** section
3. Paste your API key (starts with `sk-ant-`)
4. Click **Save** or **Validate**

### Configuring OpenAI (GPT-4)

1. Get your API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. In Settings, find the **OpenAI** section
3. Paste your API key (starts with `sk-`)
4. Click **Save** or **Validate**

### Configuring Google Gemini

You have two options for Gemini:

**Option A: API Key**

1. Get your API key from [makersuite.google.com](https://makersuite.google.com/app/apikey)
2. Paste in the Gemini section
3. Click **Save**

**Option B: OAuth (Recommended)**

1. Click **Connect with Google**
2. Sign in with your Google account
3. Grant the required permissions
4. You'll be redirected back to Local

### Selecting Your Default Provider

After configuring providers:

1. Go to Settings
2. Find **Default Provider**
3. Select your preferred AI (Claude, OpenAI, or Gemini)
4. This will be used for all site generation tasks

### Security Note

Your API keys are stored securely in your system's credential manager:

- **macOS**: Keychain
- **Windows**: Credential Manager
- **Linux**: Secret Service

Keys are never stored in plain text or logged.

---

## Creating Your First Site

### Step 1: Start a New Project

1. Ensure you have a WordPress site selected in Local
2. Open AI Site Builder
3. You'll see the **Entry Screen** with a text area

### Step 2: Describe Your Site

In the main text area, describe what you want to build:

**Good descriptions include:**

- Purpose of the site
- Target audience
- Key features needed
- Style or tone preferences

**Example:**

```
I need a professional portfolio website for a freelance photographer.
It should showcase my work in galleries, have an about page, contact form,
and pricing information. The style should be minimal and elegant with
a focus on letting the photos speak for themselves.
```

### Step 3: Click Continue

After entering your description, click **Continue** to proceed to the guided questions.

---

## The Site Building Workflow

AI Site Builder guides you through a structured workflow:

### 1. Entry Screen

- Describe your site vision
- Optionally connect a Figma design
- Choose your starting point

### 2. Questions Wizard

The AI asks clarifying questions to understand your needs:

- **Site Type**: Portfolio, blog, business, e-commerce, etc.
- **Content Sections**: What pages and sections do you need?
- **Features**: Contact forms, galleries, testimonials, etc.
- **Style Preferences**: Colors, typography, layout style

Answer each question to help the AI generate better recommendations.

### 3. AI Conversation

For complex sites, you may enter a conversation mode where you can:

- Refine your requirements
- Ask questions about options
- Request specific changes
- Get AI explanations for recommendations

### 4. Structure Review

The AI generates a proposed site structure:

- **Pages**: Home, About, Services, Contact, etc.
- **Navigation**: Menu structure and hierarchy
- **Content Types**: Blog posts, portfolio items, testimonials
- **Design Elements**: Color scheme, typography, spacing

Review each section and make adjustments as needed.

### 5. Building Phase

Once you approve the structure:

1. AI Site Builder creates the pages in WordPress
2. Sets up navigation menus
3. Configures theme settings
4. Applies design tokens

Watch the progress indicator as changes are applied.

---

## Figma Integration

Connect your Figma designs for design-aware site generation.

### Connecting Figma

1. On the Entry Screen, click **Connect Figma**
2. Choose authentication method:
   - **OAuth**: Click "Connect with Figma" and authorize
   - **Access Token**: Paste your Figma personal access token
3. Once connected, you'll see a confirmation

### Using Figma Designs

1. Paste a Figma file URL or frame URL
2. Click **Analyze Design**
3. AI Site Builder extracts:
   - Color palette
   - Typography styles
   - Component patterns
   - Layout structure
4. These inform the site generation

### Figma URL Format

```
# Full file
https://www.figma.com/file/ABC123/MyDesign

# Specific frame
https://www.figma.com/file/ABC123/MyDesign?node-id=1:234
```

---

## Understanding AI Suggestions

### How Recommendations Work

The AI analyzes your inputs to suggest:

1. **Page Structure**: Optimal pages for your site type
2. **Content Hierarchy**: How to organize information
3. **Navigation**: Logical menu structure
4. **SEO Elements**: Meta descriptions, headings, etc.
5. **Design Tokens**: Colors, fonts, spacing based on your preferences

### Confidence Indicators

Some suggestions may show confidence levels:

- **High Confidence**: Strong recommendation based on best practices
- **Medium Confidence**: Good option, but alternatives exist
- **Suggestion**: Optional enhancement you might consider

### AI Provider Differences

Each AI provider has slightly different strengths:

| Provider | Strengths                                    |
| -------- | -------------------------------------------- |
| Claude   | Detailed explanations, nuanced understanding |
| GPT-4    | Broad knowledge, creative suggestions        |
| Gemini   | Fast responses, good with technical details  |

---

## Reviewing and Customizing Structure

### The Review Screen

After AI generates a structure, you'll see:

- **Section Navigator**: Jump between sections
- **Page List**: All proposed pages
- **Content Preview**: What each page will contain
- **Settings Panel**: Design and configuration options

### Editing Pages

1. Click on any page in the list
2. Modify the title, slug, or content outline
3. Add or remove sections
4. Reorder content blocks

### Adding Pages

1. Click **Add Page** or the **+** button
2. Choose from suggested templates or start blank
3. Configure page settings
4. Position in navigation

### Removing Pages

1. Hover over the page you want to remove
2. Click the **delete** or **trash** icon
3. Confirm removal

### Changing Design Settings

In the design panel, adjust:

- **Color Palette**: Primary, secondary, accent colors
- **Typography**: Heading and body fonts
- **Spacing**: Layout density and margins
- **Style**: Overall visual approach

---

## Applying Changes to WordPress

### Before You Apply

1. **Review all pages** and sections
2. **Check navigation** structure makes sense
3. **Verify design settings** match your preferences
4. **Consider backing up** your existing site (if modifying)

### Applying the Structure

1. Click **Apply to Site** or **Build Site**
2. Watch the progress indicator
3. Each step shows what's being created:
   - Creating pages...
   - Setting up menus...
   - Configuring theme...
   - Applying design tokens...

### After Applying

1. **View your site** in the browser
2. **Check WordPress admin** for created content
3. **Test navigation** and links
4. **Refine as needed** using the WordPress editor

### Making Changes Later

You can always:

- Edit pages directly in WordPress
- Re-run AI Site Builder for new sections
- Manually adjust theme settings

---

## Tips and Best Practices

### Writing Better Descriptions

**Be specific about your audience:**

```
❌ "A business website"
✅ "A website for a local bakery targeting families and wedding planners"
```

**Include key features:**

```
❌ "An online store"
✅ "An e-commerce site for handmade jewelry with product galleries,
   size guides, and a custom order form"
```

**Mention style preferences:**

```
❌ "A modern website"
✅ "A minimalist design with lots of whitespace, sans-serif fonts,
   and a blue/white color scheme"
```

### Iterating on Results

1. **Start broad**, then refine
2. **Use conversation mode** to adjust recommendations
3. **Don't hesitate to regenerate** if results aren't right
4. **Save good structures** as templates for future use

### Working with Existing Sites

When improving an existing site:

1. AI Site Builder analyzes current content
2. Suggests improvements and additions
3. You choose what to keep, modify, or replace
4. Changes are applied incrementally

### Performance Tips

- **Close unnecessary browser tabs** when building
- **Ensure stable internet** for AI communication
- **Large sites** may take longer to generate
- **Check provider status** if requests fail

---

## Troubleshooting

### "No AI Provider Configured"

**Solution:**

1. Go to Settings
2. Add at least one API key
3. Validate the key works
4. Return to the main screen

### "API Key Invalid"

**Solution:**

1. Check for extra spaces when pasting
2. Verify the key hasn't expired
3. Ensure you have API credits/quota remaining
4. Try generating a new key

### "Rate Limited"

**Solution:**

1. Wait a few minutes before retrying
2. Check your API provider's usage limits
3. Consider upgrading your API plan
4. Switch to a different provider temporarily

### "Failed to Apply Structure"

**Solution:**

1. Ensure WordPress site is running in Local
2. Check WordPress admin is accessible
3. Verify no plugin conflicts
4. Try applying sections individually

### "Figma Connection Failed"

**Solution:**

1. Check your Figma token hasn't expired
2. Re-authenticate with OAuth
3. Verify the Figma file is accessible
4. Ensure you have view permissions

### Provider Health Issues

Check provider status at:

- Anthropic: [status.anthropic.com](https://status.anthropic.com/)
- OpenAI: [status.openai.com](https://status.openai.com/)
- Google: [status.cloud.google.com](https://status.cloud.google.com/)

---

## Getting Help

If you encounter issues:

1. **Check this guide** for common solutions
2. **View the [README](../README.md)** for additional info
3. **Search [GitHub Issues](https://github.com/jpollock/ai-site-builder/issues)**
4. **Create a new issue** with:
   - Your OS and Local version
   - Steps to reproduce
   - Error messages or screenshots

---

## Keyboard Shortcuts

| Shortcut       | Action                  |
| -------------- | ----------------------- |
| `Enter`        | Submit/Continue         |
| `Esc`          | Cancel/Go Back          |
| `Tab`          | Navigate between fields |
| `Cmd/Ctrl + S` | Save current state      |

---

Happy building! 🚀
