# Figma Make Prompt - WordPress AI Builder Add-on
**Version 2.0 - Living Sites & Multi-Context Editing**

---

## PROJECT OVERVIEW

Design the interface for a Local WP desktop add-on that transforms WordPress site creation through AI-powered intelligence. This is a professional tool serving three distinct user types: non-technical users, developers, and agencies.

---

## CORE PHILOSOPHY

**Make advanced WordPress development accessible without hiding power.**

The tool assists users across their entire site lifecycle - from initial scaffolding through ongoing evolution. Sites are living systems that users edit in multiple contexts: our tool, wp-admin, code editors, and Local itself. We create the structure for content entry, not the content itself.

---

## FUNDAMENTAL PRINCIPLES

### 1. Progressive Disclosure Over Simplification
Make advanced features accessible through secondary actions. Don't hide complexity - make it approachable when needed. Interface adapts based on detected user behavior.

### 2. Intelligence as Assistant, Not Replacement
AI proposes, human decides. Never execute major changes without explicit approval. Show reasoning, not just conclusions. Users maintain control and understanding.

### 3. Right Interface for the Task
Use appropriate UI patterns based on task needs:
- **Conversational AI** for exploring needs and explaining concepts
- **Direct manipulation** when spatial relationships or structure matter
- **Forms and controls** for precise input and validation
- **Visual builders** for hierarchy and relationships
- **Hybrid approaches** when AI suggestions benefit from manual refinement

### 4. Transparent Over Magical
Show what's happening. Explain AI recommendations. Make the system learnable. "Magic" without understanding breeds distrust.

### 5. Living Sites, Multi-Context Editing
Sites evolve continuously and users edit across multiple contexts. Detect and understand changes made outside our tool. WordPress site is source of truth. Everything remains editable - both in our tool and outside it.

---

## THE TWO PHASES

### Phase 1: Scaffolding (Initial Site Creation)

**Purpose:** Create the architecture - the structure for content entry

**Not:** Creating actual site content or final designs

#### Absolute Minimum Requirements

To create a functional WordPress site, we need:
1. **Site name and URL** (Local handles WordPress installation)
2. **At least one way to add content** (even if just default posts/pages)

**That's it.** Everything else is optional and can be added later.

#### Complete Scaffolding Flow

**Step 1: Site Creation Decision**
- User chooses: "Create new site" or "Connect existing site"

**Step 2: Initial Discovery (If New Site)**

**Entry point variations:**
- "I have a Figma design" → Connect Figma, AI analyzes
- "Describe my project" → Conversational discovery
- "Quick setup for [site type]" → Template starting point
- "Browse examples" → See sample sites, adapt one
- "Improve existing site" → Connect to Local site, audit

**Conversational discovery approach:**
- AI asks: "What are you building?"
- Follow-up questions (max 3-5, user can skip any)
- User can say "I'll decide later" at any point
- AI builds understanding progressively

**Step 3: Design Source (Optional)**
- "Do you have a design?"
  - Connect Figma (token + URL) → AI analyzes fidelity level
  - Upload images → AI extracts visual ideas
  - Skip → Use minimal default styling

**AI handles different design fidelities:**
- Wireframes only → Extract structure, minimal theme
- High-fidelity → Complete visual system, generate full theme
- Component library → Design system only, ask about structure
- Multiple files → Let user specify which for what

**Step 4: Architecture Proposal**

AI proposes complete structure based on understanding:

**CORE (Always included):**
- Site name, basic configuration
- WordPress installation details

**SCAFFOLD (Suggested, can edit/remove/skip):**
- Content types with specific fields needed
- Taxonomies with initial terms (if definitively needed)
- Relationships between content types
- Navigation menus
- Homepage structure

**THEME (Suggested approach):**
- Generate from Figma design (if provided)
- Use minimal default styling (if no design)
- Use specific theme (if user requests)
- Skip for now (user handles separately)

