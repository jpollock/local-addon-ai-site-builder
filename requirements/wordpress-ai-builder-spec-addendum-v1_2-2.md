# WordPress AI Builder - Specification Addendum
**Version 1.2 - Living Sites & External Change Awareness**  
**Date:** November 21, 2024  
**Status:** Strategic Enhancement

---

## EXECUTIVE SUMMARY OF CHANGES

This addendum builds upon v1.1 by addressing the reality of how sites actually evolve. Key additions:

1. **Living Sites Philosophy** - Sites are never "done" and edited across multiple contexts
2. **External Change Detection** - System must detect, analyze, and understand changes made outside the tool
3. **Scaffolding Layer Clarity** - We create the structure for content entry, not the content itself
4. **Multi-Context Editing** - Users work in our tool, wp-admin, code editors, and Local itself
5. **Interface Flexibility** - Use appropriate UI patterns (conversational, direct manipulation, forms) based on task needs

---

## LIVING SITES PHILOSOPHY

### Sites Evolve Continuously

WordPress sites are living systems that change over time. Our tool must recognize and support this reality.

**Core Principle:**
Sites are never "complete" - they evolve based on business needs, user feedback, content growth, and technical improvements.

### Multi-Context Editing Reality

Users edit their sites across multiple tools and contexts:

**Within Our Tool:**
- Conversational AI assistance for exploring needs
- Direct manipulation UI for editing structures
- Forms and controls for precise configuration
- Visual builders for relationships and navigation

**In WordPress Admin:**
- Adding and editing content
- Installing plugins
- Configuring settings
- Managing users and permissions
- Creating taxonomy terms

**In Code Editors:**
- Modifying template files
- Writing custom functions
- Editing theme stylesheets
- Creating custom plugins
- Advanced customizations

**In Local WP:**
- Site configuration
- Database access
- Server settings
- Backup management

**System Requirement:**
Our tool must support editing within its interface while detecting, understanding, and respecting changes made in any other context. The WordPress site itself is the source of truth, not our representation of it.

### Always-Editable Principle

**During Scaffolding:**
- Users can revise any decision at any time
- Going back to edit earlier choices should be seamless
- No "point of no return" moments
- AI understanding builds progressively and can be corrected

**After Initial Build:**
- Any generated structure can be modified
- Changes can happen in our tool or outside it
- No lock-in to our tool's workflow
- Users choose the best context for each edit

**System Implications:**
- Never present scaffolding as "final"
- Always allow modifications to AI-generated structures
- Detect external changes and offer to help extend them
- Support iterative refinement indefinitely

### Figma Design Updates & Synchronization

**The Reality:**
When users connect a Figma file during scaffolding, that design will likely evolve. Designers iterate, add pages, modify components, and refine styles. Our tool must handle ongoing design evolution gracefully.

#### Detection and Analysis

**Update Detection Methods:**

**Manual Trigger:**
- User-initiated "Update from Figma" action
- Available in ongoing assistance interface
- Shows last sync timestamp
- On-demand re-analysis

**Periodic Checking (Optional):**
- Configurable background checking
- User controls frequency or disables
- Non-intrusive notifications when changes detected
- Respects user's workflow

**Change Analysis:**
When Figma file is re-analyzed, system detects:
- New pages or sections added
- Existing pages modified
- Component additions or changes
- Design token updates (colors, typography, spacing)
- Layout modifications
- Removed elements or pages

**Analysis Output:**
```
Figma Changes Detected:
- 3 new pages added ("About Team", "Services", "Contact")
- 2 color values updated (Primary: #2C3E50 → #34495E)
- 1 component modified (Button - added hover state)
- 1 page removed ("Old Landing")
```

#### Update Options

**1. Review Changes**
- Show detailed diff of Figma changes
- Explain WordPress implications
- "New pages would need content types or static pages"
- "Color updates would regenerate theme CSS"
- No automatic actions

**2. Selective Update**
User chooses which changes to apply:

**Design Tokens Only:**
- Update colors, typography, spacing
- Regenerate theme CSS
- Don't touch content structure or templates

