/**
 * FigmaComponentMapper - Maps Figma components to WordPress block patterns
 *
 * This module:
 * 1. Classifies Figma components by type (buttons, cards, testimonials, etc.)
 * 2. Generates WordPress block patterns from component structures
 * 3. Creates pattern registration PHP code for the theme
 */

import { DesignTokens, FigmaComponent } from '../common/types';

// ============================================================================
// Types
// ============================================================================

export interface ClassifiedComponents {
  buttons: FigmaComponentExtended[];
  cards: FigmaComponentExtended[];
  headers: FigmaComponentExtended[];
  forms: FigmaComponentExtended[];
  navigation: FigmaComponentExtended[];
  footers: FigmaComponentExtended[];
  testimonials: FigmaComponentExtended[];
  pricing: FigmaComponentExtended[];
  features: FigmaComponentExtended[];
  other: FigmaComponentExtended[];
}

export interface FigmaComponentExtended extends FigmaComponent {
  category?: string;
  nodeData?: any;
}

export interface WordPressPattern {
  name: string;
  title: string;
  categories: string[];
  content: string;
  description?: string;
}

// Reserved for future content extraction
interface _ExtractedComponentContent {
  heading: string;
  body: string[];
  buttons: string[];
  images: string[];
}

// ============================================================================
// FigmaComponentMapper Class
// ============================================================================

