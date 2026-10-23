/** Anchors shared by the public marketing pages (landing page, guide, nav and footer). */

export interface MarketingLink {
  id: string;
  label: string;
}

/** Landing page sections shown in the top navigation. */
export const LANDING_NAV_LINKS: MarketingLink[] = [
  { id: 'work', label: 'Features' },
  { id: 'ai', label: 'AI' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'developers', label: 'Developers' },
  { id: 'governance', label: 'Governance' },
  { id: 'roles', label: 'Roles' },
  { id: 'faq', label: 'FAQ' }
];

/** Sections of the product guide, in reading order. Used by the guide's table of contents and the footer. */
export const GUIDE_SECTIONS: MarketingLink[] = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'workspaces-and-roles', label: 'Workspaces and roles' },
  { id: 'projects-and-epics', label: 'Projects and epics' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'workflow-states', label: 'Workflow states' },
  { id: 'slas', label: 'SLAs' },
  { id: 'dynamic-priority', label: 'Dynamic priority and rollover' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'ai', label: 'AI features' },
  { id: 'prompts', label: 'Prompt library and playground' },
  { id: 'product-engagement', label: 'Product engagement' },
  { id: 'event-tracking', label: 'Event tracking' },
  { id: 'developer-integrations', label: 'Developer integrations' },
  { id: 'agent-governance', label: 'Agent governance' },
  { id: 'account-security', label: 'Account and security' },
  { id: 'troubleshooting', label: 'Troubleshooting and FAQ' }
];
