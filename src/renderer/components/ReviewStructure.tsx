/**
 * Review Structure Screen - Master/Detail view of AI-generated site structure
 *
 * Two-panel layout:
 * - Left: Section navigation (Content Types, Pages, Taxonomies, etc.)
 * - Right: Detail view of selected section
 */

import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { IPC_CHANNELS, ROUTES } from '../../common/constants';
import { SiteStructure } from '../../common/types';
import { getElectron } from '../electron-context';
import { CustomStepper } from './CustomStepper';
import { SectionNav, SectionItem } from './SectionNav';
import { SectionDetail, SectionKey } from './SectionDetail';

interface Props extends RouteComponentProps {
  siteSettings: any;
  updateSiteSettings?: (settings: any) => void;
  context?: any;
}

interface State {
  structure: SiteStructure | null;
  isCreatingSite: boolean;
  error: string | null;
  selectedSection: SectionKey;
}

export class ReviewStructure extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      structure: props.siteSettings.structure || null,
      isCreatingSite: false,
      error: null,
      selectedSection: 'content-types',
    };
  }

  componentDidMount() {
    if (!this.state.structure) {
      this.loadStructure();
    }
  }

  loadStructure = async () => {
    try {
      const { siteSettings } = this.props;

      if (!siteSettings.projectId) {
        throw new Error('No project ID found');
      }

      const electron = getElectron();

      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT, {
        projectId: siteSettings.projectId,
      });

      if (!response.success || !response.project.structure) {
        throw new Error('No structure found for this project');
      }

      this.setState({ structure: response.project.structure });
    } catch (error: any) {
      console.error('[ReviewStructure] Error loading structure:', error);
      this.setState({ error: error.message || 'Failed to load structure' });
    }
  };

  handleProceedToBuild = async () => {
    const { structure } = this.state;

    if (!structure) {
      return;
    }

    try {
      this.setState({ isCreatingSite: true, error: null });

      const siteName =
        this.props.siteSettings.projectName ||
        this.props.siteSettings.wizardAnswers?.siteName ||
        `ai-site-${Date.now()}`;

      const siteDomain = `${siteName.toLowerCase().replace(/\s+/g, '-')}.local`;

      if (this.props.updateSiteSettings) {
        this.props.updateSiteSettings({
          siteName,
          siteDomain,
        });
      }

      console.log('[ReviewStructure] Navigating to building screen');
      this.props.history.push(ROUTES.BUILDING);

      const electron = getElectron();
      const plainStructure = JSON.parse(JSON.stringify(structure));

      // Include Figma analysis if available for enhanced design application
      const figmaAnalysis = this.props.siteSettings.figmaAnalysis
        ? JSON.parse(JSON.stringify(this.props.siteSettings.figmaAnalysis))
        : undefined;

      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.CREATE_SITE, {
        projectId: this.props.siteSettings.projectId,
        siteName,
        siteDomain,
        structure: plainStructure,
        figmaAnalysis, // Pass Figma analysis for page/pattern generation
        environment: {
          php: '8.2.0',
          webServer: 'nginx',
          database: '8.0.16',
        },
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create site');
      }

      if (this.props.updateSiteSettings) {
        this.props.updateSiteSettings({
          siteId: response.siteId,
        });
      }

      console.log('[ReviewStructure] Site creation started:', response.siteId);
    } catch (error: any) {
      console.error('[ReviewStructure] Error creating site:', error);
    }
  };

  handleGoBack = () => {
    this.props.history.push(ROUTES.QUESTIONS);
  };

  handleStartOver = () => {
    if (this.props.updateSiteSettings) {
      this.props.updateSiteSettings({
        wizardAnswers: {},
        structure: null,
        projectId: null,
      });
    }
    this.props.history.push(ROUTES.ENTRY);
  };

  handleSelectSection = (sectionKey: string) => {
    this.setState({ selectedSection: sectionKey as SectionKey });
  };

  handleEdit = (type: string, item: any) => {
    console.log('[ReviewStructure] Edit:', type, item);
    // TODO: Implement edit modal/drawer
  };

  handleDelete = (type: string, item: any) => {
    console.log('[ReviewStructure] Delete:', type, item);
    // TODO: Implement delete confirmation
  };

  handleAdd = (type: string) => {
    console.log('[ReviewStructure] Add:', type);
    // TODO: Implement add modal/drawer
  };

  render() {
    const { structure, isCreatingSite, error, selectedSection } = this.state;
    const siteName =
      this.props.siteSettings?.wizardAnswers?.siteName ||
      this.props.siteSettings?.projectName ||
      'Your Site';
    const siteDomain = `${siteName.toLowerCase().replace(/\s+/g, '-')}.local`;

    if (!structure) {
      return this.renderLoadingOrError();
    }

    const sections = this.buildSectionItems(structure);
    const pages = this.extractPages(structure);

    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      },

      // Header
      this.renderHeader(siteName, siteDomain),

      // Main content area - Master/Detail layout
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
          },
        },

        // Left side - Section navigation
        React.createElement(SectionNav, {
          sections,
          selectedSection,
          onSelectSection: this.handleSelectSection,
        }),

        // Right side - Section detail
        React.createElement(SectionDetail, {
          sectionKey: selectedSection,
          structure,
          pages,
          onEdit: this.handleEdit,
          onDelete: this.handleDelete,
          onAdd: this.handleAdd,
        })
      ),

      // Footer
      this.renderFooter(isCreatingSite),

      // Error overlay
      error && this.renderError(error),

      // Custom stepper
      React.createElement(CustomStepper, {
        currentPath: this.props.history.location.pathname,
      })
    );
  }

  private buildSectionItems(structure: SiteStructure): SectionItem[] {
    const postTypes = structure.content.postTypes || [];
    const plugins = structure.features.plugins || [];
    const pages = this.extractPages(structure);

    // Extract unique taxonomies from all post types
    const allTaxonomies = postTypes.flatMap((pt) => pt.taxonomies || []);
    const uniqueTaxonomies = allTaxonomies.filter(
      (tax, index, self) => index === self.findIndex((t) => t.slug === tax.slug)
    );

    return [
      {
        key: 'content-types',
        icon: '📝',
        title: 'Content Types',
        count: postTypes.length,
      },
      {
        key: 'pages',
        icon: '📄',
        title: 'Pages',
        count: pages.length,
      },
      {
        key: 'taxonomies',
        icon: '🏷️',
        title: 'Taxonomies',
        count: uniqueTaxonomies.length || undefined,
      },
      {
        key: 'navigation',
        icon: '🧭',
        title: 'Navigation',
      },
      {
        key: 'design',
        icon: '🎨',
        title: 'Design & Theme',
      },
      {
        key: 'plugins',
        icon: '🔌',
        title: 'Features & Plugins',
        count: plugins.length,
      },
    ];
  }

  private renderLoadingOrError() {
    const { error } = this.state;

    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        },
      },
      error
        ? React.createElement(
            'div',
            { style: { textAlign: 'center', color: '#f44336' } },
            React.createElement('h2', null, 'Error Loading Structure'),
            React.createElement('p', null, error),
            React.createElement(
              'button',
              {
                onClick: this.handleGoBack,
                className: 'Button Button--primary',
                style: { marginTop: '16px' },
              },
              'Go Back'
            )
          )
        : React.createElement('div', null, 'Loading structure...')
    );
  }

  private renderHeader(siteName: string, siteDomain: string) {
    return React.createElement(
      'div',
      {
        style: {
          padding: '20px 32px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },

      // Left side - Title and subtitle
      React.createElement(
        'div',
        null,
        React.createElement(
          'h2',
          {
            style: {
              margin: '0 0 4px 0',
              fontSize: '24px',
              fontWeight: 600,
            },
          },
          'Review Your Site Structure'
        ),
        React.createElement(
          'p',
          {
            style: {
              margin: 0,
              color: '#666',
              fontSize: '14px',
            },
          },
          'Review the AI-generated architecture before building'
        )
      ),

      // Right side - Site domain
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f8f8f8',
            borderRadius: '8px',
          },
        },
        React.createElement('span', { style: { fontSize: '16px' } }, '🌐'),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '15px',
              color: '#51a351',
              fontWeight: 500,
            },
          },
          siteDomain
        )
      )
    );
  }

  private renderFooter(isCreatingSite: boolean) {
    return React.createElement(
      'div',
      {
        style: {
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '60px', // Space for stepper
        },
      },

      // Left buttons
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '12px' } },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: this.handleGoBack,
            disabled: isCreatingSite,
            style: {
              padding: '10px 20px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#fff',
              cursor: isCreatingSite ? 'not-allowed' : 'pointer',
              opacity: isCreatingSite ? 0.5 : 1,
            },
          },
          'Go back'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: this.handleStartOver,
            disabled: isCreatingSite,
            style: {
              padding: '10px 20px',
              fontSize: '14px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#666',
              cursor: isCreatingSite ? 'not-allowed' : 'pointer',
              opacity: isCreatingSite ? 0.5 : 1,
            },
          },
          'Start over'
        )
      ),

      // Build button
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: this.handleProceedToBuild,
          disabled: isCreatingSite,
          style: {
            padding: '12px 28px',
            fontSize: '15px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: isCreatingSite ? '#ccc' : '#51a351',
            color: '#fff',
            cursor: isCreatingSite ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          },
        },
        isCreatingSite ? 'Creating Site...' : 'Approve and build site'
      )
    );
  }

  private renderError(error: string) {
    return React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#f44336',
          color: 'white',
          padding: '16px',
          textAlign: 'center',
          zIndex: 1000,
        },
      },
      error
    );
  }

  private extractPages(structure: SiteStructure): { title: string; slug: string }[] {
    // First check if structure has pages directly
    if (structure.content.pages && structure.content.pages.length > 0) {
      return structure.content.pages.map((p) => ({ title: p.title, slug: p.slug }));
    }

    // Fall back to wizard answers
    const wizardPages = this.props.siteSettings?.wizardAnswers?.requiredPages || [];
    const pages: { title: string; slug: string }[] = [];

    // Convert wizard page selections to page objects
    wizardPages.forEach((pageValue: string) => {
      const pageMap: Record<string, { title: string; slug: string }> = {
        about: { title: 'About', slug: 'about' },
        contact: { title: 'Contact', slug: 'contact' },
        'privacy-policy': { title: 'Privacy Policy', slug: 'privacy-policy' },
        faq: { title: 'FAQ', slug: 'faq' },
        'terms-of-service': { title: 'Terms of Service', slug: 'terms-of-service' },
        blog: { title: 'Blog', slug: 'blog' },
      };

      if (pageMap[pageValue]) {
        pages.push(pageMap[pageValue]);
      } else {
        // Handle custom pages
        pages.push({
          title: pageValue.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          slug: pageValue,
        });
      }
    });

    return pages;
  }
}
