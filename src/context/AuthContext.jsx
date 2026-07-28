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
    let profileChannel = null;

    const setupProfileSubscription = (userId) => {
      if (profileChannel) supabase.removeChannel(profileChannel);
      profileChannel = supabase
        .channel(`profile_changes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new) {
              setProfile(payload.new);
            }
          }
        )
        .subscribe();
    };

    // Joriy sessiyani tekshirish
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadProfile(u.id);
        setupProfileSubscription(u.id);
      }
      setLoading(false);
    });

    // Auth o'zgarishlarini tinglash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await loadProfile(u.id);
          setupProfileSubscription(u.id);
        } else {
          setProfile(null);
          if (profileChannel) supabase.removeChannel(profileChannel);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
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
    const phoneDigits = cleanPhone.replace('+', '');
    const email = `${phoneDigits}@keshbak.uz`;
    const password = `OtpSecretPasswordFor_${phoneDigits}`;
    const legacyPassword = `Keshbek_${phoneDigits}`;

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

    // 3. Tizimga kirishga urinish (Sign In)
    let userId = null;

    const candidateEmails = [
      `${phoneDigits}@keshbak.uz`,
      `${phoneDigits}@keshbek.uz`,
      `${cleanPhone}@keshbak.uz`,
      `${cleanPhone}@keshbek.uz`,
    ];

    const candidatePasswords = [
      `OtpSecretPasswordFor_${phoneDigits}`,
      `Keshbek_${phoneDigits}`,
      `OtpSecretPasswordFor_${cleanPhone}`,
      `Keshbek_${cleanPhone}`,
      `12345678`,
      `123456`,
      `password`,
    ];

    // Birinchi galda barcha variantlarni sinab ko'ramiz
    for (const em of candidateEmails) {
      for (const pw of candidatePasswords) {
        const { data: res, error } = await supabase.auth.signInWithPassword({
          email: em,
          password: pw,
        });
        if (!error && res?.user) {
          userId = res.user.id;
          break;
        }
      }
      if (userId) break;
    }

    // Agar hech qaysi parol bilan kira olmagan bo'lsa, yangi akkaunt sifatida Sign Up qilamiz
    if (!userId) {
      const mainEmail = `${phoneDigits}@keshbak.uz`;
      const mainPassword = `OtpSecretPasswordFor_${phoneDigits}`;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: mainEmail,
        password: mainPassword,
      });

      if (signUpData?.user) {
        userId = signUpData.user.id;
        if (!signUpData.session) {
          const reSignIn = await supabase.auth.signInWithPassword({ email: mainEmail, password: mainPassword });
          if (reSignIn.data?.user) userId = reSignIn.data.user.id;
        }
      } else if (signUpError) {
        // Agar 'User already registered' berib, paroli topilmagan bo'lsa, muqobil email bilan tiklab kiritamiz
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          const altEmail = `${phoneDigits}_v2@keshbak.uz`;
          const { data: altSignUp, error: altError } = await supabase.auth.signUp({
            email: altEmail,
            password: mainPassword,
          });

          if (altSignUp?.user) {
            userId = altSignUp.user.id;
            if (!altSignUp.session) {
              const reSignIn = await supabase.auth.signInWithPassword({ email: altEmail, password: mainPassword });
              if (reSignIn.data?.user) userId = reSignIn.data.user.id;
            }
          } else {
            return { error: signUpError.message };
          }
        } else {
          return { error: signUpError.message };
        }
      }
    }

    if (!userId) {
      return { error: 'Tizimga kirishda kutilmagan xatolik yuz berdi.' };
    }

    // 4. Profil mavjudligini tekshirish va yaratish / yangilash
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (!profileExists) {
      const cardNumber = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
      await supabase.from('profiles').insert({
        id:               userId,
        name:             finalName || 'Mijoz',
        full_name:        finalName || 'Mijoz',
        phone:            cleanPhone,
        card_number:      cardNumber,
        cashback_balance: 0,
        level:            'Standart',
      });
    } else {
      // Agar mavjud profil nomi bo'sh yoki 'Mijoz' bo'lsa va bizda yangi ism bo'lsa -> yangilaymiz
      const hasNoName = !profileExists.name && !profileExists.full_name;
      const isDefaultName = profileExists.name === 'Mijoz' || profileExists.full_name === 'Mijoz';

      const updateData = {};
      if (finalName && (hasNoName || isDefaultName)) {
        updateData.name = finalName;
        updateData.full_name = finalName;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase.from('profiles').update(updateData).eq('phone', cleanPhone);
      }
    }

    await loadProfile(userId);
    return { success: true };
  };

  // Profil ismini yangilash
  const updateProfileName = async (newName) => {
    if (!user) return { error: 'Tizimga kirmagansiz' };
    const cleanName = newName.trim();
    if (!cleanName) return { error: 'Ism bo\'sh bo\'lishi mumkin emas' };

    const { error } = await supabase
      .from('profiles')
      .update({ name: cleanName, full_name: cleanName })
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

