import React, { useState } from 'react';
import {
  HiUserCircle,
  HiWallet,
  HiSquare2Stack,
  HiPhone,
  HiQuestionMarkCircle,
  HiArrowLeftOnRectangle,
  HiChevronRight,
  HiShieldCheck,
  HiBell,
  HiXMark,
  HiKey,
  HiFingerPrint,
  HiCalendarDays,
  HiReceiptPercent,
  HiLockClosed,
  HiPaperAirplane,
  HiPencilSquare
} from 'react-icons/hi2';
import { RiGasStationFill } from 'react-icons/ri';
import { FaCrown, FaTrophy, FaMedal, FaShieldHalved } from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useStationSettings } from '../hooks/useStationSettings';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';

const formatSum = (n) => Number(n || 0).toLocaleString('uz-UZ') + " so'm";

const ProfilePage = () => {
  const { profile, signOut, user, updateProfileName } = useAuth();
  const { transactions } = useTransactions(user?.id);
  const { station } = useStationSettings();
  const userPhone = profile?.phone || user?.phone || '';
  const { notifications, unreadCount, loading: notifsLoading, markAsRead, markAllAsRead, fetchNotifications } = useNotifications(userPhone);
  const [copied, setCopied] = useState(false);

  // Ismni va familiyani tahrirlash state'lari
  const [showEditName, setShowEditName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const openEditNameModal = () => {
    let fn = profile?.first_name || '';
    let ln = profile?.last_name || '';
    if (!fn && profile?.name) {
      const parts = profile.name.trim().split(' ');
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }
    setEditFirstName(fn);
    setEditLastName(ln);
    setShowEditName(true);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!editFirstName.trim()) return;
    setSavingName(true);
    const res = await updateProfileName({
      firstName: editFirstName.trim(),
      lastName: editLastName.trim()
    });
    setSavingName(false);
    if (!res?.error) {
      setShowEditName(false);
      showToast('Ism va familiya muvaffaqiyatli yangilandi!', 'success');
    } else {
      showToast(res.error, 'error');
    }
  };

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

  const now = new Date();
  const thisMonthCashback = transactions
    .filter(t => {
      const d = new Date(t.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .filter(t => Number(t.cashback_amount) > 0 || (t.type || '').toLowerCase() === 'cashback' || (t.type || '').toUpperCase() === 'EARN')
    .reduce((s, t) => s + Number(t.cashback_amount || 0), 0);

  const copyCard = () => {
    navigator.clipboard.writeText(profile?.card_number ?? '').catch(() => { });
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

  const totalEarnedCashback = transactions
    .filter(t => Number(t.cashback_amount) > 0 || (t.type || '').toLowerCase() === 'cashback' || (t.type || '').toUpperCase() === 'EARN')
    .reduce((s, t) => s + Number(t.cashback_amount || 0), 0);

  // Daraja ma'lumoti va ikonkasini olish
  const getLevelInfo = () => {
    if (profile?.level && profile.level !== 'Standart') {
      const lvl = profile.level.toLowerCase();
      if (lvl.includes('vip')) return { name: profile.level, icon: FaCrown, color: 'text-purple-600 bg-purple-50 border-purple-100' };
      if (lvl.includes('oltin') || lvl.includes('gold')) return { name: profile.level, icon: FaTrophy, color: 'text-amber-500 bg-amber-50 border-amber-100' };
      if (lvl.includes('kumush') || lvl.includes('silver')) return { name: profile.level, icon: FaMedal, color: 'text-slate-600 bg-slate-100 border-slate-200' };
      return { name: profile.level, icon: FaShieldHalved, color: 'text-[#0f7b4c] bg-emerald-50 border-emerald-100' };
    }

    const count = transactions.length;
    if (count >= 30 || totalEarnedCashback >= 500000) {
      return { name: 'VIP', icon: FaCrown, color: 'text-purple-600 bg-purple-50 border-purple-100' };
    }
    if (count >= 15 || totalEarnedCashback >= 200000) {
      return { name: 'Oltin', icon: FaTrophy, color: 'text-amber-500 bg-amber-50 border-amber-100' };
    }
    if (count >= 5 || totalEarnedCashback >= 50000) {
      return { name: 'Kumush', icon: FaMedal, color: 'text-slate-600 bg-slate-100 border-slate-200' };
    }
    return { name: 'Standart', icon: FaShieldHalved, color: 'text-[#0f7b4c] bg-emerald-50 border-emerald-100' };
  };

  const levelInfo = getLevelInfo();
  const LevelIcon = levelInfo.icon;

  return (
    <div className="flex-1 bg-gray-50/60 w-full font-sans pb-24 relative min-h-screen">

      {/* Toast xabar */}
      {message.text && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold transition-all text-center min-w-[280px] ${message.type === 'success' ? 'bg-[#0f7b4c] text-white' : 'bg-red-600 text-white'
          }`}>
          {message.text}
        </div>
      )}

      {/* Profil sarlavhasi */}
      <div className="bg-[#0f7b4c] pt-6 pb-10 px-5 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute right-6 top-16 w-16 h-16 bg-white/5 rounded-full blur-lg pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 shrink-0 backdrop-blur-md">
            <HiUserCircle size={48} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-extrabold">{profile?.name || '—'}</h2>
              <button
                onClick={openEditNameModal}
                className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center text-white/90 transition-all active:scale-95"
                title="Ism va familiyani o'zgartirish"
              >
                <HiPencilSquare size={16} />
              </button>
            </div>
            <p className="text-white/80 text-[13px] font-medium">
              {(() => {
                const raw = profile?.phone || user?.phone || user?.email || '';
                if (!raw) return '';
                const cleanDigits = raw.split('_')[0].split('@')[0].replace('+', '');
                return cleanDigits ? '+' + cleanDigits : '';
              })()}
            </p>
            <div className="flex items-center gap-1 mt-1 text-white/70 text-[12px]">
              <RiGasStationFill size={14} />
              <span>{station.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balans va karta */}
      <div className="mx-4 -mt-6 bg-white rounded-2xl shadow-md p-5 relative z-10 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-400 text-[12px] font-medium">Keshbek balansi</p>
            <h3 className="text-[28px] font-black text-[#1a1a1a] leading-none mt-1">
              {formatSum(profile?.cashback_balance)}
            </h3>
          </div>
          <div className="w-12 h-12 bg-[#e8f5e9] rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 text-[#0f7b4c]">
            <HiWallet size={24} />
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <div>
            <p className="text-gray-400 text-[11px] font-medium">Karta raqami</p>
            <p className="font-bold text-[15px] text-[#1a1a1a] font-mono">{profile?.card_number ?? '—'}</p>
          </div>
          <button
            onClick={copyCard}
            className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${copied ? 'text-[#0f7b4c]' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <HiSquare2Stack size={17} />
            {copied ? 'Nusxalandi!' : 'Nusxa'}
          </button>
        </div>
      </div>

      {/* Statistika kartalari */}
      <div className="grid grid-cols-3 gap-2.5 mx-4 mt-4 mb-5">

        {/* Bu oy */}
        <div className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs border border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0f7b4c] flex items-center justify-center mb-1.5 border border-emerald-100">
            <HiCalendarDays size={17} />
          </div>
          <p className="text-[13px] font-black text-gray-900 leading-snug">
            {formatSum(thisMonthCashback)}
          </p>
          <p className="text-gray-400 text-[11px] font-medium mt-0.5 whitespace-nowrap">Oylik keshbek</p>
        </div>

        {/* To'lovlar */}
        <div className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs border border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 border border-blue-100">
            <HiReceiptPercent size={17} />
          </div>
          <p className="text-[13px] font-black text-gray-900 leading-snug">
            {transactions.length} ta
          </p>
          <p className="text-gray-400 text-[11px] font-medium mt-0.5">To'lovlar</p>
        </div>

        {/* Daraja */}
        <div className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs border border-gray-100">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 border ${levelInfo.color}`}>
            <LevelIcon size={17} />
          </div>
          <p className="text-[13px] font-black text-gray-900 leading-snug">
            {levelInfo.name}
          </p>
          <p className="text-gray-400 text-[11px] font-medium mt-0.5">Daraja</p>
        </div>

      </div>

      {/* Shaxobcha aloqa */}
      <div className="mx-4 mb-4 bg-white rounded-2xl shadow-xs p-4 flex items-center justify-between border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c] shrink-0 border border-emerald-100">
            <RiGasStationFill size={20} />
          </div>
          <div>
            <p className="font-bold text-[14px] text-[#1a1a1a]">{station.name}</p>
            <p className="text-gray-400 text-[12px]">{station.phone}</p>
          </div>
        </div>
        <a href={`tel:${station.phone}`} className="w-9 h-9 bg-[#0f7b4c] rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs">
          <HiPhone size={17} />
        </a>
      </div>

      {/* Menyu */}
      <div className="mx-4 mb-4">
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden font-medium">

          {/* Ismni tahrirlash tugmasi */}
          <button
            onClick={openEditNameModal}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 border-b border-gray-100"
          >
            <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c] border border-emerald-100">
              <HiUserCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[14px] text-[#1a1a1a]">Ismni tahrirlash</p>
              <p className="text-gray-400 text-[12px]">Ism va familiyangizni yangilash</p>
            </div>
            <HiChevronRight size={17} className="text-gray-300" />
          </button>

          {/* Xavfsizlik tugmasi */}
          <button
            onClick={() => setActiveModal('security')}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 border-b border-gray-100"
          >
            <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c] border border-emerald-100">
              <HiShieldCheck size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[14px] text-[#1a1a1a]">Akkaunt Xavfsizligi</p>
              <p className="text-gray-400 text-[12px]">Raqam va hisob xavfsizligi</p>
            </div>
            <HiChevronRight size={17} className="text-gray-300" />
          </button>

          {/* Bildirishnomalar tugmasi */}
          <button
            onClick={() => setActiveModal('notifications')}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 border-b border-gray-100"
          >
            <div className="relative w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c] border border-emerald-100">
              <HiBell size={20} />
              {unreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-[14px] text-[#1a1a1a]">Bildirishnomalar</p>
              <p className="text-gray-400 text-[12px]">{unreadCount > 0 ? `${unreadCount} ta yangi xabar` : 'Barcha xabarlar tarixi'}</p>
            </div>
            <HiChevronRight size={17} className="text-gray-300" />
          </button>

          {/* Yordam */}
          <div className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50">
            <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c] border border-emerald-100">
              <HiQuestionMarkCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[14px] text-[#1a1a1a]">Yordam</p>
              <p className="text-gray-400 text-[12px]">Qo'llab-quvvatlash tizimi</p>
            </div>
          </div>

        </div>
      </div>

      {/* Chiqish */}
      <div className="mx-4">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-[14px] active:bg-rose-100 transition-colors"
        >
          <HiArrowLeftOnRectangle size={19} />
          Tizimdan chiqish
        </button>
      </div>

      {/* ----------------- MODALLAR (Security / Notifications) ----------------- */}

      {/* AKKAUNT XAVFSIZLIGI MODALI */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <HiXMark size={24} />
            </button>
            <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-5 flex items-center gap-2">
              <HiShieldCheck className="text-[#0f7b4c]" size={22} />
              Akkaunt Xavfsizligi
            </h3>

            <div className="flex flex-col gap-4">
              {/* Telefon raqami va status */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-gray-400">Ulangan Telefon Raqam</span>
                  <span className="text-[11px] font-bold text-[#0f7b4c] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Ulangan 🟢
                  </span>
                </div>
                <p className="font-extrabold text-[16px] text-gray-900">
                  {profile?.phone || '—'}
                </p>
              </div>

              {/* OTP himoyasi info */}
              <div className="bg-[#f0f7f4] border border-[#0f7b4c]/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0f7b4c]/10 text-[#0f7b4c] flex items-center justify-center shrink-0 mt-0.5">
                  <HiLockClosed size={18} />
                </div>
                <div>
                  <p className="font-bold text-[13px] text-gray-900">OTP Himoyasi</p>
                  <p className="text-gray-600 text-[12px] mt-0.5 leading-relaxed">
                    Sizning hisobingiz 4 xonali bir martalik kod (OTP) bilan to'liq himoyalangan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BILDIRISHNOMALAR MODALI */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex flex-col justify-end p-0">
          <div className="bg-white rounded-t-3xl w-full h-[85vh] shadow-2xl relative flex flex-col">

            {/* Header */}
            <div className="p-5 pb-3 flex items-center justify-between border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center">
                  <HiBell className="text-[#0f7b4c]" size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#1a1a1a] leading-tight">Bildirishnomalar</h3>
                  {unreadCount > 0 && (
                    <p className="text-[11px] text-[#0f7b4c] font-semibold">{unreadCount} ta o'qilmagan</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[12px] text-[#0f7b4c] font-semibold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                  >
                    Barchasini o'qi
                  </button>
                )}
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 active:bg-gray-200"
                >
                  <HiXMark size={20} />
                </button>
              </div>
            </div>

            {/* Kontent */}
            <div className="flex-1 overflow-y-auto pb-10">
              {notifsLoading ? (
                /* Yuklanmoqda holati */
                <div className="flex flex-col gap-3 p-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-2xl border border-gray-100 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-3" />
                      <div className="h-3 bg-gray-100 rounded-full w-full mb-1.5" />
                      <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                /* Bo'sh holat */
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 py-16">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                    <HiBell size={36} className="text-gray-200" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[15px] text-gray-500">Hozircha xabarlar yo'q</p>
                    <p className="text-[13px] text-gray-400 mt-1">Admin xabar yuborganda bu yerda ko'rinadi</p>
                  </div>
                  <button
                    onClick={fetchNotifications}
                    className="text-[13px] text-[#0f7b4c] font-semibold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100"
                  >
                    Yangilash
                  </button>
                </div>
              ) : (
                /* Xabarlar ro'yxati */
                <div className="flex flex-col gap-2 p-4">
                  {notifications.map((notif) => {
                    const isTransfer = notif.category === 'TRANSFER';
                    return (
                      <div
                        key={notif.id}
                        onClick={() => !notif.is_read && markAsRead(notif.id)}
                        className={`p-4 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer ${
                          notif.is_read
                            ? 'bg-white border-gray-100'
                            : isTransfer
                              ? 'bg-[#f0f7f4] border-[#0f7b4c]/30 shadow-sm'
                              : 'bg-blue-50/50 border-blue-100 shadow-sm'
                        }`}
                      >
                        {/* Header: ikonka + sarlavha + vaqt */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* O'qilmagan nuqta */}
                            {!notif.is_read && (
                              <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${isTransfer ? 'bg-[#0f7b4c]' : 'bg-blue-500'}`} />
                            )}
                            {/* Category badge */}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              isTransfer
                                ? 'bg-emerald-100 text-[#0f7b4c]'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {isTransfer ? '💰 Keshbek' : '📢 Xabar'}
                            </span>
                            <h4 className={`font-bold text-[13px] truncate ${
                              notif.is_read ? 'text-gray-600' : 'text-[#1a1a1a]'
                            }`}>
                              {notif.title || 'Xabar'}
                            </h4>
                          </div>
                          {/* Vaqt */}
                          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                            {(() => {
                              const d = new Date(notif.created_at);
                              const now = new Date();
                              const diffMs   = now - d;
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHrs  = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);
                              if (diffMins < 1)  return 'Hozirgina';
                              if (diffMins < 60) return `${diffMins} daq oldin`;
                              if (diffHrs  < 24) return `${diffHrs} soat oldin`;
                              if (diffDays === 1) return 'Kecha';
                              if (diffDays < 7)  return `${diffDays} kun oldin`;
                              return d.toLocaleDateString('uz-UZ');
                            })()}
                          </span>
                        </div>

                        {/* Xabar matni */}
                        <p className={`text-[12px] leading-relaxed ml-4 ${
                          notif.is_read ? 'text-gray-400' : 'text-gray-700'
                        }`}>
                          {notif.message}
                        </p>

                        {/* Keshbek miqdori */}
                        {notif.amount > 0 && (
                          <div className="mt-2.5 ml-4 inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                            <span className="text-[#0f7b4c] text-[14px]">💰</span>
                            <span className="text-[#0f7b4c] font-extrabold text-[13px]">
                              +{Number(notif.amount).toLocaleString('uz-UZ')} so'm
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ISMNI TAHRIRLASH MODALI */}
      {showEditName && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditName(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <HiXMark size={24} />
            </button>
            <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-4">
              Ism va familiyani o'zgartirish
            </h3>
            <form onSubmit={handleSaveName} className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-semibold text-gray-500 mb-1 block">Ism</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={e => setEditFirstName(e.target.value)}
                  placeholder="Ismingiz"
                  required
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-800 outline-none focus:border-[#0f7b4c]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-500 mb-1 block">Familiya</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={e => setEditLastName(e.target.value)}
                  placeholder="Familiyangiz (ixtiyoriy)"
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-800 outline-none focus:border-[#0f7b4c]"
                />
              </div>
              <button
                type="submit"
                disabled={savingName}
                className="w-full h-12 bg-[#0f7b4c] text-white font-bold text-[14px] rounded-xl active:scale-95 transition-all shadow-md shadow-[#0f7b4c]/20 disabled:opacity-60 mt-1"
              >
                {savingName ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