**New Pages Only:**
- Analyze new Figma pages
- Propose WordPress structures for them
- Leave existing structures unchanged

**Specific Elements:**
- Update individual components
- Granular control over what syncs
- "Update header design but not footer"

**3. Full Re-sync**
- Complete re-analysis of current Figma state
- Regenerate theme from scratch
- Analyze for new content structure needs
- Propose new architecture elements
- Most comprehensive but most disruptive

**4. Disconnect/Ignore**
- Stop tracking Figma updates
- User has moved to manual workflow
- Can reconnect to same or different file later
- Preserves all generated code

#### Conflict Resolution

**Scenario 1: User Modified Generated Theme**

**Detection:**
- Our generated CSS files have been manually edited
- Compare file hashes against our metadata
- Detect modifications outside our tool

**User Notification:**
```
Your theme has custom modifications since last Figma sync.
Updating from Figma may overwrite these changes.

What would you like to do?
□ Create new child theme (preserves your custom CSS)
□ Attempt to merge changes (AI combines both)
□ Overwrite with Figma (accept new design as source of truth)
□ Review conflicts manually (show side-by-side)
□ Keep current, ignore Figma updates
```

**Merge Approach:**
- AI attempts to identify non-conflicting changes
- User custom CSS preserved where possible
- Conflicts flagged for manual resolution
- Preview before applying

**Scenario 2: New Figma Design for Existing Content**

**Detection:**
- New or modified Figma page for existing content type
- Example: Figma has new recipe detail page design, recipe post type already exists

**User Notification:**
```
Figma has updated design for recipe pages, but recipe structure already exists.

What would you like to do?
□ Update template only (keep current content structure)
□ Review if structure needs changes (AI analyzes both)
□ Keep current implementation (ignore Figma updates)
```

**Analysis:**
AI compares Figma design to existing structure:
- Does design show fields we don't have?
- Does design hide fields we do have?
- Are there layout changes requiring template updates?
- Propose specific modifications

**Scenario 3: Removed Figma Pages**

**Detection:**
- Pages that existed in previous sync are gone
- Corresponding WordPress structures exist

**User Notification:**
```
3 pages removed from Figma:
- "Old Services" page
- "Legacy About" page
- "Unused Contact" page

Your WordPress site still has corresponding structures.

What would you like to do?
□ Review for removal (AI suggests what could be deleted)
□ Keep WordPress structures (design removed, site unchanged)
□ Manual review (decide per page)
```

**Never Automatic:**
Don't delete WordPress structures automatically. User decides.

#### Interface Requirements

**Figma Connection Status:**
- Always visible indicator when Figma connected
- Shows: File name, last sync date/time
- Connection health (active, disconnected, token expired)
- Quick access to sync actions

**Update Notification:**
- Non-intrusive alert when changes detected
- "Figma design updated 2 days ago"
- Action: "Review changes" or dismiss
- Not naggy or repetitive

**Diff Visualization:**
- Side-by-side or overlay comparison
- Show what changed in Figma
- Explain WordPress implications
- Visual preview of theme changes
- Structural preview of new pages

**Selective Update Controls:**
- Checklist of available updates
- Group by type (design tokens, pages, components)
- Individual selection granularity
- "Select all" / "Select none" options
- Preview before applying

**Conflict Resolution Interface:**
- Show conflicting changes clearly
- Side-by-side code comparison when relevant
- Visual diff for design changes
- Undo/rollback option visible
- Staged application (review → approve → apply)

**Progress Indication:**
- Show what's being updated
- "Regenerating theme CSS..."
- "Creating new page structures..."
- "Analyzing conflicts..."
- Clear completion state

#### Behavioral Guidelines

**Respect User Workflow:**
- Never force updates
- Never surprise with automatic changes
- Always explain implications before updating
- User controls timing of updates

**Non-Intrusive Awareness:**
- Show Figma status without clutter
- Notify about updates, don't nag
- Easy to dismiss notifications
- Can disable automatic checking

