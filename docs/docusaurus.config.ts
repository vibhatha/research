import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'LDF Research',
  tagline: 'Research and Development at Lanka Data Foundation',
  favicon: 'img/ldf_logo.png',

  // Future flags
  future: {
    v4: true,
  },

  url: 'https://ldflk.github.io',
  baseUrl: '/research/',
  organizationName: 'ldflk',
  projectName: 'research',
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/vibhatha/research/tree/main/docs/',
        },
        blog: false, // Disabling blog for now
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  themeConfig: {
    image: 'img/ldf_logo.png',
    navbar: {
      title: 'LDF Research',
      logo: {
        alt: 'LDF Research Logo',
        src: 'img/ldf_logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Projects',
        },
        {
          href: 'https://github.com/vibhatha/research',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Research',
          items: [
            {
              label: 'Projects',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/LDFLK/research',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Lanka Data Foundation.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
