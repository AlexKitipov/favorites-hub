export type TabId = 'favorites' | 'recentApps' | 'recentFiles' | 'allPrograms';

export interface TabDefinition {
  id: TabId;
  label: string;
}

interface TabsContainerProps {
  tabs: TabDefinition[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

// Pure presentational component: it knows nothing about what each tab
// renders. Adding a new tab elsewhere in the app never requires touching
// this file — just pass a longer `tabs` array from App.tsx.
export function TabsContainer({ tabs, activeTab, onTabChange }: TabsContainerProps) {
  return (
    <nav className="tabs-container" role="tablist" aria-label="Sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTab}
          className={`tab-button ${tab.id === activeTab ? 'tab-button--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