**FEATURES (Suggested, can edit/remove/skip):**
- Recommended plugins based on needs
- Build vs plugin decisions explained
- Configuration requirements

**Step 5: Review and Refinement**

User sees complete proposal with:
- What will be created and why
- Ability to edit any element
- Add/remove fields, content types, features
- Change taxonomy terms
- Modify navigation structure
- Adjust theme approach

**Interface needs:**
- Visual structure overview
- Granular edit controls for each element
- AI explains implications of changes
- Can iterate until it's right

**Key scenarios to handle:**
- User removes suggested fields: "Actually, I don't need difficulty ratings"
- User adds fields: "Can you add a field for prep time?"
- User changes approach: "Use WooCommerce instead of building it"
- User defers decisions: "I'll add categories later"

**Step 6: Approval**

Show complete picture:
- Everything that will be created
- Estimated time (30 seconds to 3 minutes)
- Clear explanation of each change
- Rollback option visible upfront

Actions: [Create Site] [Edit First] [Start Over]

**Step 7: Building**

Progress indicators show:
- "Creating WordPress site..."
- "Setting up [content type]..."
- "Creating fields..."
- "Installing plugins..."
- "Generating theme..."
- "Setting up navigation..."

Takes 30 seconds to 3 minutes depending on complexity.

**Step 8: Site Ready**

Result: Functional WordPress site with:
- Basic WordPress installation ✓
- Proposed content types (if approved) ✓
- Fields configured (if approved) ✓
- Navigation set up (if approved) ✓
- Theme applied (if approved) ✓
- Plugins installed (if approved) ✓
- One placeholder content item per type ✓

User sees:
- "Your site is ready to develop!"
- [Open in browser] [Open wp-admin] [Continue in tool]

**What user can now do:**
- Add actual content in wp-admin (structure is ready)
- Edit code in their editor (files are there)
- Modify in Local (site exists)
- Return to our tool for more changes

#### What We Actually Build

**Content Type Example: Recipe Site**

For each content type:
- Custom post type registration (ACF/CPT UI in background, hidden from user)
- Exact fields needed:
  - Title (default)
  - Description (textarea)
  - Ingredients (repeater)
  - Cooking time (number)
  - Difficulty (select: easy/medium/hard)
  - Servings (number)
  - Instructions (WYSIWYG)
  - Featured image (default)

Templates created:
- single-recipe.php (displays one recipe)
- archive-recipe.php (lists all recipes)
- taxonomy-recipe-category.php (recipes by category)

Taxonomies created:
- Recipe Categories: Breakfast, Lunch, Dinner, Desserts
- Cuisine Types: Italian, Mexican, Asian, American
- Dietary Tags: Vegetarian, Vegan, Gluten-Free

Navigation menu:
- Home
- All Recipes (→ archive)
- Recipe Categories (→ submenu: Breakfast, Lunch, etc.)
- About
- Contact

Homepage:
- Based on user's stated goals during discovery
- Fields for whatever content they described
- Template that displays it correctly

Sample content:
- One "Sample Recipe" with all fields filled with obvious placeholder data
- Shows what content entry will look like in wp-admin

**Theme approach:**
- By default: Generate from Figma design OR minimal clean styling
- Unless user explicitly says: "Use [specific theme]" or "I'll handle theme"
- Base: Frost WP (block-based)
- Our additions: Child theme with generated CSS, templates, customizations

**What We Create:**
All the structure and templates. Zero actual content (except one placeholder per type).

**What User Creates:**
All the real content, in wp-admin, using the structure we built.

#### Revisability Throughout

**Critical:** User can go back and change ANY decision at ANY time during scaffolding.

Examples:
- Change field configuration: "Remove difficulty field" → "Actually add it back"
- Modify content types: "I need an Events section too"
- Adjust navigation: "Move Recipes to main menu"
- Change theme approach: "Generate theme from my design instead"

