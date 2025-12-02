/**
 * Tests for mock-structure.ts
 * Focuses on createStructureFromAnswers with AI-enhanced options
 */

import { createStructureFromAnswers } from '../../src/common/mock-structure';
import { EnhancedChipOption } from '../../src/common/types';

describe('createStructureFromAnswers', () => {
  describe('without AI options', () => {
    it('should create a basic structure with site name', () => {
      const answers = {
        siteName: 'My Test Site',
        contentCreators: ['just-me'],
        visitorActions: ['read-content'],
        requiredPages: ['about', 'contact'],
        homepageContent: ['hero-section'],
      };

      const structure = createStructureFromAnswers(answers);

      expect(structure.content.status).toBe('ready');
      expect(structure.design.status).toBe('ready');
      expect(structure.features.status).toBe('ready');
      expect(structure.design.theme.childThemeName).toBe('my-test-site-theme');
    });

    it('should add ACF plugin by default', () => {
      const answers = {
        siteName: 'Test Site',
      };

      const structure = createStructureFromAnswers(answers);

      const acfPlugin = structure.features.plugins.find(p => p.slug === 'advanced-custom-fields');
      expect(acfPlugin).toBeDefined();
      expect(acfPlugin?.required).toBe(true);
    });

    it('should create navigation from required pages', () => {
      const answers = {
        siteName: 'Test Site',
        requiredPages: ['about', 'contact', 'faq'],
      };

      const structure = createStructureFromAnswers(answers);

      const primaryMenu = structure.content.menus?.find(m => m.location === 'primary');
      expect(primaryMenu).toBeDefined();
      expect(primaryMenu?.items).toHaveLength(4); // Home + 3 pages
      expect(primaryMenu?.items?.[0].title).toBe('Home');
      expect(primaryMenu?.items?.[1].title).toBe('About');
    });
  });

  describe('with AI options', () => {
    it('should add AI-suggested plugins to the structure', () => {
      const answers = {
        siteName: 'Recipe Blog',
        contentCreators: ['just-me'],
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'ai-recipe-manager',
          label: 'Recipe Management',
          value: 'recipe-management',
          source: 'ai',
          structureMapping: {
            plugins: ['wp-recipe-maker', 'wp-nutrition-label'],
          },
        },
      ];

      const structure = createStructureFromAnswers(answers, aiOptions);

      const recipePlugin = structure.features.plugins.find(p => p.slug === 'wp-recipe-maker');
      expect(recipePlugin).toBeDefined();
      expect(recipePlugin?.reason).toContain('AI suggestion');
      expect(recipePlugin?.reason).toContain('Recipe Management');

      const nutritionPlugin = structure.features.plugins.find(p => p.slug === 'wp-nutrition-label');
      expect(nutritionPlugin).toBeDefined();
    });

    it('should not duplicate existing plugins', () => {
      const answers = {
        siteName: 'Test Site',
        visitorActions: ['contact-us'], // This adds contact-form-7
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'ai-contact',
          label: 'Contact Form',
          value: 'contact-form',
          source: 'ai',
          structureMapping: {
            plugins: ['contact-form-7'], // Already added by contact-us action
          },
        },
      ];

      const structure = createStructureFromAnswers(answers, aiOptions);

      // Should only have one contact-form-7 plugin
      const cf7Plugins = structure.features.plugins.filter(p => p.slug === 'contact-form-7');
      expect(cf7Plugins).toHaveLength(1);
    });

    it('should add AI-suggested pages to navigation menu', () => {
      const answers = {
        siteName: 'Test Site',
        requiredPages: ['about'],
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'ai-testimonials-page',
          label: 'Testimonials Page',
          value: 'testimonials-page',
          source: 'ai',
          structureMapping: {
            pages: ['testimonials', 'case-studies'],
          },
        },
      ];

      const structure = createStructureFromAnswers(answers, aiOptions);

      const primaryMenu = structure.content.menus?.find(m => m.location === 'primary');
      expect(primaryMenu).toBeDefined();

      const testimonialMenuItem = primaryMenu?.items?.find(i => i.url === '/testimonials');
      expect(testimonialMenuItem).toBeDefined();
      expect(testimonialMenuItem?.title).toBe('Testimonials');

      const caseStudiesMenuItem = primaryMenu?.items?.find(i => i.url === '/case-studies');
      expect(caseStudiesMenuItem).toBeDefined();
    });

    it('should not add duplicate pages to menu', () => {
      const answers = {
        siteName: 'Test Site',
        requiredPages: ['about', 'testimonials'], // Already has testimonials
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'ai-testimonials',
          label: 'Testimonials',
          value: 'testimonials',
          source: 'ai',
          structureMapping: {
            pages: ['testimonials'], // Duplicate
          },
        },
      ];

      const structure = createStructureFromAnswers(answers, aiOptions);

      const primaryMenu = structure.content.menus?.find(m => m.location === 'primary');
      const testimonialItems = primaryMenu?.items?.filter(i => i.url === '/testimonials');
      expect(testimonialItems?.length).toBe(1);
    });

    it('should ignore non-AI options (source !== "ai")', () => {
      const answers = {
        siteName: 'Test Site',
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'base-option',
          label: 'Base Option',
          value: 'base-option',
          source: 'base', // Not an AI option
          structureMapping: {
            plugins: ['should-not-be-added'],
          },
        },
      ];

      const structure = createStructureFromAnswers(answers, aiOptions);

      const unexpectedPlugin = structure.features.plugins.find(p => p.slug === 'should-not-be-added');
      expect(unexpectedPlugin).toBeUndefined();
    });

    it('should handle AI options without structureMapping', () => {
      const answers = {
        siteName: 'Test Site',
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'ai-no-mapping',
          label: 'No Structure Mapping',
          value: 'no-mapping',
          source: 'ai',
          // No structureMapping
        },
      ];

      // Should not throw
      expect(() => createStructureFromAnswers(answers, aiOptions)).not.toThrow();

      const structure = createStructureFromAnswers(answers, aiOptions);
      expect(structure).toBeDefined();
    });

    it('should use confidence score for AI plugin confidence', () => {
      const answers = {
        siteName: 'Test Site',
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'ai-plugin',
          label: 'Custom Plugin',
          value: 'custom-plugin',
          source: 'ai',
          confidence: 0.75,
          structureMapping: {
            plugins: ['custom-plugin-slug'],
          },
        },
      ];

      const structure = createStructureFromAnswers(answers, aiOptions);

      const plugin = structure.features.plugins.find(p => p.slug === 'custom-plugin-slug');
      expect(plugin?.confidence).toBe(75); // 0.75 * 100
    });

    it('should default to 80% confidence when not specified', () => {
      const answers = {
        siteName: 'Test Site',
      };

      const aiOptions: EnhancedChipOption[] = [
        {
          id: 'ai-plugin',
          label: 'Custom Plugin',
          value: 'custom-plugin',
          source: 'ai',
          // No confidence specified
          structureMapping: {
            plugins: ['no-confidence-plugin'],
          },
        },
      ];

      const structure = createStructureFromAnswers(answers, aiOptions);

      const plugin = structure.features.plugins.find(p => p.slug === 'no-confidence-plugin');
      expect(plugin?.confidence).toBe(80);
    });
  });
});
