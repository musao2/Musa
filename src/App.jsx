import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import HistoryPage from './components/HistoryPage';
import MapPage from './components/MapPage';
import ProfilePage from './components/ProfilePage';
import LoginPage from './components/LoginPage';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Yuklash
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f7b4c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-[14px]">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Login kerak
  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activeTab) {
      case 'home':    return <HomePage />;
      case 'history': return <HistoryPage />;
      case 'map':     return <MapPage />;
      case 'profile': return <ProfilePage />;
      default:        return <HomePage />;
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <div className="flex-1 pb-20 flex flex-col">
        {renderPage()}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;