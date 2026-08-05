import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import HistoryPage from './components/HistoryPage';
import MapPage from './components/MapPage';
import ProfilePage from './components/ProfilePage';
import LoginPage from './components/LoginPage';
import { IoNotificationsOutline, IoClose } from 'react-icons/io5';

const AppContent = () => {
  const { user, profile, loading, updateProfileName } = useAuth();
  const { latestToast, setLatestToast } = useNotifications();
  const [activeTab, setActiveTab] = useState('home');
  
  // Majburiy ism va familiya so'rash state'lari
  const [mandatoryFirstName, setMandatoryFirstName] = useState('');
  const [mandatoryLastName, setMandatoryLastName]   = useState('');
  const [nameError, setNameError]                   = useState('');
  const [savingName, setSavingName]                 = useState(false);

  const userDisplayName = profile?.name;
  // Telefon raqamiga biriktirilgan saqlangan ism
  const profilePhone = profile?.phone || user?.phone || user?.email?.split('@')[0]?.split('_')[0]?.replace(/\D/g, '');
  const phoneDigits = profilePhone ? profilePhone.replace(/\D/g, '') : '';
  const phoneStoredName = phoneDigits ? localStorage.getItem(`keshbak_name_${phoneDigits}`) : null;
  const validPhoneStoredName = phoneStoredName && phoneStoredName !== 'Mijoz' && phoneStoredName.trim() !== '';

  const isNameMissing = profile && !validPhoneStoredName && (!userDisplayName || userDisplayName.trim() === '' || userDisplayName === 'Mijoz' || userDisplayName === 'Noma\'lum Mijoz');

  const handleSaveMandatoryName = async (e) => {
    e.preventDefault();
    if (!mandatoryFirstName.trim()) {
      setNameError('Iltimos, ismingizni kiriting!');
      return;
    }
    if (!mandatoryLastName.trim()) {
      setNameError('Iltimos, familiyangizni ham kiriting!');
      return;
    }
    setSavingName(true);
    const res = await updateProfileName({
      firstName: mandatoryFirstName.trim(),
      lastName: mandatoryLastName.trim()
    });
    setSavingName(false);
    if (res?.error) {
      setNameError(res.error);
    } else {
      setNameError('');
    }
  };

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
      case 'home':    return <HomePage setActiveTab={setActiveTab} />;
      case 'history': return <HistoryPage />;
      case 'map':     return <MapPage />;
      case 'profile': return <ProfilePage />;
      default:        return <HomePage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden">
      
      {/* MAJBURIS ISM VA FAMILIYA KIRITISH MODALI */}
      {isNameMissing && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center animate-scale-up">
            <div className="w-14 h-14 bg-[#0f7b4c]/10 text-[#0f7b4c] rounded-2xl flex items-center justify-center mb-3">
              <span className="text-2xl font-bold">👤</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Ma'lumotlaringizni kiriting</h2>
            <p className="text-gray-500 text-[13px] mt-1.5 mb-5 leading-relaxed">
              KeshBak xizmatidan to'liq foydalanish uchun ismingiz va familiyangizni kiriting.
            </p>
            <form onSubmit={handleSaveMandatoryName} className="w-full flex flex-col gap-3">
              <input
                type="text"
                placeholder="Ismingiz (masalan: Ali)"
                value={mandatoryFirstName}
                onChange={e => setMandatoryFirstName(e.target.value)}
                required
                autoFocus
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#0f7b4c] font-bold text-gray-800 transition-colors"
              />
              <input
                type="text"
                placeholder="Familiyangiz (masalan: Valiyev)"
                value={mandatoryLastName}
                onChange={e => setMandatoryLastName(e.target.value)}
                required
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#0f7b4c] font-bold text-gray-800 transition-colors"
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

      {/* REALTIME BILDIRISHNOMA POPUP TOAST */}
      {latestToast && (
        <div key={latestToast.id || 'notif-toast'} className="fixed top-4 left-4 right-4 z-[9999] bg-[#0f7b4c] text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-slide-down border border-emerald-400/30">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5">
            <IoNotificationsOutline size={22} className="animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[14px] text-white leading-tight">
              {latestToast.title || 'Yangi bildirishnoma!'}
            </p>
            <p className="text-[12px] text-white/90 mt-0.5 leading-snug break-words">
              {latestToast.message}
            </p>
            {latestToast.amount && (
              <span className="inline-block mt-1 font-bold text-[12px] bg-white/20 px-2 py-0.5 rounded-md">
                +{Number(latestToast.amount).toLocaleString('uz-UZ')} so'm
              </span>
            )}
          </div>
          <button 
            onClick={() => setLatestToast(null)}
            className="text-white/70 hover:text-white shrink-0 p-1 cursor-pointer"
          >
            <IoClose size={20} />
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
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;