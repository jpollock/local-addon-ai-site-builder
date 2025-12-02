/**
 * Figma API utility functions
 *
 * Helper functions for interacting with the Figma API including:
 * - URL parsing and file key extraction
 * - API request handling with rate limiting
 * - Design token extraction
 * - Page and component extraction
 */

import { DesignTokens } from '../../common/types';

// Note: Figma OAuth was removed - Figma doesn't support PKCE for desktop apps.
// All Figma API calls now use Personal Access Tokens (PAT) only.

/**
 * Figma rate limit error details
 */
export interface FigmaRateLimitInfo {
  retryAfter: number; // seconds
  planTier?: string;
  rateLimitType?: string; // 'low' (Collab/Viewer) or 'high' (Full/Dev)
  upgradeLink?: string;
}

/**
 * Custom error for Figma rate limits
 */
export class FigmaRateLimitError extends Error {
  readonly rateLimitInfo: FigmaRateLimitInfo;
  readonly statusCode: number = 429;

  constructor(message: string, info: FigmaRateLimitInfo) {
    super(message);
    this.name = 'FigmaRateLimitError';
    this.rateLimitInfo = info;
  }
}

/**
 * Extract Figma file key from URL
 * Supports formats: figma.com/file/KEY/..., figma.com/design/KEY/...,
 * figma.com/proto/KEY/..., figma.com/board/KEY/...
 * Note: /site/ URLs are Figma website pages, not design files
 */
export function extractFigmaFileKey(url: string, logger?: any): string | null {
  // Log the URL being parsed
  if (logger) {
    logger.info('[AI Site Builder] Parsing Figma URL:', url);
  }

  // Support multiple Figma URL formats
  const pattern = /figma\.com\/(?:file|design|proto|board)\/([a-zA-Z0-9]+)/;
  const match = url.match(pattern);

  if (logger) {
    if (match) {
      logger.info('[AI Site Builder] Extracted file key:', match[1]);
    } else {
      // Check if it's a /site/ URL (which is not a design file)
      if (url.includes('figma.com/site/')) {
        logger.warn(
          '[AI Site Builder] URL appears to be a Figma website page (/site/), not a design file'
        );
      } else {
        logger.warn(
          '[AI Site Builder] Could not extract file key from URL. Expected format: figma.com/file/KEY or figma.com/design/KEY'
        );
      }
    }
  }

  return match ? match[1] : null;
}

/**
 * Get authorization headers for Figma API (PAT only)
 */
export function getFigmaAuthHeaders(token: string): Record<string, string> {
  // PAT mode uses X-FIGMA-TOKEN header
  return {
    'X-FIGMA-TOKEN': token,
  };
}

/**
 * Extract rate limit info from Figma response headers
 */
function extractRateLimitInfo(response: Response): FigmaRateLimitInfo {
  return {
    retryAfter: parseInt(response.headers.get('Retry-After') || '60', 10),
    planTier: response.headers.get('X-Figma-Plan-Tier') || undefined,
    rateLimitType: response.headers.get('X-Figma-Rate-Limit-Type') || undefined,
    upgradeLink: response.headers.get('X-Figma-Upgrade-Link') || undefined,
  };
}

/**
 * Handle Figma API response, throwing appropriate errors for rate limits
 */
