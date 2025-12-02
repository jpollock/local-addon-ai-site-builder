/**
 * FigmaPageGenerator - Converts Figma pages to WordPress pages
 *
 * This module analyzes Figma document structure to:
 * 1. Identify page-like frames (Homepage, About, Contact, etc.)
 * 2. Classify sections within pages (hero, features, CTA, etc.)
 * 3. Extract actual text content from Figma TEXT nodes
 * 4. Generate WordPress block markup with the content
 */

import { DesignTokens, FigmaPage, FigmaNode } from '../common/types';

// Re-export types for consumers
export type { FigmaPage, FigmaNode };

export interface GeneratedPage {
  title: string;
  slug: string;
  content: string; // WordPress block markup
  template: string;
  featuredImage?: string;
}

type SectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'cta'
  | 'footer'
  | 'navigation'
  | 'gallery'
  | 'contact'
  | 'about'
  | 'pricing'
  | 'team'
  | 'faq'
  | 'stats'
  | 'content';

interface FigmaSection {
  type: SectionType;
  node: FigmaNode;
  content: ExtractedContent;
}

interface ExtractedContent {
  heading: string;
  subheading: string;
  body: string[];
  buttons: string[];
  images: string[];
  items?: ExtractedContent[]; // For repeating items (features, testimonials, etc.)
}

// ============================================================================
// FigmaPageGenerator Class
// ============================================================================

