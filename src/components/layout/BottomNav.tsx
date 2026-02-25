import { NavLink } from 'react-router-dom';
import { Dumbbell, ClipboardList, TrendingUp, BookOpen, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/app', icon: Dumbbell, labelKey: 'app.tabs.workout' },
  { to: '/app/plans', icon: ClipboardList, labelKey: 'app.tabs.plans' },
  { to: '/app/exercises', icon: BookOpen, labelKey: 'app.tabs.exercises' },
  { to: '/app/progress', icon: TrendingUp, labelKey: 'app.tabs.progress' },
  { to: '/app/more', icon: Menu, labelKey: 'app.tabs.more' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card pb-safe">
      <div className="flex h-16 items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/app'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-manipulation min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <tab.icon className="h-5 w-5" />
            <span>{t(tab.labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
