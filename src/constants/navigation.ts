import { FileText, Gauge, Image, LayoutTemplate, Mail, Users, type LucideIcon } from 'lucide-react';
import type { AdminRole } from '@/types/auth';

export const adminRoles: readonly AdminRole[] = ['super_admin', 'editor', 'author', 'viewer'];

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
  allowedRoles: readonly AdminRole[];
  children?: {
    label: string;
    href: string;
  }[];
}

export const navigation: readonly NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge, available: true, allowedRoles: adminRoles },
  { label: 'Blogs', href: '/blogs', icon: FileText, available: true, allowedRoles: adminRoles },
  { label: 'Media Library', href: '/media', icon: Image, available: true, allowedRoles: adminRoles },
  { label: 'Templates', href: '/templates', icon: LayoutTemplate, available: true, allowedRoles: adminRoles },
  { 
    label: 'Newsletter', 
    href: '/newsletter/campaigns', 
    icon: Mail, 
    available: true, 
    allowedRoles: ['super_admin', 'editor'],
    children: [
      { label: 'Campaigns', href: '/newsletter/campaigns' },
      { label: 'Subscribers', href: '/newsletter/subscribers' }
    ]
  },
];