No warnings about "losing progress." Changes propagate naturally.

**Always Editable:**
Every decision during scaffolding can be revised. No "point of no return." Sites evolve, and even correct decisions today may change tomorrow.

### Phase 2: Ongoing Assistance (Post-Scaffolding)

**Purpose:** Continuous support as site evolves

**Activities:**
- Adding new content types
- Modifying existing structures
- Installing and configuring plugins
- Theme modifications
- Detecting and understanding external changes
- Providing contextual recommendations
- **Handling Figma design updates**

**Multi-Context Reality:**
Users work in our tool, wp-admin, code editors, and Local. We detect external changes, analyze intent, and offer assistance across all contexts.

#### Figma Design Updates

**The Reality:**
If user connected a Figma file during scaffolding, that design will likely evolve. Designers iterate, add pages, modify components, refine styles.

**What Happens When Figma Updates:**

**Detection:**
- User can trigger manual re-sync: "Update from Figma"
- System can periodically check for changes (if enabled)
- Show last sync date/time

**Analysis:**
AI compares current Figma state to what was previously extracted:
- New pages or sections added
- Components modified or added
- Design tokens changed (colors, typography, spacing)
- Layout changes
- Removed elements

**User Notification:**
"Your Figma design has updates. What would you like to do?"

**Options Presented:**

1. **Review Changes**
   - Show what changed in Figma
   - Explain implications for WordPress site
   - "3 new pages added, 2 color values updated, 1 component modified"

2. **Selective Update**
   - User chooses what to update
   - "Update colors and typography" → regenerate theme CSS
   - "Add new pages" → create corresponding WordPress structures
   - "Ignore component changes" → don't modify existing

3. **Full Re-sync**
   - Regenerate theme completely from current Figma
   - Analyze for new content structure needs
   - Propose new architecture elements

4. **Disconnect/Ignore**
   - Stop tracking Figma updates
   - "I'm doing this manually now"
   - Can reconnect later

**Conflict Handling:**

**Scenario: User modified generated theme, then Figma updates**
- Detect: Our generated CSS has been manually modified
- Alert: "Your theme has custom changes. Updating from Figma may overwrite them."
- Options:
  - Create new child theme (preserve custom changes)
  - Merge changes (attempt to combine)
  - Overwrite (accept Figma as new source of truth)
  - Manual review (show conflicts, user decides each)

**Scenario: New Figma pages but content structure already exists**
- Detect: New design for existing content type
- Alert: "Figma has new recipe page design, but recipe structure already exists."
- Options:
  - Update template only (keep structure)
  - Review if structure needs changes
  - Keep current implementation

**Interface Needs:**
- Figma connection status indicator
- Last sync timestamp
- "Update from Figma" action button
- Diff view showing Figma changes
- Conflict resolution interface
- Preview of what would change in WordPress
- Selective update controls

**Language Examples:**

**Good:**
- "Your Figma design was updated 2 days ago. Want to sync the changes?"
- "New color scheme detected in Figma. Update your theme to match?"
- "3 new pages in Figma. Should I create WordPress structures for them?"

**Bad:**
- "Warning: Figma out of sync"
- "Your design is outdated"
- "Automatic sync required"

**User Mental Model:**
Figma is a reference, not a rigid contract. Users should feel they can:
- Update from Figma when helpful
- Ignore updates when not needed
- Modify generated code and still sync Figma later
- Disconnect from Figma if workflow changes

---

## EXTERNAL CHANGE AWARENESS

### Detection and Analysis

**System Requirements:**
- Detect structural changes made outside our tool
- Analyze what changed and attempt to understand intent
- Differentiate AI-generated from user-made changes
- Surface changes through both activity feed and contextual alerts

### Activity Feed Pattern

**General Overview Interface:**
- Chronological list of all site changes
- Clear attribution: "You added..." vs "We generated..."
- Filterable by change type and time period
- Grouped by session where sensible
- Non-judgmental language about external changes

