'use client';

import { NotificationsPanel } from '@/components/NotificationsPanel';

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {action}
        <NotificationsPanel />
      </div>
    </div>
  );
}
