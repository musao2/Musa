import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profil ma'lumotlarini yuklash
  const loadProfile = async (userId, userObj = null) => {
    if (!userId) return;

    // 1. ID bo'yicha profilni yuklash
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 2. Agar ID bo'yicha topilmasa, telefon bo'yicha izlash
    if (!data) {
      const u = userObj || user;
      let cleanPhone = null;
      if (u?.phone) {
        cleanPhone = u.phone;
      } else if (u?.email) {
        const phoneDigits = u.email.split('_')[0].split('@')[0].replace('+', '');
        if (phoneDigits && /^\d+$/.test(phoneDigits)) {
          cleanPhone = '+' + phoneDigits;
        }
      }

      if (cleanPhone) {
        const { data: phoneProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (phoneProfile) {
          data = phoneProfile;
          try {
            await supabase.from('profiles').update({ id: userId }).eq('phone', cleanPhone);
          } catch (e) {}
        } else {
          const cardNumber = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
          const { data: createdProfile } = await supabase
            .from('profiles')
            .insert({
              id:               userId,
              name:             'Mijoz',
              phone:            cleanPhone,
              card_number:      cardNumber,
              cashback_balance: 0,
              level:            'Standart',
            })
            .select('*')
            .maybeSingle();

          if (createdProfile) data = createdProfile;
        }
      }
    }

    // 3. Agarda profil bor-u, karta raqami bo'sh bo'lsa -> karta raqam yaratamiz
    if (data && !data.card_number) {
      const cardNumber = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
      try {
        await supabase.from('profiles').update({ card_number: cardNumber }).eq('id', data.id);
        data.card_number = cardNumber;
      } catch (e) {}
    }

    if (data) setProfile(data);
  };

  useEffect(() => {
    let profileChannel = null;
    let currentSubscribedUserId = null;

    const setupProfileSubscription = (userId) => {
      if (!userId) return;
      if (currentSubscribedUserId === userId && profileChannel) return;

      if (profileChannel) {
        try {
          supabase.removeChannel(profileChannel);
        } catch (e) {}
        profileChannel = null;
      }

      currentSubscribedUserId = userId;
      const channel = supabase.channel(`profile_changes_${userId}`);
      channel.on(
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

    // Auth o'zgarishlarini va sessiyani bir joyda tinglash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await loadProfile(u.id, u);
          setupProfileSubscription(u.id);
        } else {
          setProfile(null);
          currentSubscribedUserId = null;
          if (profileChannel) {
            try {
              supabase.removeChannel(profileChannel);
            } catch (e) {}
            profileChannel = null;
          }
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (profileChannel) {
        try {
          supabase.removeChannel(profileChannel);
        } catch (e) {}
      }
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

    let finalName = name?.trim() || '';
    let finalFirstName = '';
    let finalLastName = '';

    if (finalName) {
      const parts = finalName.split(' ');
      finalFirstName = parts[0] || '';
      finalLastName = parts.slice(1).join(' ') || '';
    }

    // 3. Tizimga kirishga urinish (Supabase Auth)
    let userId = null;
    const email = `${phoneDigits}@keshbak.uz`;

    // 1-qadam: Kirish (Sign In)
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData?.user) {
      userId = signInData.user.id;
    } else {
      // 2-qadam: Ro'yxatdan o'tish (Sign Up)
      let { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpData?.user) {
        userId = signUpData.user.id;
        if (!signUpData.session) {
          const reSignIn = await supabase.auth.signInWithPassword({ email, password });
          if (reSignIn.data?.user) userId = reSignIn.data.user.id;
        }
      } else if (signUpError) {
        // Agar ushbu email allaqachon ro'yxatdan o'tgan bo'lsa (User already registered), muqobil akkaunt bilan bog'laymiz
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          const altEmail = `${phoneDigits}_v2@keshbak.uz`;
          const altSignUp = await supabase.auth.signUp({ email: altEmail, password });
          if (altSignUp.data?.user) {
            userId = altSignUp.data.user.id;
            if (!altSignUp.session) {
              const reSignIn = await supabase.auth.signInWithPassword({ email: altEmail, password });
              if (reSignIn.data?.user) userId = reSignIn.data.user.id;
            }
          } else {
            const altSignIn = await supabase.auth.signInWithPassword({ email: altEmail, password });
            if (altSignIn.data?.user) {
              userId = altSignIn.data.user.id;
            } else {
              return { error: 'Tizimga kirishda xatolik yuz berdi. Qayta urinib ko\'ring.' };
            }
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

    const cardNumber = profileExists?.card_number || ('KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000));

    if (!profileExists) {
      const payload = {
        id:               userId,
        name:             finalName || 'Mijoz',
        phone:            cleanPhone,
        card_number:      cardNumber,
        cashback_balance: 0,
        level:            'Standart',
      };
      if (finalFirstName) payload.first_name = finalFirstName;
      if (finalLastName) payload.last_name = finalLastName;

      let { error: insertErr } = await supabase.from('profiles').insert(payload);
      if (insertErr) {
        // agar first_name/last_name ustunlari DB ga qo'shilmagan bo'lsa fallback
        delete payload.first_name;
        delete payload.last_name;
        await supabase.from('profiles').insert(payload);
      }
    } else {
      const hasNoName = !profileExists.name;
      const isDefaultName = profileExists.name === 'Mijoz';

      const updateData = {
        id: userId,
        card_number: cardNumber,
      };
      if (finalName && (hasNoName || isDefaultName)) {
        updateData.name = finalName;
        if (finalFirstName) updateData.first_name = finalFirstName;
        if (finalLastName) updateData.last_name = finalLastName;
      }

      let { error: updErr } = await supabase.from('profiles').update(updateData).eq('phone', cleanPhone);
      if (updErr) {
        delete updateData.first_name;
        delete updateData.last_name;
        await supabase.from('profiles').update(updateData).eq('phone', cleanPhone);
      }
    }

    await loadProfile(userId, { email, phone: cleanPhone });
    return { success: true };
  };

  // Profil ismini yangilash (Ism va Familiyani alohida qabul qiladi)
  const updateProfileName = async (firstNameVal, lastNameVal = '') => {
    if (!user) return { error: 'Tizimga kirmagansiz' };

    let cleanFirst = '';
    let cleanLast = '';

    if (typeof firstNameVal === 'object' && firstNameVal !== null) {
      cleanFirst = (firstNameVal.firstName || firstNameVal.first_name || '').trim();
      cleanLast = (firstNameVal.lastName || firstNameVal.last_name || '').trim();
    } else if (typeof firstNameVal === 'string' && lastNameVal) {
      cleanFirst = firstNameVal.trim();
      cleanLast = lastNameVal.trim();
    } else if (typeof firstNameVal === 'string') {
      const parts = firstNameVal.trim().split(' ');
      cleanFirst = parts[0] || '';
      cleanLast = parts.slice(1).join(' ') || '';
    }

    const fullName = [cleanFirst, cleanLast].filter(Boolean).join(' ').trim();
    if (!fullName) return { error: 'Ism bo\'sh bo\'lishi mumkin emas' };

    const updatePayload = {
      name: fullName,
      first_name: cleanFirst || null,
      last_name: cleanLast || null,
    };

    let { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);

    if (error) {
      // Supabase-da first_name/last_name ustunlari yo'q bo'lsa fallback
      const fallback = await supabase
        .from('profiles')
        .update({ name: fullName })
        .eq('id', user.id);
      if (fallback.error) return { error: fallback.error.message };
    }
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

