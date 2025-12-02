# UX Philosophy & Product Requirements
**AI-Assisted WordPress Site Builder**  
**For Design AI Collaboration**

---

## PRODUCT MISSION

Make advanced WordPress development accessible without sacrificing control or requiring a computer science degree. Enable agencies building $50k websites to move at the speed of generic template generators, while maintaining the sophistication their clients pay for.

---

## CORE UX PHILOSOPHY

### The Central Tension

**The Problem We're Solving:**
WordPress is powerful but complex. Current solutions fall into two camps:
1. **Simple but limiting** (template generators, AI "build me a site" tools)
2. **Powerful but overwhelming** (raw WordPress, requiring technical expertise)

**Our Solution:**
A third path that **makes the advanced simple**. We don't hide power - we make it approachable.

### Design Principles

#### 1. Progressive Disclosure Over Simplification
- **Don't hide complexity** - make it accessible when needed
- Advanced features available through **secondary actions**, not hidden entirely
- Interface should **adapt** based on user behavior, revealing depth as needed
- Users shouldn't need to know everything exists, but when they look for it, it should be findable

#### 2. Intelligence as Assistant, Not Replacement
- AI proposes, human decides
- Never execute major changes without explicit approval
- Show the AI's reasoning, not just its conclusions
- User maintains sense of control and understanding

#### 3. Right Interface for the Task
- Use **appropriate UI patterns** - conversational AI, direct manipulation, forms, visual builders
- Gather requirements through **dialogue** when exploring needs
- Provide **direct manipulation** when spatial relationships or structure matter
- Use **forms and controls** when precise input or validation is needed
- Conversational feels less intimidating, but other patterns are often more efficient
- Choose interface pattern based on what makes the task clearest and fastest

#### 4. Transparent Over Magical
- Show what's happening behind the scenes
- Explain why AI recommends certain structures
- Make the system learnable, not just usable
- "Magic" that can't be understood breeds distrust

#### 5. Respect Professional Workflows
- Agencies start in design tools (Figma), not WordPress
- Developers value time savings over hand-holding
- Non-technical users appreciate guidance but not condescension
- The tool should feel professional, not "dumbed down"

#### 6. Living Sites, Multi-Context Editing
- Sites are never "done" - they evolve continuously
- Users edit across multiple contexts: our tool, wp-admin, code editors, Local itself
- WordPress site is the source of truth, not our representation
- Everything remains editable - in our tool and outside it
- Detect and understand changes made in any context
- Assist across entire workflow, not just initial setup

---

## USER MENTAL MODELS

### Three Distinct User Types (All Equally Important)

#### Type 1: Non-Technical User
**Mental Model:** "I need help, but I want to understand what's happening"

**What They Value:**
- Clear explanations without jargon
- Confidence that they won't break anything
- Ability to undo mistakes
- Feeling guided, not lost

**What They Fear:**
- Making wrong choices they can't reverse
- Not understanding what the tool is doing
- Being embarrassed by lack of technical knowledge
- Creating something unprofessional

**How Interface Should Respond:**
- Provide context and explanations naturally
- Offer suggestions with reasoning
- Show approval steps clearly
- Use rollback as safety net

#### Type 2: Developer
**Mental Model:** "I know what I want, just make it faster"

**What They Value:**
- Speed and efficiency
- Shortcuts to bypass explanations
- Technical accuracy
- Control over every detail

**What They Fear:**
- Tool making assumptions they have to undo
- Black box behavior they can't inspect
- Wasting time on unnecessary steps
- Being locked into tool's opinions

**How Interface Should Respond:**
- Provide fast paths for common tasks
- Allow direct editing of AI-generated code
- Show technical details on demand
- Get out of their way when they know what they're doing

#### Type 3: Agency Professional
**Mental Model:** "I need client-quality output, agency-speed execution"

**What They Value:**
- Professional polish
- Multi-project management
- Design-to-implementation workflow
- Client presentability

**What They Fear:**
- Generic output that looks templated
- Inability to match brand guidelines
- Tool imposing its aesthetic
- Time lost in manual WordPress configuration

