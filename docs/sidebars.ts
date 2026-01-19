import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro', // General intro
    {
      type: 'category',
      label: 'Research',
      collapsible: false,
      items: [
        {
          type: 'category',
          label: 'Legislative Analysis',
          items: [
            {
              type: 'category',
              label: 'Analysis',
              collapsible: true,
              items: [
                'legislative-analysis/archive',      // Full Acts Library
                'legislative-analysis/acts-browser', // Browse Analyzed Acts
              ]
            },
            {
              type: 'category',
              label: 'Act Extract Tool',
              collapsible: true,
              items: [
                'legislative-analysis/features',     // Key Features
                'legislative-analysis/ui-tool',      // UI Tool
                'legislative-analysis/tech-stack',   // Technology Stack
                'legislative-analysis/architecture',
                'legislative-analysis/setup-usage',
              ]
            }
          ]
        },
        {
          type: 'category',
          label: 'DeepSeek OCR',
          items: [
            {
              type: 'category',
              label: 'Findings',
              link: { type: 'doc', id: 'deepseek-ocr/experiments' },
              items: [
                'deepseek-ocr/experiments',
              ]
            },
            {
              type: 'category',
              label: 'Technology',
              link: { type: 'doc', id: 'deepseek-ocr/intro' },
              items: [
                'deepseek-ocr/intro',
                'deepseek-ocr/setup',
                'deepseek-ocr/usage'
              ]
            }
          ]
        }
      ]
    },
  ],
};

export default sidebars;
