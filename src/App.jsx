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
  const { user, profile, loading, refreshProfile, updateProfileName } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [pushNotification, setPushNotification] = useState(null);
  
  // Majburiy ism so'rash state'lari
  const [mandatoryName, setMandatoryName] = useState('');
  const [nameError, setNameError]         = useState('');
  const [savingName, setSavingName]       = useState(false);

  const userDisplayName = profile?.full_name || profile?.name;
  const isNameMissing = profile && (!userDisplayName || userDisplayName.trim() === '' || userDisplayName === 'Mijoz' || userDisplayName === 'Noma\'lum Mijoz');

  const handleSaveMandatoryName = async (e) => {
    e.preventDefault();
    if (!mandatoryName.trim()) {
      setNameError('Iltimos, ism va familiyangizni kiriting!');
      return;
    }
    setSavingName(true);
    const res = await updateProfileName(mandatoryName.trim());
    setSavingName(false);
    if (res?.error) {
      setNameError(res.error);
    } else {
      setNameError('');
    }
  };

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

        const isPushEnabled = localStorage.getItem('push_enabled') !== 'false';
        if (!isPushEnabled) return;

        refreshProfile();

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

        if (Notification.permission === 'granted') {
          new Notification(notifData.title, {
            body: notifData.body,
            icon: '/favicon.svg'
          });
        }

        setTimeout(() => setPushNotification(null), 4500);
      })
      .subscribe();

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
      
      {/* MAJBURIS ISM KIRITISH MODALI */}
      {isNameMissing && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center animate-scale-up">
            <div className="w-14 h-14 bg-[#0f7b4c]/10 text-[#0f7b4c] rounded-2xl flex items-center justify-center mb-3">
              <span className="text-2xl font-bold">👤</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Ismingizni kiriting</h2>
            <p className="text-gray-500 text-[13px] mt-1.5 mb-5 leading-relaxed">
              KeshBak xizmatidan to'liq foydalanish va keshbeklarni olish uchun ismingizni kiritishingiz shart.
            </p>
            <form onSubmit={handleSaveMandatoryName} className="w-full flex flex-col gap-3">
              <input
                type="text"
                placeholder="Ism va familiyangiz"
                value={mandatoryName}
                onChange={e => setMandatoryName(e.target.value)}
                required
                autoFocus
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#0f7b4c] text-center font-bold text-gray-800 transition-colors"
              />
              {nameError && (
                <p className="text-red-500 text-[12px] font-medium">{nameError}</p>
              )}
              <button
                type="submit"
                disabled={savingName}
                className="w-full h-12 bg-[#0f7b4c] text-white font-bold rounded-xl text-[15px] active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-[#0f7b4c]/20"
              >
                {savingName ? 'Saqlanmoqda...' : 'Saqlash va Davom etish'}
              </button>
            </form>
          </div>
        </div>
      )}

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