import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BsFuelPump } from 'react-icons/bs';
import { IoMailOutline, IoLockClosedOutline, IoPersonOutline, IoPhonePortraitOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';

const LoginPage = () => {
  const { signIn, signUp } = useAuth();

  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);


    try {
      if (mode === 'login') {
        const { data, error } = await signIn(email, password);

        if (error) {
          const msg = error.message?.toLowerCase() ?? '';
          if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
            setError('Email yoki parol noto\'g\'ri. Qayta tekshiring.');
          } else if (msg.includes('email not confirmed')) {
            setError('Emailingizni tasdiqlamadingiz. Supabase dashboard → Authentication → Providers → Email → "Confirm email" ni o\'chiring.');
          } else if (msg.includes('too many requests') || msg.includes('after')) {
            setError('Juda ko\'p urinish. Bir daqiqa kuting va qayta urinib ko\'ring.');
          } else {
            setError('Xatolik: ' + error.message);
          }
        }
      } else {
        if (!name.trim()) { setError('Ism familiyani kiriting'); setLoading(false); return; }
        const { error } = await signUp(email, password, name, phone);
        if (error) {
          const msg = error.message?.toLowerCase() ?? '';
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setError('Bu email allaqachon ro\'yxatdan o\'tgan. Kirish tugmasini bosing.');
          } else {
            setError('Xatolik: ' + error.message);
          }
        }
      }
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('failed to fetch')) {
        setError('Ulanish xatosi (Failed to fetch). Supabase URL noto\'g\'ri yoki internet aloqasi yo\'q. .env fayli va loyiha URLini tekshiring hamda serverni qayta ishga tushiring.');
      } else {
        setError('Tizim xatosi: ' + errMsg);
      }
    } finally {
      setLoading(false);
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
        <p className="text-white/60 text-[13px] mt-1">Lukoil — Yunusobod</p>
      </div>

      {/* Forma kartasi */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">

        {/* Tab */}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Ism — faqat register */}
          {mode === 'register' && (
            <div className="relative">
              <IoPersonOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ism familiya"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
              />
            </div>
          )}

          {/* Telefon — faqat register */}
          {mode === 'register' && (
            <div className="relative">
              <IoPhonePortraitOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
              />
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <IoMailOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Email manzil"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
            />
          </div>

          {/* Parol */}
          <div className="relative">
            <IoLockClosedOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Parol (kamida 6 ta belgi)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 outline-none focus:border-[#0f7b4c] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPass ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
            </button>
          </div>

          {/* Xatolik */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-red-500 text-[13px] font-medium">
              {error}
            </div>
          )}

          {/* Submit tugma */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#0f7b4c] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              mode === 'login' ? 'Kirish' : 'Ro\'yxatdan o\'tish'
            )}
          </button>
        </form>
      </div>

      <p className="text-white/40 text-[12px] mt-6 text-center">
        KeshBak © 2024 — Lukoil Yunusobod
      </p>
    </div>
  );
};

export default LoginPage;