### Contextual Alerts Pattern

**In-Context Awareness:**
- Appear where relevant to current work
- Triggered by changes in related area
- Non-intrusive but visible
- Dismissible if not immediately relevant
- Actionable when assistance would help

**Example:** User opens content types section → Alert: "You added Events content type. Want help setting up date and location fields?"

### Recommendation System

**General Recommendations:**
- Dedicated area for improvement suggestions
- Based on detected patterns and gaps
- Prioritized by impact and relevance
- User can act on, dismiss, or postpone

**Contextual Recommendations:**
- Inline with related UI elements
- Suggest complementary actions
- Context-appropriate controls
- Expandable for details

**Language Approach:**
- Collaborative, not judgmental
- Acknowledge external changes positively
- Offer help without assuming it's needed
- Never say "warning" or "unauthorized"

---

## THREE USER TYPES

### Non-Technical Users
**Mental Model:** "I need help but want to understand what's happening"
- Value clear explanations without jargon
- Fear making irreversible mistakes
- Need confidence they won't break anything
- Appreciate guidance without condescension

**Interface Response:**
- Natural language descriptions
- Context and reasoning provided naturally
- Clear approval steps
- Rollback as safety net

### Developers
**Mental Model:** "I know what I want, make it faster"
- Value speed and efficiency
- Want shortcuts to bypass explanations
- Need technical accuracy and control
- Fear tool making assumptions to undo

**Interface Response:**
- Fast paths for common tasks
- Technical details on demand
- Ability to directly edit generated code
- Get out of their way when they're confident

### Agencies
**Mental Model:** "Client-quality output, agency-speed execution"
- Value professional polish
- Need design-to-implementation workflow
- Manage multiple projects
- Fear generic templated output

**Interface Response:**
- Respect design decisions from Figma
- Support sophisticated content structures
- Enable brand consistency
- Streamline repetitive configuration

**Critical:** Interface adapts based on detected behavior (passively), revealing appropriate depth for each user type. One interface serves all three.

---

## THE THREE PILLARS ARCHITECTURE

Sites are built around three parallel workstreams that can progress independently:

### Pillar 1: Content Structure
- Post types, taxonomies, fields, relationships
- Sources: Figma, conversation, templates, manual input
- Can be built independently of other pillars

### Pillar 2: Design & Theme
- Visual appearance, layouts, styling
- Sources: Figma designs, theme selection, our defaults
- Can be minimal (defaults) or complete (full implementation)

### Pillar 3: Features & Plugins
- Functionality beyond content display
- Sources: Inferred from content, explicit requests, patterns
- Can be empty (no plugins) to complex (e-commerce stack)

**State Management:**
Each pillar has states, but we DON'T track "completion" - sites are never "done." Focus on what's been built and what can be built next, not completion percentages.

---

## SCAFFOLDING INTERFACE CHALLENGES

**Key Problems to Solve:**

### 1. Entry Point Selection
How do users choose their starting path without feeling overwhelmed?
- Multiple entry points (Figma, describe, template, examples, existing)
- Clear but not prescriptive
- Easy to switch between approaches if they change their mind

### 2. Conversational Discovery
How to gather requirements through conversation without endless questions?
- Balance between gathering info and moving forward
- User can skip questions or say "decide later"
- Show what AI understands so far
- Max 3-5 questions unless user asks for more

### 3. Design Connection (Figma)
If user has design, how to connect and analyze?
- Figma token + URL input
- Clear explanation of what will be extracted
- Security/privacy messaging
- Handling different design fidelities (wireframes vs high-fidelity)
- What if Figma connection fails?

### 4. Architecture Proposal Visualization
How to show complete proposed structure before building?
- Overview of entire proposal
- Core (always) vs Scaffold (suggested) vs optional elements
- Ability to see details of each element
- Make it scannable but comprehensive
- Show reasoning for each suggestion

