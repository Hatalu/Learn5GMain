export type UserRole = 'member' | 'dev';

export type Subject = 'คณิตศาสตร์' | 'วิทยาศาสตร์' | 'ภาษาอังกฤษ';

export type GradeLevel = 'ป.1' | 'ป.2' | 'ป.3' | 'ป.4' | 'ป.5' | 'ป.6';

export type MediaType = 'เกม' | 'แบบฝึกหัด' | 'แบบทดสอบ' | 'สื่อ Interactive' | 'วิดีโอ' | 'อื่น ๆ';

export type AccessTier = 'free' | 'premium';

export const ALL_SUBJECTS: Subject[] = ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'];

export const ALL_GRADES: GradeLevel[] = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

export const ALL_MEDIA_TYPES: MediaType[] = [
  'เกม',
  'แบบฝึกหัด',
  'แบบทดสอบ',
  'สื่อ Interactive',
  'วิดีโอ',
  'อื่น ๆ',
];

export const ALL_ACCESS_TIERS: AccessTier[] = ['free', 'premium'];

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  password?: string | null;
  premium_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  icon_url: string;
  subject: Subject;
  grade_level: string[];
  media_type: MediaType;
  access_tier: AccessTier;
  game_url: string;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
}

export interface Favorite {
  id: string;
  user_id: string;
  media_id: string;
  created_at: string;
}

export type SortOption = 'latest' | 'popular' | 'az';

export interface FilterState {
  subjects: Subject[];
  grades: GradeLevel[];
  mediaTypes: MediaType[];
  accessTiers: AccessTier[];
}

export interface SystemStats {
  totalMedia: number;
  totalMembers: number;
  totalViews: number;
  totalFavorites: number;
}