**Transparent About Conflicts:**
- Show exactly what conflicts
- Explain implications clearly
- Provide safe options
- No hidden overwriting

**Language Examples:**

**Good (Collaborative):**
- "Your Figma design was updated. Want to sync the changes?"
- "New color scheme detected. Update your theme to match?"
- "3 new pages in Figma. Should I create WordPress structures?"
- "Your theme has custom CSS. Let's preserve it while updating from Figma."

**Bad (Pushy/Alarming):**
- "Warning: Figma out of sync"
- "Your design is outdated"
- "Automatic sync required"
- "Unauthorized theme modifications detected"

#### User Mental Model

**Key Principle:**
Figma is a **reference source**, not a rigid contract.

**Users Should Feel:**
- Free to update from Figma when helpful
- Free to ignore updates when not needed
- Safe modifying generated code and still syncing later
- Able to disconnect from Figma if workflow changes
- In control of when and how design syncs

**Not Feel:**
- Locked into Figma as single source of truth
- Afraid to modify generated code
- Pressured to sync immediately
- Punished for workflow deviations

#### Technical Implementation Notes

**State Tracking:**
- Store Figma file version/last-modified timestamp
- Hash all generated files with metadata
- Track which Figma elements map to which WordPress structures
- Maintain sync history log

**Change Detection:**
- Compare current Figma state to stored snapshot
- Use Figma API's version history if available
- Detect file modifications outside our sync process
- Flag ambiguous changes for user review

**Conflict Detection:**
- Compare generated file hashes to current files
- Identify user modifications
- Analyze structural changes (new fields, removed pages)
- Calculate merge feasibility

**Update Application:**
- Stage changes for review
- Apply in transaction-like manner
- Maintain rollback point
- Verify application success

---

## EXTERNAL CHANGE DETECTION SYSTEM

### The Core Problem

Users will make changes outside our tool. We must detect these changes, understand what they mean, and provide contextually relevant assistance.

### Detection Requirements

**What to Detect:**

**Structural Changes (Priority):**
- New custom post types
- New or modified fields (ACF or native)
- Template file changes
- Taxonomy modifications (new taxonomies or terms)
- Plugin installations/removals
- Theme changes or modifications
- Navigation menu changes
- Custom code additions

**Content Changes (Lower Priority):**
- Track at aggregate level only
- Individual post/page additions not tracked
- Exception: Patterns that reveal structural needs

### Detection Methods

**File System Monitoring:**
- Track modification times of theme files
- Monitor template additions/changes
- Detect plugin directory changes
- Hash checking for file content changes

**Database State Comparison:**
- Snapshot post type registrations
- Compare ACF field group configurations
- Track taxonomy registrations
- Monitor options table for structural settings
- Compare menu structures

**Metadata Tagging:**
- Mark all our generated code with metadata
- Anything without our tags = external change
- Version tracking for our modifications
- Clear ownership attribution

**Smart Scanning:**
- Periodic scans when user returns to tool
- On-demand analysis when user requests help
- Differential comparison between states
- Intelligent inference of change intent

### Analysis Capabilities

**Change Classification:**
- Type: Addition, modification, deletion
- Scope: Single element, multiple related elements, systemic change
- Context: Related to existing structure, entirely new area
- Impact: Breaking changes, enhancements, experiments

**Intent Inference:**
- Pattern recognition (e.g., adding e-commerce indicators)
- Relationship detection (new field related to existing type)
- Workflow understanding (staging vs production changes)
- Sophistication signals (code quality, approach patterns)

**Confidence Levels:**
- High confidence: Clear additions with obvious purpose
- Medium confidence: Modifications with inferable intent
- Low confidence: Complex changes requiring clarification
- Unknown: Ask user to explain if relevant to assistance

### User-Facing Features

#### Activity Feed (General View)

**Purpose:** Overview of all changes to the site

**Content:**
- Chronological list of detected changes
- Clear differentiation: "You added..." vs "We generated..."
- Grouped by session/time period
- Filterable by change type