**How Interface Should Respond:**
- Respect design decisions from Figma
- Support sophisticated content structures
- Enable brand consistency
- Streamline repetitive setup work

---

## ADAPTIVE INTERFACE BEHAVIOR

### How Interface Reveals Complexity

The interface should **detect user sophistication** and adapt:

**Indicators of Technical User:**
- Skips explanations
- Uses keyboard shortcuts
- Edits AI-generated configs directly
- Asks for specific technical features by name

**Response:** Reduce explanations, show more options upfront, provide advanced features directly

**Indicators of Learning User:**
- Reads help text
- Asks clarifying questions
- Proceeds slowly through steps
- Uses suggested options without modification

**Response:** Maintain guidance, provide context, offer recommended paths

**Indicators of Confident Non-Technical User:**
- Engages with AI conversationally
- Makes decisions without second-guessing
- Comfortable with iteration
- Focuses on outcomes not mechanics

**Response:** Keep conversation natural, hide technical details, emphasize results

**Implementation Note:** This detection should be **subtle and continuous**, not a one-time "what type of user are you?" choice.

---

## CORE USER JOURNEYS

### Journey 1: First-Time Site Creation

**User Goal:** Create a functional WordPress site without getting lost in technical decisions

**Key Moments:**

1. **Starting Point** - User has a purpose/vision, minimal or no design
2. **Information Gathering** - AI learns what user needs through conversation
3. **Architecture Proposal** - AI suggests structure, explains reasoning
4. **Review & Approval** - User sees complete picture, can edit before execution
5. **Execution** - System creates site, user sees progress
6. **First Look** - User views their new site structure
7. **Next Steps** - Clear path to adding content or refining structure

**Emotional Arc:**
- Start: Uncertain but hopeful
- Middle: Increasing confidence as AI demonstrates understanding
- Approval: Moment of trust - "will this work?"
- Completion: Relief and accomplishment
- Ongoing: Sense of control and capability

**Critical UX Needs:**
- Never feel lost or confused about what's happening
- Always able to undo or revise
- Seeing "this was created for YOUR needs" not "generic template"
- Clear handoff from setup to usage

### Journey 2: Design-Led Site Creation

**User Goal:** Implement a Figma design as WordPress architecture quickly

**Key Moments:**

1. **Starting Point** - User has Figma design, needs WordPress structure
2. **Connection** - User provides Figma access (token + URL)
3. **Analysis** - AI examines design, extracts patterns and structure
4. **Interpretation** - AI explains what it sees and proposes WordPress mapping
5. **Refinement** - User corrects misunderstandings, adds context
6. **Execution** - System creates structure matching design intent
7. **Validation** - User confirms structure matches expectations

**Emotional Arc:**
- Start: Excitement about acceleration
- Connection: Brief technical moment (needs to feel easy)
- Analysis: Curiosity about what AI will find
- Interpretation: Evaluation - "did it understand my design?"
- Refinement: Collaboration, not criticism
- Completion: Satisfaction at speed + quality
- Ongoing: Trust in design-to-code workflow

**Critical UX Needs:**
- Figma connection must feel secure but simple
- AI's interpretation of design must be transparent
- Misunderstandings should feel collaborative to fix, not frustrating
- Final structure should honor design decisions
- Process should feel faster than manual setup (obvious time savings)

### Journey 3: Existing Site Management

**User Goal:** Add features or restructure existing WordPress site

**Key Moments:**

1. **Starting Point** - User has site in Local, wants to evolve it
2. **Connection** - User selects existing site
3. **Context Building** - AI scans current structure, understands what exists
4. **Request** - User describes desired change
5. **Impact Assessment** - AI explains what will change and potential effects
6. **Approval** - User reviews changes with understanding of consequences
7. **Execution** - Changes applied with ability to rollback
8. **Verification** - User confirms changes work as expected