export class FigmaPageGenerator {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger;
  }

  /**
   * Analyze Figma document and identify pages
   */
  analyzePages(document: any): FigmaPage[] {
    const pages: FigmaPage[] = [];

    if (!document?.children) {
      this.log('No document children found');
      return pages;
    }

    // Figma document structure: document.children are canvases/pages
    for (const canvas of document.children) {
      if (canvas.type !== 'CANVAS') continue;

      // Each canvas can have multiple top-level frames (page designs)
      for (const frame of canvas.children || []) {
        if (frame.type === 'FRAME' && this.looksLikePage(frame)) {
          pages.push({
            id: frame.id,
            name: this.normalizePageName(frame.name),
            children: frame.children || [],
          });
          this.log(`Found page: "${frame.name}" -> "${this.normalizePageName(frame.name)}"`);
        }
      }
    }

    this.log(`Total pages found: ${pages.length}`);
    return pages;
  }

  /**
   * Check if a frame looks like a page design (vs component or icon)
   */
  looksLikePage(frame: any): boolean {
    const { width, height } = frame.absoluteBoundingBox || { width: 0, height: 0 };
    // Page-like if larger than 300x400 (typical component sizes are smaller)
    const isLargeEnough = width > 300 && height > 400;

    // Also check name for common page indicators
    const nameLower = frame.name.toLowerCase();
    const hasPageName =
      nameLower.includes('page') ||
      nameLower.includes('home') ||
      nameLower.includes('about') ||
      nameLower.includes('contact') ||
      nameLower.includes('landing') ||
      nameLower.includes('screen') ||
      /^\d+\s*[-–]/.test(frame.name); // Starts with number like "01 - Homepage"

    return isLargeEnough || hasPageName;
  }

  /**
   * Normalize Figma frame names to WordPress page titles
   */
  normalizePageName(name: string): string {
    return name
      .replace(/^\d+\s*[-–]\s*/, '') // Remove leading numbers "01 - "
      .replace(/\s*page\s*$/i, '') // Remove trailing "page"
      .replace(/\s*screen\s*$/i, '') // Remove trailing "screen"
      .replace(/\s*-\s*desktop$/i, '') // Remove " - Desktop"
      .replace(/\s*-\s*mobile$/i, '') // Remove " - Mobile"
      .trim();
  }

  /**
   * Generate WordPress page from Figma page
   */
  generatePage(figmaPage: FigmaPage, designTokens: DesignTokens): GeneratedPage {
    this.log(`Generating WordPress page for: "${figmaPage.name}"`);

    // Handle pages without children (just create a basic page)
    const children = figmaPage.children || [];
    const sections = this.identifySections(children);
    this.log(`Identified ${sections.length} sections`);

    const blocks = sections.map((section) => this.sectionToBlocks(section, designTokens));

    return {
      title: figmaPage.name,
      slug: this.generateSlug(figmaPage.name),
      content: blocks.join('\n\n'),
      template: 'full-width',
    };
  }

  /**
   * Identify logical sections in a page (hero, features, etc.)
   */
  identifySections(children: FigmaNode[]): FigmaSection[] {
    const sections: FigmaSection[] = [];

    // Sort children by Y position (top to bottom)
    const sorted = [...children].sort(
      (a, b) => (a.absoluteBoundingBox?.y || 0) - (b.absoluteBoundingBox?.y || 0)
    );

    for (const child of sorted) {
      // Skip very small elements (icons, decorations)
      const { width, height } = child.absoluteBoundingBox || { width: 0, height: 0 };
      if (width < 100 || height < 50) continue;

      const sectionType = this.classifySection(child);
      const content = this.extractContent(child);

      // Only add if we found meaningful content
      if (content.heading || content.body.length > 0 || content.buttons.length > 0) {
        sections.push({
          type: sectionType,
          node: child,
          content,
        });
        this.log(`  Section: ${sectionType} - "${content.heading || 'No heading'}"`);
      }
    }

    return sections;
  }

  /**
   * Classify a section based on its structure and content
   */
  classifySection(node: FigmaNode): SectionType {
    const name = node.name.toLowerCase();
    const { width: _width, height } = node.absoluteBoundingBox || { width: 0, height: 0 };

    // Check name first (most reliable)
    if (name.includes('hero') || name.includes('header') || name.includes('banner')) return 'hero';
    if (name.includes('feature')) return 'features';
    if (name.includes('testimonial') || name.includes('review') || name.includes('quote'))
      return 'testimonials';
    if (name.includes('cta') || name.includes('call-to-action') || name.includes('action'))
      return 'cta';
    if (name.includes('footer')) return 'footer';
    if (name.includes('nav') || name.includes('menu')) return 'navigation';
    if (name.includes('gallery') || name.includes('grid') || name.includes('portfolio'))
      return 'gallery';
    if (name.includes('contact') || name.includes('form')) return 'contact';
    if (name.includes('about')) return 'about';
    if (name.includes('pricing') || name.includes('plan')) return 'pricing';
    if (name.includes('team') || name.includes('member')) return 'team';
    if (name.includes('faq') || name.includes('question')) return 'faq';
    if (name.includes('stat') || name.includes('number') || name.includes('metric')) return 'stats';

    // Check structure if name doesn't reveal type
    const hasLargeImage = this.hasLargeImage(node);
    const hasButton = this.hasButton(node);
    const hasRepeating = this.hasRepeatingPattern(node);

    // Hero: typically first section, large, has image and button
    if (height > 400 && hasLargeImage && hasButton) return 'hero';

    // Features: has repeating pattern
    if (hasRepeating) return 'features';

    // CTA: relatively small section with prominent button
    if (height < 300 && hasButton) return 'cta';

    return 'content';
  }

  /**
   * Extract actual text content from Figma nodes
   */
  extractContent(node: FigmaNode): ExtractedContent {
    const content: ExtractedContent = {
      heading: '',
      subheading: '',
      body: [],
      buttons: [],
      images: [],
      items: [],
    };

    const texts: Array<{ text: string; fontSize: number; fontWeight: number; isButton: boolean }> =
      [];

    // Walk the node tree and collect all text
    this.walkNodes(node, (child) => {
      if (child.type === 'TEXT' && child.characters) {
        const text = child.characters.trim();
        if (text) {
          const fontSize = child.style?.fontSize || 16;
          const fontWeight = child.style?.fontWeight || 400;

          // Check if this text is inside a button-like container
          const isButton = this.isInsideButton(child, node);

          texts.push({ text, fontSize, fontWeight, isButton });
        }
      }
    });

    // Sort texts by font size (largest first)
    texts.sort((a, b) => b.fontSize - a.fontSize);

    // Classify texts
    for (const { text, fontSize, fontWeight: _fontWeight, isButton } of texts) {
      if (isButton) {
        content.buttons.push(text);
      } else if (!content.heading && fontSize >= 24) {
        content.heading = text;
      } else if (!content.subheading && fontSize >= 18 && fontSize < 24) {
        content.subheading = text;
      } else if (fontSize >= 12 && text.length > 10) {
        // Only add body text if it's meaningful (not single words or labels)
        content.body.push(text);
      }
    }

    // Check for repeating items (for features, testimonials, etc.)
    content.items = this.extractRepeatingItems(node);

    return content;
  }

  /**
   * Check if a node is inside a button-like container
   */
  private isInsideButton(textNode: FigmaNode, rootNode: FigmaNode): boolean {
    // This is a simplified check - in production you'd trace the parent chain
    // For now, check if the text is short and node name suggests button
    const nameLower = rootNode.name.toLowerCase();
    if (nameLower.includes('button') || nameLower.includes('btn') || nameLower.includes('cta')) {
      return true;
    }

    // Short text (1-4 words) with action words is likely a button
    const wordCount = (textNode.characters || '').split(/\s+/).length;
    const actionWords = [
      'get',
      'start',
      'learn',
      'sign',
      'join',
      'contact',
      'buy',
      'shop',
      'try',
      'download',
    ];
    const hasActionWord = actionWords.some((word) =>
      (textNode.characters || '').toLowerCase().includes(word)
    );

    return wordCount <= 4 && hasActionWord;
  }

  /**
   * Extract repeating items from a container (for features, cards, etc.)
   */
  private extractRepeatingItems(node: FigmaNode): ExtractedContent[] {
    const items: ExtractedContent[] = [];

    if (!node.children || node.children.length < 2) return items;

    // Look for frames with similar dimensions
    const frames = node.children.filter(
      (child) => child.type === 'FRAME' || child.type === 'GROUP'
    );

    if (frames.length < 2) return items;

    // Check if frames have similar sizes (indicating repeating pattern)
    const sizes = frames.map((f) => ({
      width: f.absoluteBoundingBox?.width || 0,
      height: f.absoluteBoundingBox?.height || 0,
    }));

    const firstSize = sizes[0];
    const areSimilar = sizes.every(
      (s) => Math.abs(s.width - firstSize.width) < 50 && Math.abs(s.height - firstSize.height) < 50
    );

    if (areSimilar && frames.length >= 2) {
      for (const frame of frames) {
        const itemContent = this.extractContent(frame);
        if (itemContent.heading || itemContent.body.length > 0) {
          items.push(itemContent);
        }
      }
    }

    return items;
  }

  /**
   * Convert section to WordPress blocks
   */
  sectionToBlocks(section: FigmaSection, tokens: DesignTokens): string {
    switch (section.type) {
      case 'hero':
        return this.generateHeroBlock(section.content, tokens);
      case 'features':
        return this.generateFeaturesBlock(section.content, tokens);
      case 'testimonials':
        return this.generateTestimonialsBlock(section.content, tokens);
      case 'cta':
        return this.generateCtaBlock(section.content, tokens);
      case 'gallery':
        return this.generateGalleryBlock(section.content, tokens);
      case 'contact':
        return this.generateContactBlock(section.content, tokens);
      case 'stats':
        return this.generateStatsBlock(section.content, tokens);
      case 'pricing':
        return this.generatePricingBlock(section.content, tokens);
      case 'faq':
        return this.generateFaqBlock(section.content, tokens);
      case 'about':
        return this.generateAboutBlock(section.content, tokens);
      default:
        return this.generateContentBlock(section.content, tokens);
    }
  }

  /**
   * Generate hero section block
   */
  generateHeroBlock(content: ExtractedContent, tokens: DesignTokens): string {
    const primaryColor = tokens.colors?.primary || '#51a351';

    return `<!-- wp:cover {"dimRatio":50,"minHeight":600,"align":"full","style":{"color":{"background":"${primaryColor}"}}} -->
<div class="wp-block-cover alignfull" style="min-height:600px">
  <div class="wp-block-cover__inner-container">
    <!-- wp:heading {"textAlign":"center","level":1,"style":{"typography":{"fontSize":"48px"}}} -->
    <h1 class="has-text-align-center" style="font-size:48px">${this.escapeHtml(content.heading || 'Welcome')}</h1>
    <!-- /wp:heading -->

    ${
      content.subheading
        ? `
    <!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"20px"}}} -->
    <p class="has-text-align-center" style="font-size:20px">${this.escapeHtml(content.subheading)}</p>
    <!-- /wp:paragraph -->
    `
        : ''
    }

    ${
      content.buttons.length > 0
        ? `
    <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
    <div class="wp-block-buttons">
      ${content.buttons
        .slice(0, 2)
        .map(
          (btn, i) => `
      <!-- wp:button ${i === 1 ? '{"className":"is-style-outline"}' : ''} -->
      <div class="wp-block-button${i === 1 ? ' is-style-outline' : ''}"><a class="wp-block-button__link wp-element-button">${this.escapeHtml(btn)}</a></div>
      <!-- /wp:button -->
      `
        )
        .join('')}
    </div>
    <!-- /wp:buttons -->
    `
        : ''
    }
  </div>
</div>
<!-- /wp:cover -->`;
  }

  /**
   * Generate features section with columns
   */
  generateFeaturesBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    const items = content.items || [];
    const columnCount = Math.min(items.length || 3, 4);

    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding-top:80px;padding-bottom:80px">

  ${
    content.heading
      ? `
  <!-- wp:heading {"textAlign":"center","level":2} -->
  <h2 class="has-text-align-center">${this.escapeHtml(content.heading)}</h2>
  <!-- /wp:heading -->
  `
      : ''
  }

  ${
    content.subheading
      ? `
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">${this.escapeHtml(content.subheading)}</p>
  <!-- /wp:paragraph -->
  `
      : ''
  }

  <!-- wp:columns {"style":{"spacing":{"padding":{"top":"40px"}}}} -->
  <div class="wp-block-columns" style="padding-top:40px">
    ${
      items.length > 0
        ? items
            .slice(0, columnCount)
            .map(
              (item) => `
    <!-- wp:column -->
    <div class="wp-block-column">
      ${
        item.heading
          ? `
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"20px"}}} -->
      <h3 style="font-size:20px">${this.escapeHtml(item.heading)}</h3>
      <!-- /wp:heading -->
      `
          : ''
      }
      ${
        item.body[0]
          ? `
      <!-- wp:paragraph -->
      <p>${this.escapeHtml(item.body[0])}</p>
      <!-- /wp:paragraph -->
      `
          : ''
      }
    </div>
    <!-- /wp:column -->
    `
            )
            .join('')
        : content.body
            .slice(0, 3)
            .map(
              (text) => `
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:paragraph -->
      <p>${this.escapeHtml(text)}</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
    `
            )
            .join('')
    }
  </div>
  <!-- /wp:columns -->

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate testimonials section
   */
  generateTestimonialsBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    const items = content.items || [];

    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}},"color":{"background":"#f8f9fa"}}} -->
