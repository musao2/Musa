import React, { useState } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import HistoryPage from './components/HistoryPage';
import MapPage from './components/MapPage';
import ProfilePage from './components/ProfilePage';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'history':
        return <HistoryPage />;
      case 'map':
        return <MapPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage />;   
        
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      {/* Content Area */}
      <div className="flex-1 pb-20 flex flex-col">
        {renderPage()}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;