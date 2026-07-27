import React, { useState, useEffect } from 'react';
import {
  IoPersonCircleOutline, IoWalletOutline, IoCopyOutline,
  IoCallOutline, IoHelpCircleOutline, IoLogOutOutline,
  IoChevronForwardOutline, IoShieldCheckmarkOutline,
  IoNotificationsOutline, IoClose, IoKeyOutline, IoFingerPrintOutline
} from 'react-icons/io5';
import { BsFuelPump } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { supabase } from '../lib/supabase';

const formatSum = (n) => Number(n || 0).toLocaleString('uz-UZ') + ' so\'m';

const ProfilePage = () => {
  const { profile, signOut, user } = useAuth();
  const { transactions }           = useTransactions(user?.id);
  const [copied, setCopied]        = useState(false);

  // Modal holatlari: null | 'security' | 'notifications'
  const [activeModal, setActiveModal] = useState(null);

  // Xavfsizlik sozlamalari
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometricsEnabled, setBiometricsEnabled] = useState(
    localStorage.getItem('biometrics_enabled') === 'true'
  );
  
  // Bildirishnoma sozlamalari
  const [pushEnabled, setPushEnabled] = useState(
    localStorage.getItem('push_enabled') !== 'false'
  );
  const [smsEnabled, setSmsEnabled] = useState(
    localStorage.getItem('sms_enabled') === 'true'
  );

  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const thisMonthCashback = transactions
    .filter(t => new Date(t.created_at).getMonth() === new Date().getMonth())
    .reduce((s, t) => s + Number(t.cashback_amount), 0);

  const copyCard = () => {
    navigator.clipboard.writeText(profile?.card_number ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parolni o'zgartirish
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Parollar mos kelmadi!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Parol kamida 6 belgidan iborat bo\'lishi kerak!', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      showToast('Xatolik: ' + error.message, 'error');
    } else {
      showToast('Parol muvaffaqiyatli yangilandi!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // Biometrika o'zgartirish
  const toggleBiometrics = () => {
    const nextState = !biometricsEnabled;
    setBiometricsEnabled(nextState);
    localStorage.setItem('biometrics_enabled', String(nextState));
    showToast(nextState ? 'Biometrika (Face ID / Touch ID) yoqildi' : 'Biometrika o\'chirildi', 'success');
  };

  // Push bildirishnoma o'zgartirish
  const togglePush = () => {
    const nextState = !pushEnabled;
    setPushEnabled(nextState);
    localStorage.setItem('push_enabled', String(nextState));
    showToast(nextState ? 'Push bildirishnomalar yoqildi' : 'Push bildirishnomalar o\'chirildi', 'success');
  };

  // SMS bildirishnoma o'zgartirish
  const toggleSms = () => {
    const nextState = !smsEnabled;
    setSmsEnabled(nextState);
    localStorage.setItem('sms_enabled', String(nextState));
    showToast(nextState ? 'SMS bildirishnomalar yoqildi' : 'SMS bildirishnomalar o\'chirildi', 'success');
  };

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className="flex-1 bg-gray-50 w-full font-sans pb-6 relative">

      {/* Toast xabar */}
      {message.text && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold transition-all text-center min-w-[280px] ${
          message.type === 'success' ? 'bg-[#0f7b4c] text-white' : 'bg-red-600 text-white'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profil sarlavhasi */}
      <div className="bg-[#0f7b4c] pt-6 pb-10 px-5 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute right-6 top-16 w-16 h-16 bg-white/5 rounded-full" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
            <IoPersonCircleOutline size={46} className="text-white" />
          </div>
          <div>
            <h2 className="text-[20px] font-extrabold">{profile?.name ?? '—'}</h2>
            <p className="text-white/70 text-[13px]">{profile?.phone ?? user?.email}</p>
            <div className="flex items-center gap-1 mt-1 text-white/60 text-[12px]">
              <BsFuelPump size={12} />
              <span>Lukoil — Yunusobod</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balans va karta */}
      <div className="mx-4 -mt-6 bg-white rounded-2xl shadow-md p-5 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-400 text-[12px]">Keshbek balansi</p>
            <h3 className="text-[28px] font-extrabold text-[#1a1a1a] leading-none mt-0.5">
              {formatSum(profile?.cashback_balance)}
            </h3>
          </div>
          <div className="w-12 h-12 bg-[#e8f5e9] rounded-xl flex items-center justify-center">
            <IoWalletOutline size={24} className="text-[#0f7b4c]" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-3">
          <div>
            <p className="text-gray-400 text-[11px]">Karta raqami</p>
            <p className="font-bold text-[15px] text-[#1a1a1a]">{profile?.card_number ?? '—'}</p>
          </div>
          <button
            onClick={copyCard}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
              copied ? 'text-[#0f7b4c]' : 'text-gray-400'
            }`}
          >
            <IoCopyOutline size={16} />
            {copied ? 'Nusxalandi!' : 'Nusxa'}
          </button>
        </div>
      </div>

      {/* Statistika */}
      <div className="flex gap-3 mx-4 mt-4 mb-5">
        {[
          { label: 'Bu oy',     value: formatSum(thisMonthCashback) },
          { label: 'To\'lovlar', value: `${transactions.length} ta` },
          { label: 'Daraja',    value: profile?.level ?? 'Standart' },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[13px] font-extrabold text-[#1a1a1a] leading-snug">{s.value}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Shaxobcha aloqa */}
      <div className="mx-4 mb-4 bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
            <BsFuelPump size={18} />
          </div>
          <div>
            <p className="font-bold text-[14px] text-[#1a1a1a]">Lukoil — Yunusobod</p>
            <p className="text-gray-400 text-[12px]">+998 71 234 56 78</p>
          </div>
        </div>
        <a href="tel:+998712345678" className="w-9 h-9 bg-[#0f7b4c] rounded-xl flex items-center justify-center">
          <IoCallOutline size={17} className="text-white" />
        </a>
      </div>

      {/* Menyu */}
      <div className="mx-4 mb-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden font-medium">
          
          {/* Xavfsizlik tugmasi */}
          <button
            onClick={() => setActiveModal('security')}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 border-b border-gray-100"
          >
            <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
              <IoShieldCheckmarkOutline size={18} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px] text-[#1a1a1a]">Xavfsizlik</p>
              <p className="text-gray-400 text-[12px]">Parol va biometrik</p>
            </div>
            <IoChevronForwardOutline size={15} className="text-gray-300" />
          </button>

          {/* Bildirishnomalar tugmasi */}
          <button
            onClick={() => setActiveModal('notifications')}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 border-b border-gray-100"
          >
            <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
              <IoNotificationsOutline size={18} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px] text-[#1a1a1a]">Bildirishnomalar</p>
              <p className="text-gray-400 text-[12px]">Push va SMS sozlamalari</p>
            </div>
            <IoChevronForwardOutline size={15} className="text-gray-300" />
          </button>

          {/* Yordam */}
          <div className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50">
            <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
              <IoHelpCircleOutline size={18} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px] text-[#1a1a1a]">Yordam</p>
              <p className="text-gray-400 text-[12px]">Qo'llab-quvvatlash tizimi</p>
            </div>
          </div>

        </div>
      </div>

      {/* Chiqish */}
      <div className="mx-4">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 rounded-2xl text-red-400 font-semibold text-[15px] active:bg-red-100 transition-colors"
        >
          <IoLogOutOutline size={20} />
          Chiqish
        </button>
      </div>

      {/* ----------------- MODALLAR (Security / Notifications) ----------------- */}

      {/* XAVFSIZLIK MODALI */}
      {/* XAVFSIZLIK MODALI */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-slide-down">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <IoClose size={24} />
            </button>
            <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-5 flex items-center gap-2">
              <IoShieldCheckmarkOutline className="text-[#0f7b4c]" />
              Xavfsizlik sozlamalari
            </h3>

            {/* Biometrika simulator */}
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#0f7b4c] border border-gray-150">
                  <IoFingerPrintOutline size={20} />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#1a1a1a]">Biometrik himoya</p>
                  <p className="text-gray-400 text-[12px]">Face ID yoki Touch ID</p>
                </div>
              </div>
              <button
                onClick={toggleBiometrics}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                  biometricsEnabled ? 'bg-[#0f7b4c]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  biometricsEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Parolni yangilash */}
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
              <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider px-1">Parolni o'zgartirish</h4>
              <div className="relative">
                <IoKeyOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Yangi parol"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-850 outline-none focus:border-[#0f7b4c]"
                />
              </div>
              <div className="relative">
                <IoKeyOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Parolni tasdiqlang"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-850 outline-none focus:border-[#0f7b4c]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#0f7b4c] text-white font-bold text-[14px] rounded-xl flex items-center justify-center gap-2 mt-2 active:scale-95 transition-all"
              >
                {loading ? 'Yangilanmoqda...' : 'Saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BILDIRISHNOMALAR MODALI */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-slide-down">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <IoClose size={24} />
            </button>
            <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-5 flex items-center gap-2">
              <IoNotificationsOutline className="text-[#0f7b4c]" />
              Bildirishnomalar
            </h3>

            <div className="flex flex-col gap-4">
              
              {/* Push Notifications Toggle */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="font-bold text-[14px] text-[#1a1a1a]">Push bildirishnomalar</p>
                  <p className="text-gray-400 text-[12px]">Keshbek kelganda bildirishnoma</p>
                </div>
                <button
                  onClick={togglePush}
                  className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 ${
                    pushEnabled ? 'bg-[#0f7b4c]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    pushEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* SMS Notifications Toggle */}
              <div className="flex items-center justify-between pb-2">
                <div>
                  <p className="font-bold text-[14px] text-[#1a1a1a]">SMS xabarnomalar</p>
                  <p className="text-gray-400 text-[12px]">SMS orqali bildirishnoma yuborish</p>
                </div>
                <button
                  onClick={toggleSms}
                  className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 ${
                    smsEnabled ? 'bg-[#0f7b4c]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    smsEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