<div class="wp-block-group alignfull has-background" style="background-color:#f8f9fa;padding-top:80px;padding-bottom:80px">

  ${
    content.heading
      ? `
  <!-- wp:heading {"textAlign":"center","level":2} -->
  <h2 class="has-text-align-center">${this.escapeHtml(content.heading)}</h2>
  <!-- /wp:heading -->
  `
      : ''
  }

  <!-- wp:columns -->
  <div class="wp-block-columns">
    ${(items.length > 0 ? items : [content])
      .slice(0, 3)
      .map(
        (item) => `
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:quote {"className":"is-style-large"} -->
      <blockquote class="wp-block-quote is-style-large">
        <p>${this.escapeHtml(item.body[0] || 'Great experience!')}</p>
        <cite>${this.escapeHtml(item.heading || 'Customer')}</cite>
      </blockquote>
      <!-- /wp:quote -->
    </div>
    <!-- /wp:column -->
    `
      )
      .join('')}
  </div>
  <!-- /wp:columns -->

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate CTA section block
   */
  generateCtaBlock(content: ExtractedContent, tokens: DesignTokens): string {
    const primaryColor = tokens.colors?.primary || '#51a351';

    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"60px","bottom":"60px"}},"color":{"background":"${primaryColor}"}}} -->
