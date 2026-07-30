import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStationSettings } from '../hooks/useStationSettings';
import { sendOTPViaTelegram } from '../lib/telegramBot';
import { BsFuelPump } from 'react-icons/bs';
import { IoPhonePortraitOutline, IoKeyOutline, IoArrowBackOutline, IoPaperPlaneOutline } from 'react-icons/io5';

const LoginPage = () => {
  const { verifyOTPAndLogin } = useAuth();
  const { station } = useStationSettings();

  const [mode, setMode]               = useState('login'); // 'login' | 'register'
  const [step, setStep]               = useState(1);       // 1: Telefon kiritish, 2: Kod kiritish
  const [isNotRegistered, setIsNotRegistered] = useState(false);
  
  const [phone, setPhone]     = useState('+998');
  const [name, setName]       = useState('');
  const [code, setCode]       = useState('');
  
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Telefon raqamini chiroyli formatlash va 9 ta raqam bilan cheklash (+998 90 123 45 67)
  const handlePhoneChange = (inputVal) => {
    let digits = inputVal.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }
    digits = digits.slice(0, 9); // ko'pi bilan 9 xonali operator raqami

    let formatted = '+998';
    if (digits.length > 0) {
      formatted += ' ' + digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += ' ' + digits.slice(2, 5);
    }
    if (digits.length > 5) {
      formatted += ' ' + digits.slice(5, 7);
    }
    if (digits.length > 7) {
      formatted += ' ' + digits.slice(7, 9);
    }

    setPhone(formatted);
    if (error) {
      setError('');
      setIsNotRegistered(false);
    }
  };

  // Telefon raqam formatini tekshirish
  const validatePhone = (num) => {
    const digits = num.replace(/\D/g, '');
    if (digits.length !== 12 || !digits.startsWith('998')) {
      return false;
    }
    return true;
  };

  // 1-qadam: Telegramga kod yuborish
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsNotRegistered(false);

    const cleanPhone = '+' + phone.replace(/\D/g, '');
    if (!validatePhone(cleanPhone)) {
      setError('Telefon raqamini to\'liq kiriting. Namuna: +998 90 123 45 67');
      return;
    }

    setLoading(true);
    const res = await sendOTPViaTelegram(cleanPhone);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      if (res.notRegistered || res.error.includes('Telegram')) {
        setIsNotRegistered(true);
      }
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
    const cleanPhone = '+' + phone.replace(/\D/g, '');
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

        {/* Tab (Kirish va Ro'yxatdan o'tish) */}
        {step === 1 && (
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setError(''); setIsNotRegistered(false); }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                mode === 'login' ? 'bg-white text-[#0f7b4c] shadow-sm scale-[1.02]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Kirish
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setIsNotRegistered(false); }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                mode === 'register' ? 'bg-white text-[#0f7b4c] shadow-sm scale-[1.02]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Ro'yxatdan o'tish
            </button>
          </div>
        )}

        {/* KIRISH MODE */}
        {mode === 'login' && step === 1 && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            
            <div className="relative">
              <IoPhonePortraitOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                maxLength={17}
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-semibold text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
              />
            </div>

            {error && (
              isNotRegistered ? (
                <div className="bg-[#f0f7f4] border border-[#0f7b4c]/30 rounded-2xl p-4 flex flex-col gap-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center shrink-0 mt-0.5">
                      <IoPaperPlaneOutline size={18} />
                    </div>
                    <div>
                      <p className="text-gray-900 text-[13px] font-extrabold">Telegram botda ulash shart</p>
                      <p className="text-gray-600 text-[12px] mt-0.5 leading-relaxed">{error}</p>
                    </div>
                  </div>
                  <a
                    href="https://t.me/kechbakbot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded-xl text-[13px] flex items-center justify-center gap-2 transition-all shadow-md shadow-[#0088cc]/20 active:scale-95"
                  >
                    <IoPaperPlaneOutline size={16} />
                    @kechbakbot ga o'tish (/start)
                  </a>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-red-500 text-[12px] font-medium leading-snug">
                  {error}
                </div>
              )
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0f7b4c] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-[#0f7b4c]/20"
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

            <button
              type="button"
              onClick={() => setMode('register')}
              className="text-[#0f7b4c] text-[12px] font-bold hover:underline text-center mt-1"
            >
              Hali ro'yxatdan o'tmaganmisiz? Telegram bot orqali ulaning ➔
            </button>
          </form>
        )}

        {/* RO'YXATDAN O'TISH MODE */}
        {mode === 'register' && step === 1 && (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl flex items-center justify-center mb-3">
              <IoPaperPlaneOutline size={28} />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Telegram Bot orqali ro'yxatdan o'ting</h3>
            <p className="text-gray-500 text-[13px] leading-relaxed mb-5">
              KeshBak xizmatidan foydalanish uchun Telegram botimizga kiring, <span className="font-bold text-gray-800">/start</span> bosing va telefon raqamingizni ulang.
            </p>

            <a
              href="https://t.me/kechbakbot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded-xl text-[14px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0088cc]/25 active:scale-95 mb-3"
            >
              <IoPaperPlaneOutline size={18} />
              Telegram Botni ochish (@kechbakbot)
            </a>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-[#0f7b4c] text-[13px] font-bold hover:underline py-1"
            >
              Ro'yxatdan o'tganmisiz? Kirish ➔
            </button>
          </div>
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