async function handleFigmaResponse(
  response: Response,
  endpoint: string,
  logger?: any
): Promise<any> {
  // Log response headers for debugging
  if (logger) {
    logger.info(`[Figma API] ${endpoint} - Status: ${response.status}`);
  }

  // Handle rate limiting
  if (response.status === 429) {
    const rateLimitInfo = extractRateLimitInfo(response);

    if (logger) {
      logger.warn('[Figma API] Rate limit hit!', {
        endpoint,
        retryAfter: rateLimitInfo.retryAfter,
        planTier: rateLimitInfo.planTier,
        rateLimitType: rateLimitInfo.rateLimitType,
        upgradeLink: rateLimitInfo.upgradeLink,
      });
    }

    const userMessage =
      rateLimitInfo.rateLimitType === 'low'
        ? `Figma API rate limit exceeded. Your account type has limited API access. Please wait ${rateLimitInfo.retryAfter} seconds before trying again.`
        : `Figma API rate limit exceeded. Please wait ${rateLimitInfo.retryAfter} seconds before trying again.`;

    throw new FigmaRateLimitError(userMessage, rateLimitInfo);
  }

  // Handle other errors
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    if (logger) {
      logger.error(`[Figma API] ${endpoint} error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
    }
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch with retry logic for rate limits
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2,
  logger?: any
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If rate limited and we have retries left, wait and retry
      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        // Cap retry wait at 30 seconds for UX
        const waitTime = Math.min(retryAfter, 30) * 1000;

        if (logger) {
          logger.info(
            `[Figma API] Rate limited, waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (logger) {
        logger.error(`[Figma API] Fetch attempt ${attempt + 1} failed:`, error);
      }

      // Don't retry on network errors for now
      throw error;
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Fetch Figma file data from API (PAT only)
 */
export async function fetchFigmaFile(fileKey: string, token: string, logger?: any): Promise<any> {
  const url = `https://api.figma.com/v1/files/${fileKey}`;
  if (logger) {
    logger.info('[Figma API] Fetching file:', { fileKey });
  }

  const response = await fetchWithRetry(url, { headers: getFigmaAuthHeaders(token) }, 2, logger);

  return handleFigmaResponse(response, `GET /files/${fileKey}`, logger);
}

/**
 * Fetch Figma styles from API (PAT only)
 */
export async function fetchFigmaStyles(fileKey: string, token: string, logger?: any): Promise<any> {
  const url = `https://api.figma.com/v1/files/${fileKey}/styles`;

  const response = await fetchWithRetry(
    url,
    { headers: getFigmaAuthHeaders(token) },
    1, // Fewer retries for secondary endpoints
    logger
  );

  // Handle rate limits
  if (response.status === 429) {
    return handleFigmaResponse(response, `GET /files/${fileKey}/styles`, logger);
  }

  if (!response.ok) {
    // Styles endpoint might fail if there are no published styles, return empty
    if (logger) {
      logger.info(
        '[Figma API] Styles endpoint returned non-200, returning empty:',
        response.status
      );
    }
    return { meta: { styles: [] } };
  }

  return response.json();
}

/**
 * Fetch Figma components from API (PAT only)
 */
export async function fetchFigmaComponents(
  fileKey: string,
  token: string,
  logger?: any
): Promise<any> {
  const url = `https://api.figma.com/v1/files/${fileKey}/components`;

  const response = await fetchWithRetry(
    url,
    { headers: getFigmaAuthHeaders(token) },
    1, // Fewer retries for secondary endpoints
    logger
  );

  // Handle rate limits
  if (response.status === 429) {
    return handleFigmaResponse(response, `GET /files/${fileKey}/components`, logger);
  }

  if (!response.ok) {
    // Components endpoint might fail if there are no published components, return empty
    if (logger) {
      logger.info(
        '[Figma API] Components endpoint returned non-200, returning empty:',
        response.status
      );
    }
    return { meta: { components: [] } };
  }

  return response.json();
}

/**
 * Extract components from Figma API response
 */
export function extractFigmaComponentsFromData(
  componentsData: any
): Array<{ id: string; name: string; description?: string }> {
  const components: Array<{ id: string; name: string; description?: string }> = [];

  if (componentsData?.meta?.components) {
    for (const comp of componentsData.meta.components) {
      components.push({
        id: comp.node_id || comp.key,
        name: comp.name,
        description: comp.description || undefined,
      });
    }
  }

  return components;
}

/**
 * Extract pages from Figma file
 */
export function extractFigmaPages(fileData: any): Array<{
  id: string;
  name: string;
  type: 'homepage' | 'content-page' | 'template' | 'component';
}> {
  const pages: Array<{
    id: string;
    name: string;
    type: 'homepage' | 'content-page' | 'template' | 'component';
  }> = [];

  if (fileData.document?.children) {
    fileData.document.children.forEach((page: any) => {
      if (page.type === 'CANVAS') {
        // Try to determine page type from name
        const nameLower = page.name.toLowerCase();
        let type: 'homepage' | 'content-page' | 'template' | 'component' = 'content-page';

        if (nameLower.includes('home') || nameLower.includes('landing')) {
          type = 'homepage';
        } else if (nameLower.includes('template') || nameLower.includes('layout')) {
          type = 'template';
        } else if (
          nameLower.includes('component') ||
          nameLower.includes('ui') ||
          nameLower.includes('element')
        ) {
          type = 'component';
        }

        pages.push({
          id: page.id,
          name: page.name,
          type,
        });
      }
    });
  }

  return pages;
}

/**
 * Extract design tokens from Figma file data
 * Enhanced to support comprehensive CSS generation
 */
export function extractDesignTokens(fileData: any, stylesData: any, logger?: any): DesignTokens {
  const colors: Record<string, string> = {};
  const fontFamilies = new Set<string>();
  const fontSizes: Record<string, number> = {};
  const fontWeights = new Set<number>();
  const lineHeights: Record<string, number> = {};
  const spacing: Record<string, number> = {};
  const borderRadius: Record<string, number> = {};
  const shadows: Array<{ blur: number; offset: { x: number; y: number }; color: string }> = [];

  // Walk through the document tree to extract styles
  if (fileData.document) {
    walkFigmaNodes(fileData.document, (node: any) => {
      // Extract colors from fills
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
            const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            // Use node name or generate a key
            const colorKey =
              node.name?.toLowerCase().replace(/\s+/g, '-') ||
              `color-${Object.keys(colors).length + 1}`;
            if (!colors[colorKey]) {
              colors[colorKey] = hex;
            }
          }
        });
      }

      // Extract typography from text nodes
      if (node.type === 'TEXT' && node.style) {
        const style = node.style;
        if (style.fontFamily) {
          fontFamilies.add(style.fontFamily);
        }
        if (style.fontSize) {
          fontSizes[`size-${Math.round(style.fontSize)}`] = style.fontSize;
        }
        if (style.fontWeight) {
          fontWeights.add(style.fontWeight);
        }
        if (style.lineHeightPx) {
          lineHeights[`lh-${Math.round(style.lineHeightPx)}`] = style.lineHeightPx;
        }
      }

      // Extract border radius
      if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
        borderRadius[`radius-${Math.round(node.cornerRadius)}`] = node.cornerRadius;
      }
      // Also check individual corner radii
      if (node.rectangleCornerRadii) {
        node.rectangleCornerRadii.forEach((r: number) => {
          if (r > 0) {
            borderRadius[`radius-${Math.round(r)}`] = r;
          }
        });
      }

      // Extract spacing from auto-layout
      if (node.itemSpacing !== undefined && node.itemSpacing > 0) {
        spacing[`item-${Math.round(node.itemSpacing)}`] = node.itemSpacing;
      }
      if (node.paddingLeft !== undefined && node.paddingLeft > 0) {
        spacing[`pad-${Math.round(node.paddingLeft)}`] = node.paddingLeft;
      }
      if (node.paddingTop !== undefined && node.paddingTop > 0) {
        spacing[`pad-${Math.round(node.paddingTop)}`] = node.paddingTop;
      }

      // Extract drop shadows
      if (node.effects && Array.isArray(node.effects)) {
        node.effects.forEach((effect: any) => {
          if (effect.type === 'DROP_SHADOW' && effect.visible !== false) {
            shadows.push({
              blur: effect.radius || 0,
              offset: { x: effect.offset?.x || 0, y: effect.offset?.y || 0 },
              color: effect.color
                ? rgbToHex(effect.color.r, effect.color.g, effect.color.b)
                : '#000000',
            });
          }
        });
      }
    });
  }

  // Normalize spacing values to semantic scale
  const spacingValues = Object.values(spacing).sort((a, b) => a - b);
  const normalizedSpacing = normalizeToScale(spacingValues, {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  });

  // Normalize border radius to semantic scale
  const radiusValues = Object.values(borderRadius).sort((a, b) => a - b);
  const normalizedRadius = normalizeToScale(radiusValues, {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  });

  // Normalize font sizes to semantic scale
  const sizeValues = Object.values(fontSizes).sort((a, b) => a - b);
  const normalizedFontSizes = normalizeToScale(sizeValues, {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  });

  // Normalize font weights
  const weightValues = Array.from(fontWeights).sort((a, b) => a - b);
  const normalizedWeights = {
    normal: weightValues.find((w) => w >= 300 && w <= 500) || 400,
    medium: weightValues.find((w) => w >= 500 && w <= 600) || 500,
    semibold: weightValues.find((w) => w >= 600 && w <= 700) || 600,
    bold: weightValues.find((w) => w >= 700) || 700,
  };

  // Normalize shadows
  const normalizedShadows = normalizeShadows(shadows);

  // Map colors to semantic names
  const semanticColors = mapToSemanticColors(colors);

  // Log extraction results
  if (logger) {
    logger.info('[AI Site Builder] Design token extraction:', {
      colorsFound: Object.keys(colors).length,
      fontsFound: fontFamilies.size,
      fontSizesFound: Object.keys(fontSizes).length,
      spacingValuesFound: spacingValues.length,
      borderRadiusValuesFound: radiusValues.length,
      shadowsFound: shadows.length,
    });
  }

  // Ensure required properties exist in all token categories
  const finalColors = {
    primary: semanticColors.primary || '#51a351',
    secondary: semanticColors.secondary || '#2c3e50',
    text: semanticColors.text || '#333333',
    background: semanticColors.background || '#ffffff',
    accent: semanticColors.accent,
    textMuted: semanticColors.textMuted,
    surface: semanticColors.surface,
    border: semanticColors.border,
    custom: colors, // Keep all extracted colors
  };

  const finalFontSizes = {
    xs: normalizedFontSizes.xs || '12px',
    sm: normalizedFontSizes.sm || '14px',
    base: normalizedFontSizes.base || '16px',
    lg: normalizedFontSizes.lg || '18px',
    xl: normalizedFontSizes.xl || '20px',
    '2xl': normalizedFontSizes['2xl'] || '24px',
    '3xl': normalizedFontSizes['3xl'] || '30px',
    '4xl': normalizedFontSizes['4xl'] || '36px',
    large: normalizedFontSizes.large,
  };

  const finalSpacing = {
    xs: normalizedSpacing.xs || '4px',
    sm: normalizedSpacing.sm || '8px',
    md: normalizedSpacing.md || '16px',
    lg: normalizedSpacing.lg || '24px',
    xl: normalizedSpacing.xl || '32px',
    '2xl': normalizedSpacing['2xl'] || '48px',
    '3xl': normalizedSpacing['3xl'] || '64px',
  };

  const finalBorderRadius = {
    none: normalizedRadius.none || '0px',
    sm: normalizedRadius.sm || '4px',
    md: normalizedRadius.md || '8px',
    lg: normalizedRadius.lg || '12px',
    xl: normalizedRadius.xl || '16px',
    full: normalizedRadius.full || '9999px',
  };

  return {
    colors: finalColors,
    typography: {
      fontFamilies: Array.from(fontFamilies),
      fontSizes: finalFontSizes,
      fontWeights: normalizedWeights,
      lineHeights: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
        base: '1.5',
        heading: '1.25',
      },
    },
    spacing: finalSpacing,
    borderRadius: finalBorderRadius,
    shadows: normalizedShadows,
  };
}