**Details Shown:**
- What changed (in natural language)
- When it changed (timestamp)
- Where it changed (file, database table, wp-admin)
- Our analysis of what it means (if applicable)

**Example Entries:**
```
Nov 21, 3:42 PM - You added a new content type "Events"
Nov 21, 2:15 PM - You modified the homepage template
Nov 20, 4:30 PM - We generated the Team Members content type
Nov 19, 1:20 PM - You installed WooCommerce plugin
```

#### Contextual Alerts (In-Context View)

**Purpose:** Surface important changes where they matter

**Trigger Conditions:**
- User opens section related to changed area
- Change creates inconsistency with our generated code
- Change reveals opportunity for assistance
- Change requires user decision

**Alert Characteristics:**
- Non-intrusive but visible
- Dismissible if not relevant now
- Actionable when appropriate
- Educational when helpful

**Example Contexts:**
- Viewing content types → Alert: "You added Events content type manually. Want help setting up fields?"
- Editing navigation → Alert: "Your menu structure changed. Update related content?"
- Theme section → Alert: "Homepage template was modified. Review design consistency?"

### Recommendation System

#### General Recommendations

**Source:**
- Analysis of detected changes
- Pattern recognition across site
- Best practice comparisons
- Gap identification

**Presentation:**
- Dedicated recommendations area
- Prioritized by impact/relevance
- Dismissible or postponable
- Trackable (acted on, ignored, postponed)

**Example Recommendations:**
```
Recommendation: Add fields to Events content type
Why: Events typically need date, location, and RSVP info
Impact: Makes content entry easier and more consistent
[Set this up] [Not needed] [Maybe later]

Recommendation: Create archive page for Team Members
Why: You have 8 team members but no way to list them all
Impact: Visitors can browse your full team
[Create archive] [Not needed] [I'll do it manually]
```

#### Contextual Recommendations

**Source:**
- Specific to current user action or view
- Triggered by detected changes in related area
- Based on incomplete patterns

**Presentation:**
- Appears where it's relevant
- Inline with related UI
- Can be expanded for details
- Action buttons when applicable

**Example Contexts:**
- User manually adds field → Suggest related fields
- User adds content type → Recommend archive template
- User installs plugin → Suggest complementary setup
- User modifies template → Point out related templates

### Behavioral Guidelines

**Not Intrusive ("Clippy-like"):**
- Don't interrupt active work
- Don't explain obvious things
- Don't repeat dismissed suggestions
- Don't guess when uncertain

**Definitely Present:**
- Available when user needs help
- Proactive about important issues
- Aware of their work context
- Helpful without being pushy

**Respectful Awareness:**
- Acknowledge their changes positively
- Offer assistance, don't assume it's needed
- Treat external changes as valid choices
- Never imply they did something wrong

**Language Examples:**

**Good:**
- "I see you added an Events content type. Would you like help setting up date and location fields?"
- "Your homepage template was modified. Want me to check if the design tokens still match?"
- "You installed WooCommerce. I can help configure it for your products if you'd like."

**Bad:**
- "Warning: Detected unauthorized change to homepage!"
- "You should have used our interface to add that content type."
- "Your manual changes may cause issues."

---

## SCAFFOLDING DEPTH SPECIFICATIONS

### The Scaffolding Layer

**Conceptual Model:**
Scaffolding creates the structure layer between user content goals and WordPress backend. We're not creating content - we're creating the system for entering content.

```
User's content goals
        ↓
Our scaffolding (structure creation)
        ↓
WordPress/ACF backend (implementation)
        ↓
User adds actual content in wp-admin
```

### What Scaffolding Creates

#### Content Type Architecture

**For each content type needed:**

**Structure Definition:**
- Custom post type registration (hidden from user, using ACF/CPT UI in background)
- Exact fields required for that content type
- Field types, validations, and requirements
- Field groupings and conditional logic
- No extra fields "just in case"

**Display Templates:**
- Single content display template
- Archive/list template
- Custom template variations if needed
- All necessary template parts