### 5. Content Type Builder Interface
Creating and editing content types with fields:
- List of content types to be created
- Fields for each type (name, type, requirements)
- Visual field ordering and organization
- Add/remove fields easily
- Field configuration (types, validations, help text)
- Preview what it looks like in wp-admin

### 6. Field Configuration
Precise settings for each field:
- Field label and name
- Field type selection (text, number, repeater, etc.)
- Required/optional toggle
- Help text for content editors
- Conditional logic (show field if X)
- Validation rules

### 7. Taxonomy and Terms Setup
Creating categories, tags, and custom taxonomies:
- Taxonomy creation (name, hierarchical?)
- Initial terms to create
- AI can suggest additional terms
- User approves/denies/adds more
- Show how terms organize content

### 8. Relationship Visualization
Showing how content types relate:
- Visual map of content types
- Lines/connections showing relationships
- One-to-many, many-to-many clarity
- Edit relationships easily
- Example: "Projects have Team Members"

### 9. Navigation Builder
Setting up menus:
- Visual drag-drop menu builder
- Add pages, content types, custom links
- Nest items for sub-menus
- Reorder easily
- Multiple menu locations (primary, footer)

### 10. Homepage Setup
Configuring the homepage:
- Ask about homepage goals during discovery
- What should visitors see first?
- Featured content or specific layout?
- Fields needed for homepage content
- Template selection/generation

### 11. Theme Approach Decision
How we'll handle styling:
- Default: Generate from Figma OR minimal styling
- Override: "Use specific theme" or "I'll handle it"
- Show what will be generated
- Design token extraction preview (if Figma)

### 12. Review and Edit Interface
Seeing complete proposal with ability to modify:
- Tabbed or sectioned view of proposal
- CORE / SCAFFOLD / THEME / FEATURES sections
- Edit individual elements inline
- Show implications of changes
- Iterate without restarting

### 13. Granular Approval Controls
Not just "approve all" - selective approval:
- Approve entire proposal
- Edit specific elements before approving
- Remove elements from proposal
- Defer elements ("I'll add this later")
- Clear what happens if they skip elements

### 14. Progress During Building
30 seconds to 3 minutes of building - keep engaged:
- What's being created right now
- Progress indicator (not just spinner)
- Estimated time remaining
- Can't interrupt but can see what's happening

### 15. Site Ready State
Handoff to actual development:
- Clear "site is ready" moment
- Quick actions: open browser, wp-admin, continue in tool
- Explanation of what they can do now
- Where to add content (wp-admin)
- How to return for more changes

### 16. Revisability Throughout
Going back to modify decisions:
- Edit buttons throughout proposal review
- No "are you sure?" warnings
- Changes propagate to dependent elements
- AI explains new implications
- Can iterate indefinitely before building

### 17. Multi-Pattern Coordination
Moving between conversational, visual, and form interfaces:
- Start with conversation
- Switch to visual builder for structure
- Forms for precise configuration
- AI explains throughout
- Feels cohesive, not jarring transitions

---

## ONGOING ASSISTANCE INTERFACE CHALLENGES

**Key Problems to Solve:**

1. **Change visibility:** How to surface detected external changes in both overview and contextual ways

2. **Recommendation delivery:** Balancing general improvement suggestions with contextual inline recommendations

3. **Attribution clarity:** Making clear what we generated vs what user created

4. **Modification access:** Easy access to edit any AI-generated structure

5. **Cross-context coherence:** Maintaining understanding when users work in multiple tools

6. **Non-intrusive awareness:** Being helpful without being "Clippy-like"

7. **Activity timeline:** Showing history of changes (ours and theirs) in understandable way

8. **Figma sync status:** How to show connection state and last sync time without clutter

9. **Figma update detection:** Notifying about design changes without being naggy