<div class="wp-block-group alignfull has-background" style="background-color:${primaryColor};padding-top:60px;padding-bottom:60px">

  <!-- wp:heading {"textAlign":"center","level":2,"style":{"color":{"text":"#ffffff"}}} -->
  <h2 class="has-text-align-center has-text-color" style="color:#ffffff">${this.escapeHtml(content.heading || 'Ready to get started?')}</h2>
  <!-- /wp:heading -->

  ${
    content.subheading
      ? `
  <!-- wp:paragraph {"align":"center","style":{"color":{"text":"#ffffff"}}} -->
  <p class="has-text-align-center has-text-color" style="color:#ffffff">${this.escapeHtml(content.subheading)}</p>
  <!-- /wp:paragraph -->
  `
      : ''
  }

  ${
    content.buttons.length > 0
      ? `
  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  <div class="wp-block-buttons">
    <!-- wp:button {"backgroundColor":"white","textColor":"primary"} -->
    <div class="wp-block-button"><a class="wp-block-button__link has-primary-color has-white-background-color has-text-color has-background wp-element-button">${this.escapeHtml(content.buttons[0])}</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->
  `
      : ''
  }

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate gallery block
   */
  generateGalleryBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding-top:80px;padding-bottom:80px">

  ${
    content.heading
      ? `
  <!-- wp:heading {"textAlign":"center","level":2} -->
  <h2 class="has-text-align-center">${this.escapeHtml(content.heading)}</h2>
  <!-- /wp:heading -->
  `
      : ''
  }

  <!-- wp:gallery {"columns":3,"linkTo":"none"} -->
  <figure class="wp-block-gallery has-nested-images columns-3 is-cropped">
    <!-- wp:image {"sizeSlug":"large"} -->
    <figure class="wp-block-image size-large"><img src="https://via.placeholder.com/600x400" alt="Gallery image"/></figure>
    <!-- /wp:image -->
    <!-- wp:image {"sizeSlug":"large"} -->
    <figure class="wp-block-image size-large"><img src="https://via.placeholder.com/600x400" alt="Gallery image"/></figure>
    <!-- /wp:image -->
    <!-- wp:image {"sizeSlug":"large"} -->
    <figure class="wp-block-image size-large"><img src="https://via.placeholder.com/600x400" alt="Gallery image"/></figure>
    <!-- /wp:image -->
  </figure>
  <!-- /wp:gallery -->

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate contact section block
   */
  generateContactBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding-top:80px;padding-bottom:80px">

  <!-- wp:heading {"textAlign":"center","level":2} -->
  <h2 class="has-text-align-center">${this.escapeHtml(content.heading || 'Contact Us')}</h2>
  <!-- /wp:heading -->

  ${
    content.subheading
      ? `
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">${this.escapeHtml(content.subheading)}</p>
  <!-- /wp:paragraph -->
  `
      : ''
  }

  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">Please use the contact form below to get in touch with us.</p>
  <!-- /wp:paragraph -->

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate stats section block
   */
  generateStatsBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    const items = content.items || [];

    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"60px","bottom":"60px"}},"color":{"background":"#f8f9fa"}}} -->