**Organizational Systems:**
- Taxonomies (categories, tags, custom)
- Initial taxonomy terms where definitively needed
- Hierarchical relationships if applicable

**Example: Recipe Site**
```
Content Type: Recipe
Fields created:
- Title (default)
- Description (textarea)
- Ingredients (repeater field)
- Cooking time (number)
- Difficulty (select: easy/medium/hard)
- Servings (number)
- Instructions (WYSIWYG)
- Featured image (default)

Taxonomies:
- Recipe Categories (Breakfast, Lunch, Dinner, Desserts)
- Cuisine Types (Italian, Mexican, Asian, American)
- Dietary Tags (Vegetarian, Vegan, Gluten-Free, Dairy-Free)

Templates:
- single-recipe.php (displays one recipe)
- archive-recipe.php (lists all recipes)
- taxonomy-recipe-category.php (recipes by category)
```

#### Navigation Structure

**Menus Created:**
- Primary navigation with logical structure
- Footer navigation if applicable
- Sidebar/secondary navigation when needed
- All linked to appropriate pages/archives

**Menu Items Include:**
- Static pages (About, Contact, etc.)
- Content type archives (All Recipes, Team Members)
- Important taxonomy archives (Recipe Categories)
- External links if specified

#### Homepage Setup

**Process:**
- Ask user about homepage goals during scaffolding
- What content should be featured?
- What actions should visitors take?
- Any specific sections or layouts?

**Implementation:**
- Create homepage structure based on goals
- Set up necessary fields for homepage content
- Configure WordPress to use custom homepage
- Create template that displays it correctly

**Example Questions:**
- "What should visitors see first on your homepage?"
- "Do you want to feature recent recipes, or specific highlighted ones?"
- "Should there be a call-to-action, like 'Browse Recipes' or 'Subscribe'?"

#### Sample Content

**Purpose:**
- Demonstrate the structure
- Show what content entry looks like
- Provide visual reference
- Help user understand their admin experience

**Approach:**
- One dummy content item per content type
- Obviously placeholder (e.g., "Sample Recipe", "Example Project")
- Includes all fields with example data
- Shows correct format and structure

**Not Included:**
- Realistic content user will keep
- Multiple items they need to delete
- Actual data from their business
- Content requiring research or creativity

### Fields: Only What's Needed

**Core Principle:**
Create fields that match user's content needs exactly. Don't add "nice to have" or "might need later" fields.

**Discovery Process:**

**Through Conversation:**
```
AI: "For each recipe, what information do you need to capture?"
User: "Ingredients, cooking time, and difficulty level."
AI: "Got it. Anything else like servings, prep time, or dietary restrictions?"
User: "Oh yeah, servings would be good. The others I can add later if needed."
Result: Create only ingredients, cooking time, difficulty, and servings fields.
```

**Through Figma Analysis:**
- Extract fields visible in design
- Infer required fields from layout
- Don't assume hidden/future fields
- Ask for clarification on ambiguous areas

**Through Templates:**
- Standard field sets for common content types
- User can remove unneeded fields
- Can add more during or after scaffolding

**Validation:**
- Show proposed field structure before creating
- User can edit, add, or remove fields
- Explain what each field is for
- Iterate until it's right

### Interface Patterns for Scaffolding

**Not Only Conversational:**
Our tool uses the appropriate interface for each task.

#### Conversational AI

**Best for:**
- Initial discovery of needs
- Clarifying ambiguous requirements
- Explaining why we recommend something
- Answering questions about architecture
- Generating suggestions based on description

**Example:**
```
User: "I'm building a site for my consulting business"
AI: "What services do you offer that you'd want to highlight?"
User: "Strategy consulting and workshop facilitation"
AI: "Should each service have its own page with details like pricing and case studies?"
```

#### Direct Manipulation UI

**Best for:**
- Editing content type structures
- Reordering fields
- Organizing relationships
- Managing field groups
- Arranging navigation menus

**Example:**
Visual interface showing:
- List of fields with drag handles
- Add/remove field buttons
- Field type dropdowns
- Settings panels for each field