// ========================================
// Internal Helper Functions
// ========================================

/**
 * Walk through Figma nodes recursively
 */
function walkFigmaNodes(node: any, callback: (node: any) => void): void {
  callback(node);

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => walkFigmaNodes(child, callback));
  }
}

/**
 * Convert RGB (0-1 scale) to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex to RGB (0-1 scale)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

/**
 * Convert hex to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}, ${alpha})`;
}

/**
 * Get color luminance (0-1)
 */
function getColorLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Get color saturation (0-1)
 */
function getColorSaturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Normalize extracted values to a semantic scale
 */
function normalizeToScale(
  values: number[],
  defaults: Record<string, number>
): Record<string, string> {
  if (values.length === 0) {
    // Return defaults as strings
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(defaults)) {
      result[key] = key === 'full' ? `${val}px` : `${val}px`;
    }
    return result;
  }

  const result: Record<string, string> = {};
  const sortedDefaults = Object.entries(defaults).sort((a, b) => a[1] - b[1]);

  // For each semantic slot, find the closest extracted value
  for (const [name, targetValue] of sortedDefaults) {
    // Find the closest value from extracted values
    let closest = values[0];
    let minDiff = Math.abs(values[0] - targetValue);

    for (const val of values) {
      const diff = Math.abs(val - targetValue);
      if (diff < minDiff) {
        minDiff = diff;
        closest = val;
      }
    }

    result[name] = `${Math.round(closest)}px`;
  }

  return result;
}