<div class="wp-block-group alignfull has-background" style="background-color:#f8f9fa;padding-top:60px;padding-bottom:60px">

  <!-- wp:columns -->
  <div class="wp-block-columns">
    ${(items.length > 0 ? items : content.body.slice(0, 4).map((b) => ({ heading: b, body: [] })))
      .slice(0, 4)
      .map(
        (item: any) => `
    <!-- wp:column {"style":{"spacing":{"padding":{"top":"20px","bottom":"20px"}}}} -->
    <div class="wp-block-column" style="padding-top:20px;padding-bottom:20px">
      <!-- wp:heading {"textAlign":"center","level":3,"style":{"typography":{"fontSize":"36px"}}} -->
      <h3 class="has-text-align-center" style="font-size:36px">${this.escapeHtml(item.heading || '100+')}</h3>
      <!-- /wp:heading -->
      ${
        item.body?.[0]
          ? `
      <!-- wp:paragraph {"align":"center"} -->
      <p class="has-text-align-center">${this.escapeHtml(item.body[0])}</p>
      <!-- /wp:paragraph -->
      `
          : ''
      }
    </div>
    <!-- /wp:column -->
    `
      )
      .join('')}
  </div>
  <!-- /wp:columns -->

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate pricing section block
   */
  generatePricingBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    const items = content.items || [];

    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding-top:80px;padding-bottom:80px">

  ${
    content.heading
      ? `
  <!-- wp:heading {"textAlign":"center","level":2} -->
  <h2 class="has-text-align-center">${this.escapeHtml(content.heading)}</h2>
  <!-- /wp:heading -->
  `
      : ''
  }

  <!-- wp:columns -->
  <div class="wp-block-columns">
    ${(items.length > 0
      ? items
      : [
          { heading: 'Basic', body: ['$9/month'] },
          { heading: 'Pro', body: ['$29/month'] },
        ]
    )
      .slice(0, 3)
      .map(
        (item: any, _i: number) => `
    <!-- wp:column {"style":{"border":{"radius":"12px","width":"1px"},"spacing":{"padding":{"top":"32px","bottom":"32px","left":"24px","right":"24px"}}}} -->
    <div class="wp-block-column" style="border-radius:12px;border-width:1px;padding:32px 24px">
      <!-- wp:heading {"textAlign":"center","level":3} -->
      <h3 class="has-text-align-center">${this.escapeHtml(item.heading || 'Plan')}</h3>
      <!-- /wp:heading -->
      ${
        item.body?.[0]
          ? `
      <!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"32px","fontWeight":"700"}}} -->
      <p class="has-text-align-center" style="font-size:32px;font-weight:700">${this.escapeHtml(item.body[0])}</p>
      <!-- /wp:paragraph -->
      `
          : ''
      }
      <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
      <div class="wp-block-buttons">
        <!-- wp:button -->
        <div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Choose Plan</a></div>
        <!-- /wp:button -->
      </div>
      <!-- /wp:buttons -->
    </div>
    <!-- /wp:column -->
    `
      )
      .join('')}
  </div>
  <!-- /wp:columns -->

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate FAQ section block
   */
  generateFaqBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    const items = content.items || [];

    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding-top:80px;padding-bottom:80px">

  <!-- wp:heading {"textAlign":"center","level":2} -->
  <h2 class="has-text-align-center">${this.escapeHtml(content.heading || 'Frequently Asked Questions')}</h2>
  <!-- /wp:heading -->

  ${(items.length > 0 ? items : content.body.map((b) => ({ heading: b, body: [''] })))
    .slice(0, 6)
    .map(
      (item: any) => `
  <!-- wp:group {"style":{"spacing":{"padding":{"top":"16px","bottom":"16px"}},"border":{"bottom":{"width":"1px","color":"#e0e0e0"}}}} -->
  <div class="wp-block-group" style="border-bottom-width:1px;border-bottom-color:#e0e0e0;padding-top:16px;padding-bottom:16px">
    <!-- wp:heading {"level":4} -->
    <h4>${this.escapeHtml(item.heading || 'Question?')}</h4>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>${this.escapeHtml(item.body?.[0] || 'Answer goes here.')}</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:group -->
  `
    )
    .join('')}

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate about section block
   */
  generateAboutBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding-top:80px;padding-bottom:80px">

  <!-- wp:columns -->
  <div class="wp-block-columns">
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:heading {"level":2} -->
      <h2>${this.escapeHtml(content.heading || 'About Us')}</h2>
      <!-- /wp:heading -->
      ${content.body
        .slice(0, 3)
        .map(
          (text) => `
      <!-- wp:paragraph -->
      <p>${this.escapeHtml(text)}</p>
      <!-- /wp:paragraph -->
      `
        )
        .join('')}
    </div>
    <!-- /wp:column -->
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:image {"sizeSlug":"large"} -->
      <figure class="wp-block-image size-large"><img src="https://via.placeholder.com/600x400" alt="About image"/></figure>
      <!-- /wp:image -->
    </div>
    <!-- /wp:column -->
  </div>
  <!-- /wp:columns -->

