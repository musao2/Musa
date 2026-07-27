import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import HistoryPage from './components/HistoryPage';
import MapPage from './components/MapPage';
import ProfilePage from './components/ProfilePage';
import LoginPage from './components/LoginPage';
import { supabase } from './lib/supabase';
import { IoNotificationsOutline, IoClose } from 'react-icons/io5';
import { BsFuelPump } from 'react-icons/bs';

const AppContent = () => {
  const { user, loading, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [pushNotification, setPushNotification] = useState(null);

  // Global real-time tranzaksiyalar bildirishnomasi
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global_tx_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const tx = payload.new;
        const amt = Number(tx.amount).toLocaleString('uz-UZ') + " so'm";
        const cb = Number(Math.abs(tx.cashback_amount)).toLocaleString('uz-UZ') + " so'm";

        // Bildirishnomalar yoqilganini tekshirish
        const isPushEnabled = localStorage.getItem('push_enabled') !== 'false';
        if (!isPushEnabled) return;

        // Profil balansini yangilash
        refreshProfile();

        // In-app Push xabarnoma tuzish
        const notifData = tx.cashback_amount < 0 
          ? {
              title: "Keshbek yechib olindi 💳",
              body: `Hisobingizdan ${cb} yechib olindi (To'lov summasi: ${amt})`,
              type: 'withdraw'
            }
          : {
              title: "Keshbek hisoblandi! 🎉",
              body: `Sizga +${cb} keshbek qo'shildi! (To'lov: ${amt})`,
              type: 'cashback'
            };

        setPushNotification(notifData);

        // Web Notification API (tizim push xabarnomasi)
        if (Notification.permission === 'granted') {
          new Notification(notifData.title, {
            body: notifData.body,
            icon: '/favicon.svg'
          });
        }

        // 4 soniyadan keyin o'chirish
        setTimeout(() => setPushNotification(null), 4500);
      })
      .subscribe();

    // Brauzerdan push ruxsatini so'rash
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => supabase.removeChannel(channel);
  }, [user, refreshProfile]);

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
    <div className="relative min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden">
      
      {/* GLOBAL NATIVE IN-APP PUSH NOTIFICATION */}
      {pushNotification && (
        <div className="fixed top-4 left-4 right-4 z-[999] bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-gray-100 flex items-start gap-3 animate-slide-down">
          <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c] shrink-0">
            <IoNotificationsOutline size={20} className="animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[14px] text-gray-900 leading-tight">
              {pushNotification.title}
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">
              {pushNotification.body}
            </p>
          </div>
          <button 
            onClick={() => setPushNotification(null)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <IoClose size={18} />
          </button>
        </div>
      )}

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