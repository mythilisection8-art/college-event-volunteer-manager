import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div
        className={`${sizeClasses[size] || sizeClasses.md} border-indigo-600 border-t-transparent rounded-full animate-spin`}
      />
      {text && <p className="text-sm font-medium text-slate-500 mt-4">{text}</p>}
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-pulse">
    <div className="h-44 bg-slate-200 rounded-xl mb-4"></div>
    <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
    <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
    </div>
  </div>
);
