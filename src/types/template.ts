import type { BlogTemplateKey, BlogTemplateLayout } from './blog';

export interface TemplateUsage { draft_count: number; published_count: number; total_blog_count: number }
export interface TemplateLibraryItem {
  key: BlogTemplateKey;
  version: number;
  name: string;
  description: string;
  layout: BlogTemplateLayout;
  type: 'system';
  is_editable: false;
  is_deletable: false;
  usage: TemplateUsage;
}
export interface TemplateDetail extends TemplateLibraryItem {
  regions: string[];
  supported_behaviors: string[];
}
export interface TemplateLibraryResponse { items: TemplateLibraryItem[] }