10. **Figma diff visualization:** Showing what changed in Figma in understandable way

11. **Selective Figma updates:** Letting users choose which Figma changes to apply

12. **Conflict resolution:** Handling cases where user modified our code and Figma updated

13. **Figma disconnect flow:** Easy way to stop tracking Figma if workflow changes

---

## CRITICAL EMOTIONAL MOMENTS

### First AI Proposal (Hope + Skepticism)
"Did it understand what I need?"
**Design Need:** Show understanding through accurate structure proposal with clear reasoning

### Approval Decision (Anxiety)
"Is this the right choice?"
**Design Need:** Provide confidence through explanation, safety nets, and editability

### Watching Execution (Anticipation)
**Design Need:** Show progress, maintain engagement, make time feel short

### First View of Result (Validation)
"This is what I wanted"
**Design Need:** Match expectations set during proposal

### Detecting External Change (Curiosity)
"It noticed what I did"
**Design Need:** Acknowledge changes positively, offer relevant help

### Making Modifications (Confidence)
"I can improve this"
**Design Need:** Make iteration feel safe, natural, and productive

### Figma Design Updates (Control + Caution)
"My design changed - what happens now?"
**Design Need:** 
- Show exactly what changed in Figma
- Give control over what updates
- Handle conflicts transparently
- Make it feel collaborative, not automatic
- User decides if/when/how to sync

---

## LANGUAGE GUIDELINES

**Use Natural Language:**
- Describe in terms of goals, not technical implementation
- "Set up a section for recipes with fields for ingredients" not "Create CPT with ACF field groups"
- "Create categories to organize products" not "Register taxonomy"

**Acceptable Terms:**
- "Content types" (for custom post types)
- "Categories" and "tags" (already natural)
- "Fields" (for custom fields)
- Basic organizational concepts

**Avoid Technical Jargon:**
- Custom post types / CPT
- Advanced Custom Fields / ACF
- Taxonomy (as technical term)
- Database terminology
- WordPress-specific internals

**Adaptive Approach:**
- Start with natural language
- Mirror user's sophistication if they use technical terms
- Never ask "Are you technical?" - adapt based on behavior

---

## INTERACTION PATTERNS TO DESIGN FOR

### Conversational AI Patterns
- Initial needs discovery
- Clarifying questions (max 3-5)
- Explaining recommendations
- Answering questions about structure
- Teaching WordPress concepts naturally

### Direct Manipulation Patterns
- Field ordering and organization
- Navigation menu building
- Content type relationship mapping
- Structure visualization and editing

### Form and Control Patterns
- Field configuration settings
- Precise input for URLs, names, labels
- Validation rules
- Taxonomy term creation

### Visual Builder Patterns
- Site architecture overview
- Content relationship diagrams
- Menu hierarchy construction
- Template selection and assignment

### Hybrid Patterns
- AI proposes structure → Visual refinement
- Conversational setup → Direct manipulation editing
- Form configuration → AI validation suggestions

---

## APPROVAL AND REVIEW

**What Requires Approval:**
- Any structural changes
- Plugin installations
- Major configuration
- Theme modifications

**Approval Interface Must:**
- Show complete picture of changes
- Explain reasoning for each change
- Allow granular editing (approve some, modify others, reject others)
- Make rollback option visible upfront
- Show estimated execution time

**Always Editable:**
Both during approval and after building. Users can modify any decision at any time.

---

## INFORMATION ARCHITECTURE

### Priority 1: Immediate Impact
What's about to happen, why it's recommended, what needs deciding now

### Priority 2: Context & Understanding
How this fits the bigger picture, why this approach, what's customizable

### Priority 3: Technical Details
Under-the-hood mechanics, configuration options, specifications

**Design Implication:** Layer information with progressive disclosure. Don't dump everything upfront.

---

## ANTI-PATTERNS TO AVOID

