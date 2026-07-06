import { useState } from 'react';
import { TabsContainer, type TabDefinition, type TabId } from './components/TabsContainer';
import { FavoritesPage } from './components/FavoritesPage';
import { RecentAppsPage } from './components/RecentAppsPage';
import { RecentFilesPage } from './components/RecentFilesPage';
import { AllProgramsPage } from './components/AllProgramsPage';
import './App.css';

// Single source of truth for which tabs exist and in what order.
// To add a new tab later: add an entry here, add a `case` below, done —
// TabsContainer and the rest of the app require no changes.
const TABS: TabDefinition[] = [
  { id: 'favorites', label: 'Favorites' },
  { id: 'recentApps', label: 'Recent Apps' },
  { id: 'recentFiles', label: 'Recent Files' },
  { id: 'allPrograms', label: 'All Programs' }
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('favorites');

  function renderActiveTab() {
    switch (activeTab) {
      case 'favorites':
        return <FavoritesPage />;
      case 'recentApps':
        return <RecentAppsPage />;
      case 'recentFiles':
        return <RecentFilesPage />;
      case 'allPrograms':
        return <AllProgramsPage />;
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header__title">Favorites Hub</h1>
        <TabsContainer tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      <main className="app-main">{renderActiveTab()}</main>
    </div>
  );
}

export default App;
