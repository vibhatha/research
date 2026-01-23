import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Legislative Analysis',
      collapsible: true,
      link: { type: 'doc', id: 'legislative-analysis/intro' },
      items: [
        'legislative-analysis/features',
        'legislative-analysis/architecture',
        'legislative-analysis/tech-stack',
        'legislative-analysis/ui-tool',
        'legislative-analysis/setup-usage',
        {
          type: 'category',
          label: 'Browse Acts',
          collapsible: true,
          items: [
            'legislative-analysis/acts-browser',
            'legislative-analysis/archive',
          ]
        },
      ]
    },
    {
      type: 'category',
      label: 'DeepSeek OCR',
      collapsible: true,
      link: { type: 'doc', id: 'deepseek-ocr/intro' },
      items: [
        'deepseek-ocr/setup',
        'deepseek-ocr/usage',
        'deepseek-ocr/experiments',
      ]
    },
    {
      type: 'category',
      label: 'Gazette Analysis',
      collapsible: true,
      link: { type: 'doc', id: 'gazettes/intro' },
      items: [
        'gazettes/extractor',
        'gazettes/processor',
        'gazettes/api-reference',
        'gazettes/tracer',
      ]
    },
  ],
};

export default sidebars;
