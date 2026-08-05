import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Local Storage kesh yordamchi funksiyalari
const GET_CACHED_PROFILE = (userId, phone) => {
  try {
    const key = `keshbak_profile_${userId || phone || 'guest'}`;
    const raw = localStorage.getItem(key) || localStorage.getItem('keshbak_profile_global');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

const SAVE_CACHED_PROFILE = (userId, phone, profileData) => {
  try {
    if (!profileData) return;
    const dataStr = JSON.stringify(profileData);
    if (userId) localStorage.setItem(`keshbak_profile_${userId}`, dataStr);
    if (phone) {
      localStorage.setItem(`keshbak_profile_${phone}`, dataStr);
      // Telefon raqamiga biriktirilgan ism – qayta kirganida ishlatilinadi
      const digits = phone.replace(/\D/g, '');
      if (digits && profileData.name && profileData.name !== 'Mijoz') {
        localStorage.setItem(`keshbak_name_${digits}`, profileData.name);
        if (profileData.first_name) localStorage.setItem(`keshbak_fname_${digits}`, profileData.first_name);
        if (profileData.last_name) localStorage.setItem(`keshbak_lname_${digits}`, profileData.last_name);
      }
    }
    localStorage.setItem('keshbak_profile_global', dataStr);
  } catch (e) {}
};

const getStoredCardNumber = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  try {
    return localStorage.getItem(`keshbak_card_${digits}`) || localStorage.getItem(`keshbak_card_number_${digits}`);
  } catch (e) {
    return null;
  }
};

const saveStoredCardNumber = (phone, cardNumber) => {
  if (!phone || !cardNumber || cardNumber === '—') return;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return;
  try {
    localStorage.setItem(`keshbak_card_${digits}`, cardNumber);
    localStorage.setItem(`keshbak_card_number_${digits}`, cardNumber);
  } catch (e) {}
};

const getOrGenerateCardNumber = (dbCard, cachedCard, phone) => {
  if (dbCard && dbCard !== '—' && dbCard.trim()) {
    saveStoredCardNumber(phone, dbCard.trim());
    return dbCard.trim();
  }
  if (cachedCard && cachedCard !== '—' && cachedCard.trim()) {
    saveStoredCardNumber(phone, cachedCard.trim());
    return cachedCard.trim();
  }
  const stored = getStoredCardNumber(phone);
  if (stored && stored !== '—' && stored.trim()) {
    return stored.trim();
  }

  const newCard = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
  saveStoredCardNumber(phone, newCard);
  return newCard;
};

// Supabase bazasiga ism, familiya va barcha ma'lumotlarni ishonchli saqlash (ID hamda telefon variantlari bo'yicha)
const syncProfileToSupabase = async (profileData) => {
  if (!profileData) return;

  const { id, name, full_name, first_name, last_name, phone, card_number, cashback_balance, level } = profileData;
  const fullName = name || full_name || [first_name, last_name].filter(Boolean).join(' ').trim();
  
  const phoneDigits = phone ? phone.replace(/\D/g, '') : '';
  const validCardNumber = card_number || getStoredCardNumber(phone) || ('KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000));
  saveStoredCardNumber(phone, validCardNumber);

  if (!fullName || fullName === 'Mijoz') return;

  let cleanFirst = first_name || '';
  let cleanLast = last_name || '';
  if (!cleanFirst && !cleanLast && fullName) {
    const parts = fullName.trim().split(' ');
    cleanFirst = parts[0] || '';
    cleanLast = parts.slice(1).join(' ') || '';
  }

  const updatePayloadWithFirstLast = {
    name: fullName,
    full_name: fullName,
    card_number: validCardNumber,
  };
  if (cleanFirst) updatePayloadWithFirstLast.first_name = cleanFirst;
  if (cleanLast) updatePayloadWithFirstLast.last_name = cleanLast;

  const updatePayloadMin = {
    name: fullName,
    full_name: fullName,
    card_number: validCardNumber,
  };

  const phoneVariations = [
    phone,
    phoneDigits ? '+' + phoneDigits : null,
    phoneDigits,
  ].filter(Boolean);

  // 1. Update by ID
  if (id) {
    let { error } = await supabase.from('profiles').update(updatePayloadWithFirstLast).eq('id', id);
    if (error) {
      await supabase.from('profiles').update(updatePayloadMin).eq('id', id);
    }
  }

  // 2. Update by Phone variations
  for (const p of phoneVariations) {
    let { error } = await supabase.from('profiles').update(updatePayloadWithFirstLast).eq('phone', p);
    if (error) {
      await supabase.from('profiles').update(updatePayloadMin).eq('phone', p);
    }
  }

  // 3. Upsert if row doesn't exist
  if (id) {
    const upsertPayload = {
      id,
      name: fullName,
      full_name: fullName,
      phone: phone || '',
      card_number: validCardNumber,
      cashback_balance: cashback_balance ?? 0,
      level: level || 'Standart',
    };
    if (cleanFirst) upsertPayload.first_name = cleanFirst;
    if (cleanLast) upsertPayload.last_name = cleanLast;

    let { error: upsertErr } = await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id' });
    if (upsertErr) {
      delete upsertPayload.first_name;
      delete upsertPayload.last_name;
      await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id' });
    }
  }
};

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

    const cached = GET_CACHED_PROFILE(userId, cleanPhone);

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

    // 3. Profil ma'lumotlarini birlashtirish
    const validName = (nameVal) => nameVal && nameVal !== 'Mijoz' && nameVal !== "Noma'lum Mijoz" ? nameVal : null;

    // Telefon raqamiga biriktirilgan saqlangan ism (chiqib qayta kirganida ishlatilinadi)
    const phoneDigitsForName = cleanPhone ? cleanPhone.replace(/\D/g, '') : '';
    const storedName = phoneDigitsForName ? localStorage.getItem(`keshbak_name_${phoneDigitsForName}`) : null;
    const storedFirst = phoneDigitsForName ? localStorage.getItem(`keshbak_fname_${phoneDigitsForName}`) : null;
    const storedLast = phoneDigitsForName ? localStorage.getItem(`keshbak_lname_${phoneDigitsForName}`) : null;
    
    const dbName = data?.name || data?.full_name;
    const finalName = validName(dbName) || validName(cached?.name) || validName(cached?.full_name) || validName(storedName) || 'Mijoz';
    const cardNumber = getOrGenerateCardNumber(data?.card_number, cached?.card_number, cleanPhone || data?.phone || cached?.phone);

    let mergedProfile = {
      id: userId,
      name: finalName,
      full_name: finalName,
      phone: data?.phone || cleanPhone || cached?.phone || '',
      card_number: cardNumber,
      cashback_balance: data?.cashback_balance ?? cached?.cashback_balance ?? 0,
      level: data?.level || cached?.level || 'Standart',
      first_name: data?.first_name || cached?.first_name || storedFirst || '',
      last_name: data?.last_name || cached?.last_name || storedLast || '',
    };

    if (data) {
      // Agarda DB dagi yozuvda ism 'Mijoz' bo'lib, keshda haqiqiy ism bo'lsa DB ni yangilaymiz
      if ((data.name === 'Mijoz' || !data.name) && cached?.name && cached.name !== 'Mijoz') {
        mergedProfile.name = cached.name;
        mergedProfile.full_name = cached.name;
        try {
          await supabase.from('profiles').update({ name: cached.name, full_name: cached.name }).eq('id', userId);
        } catch (e) {}
      }
      // Agarda DB dagi yozuvda karta bo'sh bo'lsa DB ni yangilaymiz
      if (!data.card_number) {
        try {
          await supabase.from('profiles').update({ card_number: cardNumber }).eq('id', userId);
        } catch (e) {}
      }
    } else {
      // 4. DB da profil topilmasa, upsert qilamiz
      const { data: createdProfile, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(mergedProfile, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (createdProfile) {
        mergedProfile = { ...mergedProfile, ...createdProfile };
      } else {
        console.error("loadProfile upsert xatosi:", upsertErr);
      }
    }

    if (mergedProfile.name && mergedProfile.name !== 'Mijoz') {
      try {
        await syncProfileToSupabase(mergedProfile);
      } catch (e) {}
    }

    SAVE_CACHED_PROFILE(userId, cleanPhone, mergedProfile);
    setProfile(mergedProfile);
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
            setProfile(prev => {
              const updated = { ...(prev || {}), ...payload.new };
              if (!updated.name || updated.name === 'Mijoz') {
                const cached = GET_CACHED_PROFILE(userId);
                if (cached?.name && cached.name !== 'Mijoz') {
                  updated.name = cached.name;
                  updated.full_name = cached.name;
                }
              }
              if (!updated.card_number && prev?.card_number) {
                updated.card_number = prev.card_number;
              }
              SAVE_CACHED_PROFILE(userId, updated.phone, updated);
              return updated;
            });
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
  const verifyOTPAndLogin = async (phone, code, nameInput = '', lastNameInput = '') => {
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

    let finalFirstName = '';
    let finalLastName = '';
    let finalName = '';

    if (typeof nameInput === 'object' && nameInput !== null) {
      finalFirstName = (nameInput.firstName || nameInput.first_name || '').trim();
      finalLastName = (nameInput.lastName || nameInput.last_name || '').trim();
    } else if (typeof nameInput === 'string' && lastNameInput) {
      finalFirstName = nameInput.trim();
      finalLastName = lastNameInput.trim();
    } else if (typeof nameInput === 'string' && nameInput.trim()) {
      const parts = nameInput.trim().split(' ');
      finalFirstName = parts[0] || '';
      finalLastName = parts.slice(1).join(' ') || '';
    }
    finalName = [finalFirstName, finalLastName].filter(Boolean).join(' ').trim();

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

    const cached = GET_CACHED_PROFILE(userId, cleanPhone);
    const cardNumber = getOrGenerateCardNumber(profileExists?.card_number, cached?.card_number, cleanPhone);
    const resolvedName = finalName || profileExists?.name || profileExists?.full_name || cached?.name || 'Mijoz';
    const resolvedFirstName = finalFirstName || profileExists?.first_name || cached?.first_name || '';
    const resolvedLastName = finalLastName || profileExists?.last_name || cached?.last_name || '';

    const payload = {
      id:               userId,
      name:             resolvedName,
      full_name:        resolvedName,
      phone:            cleanPhone,
      card_number:      cardNumber,
      cashback_balance: profileExists?.cashback_balance ?? cached?.cashback_balance ?? 0,
      level:            profileExists?.level || cached?.level || 'Standart',
    };
    if (resolvedFirstName) payload.first_name = resolvedFirstName;
    if (resolvedLastName) payload.last_name = resolvedLastName;

    SAVE_CACHED_PROFILE(userId, cleanPhone, payload);
    await syncProfileToSupabase(payload);
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

    const cached = GET_CACHED_PROFILE(targetId, cleanPhone);
    const cardNumber = getOrGenerateCardNumber(profile?.card_number, cached?.card_number, cleanPhone || profile?.phone);

    const updatedProfile = {
      ...(profile || {}),
      id: targetId,
      name: fullName,
      full_name: fullName,
      first_name: cleanFirst || null,
      last_name: cleanLast || null,
      card_number: cardNumber,
      phone: profile?.phone || cleanPhone || '',
      cashback_balance: profile?.cashback_balance ?? 0,
      level: profile?.level || 'Standart',
    };

    // 1. Local profildagi ism va karta raqamni darhol yangilaymiz hamda keshlaymiz
    setProfile(updatedProfile);
    SAVE_CACHED_PROFILE(targetId, cleanPhone, updatedProfile);

    // 2. Supabase bazasiga ko'p bosqichli ishonchli sinxronlashtiramiz
    await syncProfileToSupabase(updatedProfile);

    return { success: true };
  };

  // Chiqish – profil keshini SAQLAYMIZ (faqat auth sessionni o'chiramiz)
  // Sabab: qayta kirganida ism so'ralmasin
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

