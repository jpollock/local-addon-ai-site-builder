/**
 * Structure Applicator - Applies AI-generated site structure to WordPress sites
 *
 * This module handles applying the Three Pillars structure:
 * - Content (ACF fields, custom post types, taxonomies)
 * - Design (theme, colors, typography)
 * - Features (plugins, custom functionality)
 */

import * as LocalMain from '@getflywheel/local/main';
import {
  SiteStructure,
  ContentType,
  PageStructure,
  FigmaAnalysis,
  DesignTokens,
} from '../common/types';
import { FigmaPageGenerator } from './figma-page-generator';
import { FigmaComponentMapper } from './figma-component-mapper';
import {
  sanitizeForPHP,
  sanitizeForWordPress,
  sanitizeSlug,
  sanitizeName,
} from './utils/validators';
import { validateWpCliCommand } from './utils/prompt-sanitizer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Pre-flight check results
 */
interface PreFlightCheckResult {
  passed: boolean;
  checks: {
    siteRunning: boolean;
    wpCliAvailable: boolean;
    sitePathExists: boolean;
    databaseReady: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Safely execute a WP-CLI command after validating it against the allowlist
 * This prevents execution of dangerous commands that could harm the site
 */
async function _safeWpCliRun(
  wpCli: any,
  site: any,
  command: string[],
  localLogger: any
): Promise<string> {
  // Validate the command against our allowlist
  const validation = validateWpCliCommand(command);

  if (!validation.valid) {
    localLogger.error(`[AI Site Builder] Blocked dangerous WP-CLI command: ${command.join(' ')}`);
    localLogger.error(`[AI Site Builder] Reason: ${validation.reason}`);
    throw new Error(`WP-CLI command blocked for security: ${validation.reason}`);
  }

  // Execute the validated command
  return await wpCli.run(site, command);
}

/**
 * Perform pre-flight checks before applying structure to a WordPress site
 * Verifies the site is running, WP-CLI is available, and database is ready
 */
async function performPreFlightChecks(site: any, localLogger: any): Promise<PreFlightCheckResult> {
  const services = LocalMain.getServiceContainer().cradle as any;
  const { siteProcessManager, wpCli, siteDatabase } = services;

  const result: PreFlightCheckResult = {
    passed: true,
    checks: {
      siteRunning: false,
      wpCliAvailable: false,
      sitePathExists: false,
      databaseReady: false,
    },
    errors: [],
    warnings: [],
  };

  // Check 1: Site is running
  try {
    const siteStatus = siteProcessManager.getSiteStatus(site);
    result.checks.siteRunning = siteStatus === 'running';

    if (!result.checks.siteRunning) {
      result.errors.push(
        `Site is not running (status: ${siteStatus}). Please start the site first.`
      );
      result.passed = false;
    } else {
      localLogger.info(`[AI Site Builder] ✓ Pre-flight: Site is running`);
    }
  } catch (error) {
    result.errors.push(`Failed to check site status: ${(error as Error).message}`);
    result.passed = false;
  }

  // Check 2: Site path exists
  try {
    const sitePath = site.paths?.app;
    if (sitePath && fs.existsSync(sitePath)) {
      result.checks.sitePathExists = true;
      localLogger.info(`[AI Site Builder] ✓ Pre-flight: Site path exists`);
    } else {
      result.errors.push(`Site path does not exist: ${sitePath}`);
      result.passed = false;
    }
  } catch (error) {
    result.errors.push(`Failed to check site path: ${(error as Error).message}`);
    result.passed = false;
  }

  // Check 3: WP-CLI is available and working
  try {
    // Try a simple WP-CLI command to verify it's working
    await wpCli.run(site, ['core', 'is-installed']);
    result.checks.wpCliAvailable = true;
    localLogger.info(`[AI Site Builder] ✓ Pre-flight: WP-CLI is working`);
  } catch (error) {
    // WP-CLI might fail if WordPress isn't fully installed yet - this is a warning, not a blocker
    result.warnings.push(
      `WP-CLI check returned error (may be normal during site setup): ${(error as Error).message}`
    );
    result.checks.wpCliAvailable = false;
    // Don't fail pre-flight for this - the site might still be installing
    localLogger.warn(`[AI Site Builder] ⚠ Pre-flight: WP-CLI check inconclusive (may retry later)`);
  }

  // Check 4: Database is ready
  try {
    // Wait for database to be ready with a timeout
    const dbReady = await Promise.race([
      siteDatabase.waitForDB(site).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10000)), // 10 second timeout
    ]);

    result.checks.databaseReady = dbReady;

    if (dbReady) {
      localLogger.info(`[AI Site Builder] ✓ Pre-flight: Database is ready`);
    } else {
      result.warnings.push('Database readiness check timed out. Will attempt to proceed.');
      localLogger.warn(`[AI Site Builder] ⚠ Pre-flight: Database check timed out`);
    }
  } catch (error) {
    result.warnings.push(`Failed to verify database readiness: ${(error as Error).message}`);
    localLogger.warn(`[AI Site Builder] ⚠ Pre-flight: Database check failed (may retry later)`);
  }