1. **The Endless Wizard:** Form after form, users lose context
2. **The Unexplained Magic:** AI does things, no explanation
3. **The Overeager Assistant:** Makes unwanted changes, users undo everything
4. **The Technical Manual:** All complexity upfront, overwhelms non-technical
5. **The Condescending Guide:** Treats users like children
6. **The Templated Output:** Everything looks the same, no customization
7. **The Surveillance System:** Creepy monitoring feel
8. **The Lock-In:** Can only work through our tool
9. **Completion Tracking:** False sense of "done" when sites evolve continuously

---

## COMPONENT NEEDS

### Conversational Elements
- AI message display with reasoning
- User input areas
- Typing/processing indicators
- Question prompts with context

### Structural Editing
- Content type builders
- Field configuration interfaces
- Relationship mappers
- Template assignment

### Navigation
- Menu builders (visual drag-drop)
- Link configuration
- Hierarchy visualization

### Change Awareness
- Activity feed/timeline
- Contextual alert components
- Recommendation cards (general and contextual)
- Attribution labels (AI-generated vs user-made)
- **Figma sync status indicator**
- **Figma update notifications**
- **Design diff visualization**
- **Conflict resolution interface**

### Progress and Status
- Building progress indicators
- Site status displays
- Success confirmations
- Error recovery paths

### Approval and Review
- Side-by-side comparisons
- Diff visualization
- Granular approval controls
- Impact explanations

---

## KEY DESIGN QUESTIONS TO EXPLORE

1. How do users move between conversational AI and direct manipulation without friction?

2. How does activity feed balance comprehensiveness with digestibility?

3. What makes contextual alerts helpful vs intrusive?

4. How do we visualize AI-generated vs user-made changes clearly?

5. How does scaffolding interface balance gathering requirements with not overwhelming?

6. What makes recommendations feel collaborative vs pushy?

7. How do we show site architecture (content types, relationships, navigation) comprehensibly?

8. What patterns help users understand their site evolves across multiple editing contexts?

9. How do we show Figma sync status without adding clutter?

10. What makes Figma update notifications helpful vs annoying?

11. How do we visualize design changes in Figma in a way that shows WordPress implications?

12. What makes conflict resolution (user code changes vs Figma updates) feel collaborative vs frustrating?

---

## CONTEXT AND CONSTRAINTS

**Platform:** Desktop application (Local WP add-on)
**Users Work In:** Our tool, WordPress admin, code editors, Local itself
**Technical Backend:** ACF Pro, custom post types, WordPress templates (hidden from user)
**Site Types:** Blogs, portfolios, business sites, e-commerce, directories, memberships
**Integration:** Figma design import (optional entry point)

**Not Mobile:** Desktop-first experience
**Not Web-based:** Native desktop application feel
**Not Replacement:** Enhancement to existing WordPress/Local workflow

---

## SUCCESS CRITERIA

**User Can:**
- Create sophisticated site architecture without technical knowledge
- Understand what the system is doing and why
- Edit any decision at any time
- Work confidently across multiple contexts (our tool, wp-admin, code)
- Trust that external changes are detected and understood
- Get relevant help when needed without intrusion
- Build professional-quality sites quickly

**System Demonstrates:**
- Clear AI reasoning
- Appropriate interface patterns for each task
- Awareness of external changes
- Respectful, collaborative assistance
- No lock-in to our workflow
- Professional quality throughout

---

## FINAL NOTES

**This is a professional tool** for building real WordPress sites. Users include agencies billing $50k+ for sites. Quality, flexibility, and respect for professional workflows are essential.

**Sites are living systems.** They're never "complete." The tool supports continuous evolution across multiple editing contexts.

**The scaffolding creates structure,** not content. We're building the system for content entry, making wp-admin naturally intuitive for their specific needs.

**AI is assistant,** not autonomous. Users maintain control. External changes are valid. We're helpful, not gatekeeping.

Design interfaces that embody these principles.