</div>
<!-- /wp:group -->`;
  }

  /**
   * Generate generic content block
   */
  generateContentBlock(content: ExtractedContent, _tokens: DesignTokens): string {
    return `<!-- wp:group {"style":{"spacing":{"padding":{"top":"60px","bottom":"60px"}}}} -->
<div class="wp-block-group" style="padding-top:60px;padding-bottom:60px">

  ${
    content.heading
      ? `
  <!-- wp:heading {"level":2} -->
  <h2>${this.escapeHtml(content.heading)}</h2>
  <!-- /wp:heading -->
  `
      : ''
  }

  ${
    content.subheading
      ? `
  <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"20px"}}} -->
  <h3 style="font-size:20px">${this.escapeHtml(content.subheading)}</h3>
  <!-- /wp:heading -->
  `
      : ''
  }

  ${content.body
    .map(
      (text) => `
  <!-- wp:paragraph -->
  <p>${this.escapeHtml(text)}</p>
  <!-- /wp:paragraph -->
  `
    )
    .join('')}

  ${
    content.buttons.length > 0
      ? `
  <!-- wp:buttons -->
  <div class="wp-block-buttons">
    ${content.buttons
      .map(
        (btn) => `
    <!-- wp:button -->
    <div class="wp-block-button"><a class="wp-block-button__link wp-element-button">${this.escapeHtml(btn)}</a></div>
    <!-- /wp:button -->
    `
      )
      .join('')}
  </div>
  <!-- /wp:buttons -->
  `
      : ''
  }

