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
    let currentSubscribedUserId = null;

    const setupProfileSubscription = (userId) => {
      if (!userId || currentSubscribedUserId === userId) return;

      if (profileChannel) {
        supabase.removeChannel(profileChannel);
        profileChannel = null;
      }

      currentSubscribedUserId = userId;
      const channel = supabase
        .channel(`profile_changes_${userId}_${Date.now()}`)
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
        );

      channel.subscribe();
      profileChannel = channel;
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
          currentSubscribedUserId = null;
          if (profileChannel) {
            supabase.removeChannel(profileChannel);
            profileChannel = null;
          }
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

    // 2. Supabase auth tizimi uchun telefon raqam va parol
    const phoneDigits = cleanPhone.replace('+', '');
    const password = `OtpSecretPasswordFor_${phoneDigits}`;

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

    // 3. Tizimga kirishga urinish (Telefon raqamining o'zi bilan)
    let userId = null;

    // 1-qadam: Telefon raqami va parol orqali kirish (Phone Sign In)
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      phone: cleanPhone,
      password: password,
    });

    if (!signInError && signInData?.user) {
      userId = signInData.user.id;
    } else {
      // 2-qadam: Agar kirib bo'lmasa, telefon raqami bilan ro'yxatdan o'tkazish (Phone Sign Up)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        phone: cleanPhone,
        password: password,
      });

      if (signUpData?.user) {
        userId = signUpData.user.id;
        if (!signUpData.session) {
          const reSignIn = await supabase.auth.signInWithPassword({ phone: cleanPhone, password: password });
          if (reSignIn.data?.user) userId = reSignIn.data.user.id;
        }
      } else {
        // Zaxira: Agar Supabase loyihangizda Phone Provider o'chirilgan bo'lsa, avtomatik email shakliga o'tkazamiz
        const email = `${phoneDigits}@keshbak.uz`;
        const emailSignIn = await supabase.auth.signInWithPassword({ email, password });
        if (!emailSignIn.error && emailSignIn.data?.user) {
          userId = emailSignIn.data.user.id;
        } else {
          const emailSignUp = await supabase.auth.signUp({ email, password });
          if (emailSignUp.data?.user) {
            userId = emailSignUp.data.user.id;
            if (!emailSignUp.session) {
              const reSignIn = await supabase.auth.signInWithPassword({ email, password });
              if (reSignIn.data?.user) userId = reSignIn.data.user.id;
            }
          } else if (signUpError) {
            return { error: signUpError.message };
          }
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

