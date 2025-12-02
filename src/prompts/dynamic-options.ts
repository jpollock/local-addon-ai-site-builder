/**
 * Build the dynamic options prompt for wizard question enhancement
 *
 * Used by AIService.getDynamicOptions() to generate context-aware
 * options for wizard questions based on user's site description and
 * previous answers. Works with Claude, OpenAI, and Gemini providers.
 */
export function buildDynamicOptionsPrompt(
  contextSummary: string,
  questionIndex: number,
  currentQuestion: { question: string; subtitle: string },
  baseOptionsText: string
): string {
  return `You are a WordPress expert helping configure a site builder wizard. Based on the user's context, enhance the options for the current question.

## USER CONTEXT
${contextSummary}

## CURRENT QUESTION
Question ${questionIndex + 1} of 5: "${currentQuestion.question}"
Subtitle: "${currentQuestion.subtitle}"

## BASE OPTIONS
${baseOptionsText}

## WORDPRESS KNOWLEDGE
Consider these common patterns when suggesting options:

**For Content Creators questions:**
- Business sites: Marketing team, executives, support staff
- Blogs: Writers, editors, guest contributors
- E-commerce: Product managers, inventory staff
- Portfolios: Artists, designers, photographers

**For Homepage Content questions:**
- Hero section with CTA is nearly universal
- Testimonials work well for services/products
- Portfolio grids for creative sites
- Feature lists for SaaS/products
- Team sections for agencies/firms

**For Required Pages questions:**
- About page is almost always needed
- Contact page with form for businesses
- FAQ for products/services
- Portfolio/Gallery for creative sites
- Pricing for services/SaaS

**Common WordPress Plugins by Site Type:**
- Contact forms: contact-form-7, wpforms-lite, ninja-forms
- E-commerce: woocommerce, easy-digital-downloads
- SEO: wordpress-seo (Yoast), rank-math
- Security: wordfence, sucuri-scanner
- Performance: wp-super-cache, autoptimize
- Galleries: envira-gallery-lite, modula-best-grid-gallery
- Social: social-warfare, shared-counts
- Booking: flavor (restaurants), bookly-responsive-appointment-booking
- Portfolios: portfolio-gallery, starter-templates
- Membership: paid-memberships-pro, memberpress

## YOUR TASK
1. **suggestedOptions**: Add 0-3 NEW options specific to their site type (not duplicates)
2. **removedOptionIds**: Hide options clearly irrelevant to their context (be conservative)
3. **defaultSelections**: Pre-select options that make sense for their site
4. **hints**: Add contextual tooltips to existing options
5. **recommendedPlugins**: Suggest 1-3 plugins that would help this specific site (use slugs from list above)

## RESPONSE FORMAT
Always respond with a JSON code block:

\`\`\`json
{
  "suggestedOptions": [
    {
      "id": "ai-{question}-{name}",
      "label": "Option Label",
      "value": "option-value",
      "contextHint": "Brief explanation (under 80 chars)"
    }
  ],
  "removedOptionIds": [],
  "defaultSelections": ["option-value-to-preselect"],
  "hints": {
    "existing-option-id": "Why this matters for their site"
  },
  "recommendedPlugins": [
    {
      "slug": "plugin-slug",
      "name": "Plugin Display Name",
      "reason": "Why this plugin helps their specific site"
    }
  ]
}
\`\`\`

## RULES
- Generate unique IDs like "ai-homepage-testimonials" or "ai-pages-portfolio"
- Only suggest options that genuinely add value for this specific site
- Be conservative with removals - only hide truly irrelevant options
- Keep hints concise and actionable (under 80 characters)
- defaultSelections should contain option VALUES, not IDs
- recommendedPlugins should use exact WordPress.org plugin slugs
- Only recommend plugins that directly support features the user needs`;
}