#### Forms and Controls

**Best for:**
- Precise input (URLs, names, labels)
- Configuration options
- Field settings and validations
- Taxonomy term creation
- Menu item details

**Example:**
Form for creating a field:
- Field label (text input)
- Field type (dropdown)
- Required? (checkbox)
- Help text (textarea)
- Conditional logic (rules builder)

#### Visual Builders

**Best for:**
- Navigation menu construction
- Content type relationships
- Template selection
- Layout configuration
- Hierarchy visualization

**Example:**
Drag-and-drop menu builder:
- Add pages, content types, custom links
- Nest items for sub-menus
- Reorder with drag handles
- Preview menu structure

#### Hybrid Approaches

**Best for:**
- Complex tasks requiring multiple inputs
- Situations benefiting from AI suggestions + manual refinement
- Teaching moments where explanation helps
- Iterative refinement

**Example:**
AI suggests field structure → User edits in visual interface → AI explains implications of changes → User approves

### Taxonomy Population

**When to Create Terms:**

**Definitely Create:**
- User explicitly requests them
- AI analyzes Figma and finds category labels
- Standard terms for common content types (e.g., blog post categories)
- Essential for site navigation

**AI Can Suggest:**
- Additional terms that might be useful
- Common terms for this site type
- Terms found in similar sites
- Organizational structures

**User Decides:**
- Which suggested terms to include
- Whether terms are hierarchical
- Initial terms vs. user-added later
- Custom term metadata

**Example: Recipe Site**
```
AI proposes:
Recipe Categories:
- Breakfast ✓ (user confirmed)
- Lunch ✓ (user confirmed)
- Dinner ✓ (user confirmed)
- Desserts ✓ (user confirmed)
- Appetizers? (AI suggested)
- Drinks? (AI suggested)

User: "Yes to Appetizers, no to Drinks for now"
Result: Create 5 category terms
```

### Revisability Throughout Scaffolding

**Always Editable:**
- Any decision made during scaffolding
- Any AI-generated structure
- Any field configuration
- Any navigation setup

**Implementation:**
- Clear "Edit" options throughout
- Easy to go back to previous steps
- Changes propagate through dependent systems
- No warnings about "losing progress"

**Progressive Understanding:**
- AI builds understanding through conversation
- User can correct misunderstandings anytime
- Earlier decisions inform later suggestions
- But earlier decisions can always be revised

**Example Flow:**
```
1. User describes recipe site
2. AI proposes structure with fields
3. User: "Actually, I don't need difficulty ratings"
4. AI removes that field, adjusts accordingly
5. Later: User: "You know what, add difficulty back"
6. AI adds it back, no problem
```

---

## STRUCTURAL VS CONTENT DISTINCTION

### What We Track: Structure

**Structural elements:**
- Content types and their fields
- Taxonomies and their configuration (not individual terms added by user)
- Template files and their logic
- Relationships between content types
- Navigation menus (structure, not content)
- Plugin installations affecting architecture
- Theme modifications affecting structure
- Custom code affecting data models

**Why we track these:**
- Affects how content is entered
- Changes what's possible in wp-admin
- May require related updates
- Reveals opportunities for assistance
- Indicates architectural evolution

### What We Don't Track: Content

**Content elements:**
- Individual posts/pages added
- Media uploads
- User-generated content
- Comments
- Content edits within existing structure
- Individual taxonomy terms created by user
- User account creation

**Why we don't track these:**
- Not architectural concerns
- User's domain, not ours
- High frequency, low signal
- Privacy considerations
- Performance considerations

### The Exception: Content Patterns

**When content reveals structural needs:**

**Pattern Detection:**
- User manually adds same information repeatedly in content
- Inconsistent data entry across similar posts
- Workarounds that suggest missing fields
- Content stored in wrong places

**Example Scenarios:**

**Scenario 1: Missing Fields**
```
Detection: User adding "Location: San Francisco" to beginning of every event post
Analysis: They need a location field
Recommendation: "I notice you're adding location info manually. Want me to create a location field so it's structured data?"
```

