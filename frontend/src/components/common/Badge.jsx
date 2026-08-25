import React from 'react';

const badgeStyles = {
  // Registration Statuses
  pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200/80',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',

  // Attendance Statuses
  not_marked: 'bg-slate-50 text-slate-600 border-slate-200',
  present: 'bg-blue-50 text-blue-700 border-blue-200',
  absent: 'bg-rose-50 text-rose-700 border-rose-200',
  completed: 'bg-teal-50 text-teal-700 border-teal-200',

  // Event Statuses
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ongoing: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse',
  completed_event: 'bg-slate-100 text-slate-600 border-slate-200',

  // Roles
  student: 'bg-sky-50 text-sky-700 border-sky-200',
  organizer: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-rose-50 text-rose-700 border-rose-200',

  // User Account Status
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blocked: 'bg-rose-50 text-rose-700 border-rose-200',
};

const labels = {
  not_marked: 'Not Marked',
  completed_event: 'Completed',
};

export const Badge = ({ status, text, size = 'md', className = '' }) => {
  const normalizedKey = status ? status.toLowerCase() : 'pending';
  const style = badgeStyles[normalizedKey] || 'bg-slate-100 text-slate-700 border-slate-200';
  const displayText = text || labels[normalizedKey] || normalizedKey.replace('_', ' ');

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : size === 'lg' 
    ? 'px-3.5 py-1.5 text-sm' 
    : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium capitalize rounded-full border shadow-sm ${sizeClasses} ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {displayText}
    </span>
  );
};
