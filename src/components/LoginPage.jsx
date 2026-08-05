import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStationSettings } from '../hooks/useStationSettings';
import { sendOTPViaTelegram as sendOTP } from '../lib/telegramBot';
import { BsFuelPump } from 'react-icons/bs';
import { IoPhonePortraitOutline, IoKeyOutline, IoArrowBackOutline, IoPersonOutline, IoSendOutline } from 'react-icons/io5';

const LoginPage = () => {
  const { verifyOTPAndLogin } = useAuth();
  const { station } = useStationSettings();

  const [mode, setMode]             = useState('login'); // 'login' | 'register'
  const [step, setStep]             = useState(1);       // 1: Telefon/Ism kiritish, 2: Kod kiritish
  
  const [phone, setPhone]           = useState('+998');
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [code, setCode]             = useState('');
  
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  // Telefon raqamini chiroyli formatlash (+998 90 123 45 67)
  const handlePhoneChange = (inputVal) => {
    let digits = inputVal.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }
    digits = digits.slice(0, 9);

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

  // 1-qadam: Kod yuborish
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = '+' + phone.replace(/\D/g, '');
    if (!validatePhone(cleanPhone)) {
      setError('Telefon raqamini to\'liq kiriting. Namuna: +998 90 123 45 67');
      return;
    }

    if (mode === 'register') {
      if (!firstName.trim()) {
        setError('Iltimos, ismingizni kiriting.');
        return;
      }
      if (!lastName.trim()) {
        setError('Iltimos, familiyangizni ham kiriting.');
        return;
      }
    }

    setLoading(true);
    const res = await sendOTP(cleanPhone);
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
    const cleanPhone = '+' + phone.replace(/\D/g, '');
    const res = await verifyOTPAndLogin(cleanPhone, code, { firstName, lastName });
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
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                mode === 'login' ? 'bg-white text-[#0f7b4c] shadow-sm scale-[1.02]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Kirish
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                mode === 'register' ? 'bg-white text-[#0f7b4c] shadow-sm scale-[1.02]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Ro'yxatdan o'tish
            </button>
          </div>
        )}

        {/* 1-QADAM: TELEFON VA ISMI */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            
            {mode === 'register' && (
              <>
                <div className="relative">
                  <IoPersonOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ismingiz (masalan: Ali)"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-semibold text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
                  />
                </div>
                <div className="relative">
                  <IoPersonOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Familiyangiz (masalan: Valiyev)"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-semibold text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
                  />
                </div>
              </>
            )}

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
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-red-500 text-[12px] font-medium leading-snug">
                {error}
              </div>
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
                  <IoSendOutline size={18} />
                  Kod yuborish
                </>
              )}
            </button>

            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[#0f7b4c] text-[12px] font-bold hover:underline text-center mt-1"
              >
                Hali ro'yxatdan o'tmaganmisiz? Ro'yxatdan o'tish ➔
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#0f7b4c] text-[12px] font-bold hover:underline text-center mt-1"
              >
                Ro'yxatdan o'tganmisiz? Kirish ➔
              </button>
            )}
          </form>
        )}

        {/* 2-QADAM: KODNI TASDIQLASH */}
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
              Tasdiqlash kodi <span className="font-bold text-gray-800">{phone}</span> raqamiga yuborildi.
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
        KeshBak © 2024 — OTP Tizimi
      </p>
    </div>
  );
};

export default LoginPage;

