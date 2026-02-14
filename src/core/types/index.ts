// Gmail module types
export interface GmailAccount {
  id: number;
  email_prefix: string;
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: number;
  name: string;
  created_at: string;
}

export interface GmailPlatformStatus {
  id: number;
  gmail_id: number;
  platform_id: number;
  is_registered: boolean;
  updated_at: string;
  platform_name?: string;
}

export interface GmailAccountWithPlatforms extends GmailAccount {
  platforms: GmailPlatformStatus[];
  pendingCount: number;
  totalCount: number;
  allCompleted: boolean;
}

// Clipboard module types
export interface ClipboardCategory {
  id: number;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface ClipboardFolder {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  is_private: boolean;
  created_at: string;
  item_count?: number;
}

export interface ClipboardLink {
  id: number;
  title: string;
  url: string;
  type: 'link' | 'note';
  content: string | null;
  folder_id: number | null;
  category_id: number | null;
  is_private: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  folder_name?: string;
  category_name?: string;
  tags?: ClipboardTag[];
}

export interface ClipboardTag {
  id: number;
  name: string;
}

// Focus module types
export interface FocusTask {
  id: number;
  title: string;
  is_completed: boolean;
  date: string;
  created_at: string;
}

export interface FocusSession {
  id: number;
  duration_minutes: number;
  completed: boolean;
  date: string;
  created_at: string;
}

// Finance module types
export interface FinanceCategory {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface FinanceTransaction {
  id: number;
  title: string;
  amount: number;
  currency: 'ARS' | 'USD';
  status: 'confirmed' | 'pending';
  recurring_id: number | null;
  exchange_rate: number | null;
  type: 'income' | 'expense';
  date: string;
  notes: string | null;
  created_at: string;
  categories: FinanceCategory[];
}

export interface FinanceRecurring {
  id: number;
  title: string;
  amount: number;
  currency: 'ARS' | 'USD';
  type: 'expense';
  day_of_month: number;
  is_active: boolean;
  created_at: string;
  categories: FinanceCategory[];
}

// Module definition for the dashboard
export interface ModuleDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  route: string;
  color?: string;
}