**Emotional Arc:**
- Start: Specific need or frustration with current setup
- Connection: Ease of finding their site
- Scan: Confidence that AI understands existing work
- Request: Natural expression of need
- Assessment: Caution - "will this break things?"
- Approval: Informed decision making
- Completion: Relief that it worked
- Ongoing: Willingness to iterate

**Critical UX Needs:**
- Respect for existing work (don't suggest unnecessary changes)
- Clear impact assessment before changes
- Visible rollback option (safety)
- Changes should feel surgical, not disruptive
- Build confidence for future modifications

---

## INTERACTION PATTERNS

### AI Conversation Style

**Tone:**
- Professional but approachable
- Knowledgeable without being condescending  
- Collaborative, not directive
- Concise but complete

**When AI Should Ask Questions:**
- When user intent is genuinely ambiguous
- When multiple valid approaches exist
- When user might not know what's possible
- To confirm understanding before major operations

**When AI Should NOT Ask Questions:**
- When answer is obvious from context
- When a reasonable default exists
- To fill out internal data structures (infer instead)
- When it would slow down experienced users

**AI Explanation Philosophy:**
- **Always explain reasoning** behind recommendations
- **Never assume user knows** WordPress terminology
- **Provide examples** when describing concepts
- **Link explanations** to user's stated goals

### Change Awareness & Recommendations

**Detecting External Changes:**
- Monitor for structural changes made outside our tool
- Differentiate between AI-generated and user-made changes
- Analyze intent behind detected changes
- Maintain awareness without feeling intrusive

**Activity Feed Pattern:**
- Chronological view of all site changes
- Clear attribution: "You added..." vs "We generated..."
- Filterable by change type and time period
- Non-judgmental language about external changes

**Contextual Alert Pattern:**
- Surface relevant changes where they matter
- Appear in context of related work
- Non-intrusive but visible
- Dismissible if not immediately relevant
- Actionable when assistance would help

**General Recommendations:**
- Dedicated area for improvement suggestions
- Based on detected patterns and gaps
- Prioritized by impact and relevance
- User can act on, dismiss, or postpone
- Never pushy or repetitive

**Contextual Recommendations:**
- Appear inline with related UI
- Triggered by detected changes in area
- Suggest complementary actions
- Easily expandable for details
- Context-appropriate action buttons

**Language for Change Awareness:**

**Good (Collaborative):**
- "I see you added an Events content type. Would you like help setting up date fields?"
- "Your homepage template was modified. Want me to check design consistency?"
- "You installed WooCommerce. I can help configure it if you'd like."

**Bad (Judgmental/Intrusive):**
- "Warning: Detected unauthorized change"
- "You should have used our interface"
- "Your manual changes may cause issues"

**Behavioral Guidelines:**
- Not "Clippy-like" - don't interrupt active work
- Definitely present - available when needed
- Respectful - acknowledge their changes positively
- Helpful without assuming help is needed

### Approval & Review Moments

**What Requires Approval:**
- Any structural changes (post types, taxonomies, ACF fields)
- Plugin installations
- Major configuration changes
- Theme modifications

**What Doesn't Require Approval:**
- Reading/analyzing existing structure
- Generating suggestions
- Providing recommendations
- Creating content drafts (before publishing)

**Approval Interface Philosophy:**
- Show **complete picture** of what will change
- Explain **why** each change is recommended
- Allow **granular editing** (approve some, edit others, reject others)
- Provide **estimated time** for execution
- Make **rollback option** visible upfront

### Progressive Disclosure Examples

**Example 1: Post Type Creation**

**Basic View (All Users See):**
```
Creating: Products
Why: Your site needs a way to display and manage product listings
```

**Expanded View (Click for details):**
```
Technical Details:
- Post type: product
- Supports: title, editor, thumbnail, custom-fields
- Public: yes
- Archive: yes
- Rewrite slug: products

[Edit Configuration]
```

**Example 2: Plugin Recommendation**

**Basic View:**
```
Recommended: WooCommerce
Why: Best solution for e-commerce functionality
Priority: High
```

**Expanded View:**
```
What it does:
- Product management
- Shopping cart
- Checkout process
- Payment processing

Alternatives considered:
- Easy Digital Downloads (better for digital products)
- Custom solution (more work, more control)

Installation time: ~2 minutes

[Install] [Tell me more] [Skip]
```

---

## INFORMATION HIERARCHY

### What User Needs to Know (By Priority)

#### Priority 1: Immediate Impact
- What is about to happen
- Why it's being recommended
- What they need to decide right now

#### Priority 2: Context & Understanding
- How this fits into bigger picture
- Why this approach vs alternatives
- What they can customize

#### Priority 3: Technical Details
- Under-the-hood mechanics
- Configuration options
- Technical specifications

**Design Implication:** Information should be layered, with each priority level progressively disclosed.

---

## LANGUAGE & TERMINOLOGY

### Natural Language Over Jargon

**Core Principle:** Describe functionality in terms of what users want to accomplish, not technical implementation.

**Acceptable Terms:**
- "Content types" (for custom post types)
- "Categories" and "tags" (already natural)
- "Fields" (for custom fields)
- Basic organizational concepts familiar to non-developers

**Avoid Unless User Demonstrates Technical Knowledge:**
- "Custom post types" / "CPT"
- "Advanced Custom Fields" / "ACF"
- "Taxonomy" (as technical term)
- Database or implementation terminology
- WordPress-specific jargon

**Translation Examples:**

**Instead of:** "I'll create a custom post type with ACF field groups"
**Say:** "I'll set up a section for your recipes with fields for ingredients and cooking time"

**Instead of:** "Register a taxonomy for product categories"
**Say:** "Create categories so you can organize your products"

**Instead of:** "This requires a custom archive template"
**Say:** "I'll create a page that lists all your recipes"

**Adaptive Language:**
- Start with natural language for all users
- If user uses technical terms, mirror their sophistication level
- Passive detection based on vocabulary used
- Never ask "Are you technical?" - just adapt naturally

**Categories and Tags:**
These terms are close enough to natural language that most users understand them. Use freely.

**Content Types:**
Acceptable middle ground - not too technical but clear enough.

---

## CRITICAL SUCCESS FACTORS

### What Makes This Tool Feel Different

#### 1. Never Feels Like a Black Box
- User always knows what's happening
- AI reasoning is visible
- Changes are reviewable before execution
- System state is always clear

#### 2. Respects User's Time
- No unnecessary questions
- Smart defaults for common cases
- Fast paths for experienced users
- Batch operations where possible

#### 3. Builds Confidence Over Time
- Early success builds trust
- Rollback reduces fear
- Clear cause-and-effect relationships
- Learning happens through use

#### 4. Maintains Professional Quality
- Nothing about interface suggests "amateur hour"
- Generated output looks intentional, not templated
- Respects sophisticated use cases
- Doesn't infantilize any user type

---

## FAILURE MODES TO AVOID

### Anti-Patterns We Must Not Create

#### 1. The Wizard That Never Ends
- Problem: Form after form after form
- Why it fails: Users lose context, get fatigued
- Our approach: Conversational gathering with clear progress

#### 2. The Unexplained Magic
- Problem: "AI did something, trust us it's good"
- Why it fails: Users can't learn, feel powerless
- Our approach: Always explain reasoning

#### 3. The Overeager Assistant
- Problem: AI assumes too much, makes unwanted changes
- Why it fails: Users spend time undoing AI's "help"
- Our approach: Propose, don't execute

#### 4. The Technical Manual
- Problem: Exposing all complexity upfront
- Why it fails: Overwhelms non-technical users
- Our approach: Progressive disclosure

#### 5. The Condescending Guide
- Problem: Treating users like children
- Why it fails: Professional users feel disrespected
- Our approach: Respect intelligence while providing support

#### 6. The Templated Output
- Problem: Everything looks the same
- Why it fails: Agencies can't use for client work
- Our approach: Honor user's design and content needs

---

## WORKFLOW CONSIDERATIONS

### Multi-Site Management

**Context:** Users may manage multiple WordPress sites simultaneously

**UX Implications:**
- Need dashboard showing all sites
- Quick switching between sites
- Ability to compare or replicate configurations
- Clear indication of which site is currently active
- No risk of applying changes to wrong site

**Mental Model:** Like a project management tool, not a single-site builder

### Figma Integration Workflow

**Context:** User has design in Figma, wants to implement in WordPress

**UX Implications:**
- Connection step must feel secure (explaining what access allows)
- Analysis phase should feel fast but thorough
- AI's interpretation of design must be reviewable
- Mismatches between design and WordPress capabilities need gentle handling
- Multiple design files (wireframes vs high-fidelity) need different treatments

**Mental Model:** Like an import tool, not a converter. User maintains control.

### Iterative Refinement

**Context:** User will revise and refine architecture over time

**UX Implications:**
- Changes to existing structure need impact warnings
- History/versioning must be accessible
- Rollback must feel safe and easy
- AI should understand context from past decisions
- Avoid asking same questions repeatedly

**Mental Model:** Like version control, not one-time setup

---

## CONTENT & MESSAGING

### Terminology Philosophy

**Prefer:**
- Plain language over WordPress jargon
- "Content type" over "Custom post type"
- "Categories" over "Taxonomies" (when general)
- "Field" over "ACF field" (when contextual)
- "Plugin" is okay (widely understood)

**But:**
- Don't hide technical terms entirely
- Introduce proper terminology with explanation
- Allow users to learn correct terms naturally
- Use technical terms in expandable details

**Example:**
```
Main text: "Creating a new content type for Products"
Expanded: "In WordPress, this is called a Custom Post Type (CPT)"
```

### Help Text Philosophy

**Good Help Text:**
- Explains why, not just what
- Provides examples
- Anticipates confusion
- Points to relevant documentation
- Disappears when not needed

**Bad Help Text:**
- States the obvious
- Uses jargon without explanation
- Permanent clutter
- Patronizing tone
- Disconnected from actual action

### Error Handling Philosophy

**When Things Go Wrong:**
- Explain what happened in plain language
- Suggest what user can do to fix it
- Offer to rollback if applicable
- Don't blame user
- Provide path forward

**Example of Good Error:**
```
"Can't connect to Figma file"
This might mean:
- The file URL isn't correct
- Your access token doesn't have permission
- The file is in a private team

Try:
1. Check that the URL is complete
2. Generate a new access token
3. [Contact support if problem persists]
```

**Example of Bad Error:**
```
"Error: Invalid token (401)"
```

---

## EMOTIONAL DESIGN CONSIDERATIONS

### Moments That Matter

#### Moment 1: First AI Proposal
**Emotion:** Hope mixed with skepticism  
**Design Need:** Show understanding of user's needs, explain reasoning clearly  
**Success Signal:** "Wow, it got it"

#### Moment 2: Approval Decision
**Emotion:** Anxiety about making wrong choice  
**Design Need:** Provide confidence through explanation and safety nets  
**Success Signal:** User approves without second-guessing

#### Moment 3: Watching Execution
**Emotion:** Anticipation  
**Design Need:** Show progress, maintain engagement, not boring wait  
**Success Signal:** Time feels short, not long

#### Moment 4: First View of Result
**Emotion:** Validation or disappointment  
**Design Need:** Match expectations set during proposal  
**Success Signal:** "This is what I wanted"

#### Moment 5: Making First Change
**Emotion:** Confidence testing  
**Design Need:** Make iteration feel safe and natural  
**Success Signal:** Willingness to experiment

#### Moment 6: Encountering Problem
**Emotion:** Frustration  
**Design Need:** Fast path to resolution, maintain trust  
**Success Signal:** Problem solved without abandoning tool

---

## TECHNICAL CONSTRAINTS AFFECTING UX

### What Users Need to Provide

**Required:**
- Local WP installed
- Claude API key (user provides their own)
- ACF Pro license (for full features)

**Optional:**
- Figma Personal Access Token (for design import)
- Figma file URL

**UX Implication:**
- Setup process must guide through these requirements
- Explain why each is needed
- Provide links to acquire/configure
- Validate before proceeding
- Store securely (explain security)

### What Happens Locally vs Cloud

**Local Operations:**
- WordPress site creation
- File system changes
- Database operations
- Configuration storage

**Cloud Operations:**
- AI analysis (Claude API)
- Figma data fetching
- Future: Design asset generation

**UX Implication:**
- Indicate when network is required
- Handle offline gracefully
- Explain data flow if user asks
- Don't expose this complexity unnecessarily

---

## ACCESSIBILITY CONSIDERATIONS

### Inclusive Design Requirements

**Visual:**
- High contrast options
- Scalable text
- Clear information hierarchy
- Not reliant on color alone

**Cognitive:**
- Clear, simple language
- Logical flow
- Undo/redo throughout
- No time pressure on decisions

**Motor:**
- Keyboard navigation
- Adequate click targets
- No required precision tasks
- Shortcut alternatives

**Situational:**
- Works on various screen sizes
- Readable in different lighting
- Usable with screen readers
- Text alternatives for visual info

---

## MEASURING SUCCESS

### UX Metrics That Matter

**Efficiency Metrics:**
- Time to complete first site setup
- Number of steps to common tasks
- Abandonment rate during setup
- Time spent in approval/review phase

**Confidence Metrics:**
- Rollback usage rate (lower is better after initial learning)
- Approval acceptance rate (higher = AI understood needs)
- Return usage rate (higher = positive experience)
- Feature discovery depth (are users finding advanced features?)

**Understanding Metrics:**
- Help text expansion rate (are explanations needed?)
- Error recovery success rate
- Support request themes
- User-generated feedback themes

**Quality Metrics:**
- Generated architecture quality (subjective evaluation)
- User satisfaction (NPS or similar)
- Task completion success
- Would-recommend rate

---

## DESIGN SYSTEM IMPLICATIONS

### What This Product Needs

**Component Categories:**

**Conversational:**
- Chat-like message display
- AI response formatting
- User input areas
- Typing/processing indicators

**Approval/Review:**
- Side-by-side comparison views
- Diff visualization
- Checkbox/selection patterns
- Expandable detail sections

**Progress/Status:**
- Multi-step wizards with context
- Progress indicators
- Status badges
- Timeline visualizations

**Data Display:**
- Configuration previews
- Code snippets (readable, not editable in preview)
- Hierarchical structures
- Lists with metadata

**Action Patterns:**
- Primary/secondary/tertiary actions
- Destructive action warnings
- Batch operations
- Quick actions

**Empty States:**
- First-time user guidance
- No-sites-yet state
- Loading states
- Error states

### Voice & Personality

**Brand Personality:**
- Knowledgeable guide
- Professional collaborator
- Patient teacher
- Efficient helper

**Not:**
- Overly casual friend
- Robotic system
- Pushy salesperson
- Patronizing expert

---

## QUESTIONS FOR DESIGN AI

As you help design this experience, consider:

1. How can we make AI proposals feel collaborative rather than prescriptive?
2. What visual patterns make "progressive disclosure" feel natural, not hidden?
3. How do we show sophistication without overwhelming?
4. What makes approval/review feel decisive rather than anxious?
5. How do we handle three user types with one interface?
6. What makes version history/rollback feel safe and accessible?
7. How do we visualize "AI is thinking" in a way that builds confidence?
8. What patterns help users understand cause-and-effect in AI decisions?

---

## FINAL NOTES

**Remember:**
- This is a professional tool, not a toy
- Users want speed AND control
- AI is assistant, not autonomous
- Design matters because users care about quality
- The tool should feel learnable, not just usable
- Respect workflows that start outside WordPress

**Do Not:**
- Oversimplify to the point of limiting
- Make decisions users should make
- Hide important information
- Treat any user type as less capable
- Create generic output
- Force a single "right way"

---

**This document contains only what has been discussed and decided. All guidance reflects actual product requirements and philosophy, not assumptions or additions.**
