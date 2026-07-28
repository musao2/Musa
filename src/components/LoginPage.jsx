import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStationSettings } from '../hooks/useStationSettings';
import { sendOTPViaTelegram } from '../lib/telegramBot';
import { BsFuelPump } from 'react-icons/bs';
import { IoPhonePortraitOutline, IoPersonOutline, IoKeyOutline, IoArrowBackOutline, IoPaperPlaneOutline } from 'react-icons/io5';

const LoginPage = () => {
  const { verifyOTPAndLogin } = useAuth();
  const { station } = useStationSettings();

  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [step, setStep]       = useState(1);       // 1: Telefon kiritish, 2: Kod kiritish
  
  const [phone, setPhone]     = useState('+998');
  const [name, setName]       = useState('');
  const [code, setCode]       = useState('');
  
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Telefon raqam formatini tekshirish
  const validatePhone = (num) => {
    const clean = num.replace(/\s+/g, '');
    if (!clean.startsWith('+998') || clean.length !== 13) {
      return false;
    }
    return true;
  };

  // 1-qadam: Telegramga kod yuborish
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\s+/g, '');
    if (!validatePhone(cleanPhone)) {
      setError('Telefon raqami noto\'g\'ri formatda. Namuna: +998901234567');
      return;
    }

    if (!name.trim()) {
      setError('Iltimos, ism familiyangizni kiriting.');
      return;
    }

    setLoading(true);
    const res = await sendOTPViaTelegram(cleanPhone);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setStep(2);
      setError('');
    }
  };

  // 2-qadam: Kodni tekshirish va kirish
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    if (code.trim().length !== 4) {
      setError('Tasdiqlash kodi 4 xonali bo\'lishi kerak.');
      return;
    }

    setLoading(true);
    const cleanPhone = phone.replace(/\s+/g, '');
    const res = await verifyOTPAndLogin(cleanPhone, code, name);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f7b4c] via-[#0a5c39] to-[#063d27] flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm border border-white/20">
          <BsFuelPump size={32} className="text-white" />
        </div>
        <h1 className="text-[28px] font-extrabold text-white tracking-tight">KeshBak</h1>
        <p className="text-white/60 text-[13px] mt-1">{station?.name || 'Yuklanmoqda...'}</p>
      </div>

      {/* Forma kartasi */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">

        {/* Tab (Faqat 1-qadamda ko'rinadi) */}
        {step === 1 && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-[14px] font-semibold transition-all ${
                  mode === m ? 'bg-white text-[#0f7b4c] shadow-sm' : 'text-gray-400'
                }`}
              >
                {m === 'login' ? 'Kirish' : 'Ro\'yxat'}
              </button>
            ))}
          </div>
        )}

        {/* 1-qadam: Telefon raqam kiritish */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            
            {/* Ism (Har doim ko'rsatiladi) */}
            <div className="relative">
              <IoPersonOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ism va familiyangiz"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
              />
            </div>

            {/* Telefon raqam */}
            <div className="relative">
              <IoPhonePortraitOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-red-500 text-[12px] font-medium leading-snug">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0f7b4c] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <IoPaperPlaneOutline size={18} />
                  Kod yuborish
                </>
              )}
            </button>
          </form>
        )}

        {/* 2-qadam: Telegramdan kelgan kodni tasdiqlash */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); }}
              className="flex items-center gap-1.5 text-[#0f7b4c] text-[13px] font-bold self-start mb-2"
            >
              <IoArrowBackOutline size={16} />
              Raqamni o'zgartirish
            </button>

            <p className="text-gray-500 text-[13px] text-center mb-1">
              Tasdiqlash kodi Telegram orqali <span className="font-bold text-gray-800">{phone}</span> raqamiga yuborildi.
            </p>

            {/* OTP kod input */}
            <div className="relative">
              <IoKeyOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="4 xonali kod"
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 outline-none text-center tracking-[12px] font-bold focus:border-[#0f7b4c] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-red-500 text-[12px] font-medium leading-snug">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0f7b4c] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Tasdiqlash va Kirish'
              )}
            </button>
          </form>
        )}
      </div>

      <p className="text-white/40 text-[12px] mt-6 text-center">
        KeshBak © 2024 — Telegram OTP tizimi
      </p>
    </div>
  );
};

export default LoginPage;
