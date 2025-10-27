import React, { useState, createContext, useContext } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  children: React.ReactNode;
  defaultValue: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultValue, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
  const baseClasses = 'flex space-x-1 rounded-lg bg-gray-100 p-1';

  return (
    <div className={`${baseClasses} ${className}`}>
      {children}
    </div>
  );
};

export interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ children, value, className = '' }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  const baseClasses = 'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer text-center';
  const activeClasses = 'bg-white text-gray-900 shadow-sm';
  const inactiveClasses = 'text-gray-500 hover:text-gray-700';

  const classes = `${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${className}`;

  return (
    <button className={classes} onClick={() => setActiveTab(value)}>
      {children}
    </button>
  );
};

export interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ children, value, className = '' }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return (
    <div className={className}>
      {children}
    </div>
  );
};