</div>
<!-- /wp:group -->`;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private walkNodes(node: FigmaNode, callback: (node: FigmaNode) => void): void {
    callback(node);
    for (const child of node.children || []) {
      this.walkNodes(child, callback);
    }
  }

  private hasLargeImage(node: FigmaNode): boolean {
    let found = false;
    this.walkNodes(node, (child) => {
      if (child.type === 'RECTANGLE' || child.type === 'VECTOR') {
        const { width, height } = child.absoluteBoundingBox || { width: 0, height: 0 };
        if (width > 200 && height > 150) {
          found = true;
        }
      }
    });
    return found;
  }

  private hasButton(node: FigmaNode): boolean {
    let found = false;
    this.walkNodes(node, (child) => {
      const name = child.name.toLowerCase();
      if (name.includes('button') || name.includes('btn') || name.includes('cta')) {
        found = true;
      }
    });
    return found;
  }

  private hasRepeatingPattern(node: FigmaNode): boolean {
    if (!node.children || node.children.length < 2) return false;

    const frames = node.children.filter((c) => c.type === 'FRAME' || c.type === 'GROUP');
    if (frames.length < 2) return false;

    // Check if frames have similar dimensions
    const sizes = frames.map((f) => ({
      w: f.absoluteBoundingBox?.width || 0,
      h: f.absoluteBoundingBox?.height || 0,
    }));

    const first = sizes[0];
    return sizes.every((s) => Math.abs(s.w - first.w) < 50 && Math.abs(s.h - first.h) < 50);
  }

  // Reserved for future use - counts text nodes in a Figma node tree
  private _countTextNodes(node: FigmaNode): number {
    let count = 0;
    this.walkNodes(node, (child) => {
      if (child.type === 'TEXT') count++;
    });
    return count;
  }

  private log(message: string): void {
    if (this.logger) {
      this.logger.info(`[FigmaPageGenerator] ${message}`);
    }
  }
}

export default FigmaPageGenerator;
