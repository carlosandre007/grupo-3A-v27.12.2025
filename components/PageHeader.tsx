
import React from 'react';

interface PageHeaderProps {
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, children }) => {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{title}</h2>
        <p className="text-slate-400 dark:text-slate-500 font-medium mt-1.5 text-sm">{description}</p>
      </div>
      {children && (
        <div className="flex gap-2">
          {children}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