**Scenario 2: Wrong Structure**
```
Detection: User creating blog posts for team members instead of using Team Members content type
Analysis: They might not realize custom content type exists, or it doesn't meet needs
Recommendation: "I see you're adding team members as blog posts. Want to use the Team Members section instead, or does it need different fields?"
```

**Scenario 3: Manual Relationships**
```
Detection: User manually linking related content in post content instead of using relationship fields
Analysis: They need easier relationship management
Recommendation: "Want me to set up automatic related content so you don't have to link things manually?"
```

---

## INTERFACE PATTERN SELECTION

### Principle: Use the Right Tool for the Job

Our tool is not "conversational AI with a UI wrapper." It's a comprehensive site building assistant that uses appropriate interface patterns for each task.

### Pattern Selection Criteria

**Use Conversational AI when:**
- Exploring ambiguous requirements
- Gathering context and understanding
- Explaining complex concepts
- Providing personalized recommendations
- Answering open-ended questions
- Clarifying user intent
- Teaching WordPress concepts naturally

**Use Direct Manipulation when:**
- Clear visual feedback is important
- Spatial relationships matter
- Drag-and-drop makes sense
- Immediate response to actions needed
- User wants to "feel" the structure
- Examples: Menu building, field ordering, template selection

**Use Forms/Controls when:**
- Precise input is required
- Validation is important
- Standard input types work well
- Batch operations helpful
- Technical configuration needed
- Examples: Field settings, URLs, validation rules

**Use Visual Builders when:**
- Relationships between elements matter
- Hierarchy needs to be clear
- Preview is valuable
- Complex structure with many parts
- Examples: Site architecture view, content relationships

**Use Hybrid Approaches when:**
- Task benefits from AI + manual control
- Explanation adds value during manipulation
- Suggestions should be refinable
- Teaching moments embedded in workflow
- Examples: AI proposes structure, user refines visually

### Examples by Task

**Task: Create Content Type**
- Start: Conversational AI to understand needs
- Propose: Show structured view of proposed content type
- Refine: Direct manipulation to add/remove/reorder fields
- Configure: Forms for field settings and validations
- Explain: AI explains implications of choices
- Approve: Visual review of complete structure

**Task: Build Navigation**
- Start: AI suggests menu based on site structure
- Build: Visual drag-and-drop menu builder
- Configure: Forms for menu item URLs and labels
- Preview: Live preview of menu
- Iterate: Easy to modify and see changes

**Task: Set Up Content Relationships**
- Start: AI explains available content types
- Visualize: Show content types and potential relationships
- Connect: Visual interface to create relationships
- Configure: Forms for relationship settings (one-to-many, etc.)
- Explain: AI clarifies what each relationship means

**Task: Configure Field**
- Edit: Form with all field options
- Preview: Shows how field appears in wp-admin
- Validation: AI suggests appropriate validations
- Help: Contextual help text explains each option

---

## IMPLEMENTATION PRIORITIES (UPDATED)

### Phase 1: Core Intelligence & Structure
1. Figma parser for all design fidelity levels
2. Build vs. plugin decision engine
3. Code generation for WordPress structures
4. Field structure definition system
5. Template generation engine

### Phase 2: Change Detection Foundation
1. File system monitoring setup
2. Database state comparison
3. Metadata tagging system
4. Basic diff detection
5. Change classification logic

### Phase 3: Interface & Scaffolding
1. Multi-pattern interface framework (conversational + direct manipulation + forms)
2. Content type builder UI
3. Field configuration interfaces
4. Navigation menu builder
5. Homepage setup flow

### Phase 4: Figma Integration & Updates
1. Figma connection and initial sync
2. Figma change detection (diff analysis)
3. Selective update interface
4. Conflict resolution system
5. Design token extraction and regeneration

### Phase 5: Intelligent Awareness
1. Change analysis engine
2. Intent inference logic
3. Activity feed implementation
4. Contextual alert system
5. Recommendation engine

