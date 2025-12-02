# AI-Assisted WordPress Site Builder - Project Specification
**Version 1.0 - Foundation Phase**  
**Last Updated:** November 13, 2025

---

## EXECUTIVE SUMMARY

An intelligent Local WP add-on that guides users through WordPress site creation by abstracting complexity, leveraging Advanced Custom Fields (ACF) for flexible content architecture, and providing contextual recommendations for plugins and features based on site type. The system can optionally integrate with Figma to extract design intent and accelerate setup.

**Core Philosophy:** Make advanced WordPress development simple. Enable $50k website quality without $50k setup time.

---

## PRODUCT VISION & POSITIONING

### What This Is
- **Intelligence layer** between design tools and WordPress
- **Architecture accelerator** that understands sophisticated needs
- **Ongoing management partner** that reduces WordPress friction
- **Multi-site platform** for agencies and power users

### What This Is Not
- Generic template generator
- Visual page builder competitor
- "AI generates your website" tool
- Replacement for creative design work

### Competitive Moat
Unlike Elementor (visual assembly) or WordPress.com AI (generic generation), we provide:
1. **Design-aware intelligence** - understands existing design decisions
2. **Architectural depth** - proper custom post types, taxonomies, ACF structure
3. **Progressive sophistication** - simple interface, advanced capabilities
4. **Workflow continuity** - works where agencies actually start (design tools)

---

## TARGET USERS

### Primary User Personas (All Three Are Core)

**1. Non-Technical Users**
- Want professional WordPress sites without learning technical details
- Need guided experience with helpful explanations
- Value automation over manual configuration
- Example: Small business owner creating first website

**2. Developers**
- Want to speed up boilerplate setup
- Need advanced features readily accessible
- Value time savings over hand-coding repetitive structures
- Example: Freelance developer managing multiple client sites

**3. Agencies**
- Build sophisticated sites for clients with budgets ($10k-$100k+)
- Start in design tools (Figma, Miro) not WordPress
- Need to move fast without sacrificing quality
- Manage multiple projects simultaneously
- Example: Digital agency with 5-20 ongoing client projects

### User Journey Characteristics
- Interface should be **adaptive** - reveals complexity based on user behavior
- **Progressive disclosure** - advanced features available through secondary actions
- Position: "You shouldn't need a CS degree to make the coolest site ever made"

---

## V1 SCOPE & PRIORITIES

### Must Have (MVP)

1. **Local WP Add-on Foundation**
   - Integrates cleanly with Local WP application
   - TypeScript + React architecture
   - Multi-site project management

2. **WordPress Site Creation**
   - Create new WordPress sites via Local's API
   - Guided setup flow with AI assistance
   - Support for blog + one complex type (e.g., blog + basic e-commerce)

3. **Intelligent Architecture Generation**
   - Custom post types based on user needs
   - Taxonomies (categories, tags, custom taxonomies)
   - ACF field groups tailored to content structure
   - Relationships between content types

4. **Figma Integration (Direct API)**
   - User provides Figma Personal Access Token
   - Extract: frame names, component inventory, page structure
   - AI analyzes design to infer content structure
   - Suggest WordPress architecture based on design

5. **Plugin Recommendations**
   - Context-aware suggestions based on site type
   - Show basic details and installation option
   - Start with top 10 most-used plugins (manual adapters)
   - AI can analyze other plugins on-demand

6. **AI-Powered Content Assistance**
   - AI involved in every content creation/editing session
   - Generate/suggest: alt text, meta descriptions, SEO content
   - Content quality recommendations

7. **Theme Strategy**
   - Include Frost WP as base theme
   - Auto-generate child theme with minimal customizations
   - AI analyzes Figma design → generates only needed CSS

8. **ACF Pro Validation**
   - Check for ACF Pro installation
   - Validate license on site creation
   - Provide clear messaging if not installed
   - Link to purchase page

9. **Human-in-the-Loop Approval**
   - Review AI-generated architecture before execution
   - Approval gates before major changes
   - Edit/refine AI proposals

10. **Rollback System**
    - Three-tier rollback: configuration, snapshot, full backup
    - Leverage Local's built-in backup capabilities
    - Version history UI showing all changes
    - Undo any AI-generated changes

### Should Have (Post-MVP, Pre-Launch)

