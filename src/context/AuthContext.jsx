import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profil ma'lumotlarini yuklash
  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) setProfile(data);
  };

  useEffect(() => {
    // Joriy sessiyani tekshirish
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      setLoading(false);
    });

    // Auth o'zgarishlarini tinglash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await loadProfile(u.id);
        else    setProfile(null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // OTP tasdiqlash va tizimga kirish (yoki ro'yxatdan o'tish)
  const verifyOTPAndLogin = async (phone, code, name = '') => {
    const cleanPhone = phone.trim();
    const cleanCode = code.trim();

    // 1. otp_codes jadvalidan kodni olish va tekshirish
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (otpError) {
      return { error: 'Ulanish xatosi: ' + otpError.message };
    }

    if (!otpData) {
      return { error: 'Keshbek uchun kod yuborilmagan yoki topilmadi.' };
    }

    // Kod muddati o'tganligini tekshirish
    if (new Date(otpData.expires_at) < new Date()) {
      return { error: 'Tasdiqlash kodining vaqti o\'tgan. Qayta kod yuboring.' };
    }

    // Kodni tekshirish
    if (otpData.code !== cleanCode) {
      return { error: 'Kiritilgan tasdiqlash kodi noto\'g\'ri!' };
    }

    // Ishlatilgan kodni o'chirib tashlaymiz
    await supabase.from('otp_codes').delete().eq('phone', cleanPhone);

    // 2. Supabase auth tizimi uchun email/parol hosil qilish
    const email = `${cleanPhone.replace('+', '')}@keshbak.uz`;
    const password = `OtpSecretPasswordFor_${cleanPhone.replace('+', '')}`;

    // Telegram botdan ism kelganligini tekshirish (agar front-enddan berilmagan bo'lsa)
    let finalName = name?.trim();
    if (!finalName) {
      try {
        const { data: tgUser } = await supabase
          .from('telegram_users')
          .select('name')
          .eq('phone', cleanPhone)
          .maybeSingle();
        if (tgUser?.name) finalName = tgUser.name;
      } catch (e) {}
    }

    // Avval profillarda bu telefon borligini tekshirish
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (!profileExists) {
      // Ro'yxatdan o'tish (Sign Up)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) return { error: signInError.message };

          const cardNumber = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
          await supabase.from('profiles').insert({
            id:               signInData.user.id,
            name:             finalName || 'Mijoz',
            phone:            cleanPhone,
            card_number:      cardNumber,
            cashback_balance: 0,
            level:            'Standart',
          });

          await loadProfile(signInData.user.id);
          return { success: true };
        }
        return { error: signUpError.message };
      }

      if (authData?.user) {
        const cardNumber = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
        await supabase.from('profiles').insert({
          id:               authData.user.id,
          name:             finalName || 'Mijoz',
          phone:            cleanPhone,
          card_number:      cardNumber,
          cashback_balance: 0,
          level:            'Standart',
        });
        await loadProfile(authData.user.id);
      }
    } else {
      // Kirish (Sign In)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return { error: signInError.message };
      }

      // Agar mavjud profil nomi bo'sh yoki 'Mijoz' bo'lsa va bizda yangi ism bo'lsa -> yangilaymiz
      if (finalName && (!profileExists.name || profileExists.name === 'Mijoz')) {
        await supabase.from('profiles').update({ name: finalName }).eq('id', signInData.user.id);
      }

      await loadProfile(signInData.user.id);
    }

    return { success: true };
  };

  // Profil ismini yangilash
  const updateProfileName = async (newName) => {
    if (!user) return { error: 'Tizimga kirmagansiz' };
    const cleanName = newName.trim();
    if (!cleanName) return { error: 'Ism bo\'sh bo\'lishi mumkin emas' };

    const { error } = await supabase
      .from('profiles')
      .update({ name: cleanName })
      .eq('id', user.id);

    if (error) return { error: error.message };
    await loadProfile(user.id);
    return { success: true };
  };

  // Chiqish
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Balansni yangilash
  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, verifyOTPAndLogin, updateProfileName, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