/**
 * Normalize shadows to sm/md/lg scale
 */
function normalizeShadows(
  shadows: Array<{ blur: number; offset: { x: number; y: number }; color: string }>
): { sm?: string; md?: string; lg?: string } {
  if (shadows.length === 0) {
    return {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    };
  }

  // Sort by blur radius
  const sorted = [...shadows].sort((a, b) => a.blur - b.blur);

  const toCSS = (s: { blur: number; offset: { x: number; y: number }; color: string }) =>
    `${s.offset.x}px ${s.offset.y}px ${s.blur}px 0 ${hexToRgba(s.color, 0.2)}`;

  return {
    sm: sorted[0] ? toCSS(sorted[0]) : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: sorted[Math.floor(sorted.length / 2)]
      ? toCSS(sorted[Math.floor(sorted.length / 2)])
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: sorted[sorted.length - 1]
      ? toCSS(sorted[sorted.length - 1])
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  };
}

/**
 * Map extracted colors to semantic color names
 */
function mapToSemanticColors(colors: Record<string, string>): Record<string, string> {
  const colorValues = Object.entries(colors);

  if (colorValues.length === 0) {
    // Return defaults
    return {
      primary: '#51a351',
      secondary: '#2C3E50',
      text: '#333333',
      background: '#FFFFFF',
    };
  }

  // Try to identify primary, secondary, text, background
  const result: Record<string, string> = {};
  const usedIndices = new Set<number>();

  // Look for dark colors (text candidates)
  const darkColors = colorValues
    .map((entry, idx) => ({ ...entry, idx, luminance: getColorLuminance(entry[1]) }))
    .filter((c) => c.luminance < 0.3);

  // Look for light colors (background candidates)
  const lightColors = colorValues
    .map((entry, idx) => ({ ...entry, idx, luminance: getColorLuminance(entry[1]) }))
    .filter((c) => c.luminance > 0.8);

  // Look for saturated colors (primary/secondary candidates)
  const saturatedColors = colorValues
    .map((entry, idx) => ({ ...entry, idx, saturation: getColorSaturation(entry[1]) }))
    .filter((c) => c.saturation > 0.3);

  // Assign text (darkest)
  if (darkColors.length > 0) {
    const darkest = darkColors.sort((a, b) => a.luminance - b.luminance)[0];
    result.text = darkest[1];
    usedIndices.add(darkest.idx);
  } else {
    result.text = '#333333';
  }

  // Assign background (lightest)
  if (lightColors.length > 0) {
    const lightest = lightColors.sort((a, b) => b.luminance - a.luminance)[0];
    result.background = lightest[1];
    usedIndices.add(lightest.idx);
  } else {
    result.background = '#FFFFFF';
  }

  // Assign primary (most saturated)
  if (saturatedColors.length > 0) {
    const mostSaturated = saturatedColors
      .filter((c) => !usedIndices.has(c.idx))
      .sort((a, b) => b.saturation - a.saturation)[0];
    if (mostSaturated) {
      result.primary = mostSaturated[1];
      usedIndices.add(mostSaturated.idx);
    }
  }
  if (!result.primary) {
    result.primary = '#51a351';
  }

  // Assign secondary (next most saturated or any remaining)
  const remaining = colorValues.filter((_, idx) => !usedIndices.has(idx));
  if (remaining.length > 0) {
    result.secondary = remaining[0][1];
  } else {
    result.secondary = '#2C3E50';
  }

  return result;
}