1. **Miro Integration** for sitemaps/user journeys
2. **Design Fidelity Awareness** (wireframes vs high-fidelity handling)
3. **Content Recommendations** (missing areas, improvements)
4. **Plugin Auto-Configuration** for top 10 most-used plugins
5. **Expanded Site Type Support** (directories, memberships)

### Could Have (Future Phases)

1. **Notion/Google Docs Content Import**
2. **Custom Interface for Content Management** (vs WordPress admin)
3. **Design Tool Sync** (Figma as source of truth)
4. **Generic Plugin Settings Automation** via AI analysis with community learning
5. **Advanced Site Types** (complex directories, membership sites)
6. **Deploy to Production** (leverage Local's WP Engine/Flywheel integration)

---

## TECHNICAL ARCHITECTURE

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL WP APPLICATION                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           OUR ADD-ON (TypeScript/React)                │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │   Setup UI   │  │  AI Engine   │  │  Figma     │  │ │
│  │  │  (React)     │  │  (Claude API)│  │  Direct API│  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │ │
│  │         │                  │                 │         │ │
│  │  ┌──────▼──────────────────▼─────────────────▼──────┐ │ │
│  │  │      Add-on State Management (SQLite/JSON)       │ │ │
│  │  └──────┬───────────────────────────────────────────┘ │ │
│  │         │                                              │ │
│  └─────────┼──────────────────────────────────────────────┘ │
│            │                                                 │
│  ┌─────────▼───────────────────────────────────────────┐   │
│  │        LOCAL API (@getflywheel/local)               │   │
│  │  - Site Creation    - Backups                       │   │
│  │  - WP-CLI Access    - Import/Export                 │   │
│  │  - Database Access  - Site Management               │   │
│  └─────────┬───────────────────────────────────────────┘   │
└────────────┼──────────────────────────────────────────────┘
             │
     ┌───────▼────────┐
     │  Local Sites   │
     │  Site 1, 2...N │
     └────────────────┘
```

### Core Components

#### 1. Add-on Main Process (TypeScript)
- Hooks into Local's lifecycle events
- Manages site creation via Local API
- Handles database operations
- Interfaces with WordPress via WP-CLI (Local provides this)

**Key Responsibilities:**
- Site provisioning orchestration
- File system operations
- Database queries
- Background task management

#### 2. Add-on Renderer Process (React + TypeScript)
- UI for setup wizard
- AI chat interface
- Site management dashboard
- Figma connection interface

**Key Components:**
- Conversational setup flow
- Multi-site project dashboard
- Approval/review UI for AI changes
- Real-time site status display

#### 3. State Management & Persistence

**Storage Strategy:**
- **SQLite database** for structured data (projects, history, API logs)
- **JSON files** for configuration snapshots (for rollback)
- Store in Local's add-on data directory

**Data Model:**
```
User (implicit - Local's user)
└── Projects (multiple sites)
    └── Project
        ├── site_id (Local site ID)
        ├── wordpress_site_url
        ├── figma_file_id (optional)
        ├── figma_access_token (encrypted)
        ├── site_type (blog, ecommerce, portfolio, etc.)
        ├── ArchitectureSnapshots
        │   ├── timestamp
        │   ├── post_types_json
        │   ├── taxonomies_json
        │   ├── acf_field_groups_json
        │   └── plugins_list
        ├── ChangeHistory (for rollback)
        │   ├── timestamp
        │   ├── change_type
        │   ├── ai_proposal
        │   ├── user_approval
        │   ├── execution_result
        │   └── rollback_data
        └── AIConversations
            ├── messages[]
            └── context_cache
```

#### 4. AI Integration Layer

**Provider:** Claude API (Anthropic)
- Model: `claude-sonnet-4-20250514`
- Used for all intelligent analysis and generation

**Responsibilities:**
- Parse Figma designs → infer content structure
- Generate ACF field group JSON configurations
- Create custom post type registration code
- Generate taxonomy configurations
- Recommend plugins based on requirements
- Generate content (alt text, SEO descriptions)
- Provide ongoing optimization suggestions

**Cost Optimization:**
- Smart context management (don't resend full Figma data each request)
- Incremental updates (only send changed sections)
- Prompt templates for common operations
- Batch related operations

#### 5. WordPress Integration Layer

**Primary Method:** WP-CLI (via Local)
- Faster than REST API
- More powerful (can do anything)
- Direct access provided by Local

**Secondary Method:** Direct Database Access (when needed)
- For complex queries
- Bulk operations
- Custom data retrieval

**What We Don't Use:** REST API (too limited for our needs)

**WordPress Operations:**
- Install/activate plugins
- Create custom post types
- Register taxonomies
- Generate ACF field groups
- Import/export content
- Configure theme settings

#### 6. Figma Integration (V1)

**Authentication:** Personal Access Token
- User generates in Figma settings
- Stored encrypted in our database
- Used for all Figma API calls

**API Endpoints Used:**
- `GET /v1/files/:file_key` - Get file structure
- `GET /v1/files/:file_key/nodes` - Get specific nodes
- `GET /v1/files/:file_key/components` - Get components

**Data Extraction:**
- Frame names and hierarchy
- Component inventory
- Text layers (for content inference)
- Auto-layout patterns (for structure inference)
- Repeating patterns (suggest custom post types)

**Processing Flow:**
1. User provides Figma file URL + token
2. Extract file ID from URL
3. Fetch file data via Figma REST API
4. Parse JSON structure
5. Send structured data to Claude API for analysis
6. Receive WordPress architecture suggestions
7. Present to user for approval

#### 7. Theme Management

**Base Theme:** Frost WP
- Block-based (Gutenberg-native)
- Minimal CSS footprint
- Clean, semantic HTML
- Easy to customize

**Child Theme Generation:**
- Auto-generate child theme folder structure
- Create `style.css` with proper headers
- Create `functions.php` with theme setup
- Generate only needed CSS based on Figma design analysis
- Theme is created in `/wp-content/themes/` directory

**AI-Driven Customization:**
- Analyze Figma design colors → CSS variables
- Extract typography → theme.json settings
- Identify spacing patterns → utility classes
- Generate minimal custom CSS

#### 8. Backup & Rollback System

**Three-Tier Strategy:**

**Tier 1: Configuration Rollback** (Fast - <1s)
- Store JSON snapshots before AI changes
- Includes: ACF field groups, CPT configs, taxonomies, plugin lists
- Rollback: Restore previous JSON, re-execute registration

**Tier 2: Local Snapshot Rollback** (Medium - ~30s)
- Trigger Local's snapshot system before major operations
- Leverage Local's backup add-on functionality
- Rollback: Restore Local snapshot via API

**Tier 3: Full Backup** (Slow - 1-5min)
- Create full Local site export for complex operations
- Includes all files + database
- Rollback: Restore from zip export

**Version History UI:**
```
┌─ Site History ─────────────────────────┐
│ ● Now - E-commerce setup complete      │
│   (2 custom post types, 3 taxonomies)  │
│                                         │
│ ↓ 2 hours ago - Added product CPT      │
│   [Rollback]                            │
│                                         │
│ ↓ Yesterday - Initial blog setup       │
│   [Rollback]                            │
│                                         │
│ ↓ 2 days ago - Site created             │
│   [Rollback]                            │
└─────────────────────────────────────────┘
```

---

## USER EXPERIENCE FLOWS

### Primary Flow: New Site Creation

```
1. CREATE PROJECT IN ADD-ON
   │
   ├─ User clicks "New Site"
   ├─ Enters basic info (site name, purpose)
   └─ Selects site type (blog, portfolio, e-commerce, etc.)
   ↓
   
2. CONNECT DESIGN TOOL (OPTIONAL)
   │
   ├─ User provides Figma file URL
   ├─ User provides Figma Personal Access Token
   ├─ AI analyzes structure automatically
   └─ Skip if no design yet (conversational gathering instead)
   ↓
   
3. AI PROPOSES ARCHITECTURE
   │
   ├─ Custom post types (e.g., "Products", "Services")
   ├─ Taxonomies (e.g., "Product Categories")
   ├─ ACF field groups for each post type
   ├─ Plugin recommendations with reasoning
   └─ Theme customizations needed
   ↓
   
4. HUMAN REVIEW & APPROVAL
   │
   ├─ User sees AI's complete proposal
   ├─ Can edit any suggested element
   ├─ Can ask AI to revise specific parts
   └─ Approves in stages or all at once
   ↓
   
5. WORDPRESS SITE CREATION
   │
   ├─ Local creates new WordPress installation
   ├─ Install companion plugin (our helper)
   ├─ Execute approved architecture
   ├─ Configure ACF field groups
   ├─ Register custom post types
   ├─ Create taxonomies
   ├─ Install/activate plugins
   └─ Set up theme
   ↓
   
6. CONTENT POPULATION
   │
   ├─ AI-assisted content entry
   ├─ Generate placeholder content (optional)
   ├─ SEO optimization suggestions
   └─ Alt text generation for images
   ↓
   
7. LAUNCH & ONGOING MANAGEMENT
   │
   ├─ Site ready for development/content
   ├─ Return to add-on for updates
   ├─ AI provides ongoing recommendations
   └─ Manage multiple sites from dashboard
```

### Secondary Flow: Existing Site Management

```
1. CONNECT EXISTING LOCAL SITE
   │
   └─ Select from Local's site list
   ↓
   
2. AI AUDITS ARCHITECTURE
   │
   ├─ Scans current setup
   ├─ Identifies structure
   └─ Suggests improvements
   ↓
   
3. USER REQUESTS CHANGES
   │
   ├─ "Add new post type for case studies"
   ├─ "Integrate WooCommerce"
   └─ "Improve SEO configuration"
   ↓
   
4. AI PROPOSES → USER APPROVES → EXECUTE
   │
   └─ Same approval flow as new site
```

### Edge Case Flow: Design Fidelity Variations

**High-Fidelity Figma Design:**
```
AI detects: Complete visual design
Offers: Full implementation (structure + styling)
Generates: Complete child theme CSS
```

**Wireframes/Low-Fidelity:**
```
AI detects: Structural design only
Offers: Focus on architecture (CPTs, taxonomies, ACF)
Suggests: Come back when design is complete for styling
Generates: Minimal theme setup
```

**No Design File:**
```
User skips Figma step
AI uses: Conversational requirements gathering
Asks about: Content types, features needed, site goals
Generates: Architecture based on interview
```

---

## TECHNICAL IMPLEMENTATION DETAILS

### Development Stack

**Frontend (Renderer Process):**
- React 18
- TypeScript 5.x
- Tailwind CSS (for UI)
- @getflywheel/local-components (Local's UI library)

**Backend (Main Process):**
- Node.js (version managed by Local)
- TypeScript 5.x
- SQLite3 (for local database)
- @getflywheel/local (Local's API)

**Build Tools:**
- Webpack (for renderer)
- tsc (for main process)
- Create-local-addon generator for scaffolding

**External APIs:**
- Claude API (Anthropic) - claude-sonnet-4-20250514
- Figma REST API
- ACF Pro REST API (for field group management)

### Add-on Structure

```
wordpress-ai-builder/
├── package.json
├── tsconfig.json
├── webpack.config.js
├── src/
│   ├── main/                  # Main process (Node.js)
│   │   ├── index.ts           # Entry point
│   │   ├── LocalAPI.ts        # Interface with Local
│   │   ├── WordPressManager.ts # WP-CLI operations
│   │   ├── Database.ts         # SQLite operations
│   │   ├── FigmaAPI.ts        # Figma integration
│   │   ├── ClaudeAPI.ts       # AI integration
│   │   └── BackupManager.ts   # Rollback system
│   │
│   ├── renderer/              # Renderer process (React)
│   │   ├── index.tsx          # Entry point
│   │   ├── App.tsx            # Main app component
│   │   ├── components/
│   │   │   ├── SetupWizard/
│   │   │   ├── Dashboard/
│   │   │   ├── ArchitectureReview/
│   │   │   ├── ChatInterface/
│   │   │   └── HistoryViewer/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   │
│   └── shared/                # Shared types/interfaces
│       ├── types.ts
│       └── constants.ts
│
├── vendor/                    # Compiled binaries (if needed)
│   ├── darwin/
│   ├── linux/
│   └── win32/
│
└── lib/                       # Compiled output (gitignored)
    ├── main/
    └── renderer/
```

### Local WP Integration Points

**Site Creation:**
```typescript
// Use Local's API to create new WordPress site
import { SiteProvisionerService } from '@getflywheel/local';

const newSite = await SiteProvisionerService.createSite({
  name: 'My New Site',
  domain: 'mynewsite.local',
  multiSite: false,
  phpVersion: '8.2',
  webServer: 'nginx'
});
```

**WP-CLI Access:**
```typescript
// Execute WP-CLI commands via Local
import { WPCLIService } from '@getflywheel/local';

await WPCLIService.run(siteId, [
  'plugin',
  'install',
  'advanced-custom-fields-pro',
  '--activate'
]);
```

**Database Operations:**
```typescript
// Access site database directly
import { DatabaseService } from '@getflywheel/local';

const result = await DatabaseService.query(siteId, 
  'SELECT * FROM wp_posts WHERE post_type = ?',
  ['product']
);
```

### ACF Pro Integration

**Field Group Generation:**
```typescript
// Generate ACF field group JSON
interface ACFFieldGroup {
  key: string;
  title: string;
  fields: ACFField[];
  location: ACFLocation[][];
  menu_order: number;
  position: string;
  style: string;
  label_placement: string;
  instruction_placement: string;
}

// Import into WordPress via WP-CLI
await WPCLIService.run(siteId, [
  'acf',
  'import',
  '--json_file=/path/to/field-group.json'
]);
```

**License Validation:**
```typescript
// Check if ACF Pro is installed and activated
async function validateACFPro(siteId: string): Promise<boolean> {
  const result = await WPCLIService.run(siteId, [
    'plugin',
    'is-installed',
    'advanced-custom-fields-pro',
    '--status=active'
  ]);
  
  return result.exitCode === 0;
}
```

### AI Prompt Engineering

**Example: Architecture Generation Prompt**
```typescript
const prompt = `
You are an expert WordPress architect. Analyze this website design and suggest the optimal WordPress architecture.

DESIGN DATA:
${JSON.stringify(figmaStructure, null, 2)}

SITE TYPE: ${siteType}

Please provide a JSON response with this structure:
{
  "customPostTypes": [
    {
      "name": "product",
      "label": "Products",
      "supports": ["title", "editor", "thumbnail"],
      "reasoning": "Why this CPT is needed"
    }
  ],
  "taxonomies": [
    {
      "name": "product_category",
      "postTypes": ["product"],
      "hierarchical": true,
      "reasoning": "Why this taxonomy is needed"
    }
  ],
  "acfFieldGroups": [
    {
      "title": "Product Details",
      "fields": [
        {
          "name": "price",
          "type": "number",
          "label": "Price",
          "required": true
        }
      ],
      "location": [["post_type", "==", "product"]],
      "reasoning": "Why these fields are needed"
    }
  ],
  "recommendedPlugins": [
    {
      "slug": "woocommerce",
      "name": "WooCommerce",
      "reasoning": "Why this plugin is recommended",
      "priority": "high"
    }
  ]
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations outside the JSON.
`;
```

**Example: Content Generation Prompt**
```typescript
const prompt = `
Generate SEO-optimized alt text for this image.

CONTEXT:
- Page Type: ${pageType}
- Main Heading: ${heading}
- Surrounding Content: ${excerpt}
- Image Filename: ${filename}

Provide alt text that is:
- Descriptive (50-125 characters)
- SEO-friendly
- Accessible
- Natural-sounding

Respond with ONLY the alt text, no formatting or explanation.
`;
```

### Plugin Management Strategy

**Top 10 Plugins (Manual Adapters for V1):**
1. WooCommerce
2. Yoast SEO
3. Contact Form 7
4. Elementor (for users who want it)
5. WPForms
6. MonsterInsights
7. UpdraftPlus (backups)
8. Wordfence Security
9. Smush (image optimization)
10. WP Rocket (caching)

**Plugin Configuration Approach:**
```typescript
// Manual adapter for WooCommerce
class WooCommerceAdapter {
  async configure(siteId: string, options: WooCommerceOptions) {
    // Set up pages (Shop, Cart, Checkout, My Account)
    await this.createPages(siteId);
    
    // Configure currency, measurements
    await WPCLIService.run(siteId, [
      'option',
      'update',
      'woocommerce_currency',
      options.currency
    ]);
    
    // Additional settings...
  }
}
```

**AI Analysis for Other Plugins:**
```typescript
// For plugins without manual adapters
async function configurePlugin(
  siteId: string,
  pluginSlug: string,
  userRequirements: string
) {
  // Get plugin's option structure
  const options = await getPluginOptions(siteId, pluginSlug);
  
  // Ask AI to generate configuration
  const config = await claudeAPI.generatePluginConfig(
    pluginSlug,
    options,
    userRequirements
  );
  
  // Apply configuration
  await applyPluginConfig(siteId, pluginSlug, config);
}
```

---

## SECURITY & DATA HANDLING

### Sensitive Data Storage

**Figma Access Tokens:**
- Encrypted using Node.js `crypto` module
- Stored in SQLite database
- Never logged or sent to external services (except Figma API)
- User can revoke/update anytime

**Claude API Keys:**
- User provides their own API key
- Stored in Local's secure settings (if possible)
- Or user-level config file with restricted permissions

**WordPress Admin Credentials:**
- Not stored (not needed - we use WP-CLI)
- Local handles WordPress authentication

### Data Privacy

**User Data:**
- All stored locally on user's machine
- No cloud sync in v1
- SQLite database in Local's add-on directory
- User can delete anytime

**AI Processing:**
- Figma data sent to Claude API for analysis
- No data retained by Anthropic (per their policy)
- User controls what gets sent

**Logging:**
- Debug logs stored locally
- Can be disabled by user
- Automatically cleaned up (7-day retention)

---

## SUCCESS METRICS

### User Metrics (V1)
- **Time to functional site:** < 45 minutes (from "New Site" to ready for content)
- **Setup completion rate:** > 70% (users who finish setup wizard)
- **Return usage rate:** > 40% within 30 days (ongoing management)
- **Multi-site adoption:** > 30% of users manage 2+ sites

### Technical Metrics
- **AI suggestion acceptance rate:** > 60% (approved without major edits)
- **Rollback usage:** < 10% (indicates good AI quality)
- **Average Claude API cost per site:** < $2
- **Add-on load time:** < 2 seconds
- **Site creation time:** < 5 minutes (after approval)

### Business Metrics (Post-Launch)
- **User satisfaction (NPS):** > 40
- **Weekly active users:** Track growth
- **Average sites per user:** Target 3-5
- **Feature request themes:** Qualitative validation

---

## KNOWN CHALLENGES & SOLUTIONS

### Challenge 1: Local Must Be Installed
**Problem:** Users need Local to use our tool  
**Solution:**
- Target users (agencies, developers) likely already use Local
- Local is free and easy to install
- Partner with Local for co-marketing
- Position as "professional tool" not "quick and dirty"

### Challenge 2: ACF Pro Dependency
**Problem:** ACF Pro is paid ($49+/year)  
**Solution:**
- Clearly communicate requirement upfront
- Tool's value justifies the dependency
- Could explore partnership with ACF for bundled licensing
- For users without ACF Pro, fall back to limited features

### Challenge 3: Figma Access May Require Paid Plans
**Problem:** Some Figma features might need paid plans  
**Solution:**
- Read-only access (our use case) works on free plans
- Target users (agencies) likely have paid Figma plans
- Make Figma integration optional
- Tool works great without Figma for conversational setup

### Challenge 4: AI Costs Can Add Up
**Problem:** Claude API usage costs money per request  
**Solution:**
- Smart context management (cache, don't resend)
- Batch operations where possible
- Set reasonable token limits
- User provides their own API key (they control costs)
- Estimate costs upfront ("This will use ~10k tokens ≈ $0.30")

### Challenge 5: Plugin Configuration Complexity
**Problem:** Each plugin has unique settings  
**Solution:**
- Manual adapters for top 10 plugins
- AI analysis for others (with human review)
- Community contribution model (share successful configs)
- Progressive rollout (start simple, add depth)

---

## DEVELOPMENT PHASES

### Phase 0: Prototype & Validation (Week 1-2)
- [ ] Run `npx create-local-addon` and explore
- [ ] Build basic UI in Local
- [ ] Test Local API capabilities
- [ ] Prototype Figma API integration
- [ ] Prototype Claude API integration
- [ ] Validate ACF field group generation

### Phase 1: Foundation (Week 3-6)
- [ ] Core add-on structure
- [ ] SQLite database setup
- [ ] Basic site creation via Local API
- [ ] Simple setup wizard UI
- [ ] Manual custom post type creation
- [ ] Manual ACF field group creation

### Phase 2: AI Integration (Week 7-10)
- [ ] Claude API integration
- [ ] Figma data extraction
- [ ] Architecture generation prompts
- [ ] Approval/review UI
- [ ] Basic content assistance

### Phase 3: Advanced Features (Week 11-14)
- [ ] Plugin recommendations
- [ ] Theme customization
- [ ] Rollback system (all tiers)
- [ ] Multi-site dashboard
- [ ] Version history UI

### Phase 4: Polish & Testing (Week 15-16)
- [ ] User testing with target personas
- [ ] Bug fixes and refinements
- [ ] Performance optimization
- [ ] Documentation
- [ ] Demo video

### Phase 5: Launch Prep (Week 17-18)
- [ ] Submit to Local add-on marketplace
- [ ] Create landing page
- [ ] Write launch announcement
- [ ] Prepare support documentation
- [ ] Set up feedback channels

---

## OPEN QUESTIONS & DECISIONS NEEDED

### Resolved Decisions
✅ **Platform:** Local WP Add-on (desktop app)  
✅ **WordPress Provisioning:** User-provided Local installation  
✅ **Figma Auth:** Personal Access Token (v1), OAuth later  
✅ **Theme Strategy:** Frost WP + child theme  
✅ **ACF Requirement:** Require Pro, validate license  
✅ **Rollback:** Three-tier system leveraging Local's backups  
✅ **Multi-tenancy:** Local handles (isolated sites)  
✅ **Figma Integration:** Direct API (skip MCP for v1)

### Still TBD
❓ **Monetization Model:**
- Free with user's own Claude API key?
- Freemium (basic free, advanced paid)?
- One-time purchase?
- Subscription?

❓ **Distribution:**
- Local add-on marketplace only?
- Also via npm?
- Direct download from website?

❓ **Support Model:**
- Community forum?
- Email support?
- Discord server?
- Documentation wiki?

❓ **Naming:**
- Current: "AI-Assisted WordPress Site Builder"
- Need catchier product name
- Consider: Domain name availability

❓ **Beta Testing:**
- Open beta vs closed?
- How to recruit beta users?
- Feedback collection method?

---

## TECHNICAL REQUIREMENTS

### User Requirements
- **Local WP installed** (free, macOS/Windows/Linux)
- **Node.js** (bundled with Local, no separate install needed)
- **Claude API key** (user provides their own)
- **Figma account + token** (optional, for Figma integration)
- **ACF Pro license** (for full features)

### System Requirements
- **OS:** macOS 10.13+, Windows 10+, Ubuntu 18.04+
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 500MB for add-on, plus space for WordPress sites
- **Internet:** Required for API calls (Claude, Figma)

---

## REFERENCES & RESOURCES

### Documentation
- Local WP Add-on API: https://getflywheel.github.io/local-addon-api/
- Local Components: https://github.com/getflywheel/local-components
- Create Local Add-on: https://www.npmjs.com/package/create-local-addon
- Claude API: https://docs.anthropic.com/
- Figma REST API: https://www.figma.com/developers/api
- ACF Pro: https://www.advancedcustomfields.com/resources/
- Frost Theme: https://frostwp.com/

### Example Add-ons (Reference)
- Local Backup Add-on: https://github.com/getflywheel/local-addon-backups
- Local Headless Add-on: https://github.com/getflywheel/local-addon-headless
- Local Image Optimizer: https://github.com/getflywheel/local-addon-image-optimizer

### Community
- Local Community Forum: https://community.localwp.com/
- Local Add-ons Library: https://localwp.com/add-ons/

---

## APPENDIX

### Glossary

**ACF (Advanced Custom Fields):** WordPress plugin for creating custom fields without code

**CPT (Custom Post Type):** WordPress content type beyond default posts/pages

**Local WP:** Desktop application for local WordPress development

**MCP (Model Context Protocol):** Protocol for AI systems to connect to data sources

**WP-CLI:** Command-line interface for WordPress

**Taxonomy:** Classification system for organizing content (categories, tags, etc.)

### FAQ for Developers

**Q: Why Local add-on vs standalone app?**  
A: Leverages Local's infrastructure (WordPress provisioning, WP-CLI, backups). Significantly faster development.

**Q: Why not use MCP for Figma?**  
A: Direct API is simpler for v1. MCP adds complexity without clear benefit yet. May revisit in v2.

**Q: Why SQLite vs PostgreSQL/MySQL?**  
A: Desktop app, single user, simple schema. SQLite is perfect and has zero setup.

**Q: Why require user's Claude API key?**  
A: Avoids us managing API costs, billing, rate limits. User controls their spend.

**Q: Why Frost theme specifically?**  
A: Block-based, minimal, well-maintained, easy to customize. But architecture supports swapping.

**Q: Can this work without Figma?**  
A: Yes! Figma is optional. Conversational setup works great without it.

**Q: What about non-English content?**  
A: Claude API supports many languages. Internationalization not in v1 scope but feasible.

---

## DOCUMENT VERSION HISTORY

- **v1.0** (2025-11-13): Initial specification
  - Defined scope, architecture, and technical approach
  - Resolved all critical architectural decisions
  - Ready for development kickoff

---

**END OF SPECIFICATION**
