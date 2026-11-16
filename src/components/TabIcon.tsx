import {
  BookOpen,
  Briefcase,
  Dumbbell,
  Folder,
  Heart,
  Home,
  ShoppingBag,
  Sparkles,
  Wrench,
} from 'lucide-react';

export const TAB_ICON_OPTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'briefcase', label: 'Work' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'wrench', label: 'Maintenance' },
  { id: 'sparkles', label: 'Personal' },
  { id: 'heart', label: 'Health' },
  { id: 'dumbbell', label: 'Fitness' },
  { id: 'book', label: 'Study' },
  { id: 'folder', label: 'General' },
] as const;

export function TabIcon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  switch (name) {
    case 'home':
      return <Home className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'shopping':
      return <ShoppingBag className={className} />;
    case 'wrench':
      return <Wrench className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'dumbbell':
      return <Dumbbell className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    default:
      return <Folder className={className} />;
  }
}