  // Log summary
  if (result.passed) {
    localLogger.info(`[AI Site Builder] ✓ Pre-flight checks passed`);
  } else {
    localLogger.error(`[AI Site Builder] ✗ Pre-flight checks failed:`);
    result.errors.forEach((err) => localLogger.error(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    result.warnings.forEach((warn) => localLogger.warn(`  ⚠ ${warn}`));
  }

  // Throw if critical checks failed
  if (!result.passed) {
    throw new Error(`Pre-flight checks failed: ${result.errors.join('; ')}`);
  }

  return result;
}

/**
 * Apply the complete AI-generated structure to a site
 * Optionally accepts Figma analysis for enhanced design application
 */
export async function applyStructureToSite(
  site: any,
  structure: SiteStructure,
  localLogger: any,
  figmaAnalysis?: FigmaAnalysis
): Promise<void> {
  localLogger.info(`[AI Site Builder] Starting structure application for site ${site.id}`);
  if (figmaAnalysis) {
    localLogger.info(`[AI Site Builder] Figma analysis available - will create pages and patterns`);
  }

  // Validate inputs
  if (!site || !site.id) {
    throw new Error('Invalid site object provided');
  }

  if (!structure) {
    throw new Error('Invalid structure object provided');
  }

  // Pre-flight checks: Verify site is in a state where we can apply changes
  localLogger.info(`[AI Site Builder] Running pre-flight checks...`);
  await performPreFlightChecks(site, localLogger);

  // Track which phases succeeded/failed
  const results = {
    plugins: { attempted: false, success: false, error: null as Error | null },
    content: { attempted: false, success: false, error: null as Error | null },
    design: { attempted: false, success: false, error: null as Error | null },
    figmaPages: { attempted: false, success: false, error: null as Error | null },
    figmaPatterns: { attempted: false, success: false, error: null as Error | null },
  };

  // Determine total phases based on Figma analysis availability
  const totalPhases = figmaAnalysis ? 5 : 3;

  // Phase 1: Install plugins (must be first - ACF needed for field groups)
  if (structure.features?.status === 'ready' && structure.features.plugins) {
    results.plugins.attempted = true;
    try {
      localLogger.info(`[AI Site Builder] === Phase 1/${totalPhases}: Installing Plugins ===`);
      await applyFeaturesStructure(site, structure.features.plugins, localLogger);
      results.plugins.success = true;
      localLogger.info(`[AI Site Builder] ✓ Phase 1 completed successfully`);
    } catch (error) {
      results.plugins.error = error as Error;
      localLogger.error(`[AI Site Builder] ✗ Phase 1 failed:`, error);
      localLogger.warn(`[AI Site Builder] Continuing with remaining phases...`);
    }
  }

  // Phase 2: Create content structure (post types, pages, and ACF fields)
  if (
    structure.content?.status === 'ready' &&
    (structure.content.postTypes || structure.content.pages)
  ) {
    results.content.attempted = true;
    try {
      localLogger.info(
        `[AI Site Builder] === Phase 2/${totalPhases}: Creating Content Structure ===`
      );
      // Pass child theme name for ACF JSON directory (in theme/acf-json)
      const childThemeName = structure.design?.theme?.childThemeName || null;
      await applyContentStructure(
        site,
        structure.content.postTypes || [],
        structure.content.pages || [],
        childThemeName,
        localLogger
      );
      results.content.success = true;
      localLogger.info(`[AI Site Builder] ✓ Phase 2 completed successfully`);
    } catch (error) {
      results.content.error = error as Error;
      localLogger.error(`[AI Site Builder] ✗ Phase 2 failed:`, error);
      localLogger.warn(`[AI Site Builder] Continuing with remaining phases...`);
    }
  }

  // Phase 3: Apply design (theme and styling)
  if (structure.design?.status === 'ready') {
    results.design.attempted = true;
    try {
      localLogger.info(`[AI Site Builder] === Phase 3/${totalPhases}: Applying Design ===`);
      await applyDesignStructure(site, structure.design, localLogger, figmaAnalysis);
      results.design.success = true;
      localLogger.info(`[AI Site Builder] ✓ Phase 3 completed successfully`);
    } catch (error) {
      results.design.error = error as Error;
      localLogger.error(`[AI Site Builder] ✗ Phase 3 failed:`, error);
    }
  }

  // Phase 4: Create WordPress pages from Figma (only if Figma analysis available)
  if (figmaAnalysis?.pages && figmaAnalysis.pages.length > 0) {
    results.figmaPages.attempted = true;
    try {
      localLogger.info(
        `[AI Site Builder] === Phase 4/${totalPhases}: Creating Pages from Figma ===`
      );
      const designTokens = structure.design?.theme?.designTokens || figmaAnalysis.designTokens;
      await applyFigmaPages(site, figmaAnalysis, designTokens, localLogger);
      results.figmaPages.success = true;
      localLogger.info(`[AI Site Builder] ✓ Phase 4 completed successfully`);
    } catch (error) {
      results.figmaPages.error = error as Error;
      localLogger.error(`[AI Site Builder] ✗ Phase 4 failed:`, error);
      localLogger.warn(`[AI Site Builder] Continuing with remaining phases...`);
    }
  }

  // Phase 5: Register block patterns from Figma components (only if Figma analysis available)
  if (figmaAnalysis?.components && figmaAnalysis.components.length > 0) {
    results.figmaPatterns.attempted = true;
    try {
      localLogger.info(
        `[AI Site Builder] === Phase 5/${totalPhases}: Creating Block Patterns from Figma ===`
      );
      const designTokens = structure.design?.theme?.designTokens || figmaAnalysis.designTokens;
      const childThemeName = structure.design?.theme?.childThemeName;
      await applyFigmaPatterns(
        site,
        figmaAnalysis.components,
        designTokens,
        childThemeName,
        localLogger
      );
      results.figmaPatterns.success = true;
      localLogger.info(`[AI Site Builder] ✓ Phase 5 completed successfully`);
    } catch (error) {
      results.figmaPatterns.error = error as Error;
      localLogger.error(`[AI Site Builder] ✗ Phase 5 failed:`, error);
    }
  }

  // Summary
  const allResults = [
    results.plugins,
    results.content,
    results.design,
    results.figmaPages,
    results.figmaPatterns,
  ];
  const attempted = allResults.filter((r) => r.attempted).length;
  const succeeded = allResults.filter((r) => r.success).length;
  const failed = attempted - succeeded;

  localLogger.info(`[AI Site Builder] ========================================`);
  localLogger.info(`[AI Site Builder] Structure Application Summary:`);
  localLogger.info(`[AI Site Builder] - Attempted: ${attempted} phases`);
  localLogger.info(`[AI Site Builder] - Succeeded: ${succeeded} phases`);
  localLogger.info(`[AI Site Builder] - Failed: ${failed} phases`);

  if (results.plugins.attempted) {
    localLogger.info(`[AI Site Builder] - Plugins: ${results.plugins.success ? '✓' : '✗'}`);
  }
  if (results.content.attempted) {
    localLogger.info(`[AI Site Builder] - Content: ${results.content.success ? '✓' : '✗'}`);
  }
  if (results.design.attempted) {
    localLogger.info(`[AI Site Builder] - Design: ${results.design.success ? '✓' : '✗'}`);
  }
  if (results.figmaPages.attempted) {
    localLogger.info(`[AI Site Builder] - Figma Pages: ${results.figmaPages.success ? '✓' : '✗'}`);
  }
  if (results.figmaPatterns.attempted) {
    localLogger.info(
      `[AI Site Builder] - Figma Patterns: ${results.figmaPatterns.success ? '✓' : '✗'}`
    );
  }
  localLogger.info(`[AI Site Builder] ========================================`);

  if (failed > 0) {
    localLogger.warn(
      `[AI Site Builder] Structure application completed with ${failed} phase(s) failed`
    );
    localLogger.warn(`[AI Site Builder] Site is partially configured - check logs for details`);
  } else {
    localLogger.info(`[AI Site Builder] Structure application completed successfully!`);
  }
}

/**
 * Apply content structure (ACF fields, custom post types, and pages)
 */
async function applyContentStructure(
  site: any,
  postTypes: ContentType[],
  pages: PageStructure[],
  childThemeName: string | null,
  localLogger: any
): Promise<void> {
  localLogger.info(
    `[AI Site Builder] Applying ${postTypes.length} custom post types and ${pages.length} pages`
  );

  // Get services
  const services = LocalMain.getServiceContainer().cradle as any;
  const { wpCli } = services;

  // Create must-use plugin for post type registration (loads automatically)
  const pluginSlug = 'ai-site-builder-structures';
  const muPluginsDir = path.join(site.paths.app, 'public', 'wp-content', 'mu-plugins');
  const pluginFile = path.join(muPluginsDir, `${pluginSlug}.php`);

  try {
    // Create mu-plugins directory if it doesn't exist
    if (!fs.existsSync(muPluginsDir)) {
      fs.mkdirSync(muPluginsDir, { recursive: true });
      localLogger.info(`[AI Site Builder] Created mu-plugins directory: ${muPluginsDir}`);
    }

    // Generate plugin PHP code
    const pluginCode = generatePostTypePlugin(postTypes, localLogger);

    // Write must-use plugin file
    fs.writeFileSync(pluginFile, pluginCode);
    localLogger.info(`[AI Site Builder] Created must-use plugin: ${pluginFile}`);
    localLogger.info(
      `[AI Site Builder] Must-use plugin will load automatically (no activation needed)`
    );

    // Flush rewrite rules to ensure post type permalinks work
    await wpCli.run(site, ['rewrite', 'flush']);
    localLogger.info(`[AI Site Builder] Flushed rewrite rules`);

    // Generate and write ACF field group JSON files to theme directory
    // ACF looks for acf-json folder within the active theme
    let acfJsonDir: string;
    if (childThemeName) {
      // Place in child theme directory (preferred - ACF's default behavior)
      acfJsonDir = path.join(
        site.paths.app,
        'public',
        'wp-content',
        'themes',
        childThemeName,
        'acf-json'
      );
      localLogger.info(
        `[AI Site Builder] Using child theme for ACF JSON: ${childThemeName}/acf-json`
      );
    } else {
      // Fallback to wp-content (requires custom load path filter)
      acfJsonDir = path.join(site.paths.app, 'public', 'wp-content', 'acf-json');
      localLogger.warn(
        `[AI Site Builder] No child theme specified, using wp-content/acf-json (may require custom ACF load path)`
      );
    }

    // Create acf-json directory if it doesn't exist
    if (!fs.existsSync(acfJsonDir)) {
      fs.mkdirSync(acfJsonDir, { recursive: true });
      localLogger.info(`[AI Site Builder] Created acf-json directory: ${acfJsonDir}`);
    }

    // Generate field groups as JSON
    const fieldGroupsJSON = generateACFFieldGroupsJSON(postTypes);
    const fieldGroupCount = Object.keys(fieldGroupsJSON).length;

    if (fieldGroupCount > 0) {
      localLogger.info(
        `[AI Site Builder] Writing ${fieldGroupCount} ACF field group(s) to JSON...`
      );

      // Write each field group JSON file
      for (const [filename, fieldGroup] of Object.entries(fieldGroupsJSON)) {
        const filePath = path.join(acfJsonDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(fieldGroup, null, 2));
        localLogger.info(`[AI Site Builder] - Created ${filename}`);
      }

      localLogger.info(
        `[AI Site Builder] ACF will auto-import these field groups on first page load`
      );
      localLogger.info(`[AI Site Builder] Field groups will be visible and editable in ACF admin`);
    }
  } catch (error) {
    localLogger.error(`[AI Site Builder] Error creating custom post types:`, error);
    throw error;
  }

  for (const postType of postTypes) {
    localLogger.info(
      `[AI Site Builder] - Post type: ${postType.name} (${postType.fields?.length || 0} fields)`
    );
  }

  // Create WordPress pages
  if (pages.length > 0) {
    localLogger.info(`[AI Site Builder] Creating ${pages.length} WordPress pages...`);

    for (const page of pages) {
      try {
        // Sanitize inputs to prevent injection attacks
        const safeTitle = sanitizeName(page.title);
        const safeSlug = sanitizeSlug(page.slug);

        // Create the page using WP-CLI
        const args = [
          'post',
          'create',
          '--post_type=page',
          `--post_title=${safeTitle}`,
          `--post_name=${safeSlug}`,
          '--post_status=publish',
        ];

        // Add content if provided (sanitize for WordPress)
        if (page.content) {
          const safeContent = sanitizeForWordPress(page.content);
          args.push(`--post_content=${safeContent}`);
        }

        await wpCli.run(site, args);
        localLogger.info(`[AI Site Builder] - Created page: ${safeTitle} (/${safeSlug})`);
      } catch (error) {
        localLogger.warn(
          `[AI Site Builder] - Failed to create page ${sanitizeName(page.title)}:`,
          error
        );
        // Continue with other pages even if one fails
      }
    }
  }

  localLogger.info(`[AI Site Builder] Content structure applied`);
}

/**
 * Generate WordPress plugin code for custom post types
 */
function generatePostTypePlugin(postTypes: ContentType[], _localLogger: any): string {
  const postTypeRegistrations = postTypes
    .map((postType) => {
      // Sanitize all inputs for PHP code generation to prevent injection
      const slug = sanitizeSlug(postType.slug);
      const name = sanitizeForPHP(postType.name);
      const description = sanitizeForPHP(postType.description || '');
      const supports = postType.supports || ['title', 'editor'];
      const icon = sanitizeForPHP(postType.icon || 'dashicons-admin-post');

      // Generate labels (all values sanitized)
      const labels = `array(
        'name' => '${name}s',
        'singular_name' => '${name}',
        'menu_name' => '${name}s',
        'add_new' => 'Add New',
        'add_new_item' => 'Add New ${name}',
        'edit_item' => 'Edit ${name}',
        'new_item' => 'New ${name}',
        'view_item' => 'View ${name}',
        'search_items' => 'Search ${name}s',
        'not_found' => 'No ${name.toLowerCase()}s found',
        'not_found_in_trash' => 'No ${name.toLowerCase()}s found in trash'
    )`;

      // Generate post type registration
      let code = `
    // Register ${sanitizeForPHP(postType.name)} post type
    register_post_type('${slug}', array(
        'labels' => ${labels},
        'description' => '${description}',
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_rest' => true,
        'menu_icon' => '${icon}',
        'supports' => array('${supports.map((s) => sanitizeForPHP(s)).join("', '")}'),
        'has_archive' => true,
        'rewrite' => array('slug' => '${slug}')
    ));
`;

      // Add taxonomies if any
      if (postType.taxonomies && postType.taxonomies.length > 0) {
        postType.taxonomies.forEach((taxonomy) => {
          // Sanitize taxonomy inputs
          const taxSlug = sanitizeSlug(taxonomy.slug);
          const taxName = sanitizeForPHP(taxonomy.name);
          const hierarchical = taxonomy.hierarchical ? 'true' : 'false';

          code += `
    // Register ${taxName} taxonomy for ${name}
    register_taxonomy('${taxSlug}', '${slug}', array(
        'labels' => array(
            'name' => '${taxName}s',
            'singular_name' => '${taxName}',
            'search_items' => 'Search ${taxName}s',
            'all_items' => 'All ${taxName}s',
            'parent_item' => 'Parent ${taxName}',
            'parent_item_colon' => 'Parent ${taxName}:',
            'edit_item' => 'Edit ${taxName}',
            'update_item' => 'Update ${taxName}',
            'add_new_item' => 'Add New ${taxName}',
            'new_item_name' => 'New ${taxName} Name',
            'menu_name' => '${taxName}s'
        ),
        'hierarchical' => ${hierarchical},
        'show_ui' => true,
        'show_admin_column' => true,
        'query_var' => true,
        'show_in_rest' => true,
        'rewrite' => array('slug' => '${taxSlug}')
    ));
`;
        });
      }

      return code;
    })
    .join('\n');

  // Complete plugin code (post types and taxonomies only)
  // ACF field groups are now in JSON files in wp-content/acf-json/
  return `<?php
/**
 * Plugin Name: AI Site Builder - Custom Structures
 * Description: Custom post types and taxonomies generated by AI Site Builder
 * Version: 1.0.0
 * Author: AI Site Builder
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Register custom post types and taxonomies
add_action('init', function() {
${postTypeRegistrations}
});
`;
}

/**
 * Generate ACF field groups as JSON objects for ACF JSON sync
 * Returns a map of filename -> JSON content
 */
function generateACFFieldGroupsJSON(postTypes: ContentType[]): Record<string, any> {
  const fieldGroups: Record<string, any> = {};

  postTypes.forEach((postType) => {
    if (!postType.fields || postType.fields.length === 0) {
      return; // No fields for this post type
    }

    const fieldGroupKey = `group_${postType.slug}`;
    const fields = postType.fields
      .map((field, index) => {
        return generateACFFieldJSON(field, fieldGroupKey, index);
      })
      .filter((f) => f !== null);

    // Generate ACF JSON format
    const fieldGroup = {
      key: fieldGroupKey,
      title: `${postType.name} Fields`,
      fields: fields,
      location: [
        [
          {
            param: 'post_type',
            operator: '==',
            value: postType.slug,
          },
        ],
      ],
      menu_order: 0,
      position: 'normal',
      style: 'default',
      label_placement: 'top',
      instruction_placement: 'label',
      hide_on_screen: '',
      active: true,
      description: '',
    };

    // Filename format: group_<key>.json
    fieldGroups[`${fieldGroupKey}.json`] = fieldGroup;
  });

  return fieldGroups;
}

/**
 * Generate a single ACF field configuration as JSON object
 */
function generateACFFieldJSON(field: any, groupKey: string, _index: number): any | null {
  const fieldKey = `${groupKey}_${field.name}`;

  // Map our field types to ACF field types
  const typeMap: Record<string, string> = {
    text: 'text',
    textarea: 'textarea',
    wysiwyg: 'wysiwyg',
    image: 'image',
    gallery: 'gallery',
    date_picker: 'date_picker',
    number: 'number',
    true_false: 'true_false',
  };

  const acfType = typeMap[field.type] || 'text';

  // Build field configuration as JSON object
  return {
    key: fieldKey,
    label: field.label,
    name: field.name,
    type: acfType,
    instructions: field.instructions || '',
    required: field.required ? 1 : 0,
    conditional_logic: 0,
    wrapper: {
      width: '',
      class: '',
      id: '',
    },
  };
}

/**
 * Apply design structure (theme and design tokens)
 */
async function applyDesignStructure(
  site: any,
  design: any,
  localLogger: any,
  _figmaAnalysis?: FigmaAnalysis
): Promise<void> {
  localLogger.info(`[AI Site Builder] Applying design structure`);

  if (!design.theme) {
    localLogger.info(`[AI Site Builder] No theme configuration found`);
    return;
  }

  localLogger.info(`[AI Site Builder] - Base theme: ${design.theme.base}`);
  localLogger.info(`[AI Site Builder] - Child theme: ${design.theme.childThemeName}`);

  // Get services
  const services = LocalMain.getServiceContainer().cradle as any;
  const { wpCli } = services;

  try {
    // Install base theme (twentytwentyfive by default, or frost if specified)
    const baseTheme = design.theme.base;
    localLogger.info(`[AI Site Builder] Installing base theme: ${baseTheme}`);

    const installResult = await wpCli.run(site, ['theme', 'install', baseTheme]);

    if (installResult === null) {
      localLogger.warn(`[AI Site Builder] Base theme installation returned null`);
    } else {
      localLogger.info(`[AI Site Builder] Base theme installed successfully`);
    }

    // Create child theme
    const childThemeName = design.theme.childThemeName;
    const childThemeDir = path.join(
      site.paths.app,
      'public',
      'wp-content',
      'themes',
      childThemeName
    );

    localLogger.info(`[AI Site Builder] Creating child theme directory: ${childThemeDir}`);
    if (!fs.existsSync(childThemeDir)) {
      fs.mkdirSync(childThemeDir, { recursive: true });
    }

    // Generate style.css
    const styleCss = generateStyleCss(childThemeName, baseTheme, design.theme.designTokens);
    fs.writeFileSync(path.join(childThemeDir, 'style.css'), styleCss);
    localLogger.info(`[AI Site Builder] Created style.css`);

    // Generate functions.php
    const functionsPHP = generateFunctionsPHP(childThemeName);
    fs.writeFileSync(path.join(childThemeDir, 'functions.php'), functionsPHP);
    localLogger.info(`[AI Site Builder] Created functions.php`);

    // Generate theme.json with design tokens
    if (design.theme.designTokens) {
      const themeJson = generateThemeJson(design.theme.designTokens);
      fs.writeFileSync(path.join(childThemeDir, 'theme.json'), JSON.stringify(themeJson, null, 2));
      localLogger.info(`[AI Site Builder] Created theme.json with design tokens`);
    }

    // Activate child theme
    localLogger.info(`[AI Site Builder] Activating child theme: ${childThemeName}`);
    const activateResult = await wpCli.run(site, ['theme', 'activate', childThemeName]);

    if (activateResult === null) {
      localLogger.warn(`[AI Site Builder] Theme activation returned null`);
    } else {
      localLogger.info(`[AI Site Builder] Child theme activated successfully`);
    }
  } catch (error) {
    localLogger.error(`[AI Site Builder] Error applying design structure:`, error);
    throw error;
  }

  localLogger.info(`[AI Site Builder] Design structure applied`);
}

/**
 * Generate comprehensive style.css for child theme with all design tokens
 */
function generateStyleCss(childThemeName: string, parentTheme: string, designTokens: any): string {
  // Sanitize theme names for CSS header (prevent CSS injection)
  const safeChildTheme = sanitizeName(childThemeName);
  const safeParentTheme = sanitizeName(parentTheme);

  const colors = designTokens?.colors || {};
  const typography = designTokens?.typography || {};
  const spacing = designTokens?.spacing || {};
  const borderRadius = designTokens?.borderRadius || {};
  const shadows = designTokens?.shadows || {};

  // Get primary font family
  const primaryFont =
    typography.fontFamilies?.[0] ||
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const secondaryFont = typography.fontFamilies?.[1] || primaryFont;

  const css = `/*
Theme Name: ${safeChildTheme}
Template: ${safeParentTheme}
Description: AI-generated child theme with design tokens from Figma
Author: AI Site Builder
Version: 1.0.0
*/

/* ==========================================================================
   Design Tokens from Figma
   ========================================================================== */

:root {
  /* Colors - WordPress format */
  --wp--preset--color--primary: ${colors.primary || '#51a351'};
  --wp--preset--color--secondary: ${colors.secondary || '#2c3e50'};
  --wp--preset--color--accent: ${colors.accent || colors.primary || '#51a351'};
  --wp--preset--color--text: ${colors.text || '#333333'};
  --wp--preset--color--text-muted: ${colors.textMuted || '#666666'};
  --wp--preset--color--background: ${colors.background || '#ffffff'};
  --wp--preset--color--surface: ${colors.surface || '#f8f9fa'};
  --wp--preset--color--border: ${colors.border || '#e0e0e0'};

  /* Typography - Font Families */
  --wp--preset--font-family--primary: ${primaryFont};
  --wp--preset--font-family--secondary: ${secondaryFont};

  /* Typography - Font Sizes */
  --wp--preset--font-size--xs: ${typography.fontSizes?.xs || '12px'};
  --wp--preset--font-size--sm: ${typography.fontSizes?.sm || '14px'};
  --wp--preset--font-size--base: ${typography.fontSizes?.base || '16px'};
  --wp--preset--font-size--lg: ${typography.fontSizes?.lg || '18px'};
  --wp--preset--font-size--xl: ${typography.fontSizes?.xl || '20px'};
  --wp--preset--font-size--2xl: ${typography.fontSizes?.['2xl'] || '24px'};
  --wp--preset--font-size--3xl: ${typography.fontSizes?.['3xl'] || '30px'};
  --wp--preset--font-size--4xl: ${typography.fontSizes?.['4xl'] || '36px'};

  /* Typography - Font Weights */
  --wp--custom--font-weight--normal: ${typography.fontWeights?.normal || 400};
  --wp--custom--font-weight--medium: ${typography.fontWeights?.medium || 500};
  --wp--custom--font-weight--semibold: ${typography.fontWeights?.semibold || 600};
  --wp--custom--font-weight--bold: ${typography.fontWeights?.bold || 700};

  /* Typography - Line Heights */
  --wp--custom--line-height--tight: ${typography.lineHeights?.tight || '1.25'};
  --wp--custom--line-height--normal: ${typography.lineHeights?.normal || '1.5'};
  --wp--custom--line-height--relaxed: ${typography.lineHeights?.relaxed || '1.75'};

  /* Spacing */
  --wp--custom--spacing--xs: ${spacing.xs || '4px'};
  --wp--custom--spacing--sm: ${spacing.sm || '8px'};
  --wp--custom--spacing--md: ${spacing.md || '16px'};
  --wp--custom--spacing--lg: ${spacing.lg || '24px'};
  --wp--custom--spacing--xl: ${spacing.xl || '32px'};
  --wp--custom--spacing--2xl: ${spacing['2xl'] || '48px'};
  --wp--custom--spacing--3xl: ${spacing['3xl'] || '64px'};

  /* Border Radius */
  --wp--custom--radius--none: ${borderRadius.none || '0px'};
  --wp--custom--radius--sm: ${borderRadius.sm || '4px'};
  --wp--custom--radius--md: ${borderRadius.md || '8px'};
  --wp--custom--radius--lg: ${borderRadius.lg || '12px'};
  --wp--custom--radius--xl: ${borderRadius.xl || '16px'};
  --wp--custom--radius--full: ${borderRadius.full || '9999px'};

  /* Shadows */
  --wp--custom--shadow--sm: ${shadows.sm || '0 1px 2px 0 rgba(0, 0, 0, 0.05)'};
  --wp--custom--shadow--md: ${shadows.md || '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
  --wp--custom--shadow--lg: ${shadows.lg || '0 10px 15px -3px rgba(0, 0, 0, 0.1)'};
}

/* ==========================================================================
   Base Typography
   ========================================================================== */

body {
  font-family: var(--wp--preset--font-family--primary);
  font-size: var(--wp--preset--font-size--base);
  font-weight: var(--wp--custom--font-weight--normal);
  line-height: var(--wp--custom--line-height--normal);
  color: var(--wp--preset--color--text);
  background-color: var(--wp--preset--color--background);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--wp--preset--font-family--secondary);
  font-weight: var(--wp--custom--font-weight--bold);
  line-height: var(--wp--custom--line-height--tight);
  color: var(--wp--preset--color--text);
  margin-top: 0;
}

h1 { font-size: var(--wp--preset--font-size--4xl); }
h2 { font-size: var(--wp--preset--font-size--3xl); }
h3 { font-size: var(--wp--preset--font-size--2xl); }
h4 { font-size: var(--wp--preset--font-size--xl); }
h5 { font-size: var(--wp--preset--font-size--lg); }
h6 { font-size: var(--wp--preset--font-size--base); }

p {
  margin-bottom: var(--wp--custom--spacing--md);
}

/* ==========================================================================
   Links
   ========================================================================== */

a {
  color: var(--wp--preset--color--primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover,
a:focus {
  color: var(--wp--preset--color--secondary);
  text-decoration: underline;
}

/* ==========================================================================
   Buttons
   ========================================================================== */

.wp-block-button__link,
.wp-element-button,
button,
input[type="submit"],
input[type="button"] {
  background-color: var(--wp--preset--color--primary);
  color: #ffffff;
  border: none;
  border-radius: var(--wp--custom--radius--md);
  padding: var(--wp--custom--spacing--sm) var(--wp--custom--spacing--lg);
  font-family: var(--wp--preset--font-family--primary);
  font-size: var(--wp--preset--font-size--base);
  font-weight: var(--wp--custom--font-weight--semibold);
  line-height: var(--wp--custom--line-height--normal);
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.1s ease;
  display: inline-block;
  text-decoration: none;
}

.wp-block-button__link:hover,
.wp-element-button:hover,
button:hover,
input[type="submit"]:hover,
input[type="button"]:hover {
  opacity: 0.9;
  color: #ffffff;
  text-decoration: none;
}

.wp-block-button__link:active,
.wp-element-button:active,
button:active {
  transform: translateY(1px);
}

/* Secondary button style */
.wp-block-button.is-style-outline .wp-block-button__link {
  background-color: transparent;
  color: var(--wp--preset--color--primary);
  border: 2px solid var(--wp--preset--color--primary);
}

.wp-block-button.is-style-outline .wp-block-button__link:hover {
  background-color: var(--wp--preset--color--primary);
  color: #ffffff;
}

/* ==========================================================================
   Cards & Containers
   ========================================================================== */

.wp-block-group.is-style-card,
.wp-block-column {
  background-color: var(--wp--preset--color--surface);
  border-radius: var(--wp--custom--radius--lg);
  box-shadow: var(--wp--custom--shadow--md);
  padding: var(--wp--custom--spacing--lg);
}

/* ==========================================================================
   Forms & Inputs
   ========================================================================== */

input[type="text"],
input[type="email"],
input[type="tel"],
input[type="url"],
input[type="password"],
input[type="search"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: var(--wp--custom--spacing--sm) var(--wp--custom--spacing--md);
  border: 1px solid var(--wp--preset--color--border);
  border-radius: var(--wp--custom--radius--sm);
  font-family: var(--wp--preset--font-family--primary);
  font-size: var(--wp--preset--font-size--base);
  line-height: var(--wp--custom--line-height--normal);
  color: var(--wp--preset--color--text);
  background-color: var(--wp--preset--color--background);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input[type="text"]:focus,
input[type="email"]:focus,
input[type="tel"]:focus,
input[type="url"]:focus,
input[type="password"]:focus,
input[type="search"]:focus,
input[type="number"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--wp--preset--color--primary);
  box-shadow: 0 0 0 3px rgba(81, 163, 81, 0.1);
}

label {
  display: block;
  margin-bottom: var(--wp--custom--spacing--xs);
  font-weight: var(--wp--custom--font-weight--medium);
  color: var(--wp--preset--color--text);
}

/* ==========================================================================
   Navigation
   ========================================================================== */

.wp-block-navigation a {
  color: var(--wp--preset--color--text);
  font-weight: var(--wp--custom--font-weight--medium);
}

.wp-block-navigation a:hover {
  color: var(--wp--preset--color--primary);
}

/* ==========================================================================
   Images & Media
   ========================================================================== */

img {
  max-width: 100%;
  height: auto;
  border-radius: var(--wp--custom--radius--sm);
}

.wp-block-image img {
  border-radius: var(--wp--custom--radius--md);
}

/* ==========================================================================
   Quotes & Blockquotes
   ========================================================================== */

blockquote,
.wp-block-quote {
  border-left: 4px solid var(--wp--preset--color--primary);
  padding-left: var(--wp--custom--spacing--lg);
  margin-left: 0;
  font-style: italic;
  color: var(--wp--preset--color--text-muted);
}

.wp-block-quote cite {
  display: block;
  margin-top: var(--wp--custom--spacing--sm);
  font-style: normal;
  font-weight: var(--wp--custom--font-weight--semibold);
  color: var(--wp--preset--color--text);
}

/* ==========================================================================
   Lists
   ========================================================================== */

ul, ol {
  padding-left: var(--wp--custom--spacing--lg);
  margin-bottom: var(--wp--custom--spacing--md);
}

li {
  margin-bottom: var(--wp--custom--spacing--xs);
}

/* ==========================================================================
   Tables
   ========================================================================== */

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--wp--custom--spacing--lg);
}

th, td {
  padding: var(--wp--custom--spacing--sm) var(--wp--custom--spacing--md);
  text-align: left;
  border-bottom: 1px solid var(--wp--preset--color--border);
}

th {
  font-weight: var(--wp--custom--font-weight--semibold);
  background-color: var(--wp--preset--color--surface);
}

/* ==========================================================================
   Utility Classes
   ========================================================================== */

.text-primary { color: var(--wp--preset--color--primary); }
.text-secondary { color: var(--wp--preset--color--secondary); }
.text-muted { color: var(--wp--preset--color--text-muted); }

.bg-primary { background-color: var(--wp--preset--color--primary); }
.bg-secondary { background-color: var(--wp--preset--color--secondary); }
.bg-surface { background-color: var(--wp--preset--color--surface); }
`;

  return css;
}

/**
 * Generate functions.php for child theme
 */
function generateFunctionsPHP(childThemeName: string): string {
  // Sanitize theme name for PHP comment (prevent PHP injection)
  const safeThemeName = sanitizeForPHP(childThemeName);

  return `<?php
/**
 * ${safeThemeName} Functions
 *
 * Child theme for AI-generated site structure
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Enqueue parent and child theme styles
add_action('wp_enqueue_scripts', function() {
    // Parent theme stylesheet
    wp_enqueue_style('parent-style', get_template_directory_uri() . '/style.css');

    // Child theme stylesheet
    wp_enqueue_style('child-style',
        get_stylesheet_directory_uri() . '/style.css',
        array('parent-style'),
        wp_get_theme()->get('Version')
    );
});

// Theme setup
add_action('after_setup_theme', function() {
    // Add theme support for various features
    add_theme_support('post-thumbnails');
    add_theme_support('responsive-embeds');
    add_theme_support('editor-styles');
    add_theme_support('wp-block-styles');
});
`;
}

/**
 * Generate comprehensive theme.json with all design tokens
 */
function generateThemeJson(designTokens: any): any {
  const colors = designTokens?.colors || {};
  const typography = designTokens?.typography || {};
  const spacing = designTokens?.spacing || {};
  const borderRadius = designTokens?.borderRadius || {};
  const shadows = designTokens?.shadows || {};

  // Get primary font family
  const primaryFont =
    typography.fontFamilies?.[0] ||
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const secondaryFont = typography.fontFamilies?.[1] || primaryFont;

  const themeJson: any = {
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 2,
    settings: {
      color: {
        defaultPalette: false,
        palette: [
          { slug: 'primary', color: colors.primary || '#51a351', name: 'Primary' },
          { slug: 'secondary', color: colors.secondary || '#2c3e50', name: 'Secondary' },
          { slug: 'accent', color: colors.accent || colors.primary || '#51a351', name: 'Accent' },
          { slug: 'text', color: colors.text || '#333333', name: 'Text' },
          { slug: 'text-muted', color: colors.textMuted || '#666666', name: 'Text Muted' },
          { slug: 'background', color: colors.background || '#ffffff', name: 'Background' },
          { slug: 'surface', color: colors.surface || '#f8f9fa', name: 'Surface' },
          { slug: 'border', color: colors.border || '#e0e0e0', name: 'Border' },
        ],
      },
      typography: {
        fontFamilies: [
          {
            slug: 'primary',
            fontFamily: primaryFont,
            name: 'Primary',
          },
          {
            slug: 'secondary',
            fontFamily: secondaryFont,
            name: 'Secondary',
          },
        ],
        fontSizes: [
          { slug: 'xs', size: typography.fontSizes?.xs || '12px', name: 'Extra Small' },
          { slug: 'sm', size: typography.fontSizes?.sm || '14px', name: 'Small' },
          { slug: 'base', size: typography.fontSizes?.base || '16px', name: 'Base' },
          { slug: 'lg', size: typography.fontSizes?.lg || '18px', name: 'Large' },
          { slug: 'xl', size: typography.fontSizes?.xl || '20px', name: 'Extra Large' },
          { slug: '2xl', size: typography.fontSizes?.['2xl'] || '24px', name: '2X Large' },
          { slug: '3xl', size: typography.fontSizes?.['3xl'] || '30px', name: '3X Large' },
          { slug: '4xl', size: typography.fontSizes?.['4xl'] || '36px', name: '4X Large' },
        ],
      },
      spacing: {
        units: ['px', 'em', 'rem', '%'],
        spacingSizes: [
          { slug: 'xs', size: spacing.xs || '4px', name: 'Extra Small' },
          { slug: 'sm', size: spacing.sm || '8px', name: 'Small' },
          { slug: 'md', size: spacing.md || '16px', name: 'Medium' },
          { slug: 'lg', size: spacing.lg || '24px', name: 'Large' },
          { slug: 'xl', size: spacing.xl || '32px', name: 'Extra Large' },
          { slug: '2xl', size: spacing['2xl'] || '48px', name: '2X Large' },
          { slug: '3xl', size: spacing['3xl'] || '64px', name: '3X Large' },
        ],
      },
      custom: {
        spacing: {
          xs: spacing.xs || '4px',
          sm: spacing.sm || '8px',
          md: spacing.md || '16px',
          lg: spacing.lg || '24px',
          xl: spacing.xl || '32px',
          '2xl': spacing['2xl'] || '48px',
          '3xl': spacing['3xl'] || '64px',
        },
        borderRadius: {
          none: borderRadius.none || '0px',
          sm: borderRadius.sm || '4px',
          md: borderRadius.md || '8px',
          lg: borderRadius.lg || '12px',
          xl: borderRadius.xl || '16px',
          full: borderRadius.full || '9999px',
        },
        shadows: {
          sm: shadows.sm || '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          md: shadows.md || '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          lg: shadows.lg || '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        fontWeights: {
          normal: typography.fontWeights?.normal || 400,
          medium: typography.fontWeights?.medium || 500,
          semibold: typography.fontWeights?.semibold || 600,
          bold: typography.fontWeights?.bold || 700,
        },
        lineHeights: {
          tight: typography.lineHeights?.tight || '1.25',
          normal: typography.lineHeights?.normal || '1.5',
          relaxed: typography.lineHeights?.relaxed || '1.75',
        },
      },
    },
    styles: {
      color: {
        background: colors.background || '#ffffff',
        text: colors.text || '#333333',
      },
      typography: {
        fontFamily: 'var(--wp--preset--font-family--primary)',
        fontSize: typography.fontSizes?.base || '16px',
        lineHeight: typography.lineHeights?.normal || '1.5',
      },
      elements: {
        button: {
          color: {
            background: colors.primary || '#51a351',
            text: '#ffffff',
          },
          border: {
            radius: borderRadius.md || '8px',
          },
          typography: {
            fontFamily: 'var(--wp--preset--font-family--primary)',
            fontWeight: (typography.fontWeights?.semibold || 600).toString(),
          },
          ':hover': {
            color: {
              background: colors.primary || '#51a351',
            },
          },
        },
        link: {
          color: {
            text: colors.primary || '#51a351',
          },
          ':hover': {
            color: {
              text: colors.secondary || '#2c3e50',
            },
          },
        },
        heading: {
          typography: {
            fontFamily: 'var(--wp--preset--font-family--secondary)',
            fontWeight: (typography.fontWeights?.bold || 700).toString(),
            lineHeight: typography.lineHeights?.tight || '1.25',
          },
          color: {
            text: colors.text || '#333333',
          },
        },
        h1: {
          typography: {
            fontSize: typography.fontSizes?.['4xl'] || '36px',
          },
        },
        h2: {
          typography: {
            fontSize: typography.fontSizes?.['3xl'] || '30px',
          },
        },
        h3: {
          typography: {
            fontSize: typography.fontSizes?.['2xl'] || '24px',
          },
        },
        h4: {
          typography: {
            fontSize: typography.fontSizes?.xl || '20px',
          },
        },
      },
      blocks: {
        'core/quote': {
          border: {
            left: {
              color: colors.primary || '#51a351',
              width: '4px',
              style: 'solid',
            },
          },
          spacing: {
            padding: {
              left: spacing.lg || '24px',
            },
          },
        },
        'core/group': {
          spacing: {
            padding: {
              top: spacing.lg || '24px',
              bottom: spacing.lg || '24px',
              left: spacing.lg || '24px',
              right: spacing.lg || '24px',
            },
          },
        },
      },
    },
  };

  return themeJson;
}

/**
 * Apply features structure (plugins)
 */
async function applyFeaturesStructure(site: any, plugins: any[], localLogger: any): Promise<void> {
  localLogger.info(`[AI Site Builder] Applying ${plugins.length} plugin recommendations`);

  // Get WP-CLI service
  const services = LocalMain.getServiceContainer().cradle as any;
  const { wpCli } = services;

  // Install all recommended plugins (not just required ones)
  const pluginsToInstall = plugins;
  localLogger.info(`[AI Site Builder] Installing ${pluginsToInstall.length} plugins`);

  // Step 1: Install all plugins without activating
  const installedPlugins: string[] = [];
  for (const plugin of pluginsToInstall) {
    try {
      localLogger.info(`[AI Site Builder] - Installing plugin: ${plugin.name} (${plugin.slug})`);

      // Install plugin without activating (to avoid initialization issues)
      await wpCli.run(site, ['plugin', 'install', plugin.slug]);

      installedPlugins.push(plugin.slug);
      localLogger.info(`[AI Site Builder] - Plugin ${plugin.slug} installed`);
    } catch (error: any) {
      // Check if plugin not found in WordPress.org repo
      if (error?.message?.includes('Plugin not found')) {
        localLogger.warn(
          `[AI Site Builder] - Plugin ${plugin.slug} not found in WordPress.org repository (may be premium)`
        );
      } else {
        localLogger.error(`[AI Site Builder] - Error installing plugin ${plugin.slug}:`, error);
      }
      localLogger.info(`[AI Site Builder] - Continuing with remaining plugins...`);
    }
  }

  // Step 2: Activate all installed plugins in one batch
  if (installedPlugins.length > 0) {
    try {
      localLogger.info(`[AI Site Builder] Activating ${installedPlugins.length} plugins...`);
      await wpCli.run(site, ['plugin', 'activate', ...installedPlugins]);
      localLogger.info(`[AI Site Builder] - Plugins activated successfully`);
    } catch (error) {
      localLogger.error(`[AI Site Builder] - Error activating plugins:`, error);
      // Try activating one by one as fallback
      localLogger.info(`[AI Site Builder] - Trying individual plugin activation...`);
      for (const slug of installedPlugins) {
        try {
          await wpCli.run(site, ['plugin', 'activate', slug]);
          localLogger.info(`[AI Site Builder] - Activated ${slug}`);
        } catch (activateError) {
          localLogger.warn(`[AI Site Builder] - Failed to activate ${slug}, skipping`);
        }
      }
    }
  }

  localLogger.info(`[AI Site Builder] Features structure applied`);
}

/**
 * Apply Figma pages - Create WordPress pages from Figma page structures
 */
async function applyFigmaPages(
  site: any,
  figmaAnalysis: FigmaAnalysis,
  designTokens: DesignTokens | undefined,
  localLogger: any
): Promise<void> {
  const pages = figmaAnalysis.pages || [];
  localLogger.info(`[AI Site Builder] Creating ${pages.length} WordPress pages from Figma`);

  if (pages.length === 0) {
    localLogger.info(`[AI Site Builder] No Figma pages to create`);
    return;
  }

  // Get services
  const services = LocalMain.getServiceContainer().cradle as any;
  const { wpCli } = services;

  // Initialize the page generator
  const pageGenerator = new FigmaPageGenerator(localLogger);

  // Use design tokens from structure or from Figma analysis
  const tokens: DesignTokens = designTokens ||
    figmaAnalysis.designTokens || {
      colors: { primary: '#51a351', secondary: '#2c3e50', text: '#333333', background: '#ffffff' },
      typography: {
        fontFamilies: ['system-ui', 'sans-serif'],
        fontSizes: { base: '16px', large: '20px' },
        lineHeights: { base: '1.5', heading: '1.2' },
      },
      spacing: { sm: '8px', md: '16px', lg: '24px' },
      borderRadius: { sm: '4px', md: '8px' },
    };

  // Generate WordPress pages from Figma pages
  for (const figmaPage of pages) {
    try {
      localLogger.info(`[AI Site Builder] - Processing Figma page: ${figmaPage.name}`);

      // Generate the page content using FigmaPageGenerator
      const generatedPage = pageGenerator.generatePage(figmaPage, tokens);

      if (!generatedPage || !generatedPage.content) {
        localLogger.warn(
          `[AI Site Builder] - Could not generate content for page: ${figmaPage.name}`
        );
        continue;
      }

      localLogger.info(
        `[AI Site Builder] - Generated page "${generatedPage.title}" (slug: ${generatedPage.slug})`
      );

      // Create the WordPress page via WP-CLI
      // Sanitize content for WordPress before writing
      const safeContent = sanitizeForWordPress(generatedPage.content);

      // First create a temporary file with the sanitized content
      const tempFile = path.join(os.tmpdir(), `wp-page-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, safeContent);

      try {
        // Sanitize page data before using in WP-CLI
        const safeTitle = sanitizeName(generatedPage.title);
        const safeSlug = sanitizeSlug(generatedPage.slug);

        // Determine if this should be the homepage
        const isHomepage =
          safeSlug === 'home' ||
          safeSlug === 'homepage' ||
          figmaPage.name.toLowerCase().includes('home');

        // Create the page
        const args = [
          'post',
          'create',
          tempFile,
          '--post_type=page',
          `--post_title=${safeTitle}`,
          `--post_name=${safeSlug}`,
          '--post_status=publish',
          '--porcelain',
        ];

        const result = await wpCli.run(site, args);

        if (result) {
          const pageId = result.toString().trim();
          localLogger.info(`[AI Site Builder] - Created page "${safeTitle}" (ID: ${pageId})`);

          // If this is the homepage, set it as the front page
          if (isHomepage) {
            await wpCli.run(site, ['option', 'update', 'show_on_front', 'page']);
            await wpCli.run(site, ['option', 'update', 'page_on_front', pageId]);
            localLogger.info(`[AI Site Builder] - Set "${safeTitle}" as the homepage`);
          }
        } else {
          localLogger.warn(`[AI Site Builder] - Page creation returned null for: ${safeTitle}`);
        }
      } finally {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      localLogger.error(`[AI Site Builder] - Error creating page "${figmaPage.name}":`, error);
      // Continue with other pages
    }
  }

  localLogger.info(`[AI Site Builder] Figma pages created`);
}

/**
 * Apply Figma patterns - Register block patterns from Figma components
 */
async function applyFigmaPatterns(
  site: any,
  components: Array<{ id: string; name: string; description?: string }>,
  designTokens: DesignTokens | undefined,
  childThemeName: string | undefined,
  localLogger: any
): Promise<void> {
  localLogger.info(
    `[AI Site Builder] Creating ${components.length} block patterns from Figma components`
  );

  if (components.length === 0) {
    localLogger.info(`[AI Site Builder] No Figma components to convert to patterns`);
    return;
  }

  // Initialize the component mapper
  const componentMapper = new FigmaComponentMapper(localLogger);

  // Use design tokens or defaults
  const tokens: DesignTokens = designTokens || {
    colors: { primary: '#51a351', secondary: '#2c3e50', text: '#333333', background: '#ffffff' },
    typography: {
      fontFamilies: ['system-ui', 'sans-serif'],
      fontSizes: { base: '16px', large: '20px' },
      lineHeights: { base: '1.5', heading: '1.2' },
    },
    spacing: { sm: '8px', md: '16px', lg: '24px' },
    borderRadius: { sm: '4px', md: '8px' },
  };

  // Convert components to expected format
  const figmaComponents = components.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
  }));

  // Classify components
  const classified = componentMapper.classifyComponents(figmaComponents);
  localLogger.info(
    `[AI Site Builder] Classified components: ${JSON.stringify({
      buttons: classified.buttons.length,
      cards: classified.cards.length,
      headers: classified.headers.length,
      testimonials: classified.testimonials.length,
      pricing: classified.pricing.length,
      features: classified.features.length,
      other: classified.other.length,
    })}`
  );

  // Generate WordPress block patterns
  const patterns = componentMapper.generatePatterns(classified, tokens);
  localLogger.info(`[AI Site Builder] Generated ${patterns.length} block patterns`);

  if (patterns.length === 0) {
    localLogger.info(`[AI Site Builder] No patterns generated from components`);
    return;
  }

  // Generate the PHP code for pattern registration
  const patternsPhp = componentMapper.generatePatternsPhp(patterns);

  // Write patterns file to child theme (or mu-plugins if no child theme)
  let targetDir: string;
  let targetFile: string;

  if (childThemeName) {
    targetDir = path.join(site.paths.app, 'public', 'wp-content', 'themes', childThemeName);
    targetFile = path.join(targetDir, 'figma-patterns.php');
  } else {
    targetDir = path.join(site.paths.app, 'public', 'wp-content', 'mu-plugins');
    targetFile = path.join(targetDir, 'figma-patterns.php');
  }

  // Ensure directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write the patterns PHP file
  fs.writeFileSync(targetFile, patternsPhp);
  localLogger.info(`[AI Site Builder] Created patterns file: ${targetFile}`);

  // If patterns are in child theme, include them in functions.php
  if (childThemeName) {
    const functionsFile = path.join(targetDir, 'functions.php');
    if (fs.existsSync(functionsFile)) {
      let functionsContent = fs.readFileSync(functionsFile, 'utf8');
      const includeStatement =
        "\n// Include Figma-generated block patterns\nrequire_once get_stylesheet_directory() . '/figma-patterns.php';\n";

      // Only add if not already included
      if (!functionsContent.includes('figma-patterns.php')) {
        functionsContent += includeStatement;
        fs.writeFileSync(functionsFile, functionsContent);
        localLogger.info(`[AI Site Builder] Added patterns include to functions.php`);
      }
    }
  }

  // Log the pattern names
  for (const pattern of patterns) {
    localLogger.info(
      `[AI Site Builder] - Pattern: ${pattern.name} (${pattern.categories.join(', ')})`
    );
  }

  localLogger.info(`[AI Site Builder] Figma patterns registered`);
}
