/**
 * Mock Structure Factory - Generate realistic test data for development
 *
 * Provides pre-defined site structures that simulate Claude's output
 * for rapid testing of the site creation flow.
 */

import { SiteStructure, EnhancedChipOption } from './types';

/**
 * Generate a realistic mock site structure for testing
 * Simulates what Claude would generate for a photography portfolio site
 */
export function createMockSiteStructure(siteName?: string): SiteStructure {
  const timestamp = Date.now();
  const themeName = siteName
    ? `${siteName.toLowerCase().replace(/\s+/g, '-')}-theme`
    : `test-portfolio-${timestamp}`;

  return {
    content: {
      status: 'ready',
      postTypes: [
        {
          name: 'Project',
          slug: 'project',
          description: 'Photography projects and client shoots',
          fields: [
            {
              name: 'client_name',
              type: 'text',
              label: 'Client Name',
              required: false,
              instructions: 'Enter the name of the client for this project',
            },
            {
              name: 'project_date',
              type: 'date_picker',
              label: 'Project Date',
              required: true,
              instructions: 'When was this project completed?',
            },
            {
              name: 'location',
              type: 'text',
              label: 'Location',
              required: false,
              instructions: 'Where was this project shot?',
            },
            {
              name: 'cover_image',
              type: 'image',
              label: 'Cover Image',
              required: true,
              instructions: 'Main image for the project (will be used as thumbnail)',
            },
            {
              name: 'gallery',
              type: 'gallery',
              label: 'Photo Gallery',
              required: true,
              instructions: 'Upload all photos from this project',
            },
            {
              name: 'description',
              type: 'wysiwyg',
              label: 'Project Description',
              required: false,
              instructions: 'Describe the project, goals, and outcomes',
            },
            {
              name: 'featured',
              type: 'true_false',
              label: 'Featured Project',
              required: false,
              instructions: 'Display this project prominently on the homepage',
            },
          ],
          taxonomies: [
            {
              name: 'Project Category',
              slug: 'project-category',
              hierarchical: true,
            },
            {
              name: 'Project Tag',
              slug: 'project-tag',
              hierarchical: false,
            },
          ],
          supports: ['title', 'editor', 'thumbnail', 'excerpt'],
          icon: 'dashicons-camera',
        },
        {
          name: 'Testimonial',
          slug: 'testimonial',
          description: 'Client testimonials and reviews',
          fields: [
            {
              name: 'client_name',
              type: 'text',
              label: 'Client Name',
              required: true,
              instructions: 'Full name of the person giving the testimonial',
            },
            {
              name: 'client_photo',
              type: 'image',
              label: 'Client Photo',
              required: false,
              instructions: 'Optional photo of the client',
            },
            {
              name: 'company',
              type: 'text',
              label: 'Company',
              required: false,
              instructions: 'Client company or organization',
            },
            {
              name: 'rating',
              type: 'number',
              label: 'Rating',
              required: false,
              instructions: 'Rating from 1-5 stars',
            },
            {
              name: 'testimonial_text',
              type: 'textarea',
              label: 'Testimonial',
              required: true,
              instructions: 'The testimonial content',
            },
            {
              name: 'date_received',
              type: 'date_picker',
              label: 'Date Received',
              required: false,
            },
          ],
          supports: ['title'],
          icon: 'dashicons-format-quote',
        },
      ],
    },
    design: {
      status: 'ready',
      theme: {
        base: 'twentytwentyfive' as const,
        childThemeName: themeName,
        designTokens: {
          colors: {
            primary: '#2C3E50',
            secondary: '#E74C3C',
            text: '#333333',
            background: '#FFFFFF',
          },
          typography: {
            fontFamilies: ['Playfair Display', 'Open Sans'],
            fontSizes: {
              base: '16px',
              large: '24px',
            },
            lineHeights: {
              base: '1.6',
              heading: '1.2',
            },
          },
          spacing: {
            sm: '16px',
            md: '32px',
            lg: '64px',
          },
          borderRadius: {
            sm: '4px',
            md: '8px',
          },
        },
      },
    },
    features: {
      status: 'ready',
      plugins: [
        {
          slug: 'advanced-custom-fields',
          name: 'Advanced Custom Fields',
          reason: 'Required for custom fields and field groups (free version)',
          required: true,
          confidence: 100,
        },
        {
          slug: 'contact-form-7',
          name: 'Contact Form 7',
          reason: 'Simple contact form for client inquiries',
          required: true,
          confidence: 95,
        },
        {
          slug: 'wordpress-seo',
          name: 'Yoast SEO',
          reason: 'SEO optimization for better portfolio visibility',
          required: false,
          confidence: 85,
        },
        {
          slug: 'wp-smushit',
          name: 'Smush Image Optimization',
          reason: 'Optimize photography images for faster loading',
          required: false,
          confidence: 80,
        },
      ],
    },
  };
}

