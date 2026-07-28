import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-900 rounded-3xl border border-slate-800 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 mb-4">
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{description}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
