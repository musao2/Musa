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

    const u = userObj || user;
    let cleanPhone = null;
    if (u?.phone) {
      cleanPhone = u.phone;
    } else if (u?.email) {
      const emailParts = u.email.split('@')[0];
      const phoneDigits = emailParts.split('_')[0].replace(/\D/g, '');
      if (phoneDigits) {
        cleanPhone = '+' + phoneDigits;
      }
    }

    // 1. ID bo'yicha profilni yuklash
    let { data, error: selectErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (selectErr) {
      console.error("loadProfile select error:", selectErr);
    }

    // 2. Agar ID bo'yicha topilmasa, telefon bo'yicha izlash
    if (!data && cleanPhone) {
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
      }
    }

    // 3. Agar profil topilmasa (masalan Supabase ma'lumotlari tozalangan bo'lsa) -> bazada yangi profil yaratamiz (upsert)
    if (!data) {
      const currentName = profile?.name && profile.name !== 'Mijoz' && profile.name !== "Noma'lum Mijoz" ? profile.name : 'Mijoz';
      const cardNumber = profile?.card_number || ('KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000));

      const newPayload = {
        id:               userId,
        name:             currentName,
        phone:            cleanPhone || '',
        card_number:      cardNumber,
        cashback_balance: profile?.cashback_balance ?? 0,
        level:            profile?.level || 'Standart',
      };
      if (profile?.first_name) newPayload.first_name = profile.first_name;
      if (profile?.last_name) newPayload.last_name = profile.last_name;

      const { data: createdProfile, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(newPayload, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (createdProfile) {
        data = createdProfile;
      } else {
        console.error("loadProfile upsert xatosi:", upsertErr);
        delete newPayload.first_name;
        delete newPayload.last_name;
        const { data: minProfile } = await supabase
          .from('profiles')
          .upsert(newPayload, { onConflict: 'id' })
          .select('*')
          .maybeSingle();

        data = minProfile || newPayload;
      }
    }

    // 4. Agarda profil bor-u, karta raqami bo'sh bo'lsa -> karta raqam biriktiramiz
    if (data && !data.card_number) {
      const cardNumber = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
      data.card_number = cardNumber;
      try {
        await supabase.from('profiles').update({ card_number: cardNumber }).eq('id', data.id || userId);
      } catch (e) {}
    }

    if (data) {
      setProfile(data);
    }
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
        // Agar ushbu email allaqachon ro'yxatdan o'tgan bo'lsa
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

    // 4. Profil mavjudligini tekshirish va yaratish / yangilash (upsert)
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    const cardNumber = profileExists?.card_number || ('KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000));

    const payload = {
      id:               userId,
      name:             finalName || profileExists?.name || 'Mijoz',
      phone:            cleanPhone,
      card_number:      cardNumber,
      cashback_balance: profileExists?.cashback_balance ?? 0,
      level:            profileExists?.level || 'Standart',
    };
    if (finalFirstName) payload.first_name = finalFirstName;
    if (finalLastName) payload.last_name = finalLastName;

    let { error: upsertErr } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (upsertErr) {
      delete payload.first_name;
      delete payload.last_name;
      await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    }

    await loadProfile(userId, { email, phone: cleanPhone });
    return { success: true };
  };

  // Profil ismini yangilash (Ism va Familiyani alohida qabul qiladi)
  const updateProfileName = async (firstNameVal, lastNameVal = '') => {
    if (!user && !profile) return { error: 'Tizimga kirmagansiz' };

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

    const targetId = profile?.id || user?.id;
    let cleanPhone = profile?.phone || user?.phone || '';
    if (!cleanPhone && user?.email) {
      const emailParts = user.email.split('@')[0];
      const phoneDigits = emailParts.split('_')[0].replace(/\D/g, '');
      if (phoneDigits) cleanPhone = '+' + phoneDigits;
    }

    const cardNumber = profile?.card_number || ('KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000));

    // 1. Local profildagi ism va karta raqamni darhol yangilaymiz (UI darhol modalni yopishi uchun)
    setProfile(prev => ({
      ...(prev || {}),
      id: targetId,
      name: fullName,
      first_name: cleanFirst || null,
      last_name: cleanLast || null,
      card_number: prev?.card_number || cardNumber,
      phone: prev?.phone || cleanPhone || '',
      cashback_balance: prev?.cashback_balance ?? 0,
      level: prev?.level || 'Standart',
    }));

    // 2. DB ga upsert qilamiz
    const upsertPayload = {
      id: targetId,
      name: fullName,
      phone: cleanPhone || '',
      card_number: cardNumber,
      cashback_balance: profile?.cashback_balance ?? 0,
      level: profile?.level || 'Standart',
    };
    if (cleanFirst) upsertPayload.first_name = cleanFirst;
    if (cleanLast) upsertPayload.last_name = cleanLast;

    let { error: upsertErr } = await supabase
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'id' });

    if (upsertErr) {
      console.error("updateProfileName upsert xatosi:", upsertErr);
      delete upsertPayload.first_name;
      delete upsertPayload.last_name;
      const fb = await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id' });
      if (fb.error && cleanPhone) {
        await supabase.from('profiles').update({ name: fullName }).eq('phone', cleanPhone);
      }
    }

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