/**
 * Create a minimal mock structure for quick testing
 */
export function createMinimalMockStructure(): SiteStructure {
  return {
    content: {
      status: 'ready',
      postTypes: [
        {
          name: 'Portfolio Item',
          slug: 'portfolio',
          description: 'Simple portfolio items',
          fields: [
            {
              name: 'description',
              type: 'textarea',
              label: 'Description',
              required: false,
            },
          ],
          supports: ['title', 'thumbnail'],
          icon: 'dashicons-portfolio',
        },
      ],
    },
    design: {
      status: 'ready',
      theme: {
        base: 'twentytwentyfive' as const,
        childThemeName: 'minimal-test-theme',
        designTokens: {
          colors: {
            primary: '#0073AA',
            secondary: '#D63638',
            text: '#1E1E1E',
            background: '#FFFFFF',
          },
          typography: {
            fontFamilies: ['system-ui', 'sans-serif'],
            fontSizes: {
              base: '16px',
              large: '20px',
            },
            lineHeights: {
              base: '1.5',
              heading: '1.2',
            },
          },
          spacing: {
            sm: '8px',
            md: '16px',
            lg: '32px',
          },
          borderRadius: {
            sm: '4px',
            md: '8px',
          },
        },
      },
    },
    features: {
      status: 'ready',
      plugins: [
        {
          slug: 'contact-form-7',
          name: 'Contact Form 7',
          reason: 'Basic contact functionality',
          required: true,
          confidence: 90,
        },
      ],
    },
  };
}

/**
 * Create site structure from wizard answers
 * Generates appropriate content types, plugins, and theme based on user selections
 *
 * @param answers - Wizard answers from user selections
 * @param aiOptions - Optional AI-suggested options that were selected, with their structure mappings
 * @param recommendedPlugins - Optional AI-recommended plugins from wizard flow
 */
