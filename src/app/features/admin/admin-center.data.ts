export interface AdminNavGroup {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
}

export interface AdminTable {
  columns: string[];
  rows: string[][];
}

export interface AdminPage {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  status?: string;
  metrics: Array<{
    label: string;
    value: string;
    note: string;
    tooltip?: string;
    configureRoute?: string;
    configureLabel?: string;
  }>;
  cards: Array<{
    title: string;
    lines: string[];
    tooltip?: string;
  }>;
  table?: AdminTable;
  guardrails: string[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'General',
    items: [{ id: 'tenant-profile', label: 'Tenant Profile', icon: 'business' }],
  },
  {
    title: 'Access Control',
    items: [
      { id: 'users', label: 'Users', icon: 'group' },
      { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'security' },
      { id: 'groups', label: 'Groups', icon: 'hub' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'departments', label: 'Departments', icon: 'domain' },
      { id: 'skills', label: 'Skills', icon: 'psychology' },
      { id: 'hiring-pipeline', label: 'Hiring Pipeline', icon: 'account_tree' },
      { id: 'workflows', label: 'Workflows', icon: 'settings_applications' },
      { id: 'notifications', label: 'Notifications', icon: 'notifications_active' },
      { id: 'ai-settings', label: 'AI Settings', icon: 'smart_toy' },
      { id: 'integrations', label: 'Integrations', icon: 'extension' },
    ],
  },
  {
    title: 'Governance',
    items: [{ id: 'audit-logs', label: 'Audit Logs', icon: 'history' }],
  },
];

export const ADMIN_PAGES: AdminPage[] = [
  page('tenant-profile', 'General', 'Tenant Profile', 'Manage company details and brand identity.'),
  page('users', 'Access Control', 'Users', 'Manage internal people, access, and workflow routing membership.'),
  page('roles-permissions', 'Access Control', 'Roles & Permissions', 'Configure role permissions and tenant access policy.'),
  page('groups', 'Access Control', 'Groups', 'Configure workflow routing groups and membership.'),
  page('departments', 'Configuration', 'Departments', 'Manage recruitment department lookups.'),
  page('skills', 'Configuration', 'Skills', 'Manage normalized skills used by parsing and matching.'),
  page('hiring-pipeline', 'Configuration', 'Hiring Pipeline', 'Configure fixed interview stage templates.'),
  page('workflows', 'Configuration / Workflows', 'Workflows', 'Configure handoffs and baton routing for job requests.'),
  page('notifications', 'Configuration', 'Notifications', 'Review notification events and editable email templates.'),
  page('ai-settings', 'Configuration', 'AI Settings', 'Review AI runtime, agents, and guardrails.'),
  page('integrations', 'Configuration', 'Integrations', 'Review manual sourcing and invite-link activity.'),
  page('audit-logs', 'Governance', 'Audit Logs', 'Review tenant-scoped activity and configuration history.'),
];

export function getAdminPage(id: string | null): AdminPage {
  return ADMIN_PAGES.find((pageItem) => pageItem.id === id) ?? ADMIN_PAGES[0];
}

function page(id: string, eyebrow: string, title: string, subtitle: string): AdminPage {
  return {
    id,
    eyebrow,
    title,
    subtitle,
    metrics: [],
    cards: [],
    guardrails: [],
  };
}
