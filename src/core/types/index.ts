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
  is_private: boolean;
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
  frequency: 'monthly' | 'installment' | 'annual';
  total_installments: number | null;
  start_month: number | null;
  start_year: number | null;
  month_of_year: number | null;
  created_at: string;
  categories: FinanceCategory[];
}

// Source Finder module types
export interface SourceSearch {
  id: number;
  tweet_url: string;
  tweet_id: string;
  tweet_text: string | null;
  tweet_author: string | null;
  tweet_author_avatar: string | null;
  image_count: number;
  created_at: string;
  results?: SourceResult[];
}

export interface SourceResult {
  id: number;
  search_id: number;
  image_url: string;
  source_name: string | null;
  source_title: string | null;
  similarity: number;
  source_url: string | null;
  thumbnail_url: string | null;
  index_name: string | null;
  creators: string | null;
  created_at: string;
}

// Gallery module types
export interface GalleryFolder {
  id: number;
  name: string;
  parent_id: number | null;
  cover_media_id: number | null;
  created_at: string;
  media_count?: number;
  cover_thumbnail?: string;
}

export interface GalleryMedia {
  id: number;
  filename: string;
  original_name: string;
  vault_path: string;
  media_type: 'image' | 'video';
  file_size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  folder_id: number | null;
  is_favorite: boolean;
  notes: string | null;
  trashed_at: string | null;
  created_at: string;
  categories?: GalleryCategory[];
}

export interface GalleryCategory {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
}

// Radar module types
export interface RadarSearch {
  id: number;
  query: string;
  keywords: string | null;
  tip: string | null;
  is_saved: boolean;
  notes: string | null;
  query_count: number;
  created_at: string;
}

export interface RadarQuery {
  id: number;
  search_id: number;
  platform: string;
  query_text: string;
  description: string | null;
  launch_url: string;
  created_at: string;
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