export function createStructureFromAnswers(
  answers: {
    siteName?: string;
    contentCreators?: string[];
    visitorActions?: string[];
    requiredPages?: string[];
    homepageContent?: string[];
  },
  aiOptions?: EnhancedChipOption[],
  recommendedPlugins?: Array<{ slug: string; name: string; reason: string }>
): SiteStructure {
  const siteName = answers.siteName || 'my-site';
  const themeName = `${siteName.toLowerCase().replace(/\s+/g, '-')}-theme`;

  // Build post types based on content creators
  const postTypes: SiteStructure['content']['postTypes'] = [];
  const plugins: SiteStructure['features']['plugins'] = [];
  const menus: SiteStructure['content']['menus'] = [];
  const pluginSlugs = new Set<string>(); // Track added plugins to avoid duplicates

  // Analyze content creators to determine post types
  const creators = answers.contentCreators || [];
  const actions = answers.visitorActions || [];

  // Business/Team content
  if (creators.includes('team-members') || creators.includes('multiple-authors')) {
    postTypes.push({
      name: 'Team Member',
      slug: 'team-member',
      description: 'Staff and team member profiles',
      fields: [
        { name: 'role', type: 'text', label: 'Job Title', required: true },
        { name: 'bio', type: 'wysiwyg', label: 'Biography', required: false },
        { name: 'photo', type: 'image', label: 'Profile Photo', required: true },
        { name: 'email', type: 'email', label: 'Email', required: false },
        { name: 'social_links', type: 'repeater', label: 'Social Links', required: false },
      ],
      supports: ['title', 'thumbnail'],
      icon: 'dashicons-groups',
    });
  }

  // E-commerce / Products
  if (actions.includes('purchase-products') || actions.includes('book-services')) {
    if (actions.includes('purchase-products') && !pluginSlugs.has('woocommerce')) {
      plugins.push({
        slug: 'woocommerce',
        name: 'WooCommerce',
        reason: 'E-commerce functionality for selling products',
        required: true,
        confidence: 95,
      });
      pluginSlugs.add('woocommerce');
    }

    if (actions.includes('book-services')) {
      postTypes.push({
        name: 'Service',
        slug: 'service',
        description: 'Services offered',
        fields: [
          { name: 'price', type: 'number', label: 'Price', required: false },
          { name: 'duration', type: 'text', label: 'Duration', required: false },
          { name: 'description', type: 'wysiwyg', label: 'Description', required: true },
          { name: 'featured_image', type: 'image', label: 'Featured Image', required: false },
        ],
        supports: ['title', 'editor', 'thumbnail'],
        icon: 'dashicons-hammer',
      });
    }
  }

  // Portfolio / Projects
  if (creators.includes('single-owner') || actions.includes('view-portfolio')) {
    postTypes.push({
      name: 'Project',
      slug: 'project',
      description: 'Portfolio projects and work samples',
      fields: [
        { name: 'client', type: 'text', label: 'Client', required: false },
        { name: 'project_url', type: 'url', label: 'Project URL', required: false },
        { name: 'gallery', type: 'gallery', label: 'Project Gallery', required: false },
        { name: 'description', type: 'wysiwyg', label: 'Description', required: true },
      ],
      taxonomies: [
        { name: 'Project Category', slug: 'project-category', hierarchical: true },
        { name: 'Project Tag', slug: 'project-tag', hierarchical: false },
      ],
      supports: ['title', 'editor', 'thumbnail'],
      icon: 'dashicons-portfolio',
    });
  }

  // Blog / Content
  if (creators.includes('guest-contributors') || actions.includes('read-articles')) {
    postTypes.push({
      name: 'Article',
      slug: 'article',
      description: 'Blog posts and articles',
      fields: [
        { name: 'author_bio', type: 'textarea', label: 'Author Bio', required: false },
        { name: 'featured_image', type: 'image', label: 'Featured Image', required: false },
      ],
      taxonomies: [
        { name: 'Category', slug: 'category', hierarchical: true },
        { name: 'Tag', slug: 'post_tag', hierarchical: false },
      ],
      supports: ['title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments'],
      icon: 'dashicons-admin-post',
    });
  }

  // Events
  if (actions.includes('register-events')) {
    postTypes.push({
      name: 'Event',
      slug: 'event',
      description: 'Events and happenings',
      fields: [
        { name: 'event_date', type: 'date_picker', label: 'Event Date', required: true },
        { name: 'event_time', type: 'time_picker', label: 'Event Time', required: false },
        { name: 'location', type: 'text', label: 'Location', required: false },
        { name: 'registration_url', type: 'url', label: 'Registration URL', required: false },
        { name: 'description', type: 'wysiwyg', label: 'Description', required: true },
      ],
      supports: ['title', 'editor', 'thumbnail'],
      icon: 'dashicons-calendar-alt',
    });
  }

  // Contact form
  if (actions.includes('contact-us') || actions.includes('submit-forms')) {
    if (!pluginSlugs.has('contact-form-7')) {
      plugins.push({
        slug: 'contact-form-7',
        name: 'Contact Form 7',
        reason: 'Contact form for visitor inquiries',
        required: true,
        confidence: 95,
      });
      pluginSlugs.add('contact-form-7');
    }
  }

  // If no specific post types were created, add a basic one
  if (postTypes.length === 0) {
    postTypes.push({
      name: 'Portfolio Item',
      slug: 'portfolio',
      description: 'Showcase your work',
      fields: [
        { name: 'description', type: 'wysiwyg', label: 'Description', required: false },
        { name: 'gallery', type: 'gallery', label: 'Gallery', required: false },
      ],
      supports: ['title', 'editor', 'thumbnail'],
      icon: 'dashicons-portfolio',
    });
  }

  // Create pages from required pages
  const requiredPages = answers.requiredPages || [];
  const pages: { title: string; slug: string; template?: string; content?: string }[] = [];
  if (requiredPages.length > 0) {
    const menuItems = requiredPages.map((page, index) => {
      const title = page.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const slug = page.toLowerCase().replace(/\s+/g, '-');

      // Add to pages array
      pages.push({
        title,
        slug,
      });

      return {
        title,
        url: `/${slug}`,
        order: index + 1,
      };
    });

    menus.push({
      name: 'Primary Navigation',
      location: 'primary',
      items: [{ title: 'Home', url: '/', order: 0 }, ...menuItems],
    });
  }

  // Merge AI-suggested structure mappings from selected options
  if (aiOptions && aiOptions.length > 0) {
    for (const opt of aiOptions) {
      if (opt.source === 'ai' && opt.structureMapping) {
        const mapping = opt.structureMapping;

        // Add AI-suggested plugins (avoid duplicates)
        if (mapping.plugins) {
          for (const pluginSlug of mapping.plugins) {
            if (!pluginSlugs.has(pluginSlug)) {
              plugins.push({
                slug: pluginSlug,
                name: pluginSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                reason: `AI suggestion based on: ${opt.label}`,
                required: false,
                confidence: opt.confidence ? Math.round(opt.confidence * 100) : 80,
              });
              pluginSlugs.add(pluginSlug);
            }
          }
        }

        // Add AI-suggested pages to menu
        if (mapping.pages) {
          const existingMenuUrls = new Set(menus.flatMap((m) => m.items?.map((i) => i.url) || []));
          const primaryMenu = menus.find((m) => m.location === 'primary');

          for (const pageslug of mapping.pages) {
            const pageUrl = `/${pageslug}`;
            if (!existingMenuUrls.has(pageUrl) && primaryMenu?.items) {
              primaryMenu.items.push({
                title: pageslug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                url: pageUrl,
              });
              existingMenuUrls.add(pageUrl);
            }
          }
        }

        // Note: postTypes and taxonomies from AI are hints for future enhancement
        if (mapping.postTypes?.length || mapping.taxonomies?.length) {
          console.log('[createStructureFromAnswers] AI suggested structures:', {
            option: opt.label,
            postTypes: mapping.postTypes,
            taxonomies: mapping.taxonomies,
          });
        }
      }
    }
  }

  // Add AI-recommended plugins from wizard flow
  if (recommendedPlugins && recommendedPlugins.length > 0) {
    console.log(
      '[createStructureFromAnswers] Processing AI-recommended plugins:',
      recommendedPlugins
    );
    for (const plugin of recommendedPlugins) {
      if (!pluginSlugs.has(plugin.slug)) {
        plugins.push({
          slug: plugin.slug,
          name: plugin.name,
          reason: plugin.reason,
          required: false,
          confidence: 85, // AI recommendations have good confidence
        });
        pluginSlugs.add(plugin.slug);
      }
    }
  }

  // Add ACF only if we have post types with custom fields
  const hasCustomFields = postTypes.some((pt) => pt.fields && pt.fields.length > 0);
  if (hasCustomFields && !pluginSlugs.has('advanced-custom-fields')) {
    plugins.unshift({
      // Add at beginning since it's foundational
      slug: 'advanced-custom-fields',
      name: 'Advanced Custom Fields',
      reason: 'Required for custom content fields on your post types',
      required: true,
      confidence: 100,
    });
    pluginSlugs.add('advanced-custom-fields');
  }

  return {
    content: {
      status: 'ready',
      postTypes,
      pages,
      menus,
    },
    design: {
      status: 'ready',
      theme: {
        base: 'twentytwentyfive' as const,
        childThemeName: themeName,
        designTokens: {
          colors: {
            primary: '#51a351',
            secondary: '#2C3E50',
            text: '#333333',
            background: '#FFFFFF',
          },
          typography: {
            fontFamilies: ['Inter', 'system-ui', 'sans-serif'],
            fontSizes: {
              base: '16px',
              large: '24px',
            },
            lineHeights: {
              base: '1.6',
              heading: '1.2',
            },
          },
          spacing: {
            sm: '16px',
            md: '32px',
            lg: '64px',
          },
          borderRadius: {
            sm: '4px',
            md: '8px',
          },
        },
      },
    },
    features: {
      status: 'ready',
      plugins,
    },
  };
}