export class FigmaComponentMapper {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger;
  }

  /**
   * Classify Figma components into WordPress-relevant categories
   */
  classifyComponents(components: FigmaComponent[]): ClassifiedComponents {
    const classified: ClassifiedComponents = {
      buttons: [],
      cards: [],
      headers: [],
      forms: [],
      navigation: [],
      footers: [],
      testimonials: [],
      pricing: [],
      features: [],
      other: [],
    };

    for (const comp of components) {
      const category = this.categorizeComponent(comp);
      const extended: FigmaComponentExtended = { ...comp, category };

      if (category in classified) {
        (classified as any)[category].push(extended);
      } else {
        classified.other.push(extended);
      }

      this.log(`Component "${comp.name}" -> ${category}`);
    }

    this.logSummary(classified);
    return classified;
  }

  /**
   * Categorize a single component by name
   */
  categorizeComponent(comp: FigmaComponent): keyof ClassifiedComponents {
    const name = comp.name.toLowerCase();
    const _desc = (comp.description || '').toLowerCase();

    // Button components
    if (name.includes('button') || name.includes('btn') || name.includes('cta')) {
      return 'buttons';
    }

    // Card components
    if (name.includes('card') || name.includes('tile') || name.includes('box')) {
      return 'cards';
    }

    // Header components
    if (name.includes('header') || name.includes('hero') || name.includes('banner')) {
      return 'headers';
    }

    // Form components
    if (
      name.includes('form') ||
      name.includes('input') ||
      name.includes('field') ||
      name.includes('select') ||
      name.includes('checkbox')
    ) {
      return 'forms';
    }

    // Navigation components
    if (
      name.includes('nav') ||
      name.includes('menu') ||
      name.includes('breadcrumb') ||
      name.includes('tab')
    ) {
      return 'navigation';
    }

    // Footer components
    if (name.includes('footer')) {
      return 'footers';
    }

    // Testimonial components
    if (name.includes('testimonial') || name.includes('review') || name.includes('quote')) {
      return 'testimonials';
    }

    // Pricing components
    if (name.includes('pricing') || name.includes('plan') || name.includes('package')) {
      return 'pricing';
    }

    // Feature components
    if (name.includes('feature') || name.includes('benefit') || name.includes('icon-text')) {
      return 'features';
    }

    return 'other';
  }

  /**
   * Generate WordPress block patterns from classified components
   */
  generatePatterns(classified: ClassifiedComponents, tokens: DesignTokens): WordPressPattern[] {
    const patterns: WordPressPattern[] = [];

    // Generate card patterns
    for (const card of classified.cards) {
      patterns.push(this.generateCardPattern(card, tokens));
    }

    // Generate testimonial patterns
    for (const testimonial of classified.testimonials) {
      patterns.push(this.generateTestimonialPattern(testimonial, tokens));
    }

    // Generate pricing patterns
    for (const pricing of classified.pricing) {
      patterns.push(this.generatePricingPattern(pricing, tokens));
    }

    // Generate feature patterns
    for (const feature of classified.features) {
      patterns.push(this.generateFeaturePattern(feature, tokens));
    }

    // Generate header patterns
    for (const header of classified.headers) {
      patterns.push(this.generateHeaderPattern(header, tokens));
    }

    this.log(`Generated ${patterns.length} patterns`);
    return patterns;
  }

  /**
   * Generate card pattern
   */
  generateCardPattern(comp: FigmaComponentExtended, tokens: DesignTokens): WordPressPattern {
    const borderRadius = tokens.borderRadius?.lg || '12px';
    const spacing = tokens.spacing?.lg || '24px';
    const shadow = tokens.shadows?.md || '0 4px 6px -1px rgba(0, 0, 0, 0.1)';

    return {
      name: `figma/${this.generatePatternSlug(comp.name)}`,
      title: comp.name,
      categories: ['cards', 'figma-import'],
      description: comp.description || 'Card component imported from Figma',
      content: `<!-- wp:group {"style":{"border":{"radius":"${borderRadius}"},"spacing":{"padding":{"top":"${spacing}","bottom":"${spacing}","left":"${spacing}","right":"${spacing}"}},"shadow":"${shadow}"},"backgroundColor":"surface"} -->
<div class="wp-block-group has-surface-background-color has-background" style="border-radius:${borderRadius};padding:${spacing};box-shadow:${shadow}">

  <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"20px"}}} -->
  <h3 style="font-size:20px">Card Title</h3>
  <!-- /wp:heading -->

  <!-- wp:paragraph -->
  <p>Card description text goes here. This pattern was imported from your Figma design.</p>
  <!-- /wp:paragraph -->

  <!-- wp:buttons -->
  <div class="wp-block-buttons">
    <!-- wp:button -->
    <div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Learn More</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->

</div>
<!-- /wp:group -->`,
    };
  }

  /**
   * Generate testimonial pattern
   */
  generateTestimonialPattern(comp: FigmaComponentExtended, tokens: DesignTokens): WordPressPattern {
    const primaryColor = tokens.colors?.primary || '#51a351';
    const spacing = tokens.spacing?.lg || '24px';

    return {
      name: `figma/${this.generatePatternSlug(comp.name)}`,
      title: comp.name,
      categories: ['testimonials', 'figma-import'],
      description: comp.description || 'Testimonial component imported from Figma',
      content: `<!-- wp:group {"style":{"spacing":{"padding":{"top":"${spacing}","bottom":"${spacing}"}}}} -->
<div class="wp-block-group" style="padding-top:${spacing};padding-bottom:${spacing}">

  <!-- wp:quote {"className":"is-style-large","style":{"border":{"left":{"color":"${primaryColor}","width":"4px"}}}} -->
  <blockquote class="wp-block-quote is-style-large" style="border-left:4px solid ${primaryColor}">
    <p>"This is an amazing product! It has completely transformed how we work."</p>
    <cite>— John Doe, CEO at Company</cite>
  </blockquote>
  <!-- /wp:quote -->

</div>
<!-- /wp:group -->`,
    };
  }

  /**
   * Generate pricing pattern
   */
  generatePricingPattern(comp: FigmaComponentExtended, tokens: DesignTokens): WordPressPattern {
    const borderRadius = tokens.borderRadius?.lg || '12px';
    const spacing = tokens.spacing?.lg || '24px';
    const primaryColor = tokens.colors?.primary || '#51a351';

    return {
      name: `figma/${this.generatePatternSlug(comp.name)}`,
      title: comp.name,
      categories: ['pricing', 'figma-import'],
      description: comp.description || 'Pricing component imported from Figma',
      content: `<!-- wp:group {"style":{"border":{"radius":"${borderRadius}","width":"1px","color":"#e0e0e0"},"spacing":{"padding":{"top":"32px","bottom":"32px","left":"${spacing}","right":"${spacing}"}}}} -->
<div class="wp-block-group" style="border:1px solid #e0e0e0;border-radius:${borderRadius};padding:32px ${spacing}">

  <!-- wp:heading {"textAlign":"center","level":3} -->
  <h3 class="has-text-align-center">Pro Plan</h3>
  <!-- /wp:heading -->

  <!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"36px","fontWeight":"700"}}} -->
  <p class="has-text-align-center" style="font-size:36px;font-weight:700">$29<span style="font-size:16px;font-weight:400">/month</span></p>
  <!-- /wp:paragraph -->

  <!-- wp:list -->
  <ul>
    <li>Unlimited users</li>
    <li>Premium support</li>
    <li>Advanced features</li>
  </ul>
  <!-- /wp:list -->

  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  <div class="wp-block-buttons">
    <!-- wp:button {"width":100,"style":{"color":{"background":"${primaryColor}"}}} -->
    <div class="wp-block-button has-custom-width wp-block-button__width-100"><a class="wp-block-button__link has-background wp-element-button" style="background-color:${primaryColor}">Get Started</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->

</div>
<!-- /wp:group -->`,
    };
  }

  /**
   * Generate feature pattern
   */
  generateFeaturePattern(comp: FigmaComponentExtended, tokens: DesignTokens): WordPressPattern {
    const primaryColor = tokens.colors?.primary || '#51a351';

    return {
      name: `figma/${this.generatePatternSlug(comp.name)}`,
      title: comp.name,
      categories: ['features', 'figma-import'],
      description: comp.description || 'Feature component imported from Figma',
      content: `<!-- wp:group {"style":{"spacing":{"padding":{"top":"24px","bottom":"24px"}}}} -->
<div class="wp-block-group" style="padding-top:24px;padding-bottom:24px">

  <!-- wp:paragraph {"style":{"typography":{"fontSize":"32px"},"color":{"text":"${primaryColor}"}}} -->
  <p class="has-text-color" style="color:${primaryColor};font-size:32px">✓</p>
  <!-- /wp:paragraph -->

  <!-- wp:heading {"level":4} -->
  <h4>Feature Title</h4>
  <!-- /wp:heading -->

  <!-- wp:paragraph -->
  <p>Brief description of this feature and why it matters to your customers.</p>
  <!-- /wp:paragraph -->

</div>
<!-- /wp:group -->`,
    };
  }

  /**
   * Generate header pattern
   */
  generateHeaderPattern(comp: FigmaComponentExtended, tokens: DesignTokens): WordPressPattern {
    const primaryColor = tokens.colors?.primary || '#51a351';

    return {
      name: `figma/${this.generatePatternSlug(comp.name)}`,
      title: comp.name,
      categories: ['headers', 'figma-import'],
      description: comp.description || 'Header component imported from Figma',
      content: `<!-- wp:cover {"dimRatio":50,"minHeight":500,"align":"full","style":{"color":{"background":"${primaryColor}"}}} -->
<div class="wp-block-cover alignfull" style="min-height:500px">
  <div class="wp-block-cover__inner-container">

    <!-- wp:heading {"textAlign":"center","level":1,"style":{"color":{"text":"#ffffff"},"typography":{"fontSize":"48px"}}} -->
    <h1 class="has-text-align-center has-text-color" style="color:#ffffff;font-size:48px">Welcome to Our Site</h1>
    <!-- /wp:heading -->

    <!-- wp:paragraph {"align":"center","style":{"color":{"text":"#ffffff"},"typography":{"fontSize":"18px"}}} -->
    <p class="has-text-align-center has-text-color" style="color:#ffffff;font-size:18px">Discover amazing products and services tailored just for you.</p>
    <!-- /wp:paragraph -->

    <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
    <div class="wp-block-buttons">
      <!-- wp:button {"backgroundColor":"white","textColor":"primary"} -->
      <div class="wp-block-button"><a class="wp-block-button__link has-primary-color has-white-background-color has-text-color has-background wp-element-button">Get Started</a></div>
      <!-- /wp:button -->
      <!-- wp:button {"className":"is-style-outline","style":{"color":{"text":"#ffffff"},"border":{"color":"#ffffff"}}} -->
      <div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-text-color wp-element-button" style="color:#ffffff;border-color:#ffffff">Learn More</a></div>
      <!-- /wp:button -->
    </div>
    <!-- /wp:buttons -->

  </div>
</div>
<!-- /wp:cover -->`,
    };
  }

  /**
   * Generate PHP code for registering patterns in WordPress
   */
  generatePatternsPhp(patterns: WordPressPattern[]): string {
    if (patterns.length === 0) {
      return '';
    }

    const registrations = patterns.map((pattern) => {
      // Escape the content for PHP string
      const escapedContent = this.escapePhpString(pattern.content);

      return `    register_block_pattern(
        '${pattern.name}',
        array(
            'title'       => '${this.escapePhpString(pattern.title)}',
            'description' => '${this.escapePhpString(pattern.description || '')}',
            'categories'  => array('${pattern.categories.join("', '")}'),
            'content'     => '${escapedContent}',
        )
    );`;
    });

    return `<?php
/**
 * Block Patterns imported from Figma
 * Generated by AI Site Builder
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Register pattern category for Figma imports
add_action('init', function() {
    register_block_pattern_category(
        'figma-import',
        array('label' => __('Figma Imports', 'ai-site-builder'))
    );
});

// Register block patterns
add_action('init', function() {
${registrations.join('\n\n')}
});
`;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generatePatternSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private escapePhpString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  private logSummary(classified: ClassifiedComponents): void {
    const counts = {
      buttons: classified.buttons.length,
      cards: classified.cards.length,
      headers: classified.headers.length,
      forms: classified.forms.length,
      navigation: classified.navigation.length,
      footers: classified.footers.length,
      testimonials: classified.testimonials.length,
      pricing: classified.pricing.length,
      features: classified.features.length,
      other: classified.other.length,
    };

    this.log(`Classification summary: ${JSON.stringify(counts)}`);
  }

  private log(message: string): void {
    if (this.logger) {
      this.logger.info(`[FigmaComponentMapper] ${message}`);
    }
  }
}

export default FigmaComponentMapper;