### Phase 6: Refinement & Learning
1. Pattern recognition improvements
2. Recommendation quality enhancement
3. User behavior adaptation
4. Multi-site learning (if applicable)

---

## SUCCESS METRICS (UPDATED)

### Scaffolding Success
- **Time to functional site:** < 15 minutes from start
- **Field accuracy:** > 90% (users don't need to modify our generated fields)
- **Revision rate during scaffolding:** < 20% (we got it right first time usually)
- **User confidence at approval:** Self-reported high confidence before building

### Change Detection Success
- **Detection accuracy:** > 95% (we catch structural changes reliably)
- **False positive rate:** < 5% (we don't flag irrelevant changes)
- **Intent inference accuracy:** > 70% (we understand why they made changes)
- **Recommendation acceptance:** > 40% (our suggestions are actually helpful)

### Figma Sync Success
- **Update detection accuracy:** > 95% (we catch Figma changes reliably)
- **Selective update usage:** > 60% (users prefer granular control over full re-sync)
- **Conflict resolution satisfaction:** > 80% (users feel conflicts handled well)
- **Sync abandonment rate:** < 10% (users don't disconnect due to sync frustration)
- **Theme preservation accuracy:** 100% (never lose user modifications unexpectedly)

### Multi-Context Success
- **Tool stickiness:** Users return to tool after external editing
- **External edit rate:** Track healthy balance of in-tool vs external work
- **Cross-context coherence:** Changes in one context don't break others
- **User confidence editing outside tool:** No fear of breaking AI's understanding

### Interface Pattern Success
- **Task completion time:** Faster with right interface pattern
- **Error rate:** Lower when using appropriate controls
- **User preference:** Track which patterns users prefer for which tasks
- **Learning curve:** New users understand multi-pattern approach quickly

---

## OPEN QUESTIONS & FUTURE CONSIDERATIONS

### Technical Challenges

**Change Detection Timing:**
- How often to scan for changes?
- Real-time monitoring vs periodic checks?
- Performance impact of constant monitoring?

**Change Conflict Resolution:**
- What if their changes conflict with our generated code?
- How to merge their modifications with our updates?
- Version control strategy?

**Cross-Context State Management:**
- How to maintain single source of truth?
- When to refresh our view of site state?
- Handling concurrent edits (them in code, us in tool simultaneously)?

**Figma Sync Challenges:**
- How to handle Figma file permissions changes?
- What if Figma file is deleted or moved?
- How to track design intent vs implementation details?
- Performance with very large Figma files?
- Handling Figma rate limits?

### UX Considerations

**Notification Fatigue:**
- How many alerts is too many?
- When to batch recommendations vs show immediately?
- User control over notification preferences?

**Complexity Scaling:**
- As sites grow more complex, how does UI scale?
- When does direct manipulation become overwhelming?
- Progressive disclosure strategies?

**Trust Building:**
- How to build trust in change detection accuracy?
- Transparency about what we can/can't detect?
- User education about our capabilities?

**Figma Sync UX:**
- How often to check for Figma updates?
- When to notify vs silently detect?
- How to visualize design diffs clearly?
- Balance between automation and control?

---

## CONCLUSION

Version 1.2 establishes the foundation for a tool that truly understands the living nature of WordPress sites. Key principles:

1. **Sites evolve continuously** - Never "done," always changing
2. **Multiple editing contexts** - Users work in our tool, wp-admin, code editors, Local
3. **Structural awareness** - Detect and understand architectural changes
4. **Appropriate interfaces** - Use the right UI pattern for each task
5. **Scaffolding creates structure** - Not content, but the system for entering content
6. **Always editable** - Nothing is locked, everything can be revised
7. **Figma as reference** - Design can evolve, users control when/how to sync

This positions us as an intelligent assistant that works with users across their entire workflow, not a wizard that sets up a site once and disappears. We support continuous evolution, respect multi-context editing, and handle design updates gracefully.

---

**END OF ADDENDUM v1.2**

*This document supplements but does not replace the original specification or v1.1 addendum. Where conflicts exist, this addendum (v1.2) takes precedence.*
