import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ─── SUPABASE SCHEMA (haqiqiy jadval ustunlari) ────────────────────────────
//
// profiles: id(uuid), name, first_name, last_name, phone,
//           card_number, cashback_balance, level, created_at
//
// telegram_users: chat_id(TEXT PK), phone, cashback_balance,
//                 full_name, card_number, created_at
//
// ──────────────────────────────────────────────────────────────────────────

const getDigits = (phone) => (phone || '').replace(/\D/g, '');

// Karta raqamini generatsiya qilish
const generateCard = () =>
  `KB-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

// Supabase dan profiles jadvalini yuklash
const fetchProfile = async (field, value) => {
  if (!value) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, first_name, last_name, phone, card_number, cashback_balance, level')
      .eq(field, value)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch { return null; }
};

// telegram_users jadvalidan ma'lumot olish (phone bo'yicha)
const fetchTelegramUser = async (phone) => {
  if (!phone) return null;
  const d = getDigits(phone);
  for (const ph of ['+' + d, d]) {
    try {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('chat_id, phone, cashback_balance, full_name, card_number')
        .eq('phone', ph)
        .maybeSingle();
      if (!error && data) return data;
    } catch {}
  }
  return null;
};

// profiles jadvalini yangilash (xatolar yutiladi)
const patchProfile = async (field, value, payload) => {
  if (!value) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq(field, value);
    return !error;
  } catch { return false; }
};

// ─── PROVIDER ───────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Profil yuklash ─────────────────────────────────────────────────────
  const loadProfile = async (userId, userObj = null) => {
    if (!userId) return;

    const u = userObj || user;
    let cleanPhone = null;
    if (u?.phone) {
      cleanPhone = u.phone;
    } else if (u?.email) {
      const digits = u.email.split('@')[0].split('_')[0].replace(/\D/g, '');
      if (digits) cleanPhone = '+' + digits;
    }

    // 1. profiles jadvalidan ID bo'yicha yuklash
    let dbProfile = await fetchProfile('id', userId);

    // 2. Topilmasa telefon bo'yicha
    if (!dbProfile && cleanPhone) {
      const d = getDigits(cleanPhone);
      dbProfile = await fetchProfile('phone', '+' + d)
               || await fetchProfile('phone', d);
    }

    // 3. telegram_users dan qo'shimcha ma'lumot (cashback_balance, card_number)
    const tgUser = await fetchTelegramUser(cleanPhone || dbProfile?.phone);

    if (!dbProfile) {
      // Profil topilmasa – minimal holat
      setProfile({
        id: userId,
        phone: cleanPhone || '',
        name: tgUser?.full_name || 'Mijoz',
        first_name: '',
        last_name: '',
        card_number: tgUser?.card_number || '',
        cashback_balance: tgUser?.cashback_balance ?? 0,
        level: 'Standart',
        chat_id: tgUser?.chat_id || null,
      });
      return;
    }

    // 4. Karta raqami yo'q bo'lsa generatsiya qilib DB ga yozish
    let cardNumber = dbProfile.card_number || tgUser?.card_number || '';
    if (!cardNumber) {
      cardNumber = generateCard();
      patchProfile('id', dbProfile.id || userId, { card_number: cardNumber });
    }

    // 5. Ism yo'q bo'lsa telegram_users dan olish
    const finalName = dbProfile.name && dbProfile.name !== 'Mijoz'
      ? dbProfile.name
      : (tgUser?.full_name || 'Mijoz');

    const mergedProfile = {
      id:               dbProfile.id || userId,
      name:             finalName,
      first_name:       dbProfile.first_name || '',
      last_name:        dbProfile.last_name  || '',
      phone:            dbProfile.phone || cleanPhone || '',
      card_number:      cardNumber,
      // cashback_balance: telegram_users dan olish (to'g'ri va yangi balans)
      cashback_balance: tgUser?.cashback_balance ?? dbProfile.cashback_balance ?? 0,
      level:            dbProfile.level || 'Standart',
      chat_id:          tgUser?.chat_id || null,
    };

    setProfile(mergedProfile);
  };

  // ── Real-time: profiles va telegram_users ni tinglash ─────────────────
  useEffect(() => {
    let profileCh = null;
    let tgCh      = null;
    let subId     = null;

    const setupSub = (userId, phone) => {
      if (subId === userId) return;
      if (profileCh) { try { supabase.removeChannel(profileCh); } catch {} }
      if (tgCh)      { try { supabase.removeChannel(tgCh);      } catch {} }
      subId = userId;

      // profiles o'zgarishlarini tinglash
      profileCh = supabase.channel(`profile_rt_${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
        }, (payload) => {
          if (payload.new) {
            setProfile(prev => ({
              ...(prev || {}),
              ...payload.new,
              card_number: payload.new.card_number || prev?.card_number || '',
              cashback_balance: prev?.cashback_balance ?? payload.new.cashback_balance ?? 0,
              chat_id: prev?.chat_id || null,
            }));
          }
        })
        .subscribe();

      // telegram_users balans o'zgarishlarini tinglash (agar phone bo'lsa)
      if (phone) {
        const d = getDigits(phone);
        tgCh = supabase.channel(`tg_rt_${d}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'telegram_users',
            filter: `phone=eq.+${d}`,
          }, (payload) => {
            if (payload.new) {
              setProfile(prev => prev ? {
                ...prev,
                cashback_balance: payload.new.cashback_balance ?? prev.cashback_balance,
                card_number: payload.new.card_number || prev.card_number,
                chat_id: payload.new.chat_id || prev.chat_id,
              } : prev);
            }
          })
          .subscribe();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfile(u.id, u);
        let phone = u.phone;
        if (!phone && u.email) {
          const d = u.email.split('@')[0].split('_')[0].replace(/\D/g, '');
          if (d) phone = '+' + d;
        }
        setupSub(u.id, phone);
      } else {
        setProfile(null);
        subId = null;
        if (profileCh) { try { supabase.removeChannel(profileCh); } catch {} profileCh = null; }
        if (tgCh)      { try { supabase.removeChannel(tgCh);      } catch {} tgCh = null; }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (profileCh) { try { supabase.removeChannel(profileCh); } catch {} }
      if (tgCh)      { try { supabase.removeChannel(tgCh);      } catch {} }
    };
  }, []);

  // ── OTP tasdiqlash va tizimga kirish ───────────────────────────────────
  const verifyOTPAndLogin = async (phone, code, nameInput = '', lastNameInput = '') => {
    const cleanPhone = phone.trim();
    const cleanCode  = code.trim();

    // OTP tekshirish
    let otpData = null;
    try {
      const res = await supabase.from('otp_codes').select('*').eq('phone', cleanPhone).maybeSingle();
      otpData = res.data;
    } catch {}

    if (!otpData)                                  return { error: 'Keshbek uchun kod yuborilmagan yoki topilmadi.' };
    if (new Date(otpData.expires_at) < new Date()) return { error: 'Tasdiqlash kodining vaqti o\'tgan. Qayta kod yuboring.' };
    if (otpData.code !== cleanCode)                return { error: 'Kiritilgan tasdiqlash kodi noto\'g\'ri!' };

    try { await supabase.from('otp_codes').delete().eq('phone', cleanPhone); } catch {}

    // Ism ajratish
    let firstName = '', lastName = '';
    if (typeof nameInput === 'object' && nameInput !== null) {
      firstName = (nameInput.firstName || nameInput.first_name || '').trim();
      lastName  = (nameInput.lastName  || nameInput.last_name  || '').trim();
    } else if (typeof nameInput === 'string' && lastNameInput) {
      firstName = nameInput.trim();
      lastName  = lastNameInput.trim();
    } else if (typeof nameInput === 'string' && nameInput.trim()) {
      const parts = nameInput.trim().split(' ');
      firstName = parts[0] || '';
      lastName  = parts.slice(1).join(' ') || '';
    }
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    // Supabase Auth
    const digits   = cleanPhone.replace('+', '');
    const email    = `${digits}@keshbak.uz`;
    const password = `OtpSecretPasswordFor_${digits}`;

    let userId = null;
    try {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (!signIn.error && signIn.data?.user) {
        userId = signIn.data.user.id;
      } else {
        const signUp = await supabase.auth.signUp({ email, password });
        if (signUp.data?.user) {
          userId = signUp.data.user.id;
          if (!signUp.data.session) {
            const reIn = await supabase.auth.signInWithPassword({ email, password });
            if (reIn.data?.user) userId = reIn.data.user.id;
          }
        } else if (signUp.error?.message?.includes('already registered') || signUp.error?.message?.includes('already exists')) {
          const altEmail = `${digits}_v2@keshbak.uz`;
          const altUp = await supabase.auth.signUp({ email: altEmail, password });
          if (altUp.data?.user) {
            userId = altUp.data.user.id;
            if (!altUp.data.session) {
              const reIn = await supabase.auth.signInWithPassword({ email: altEmail, password });
              if (reIn.data?.user) userId = reIn.data.user.id;
            }
          } else {
            const altIn = await supabase.auth.signInWithPassword({ email: altEmail, password });
            if (altIn.data?.user) userId = altIn.data.user.id;
            else return { error: 'Tizimga kirishda xatolik yuz berdi. Qayta urinib ko\'ring.' };
          }
        } else {
          return { error: signUp.error?.message || 'Tizimga kirishda xatolik.' };
        }
      }
    } catch {
      return { error: 'Internet ulanish xatosi. Qayta urinib ko\'ring.' };
    }

    if (!userId) return { error: 'Tizimga kirishda kutilmagan xatolik yuz berdi.' };

    // Mavjud profilni olish
    const existingProfile = await fetchProfile('id', userId)
                         || await fetchProfile('phone', cleanPhone)
                         || await fetchProfile('phone', digits);
    const tgUser = await fetchTelegramUser(cleanPhone);

    const validName = (v) => v && v !== 'Mijoz' && v.trim() ? v.trim() : null;
    const resolvedName  = validName(fullName) || validName(existingProfile?.name) || validName(tgUser?.full_name) || 'Mijoz';
    const resolvedFirst = firstName || existingProfile?.first_name || '';
    const resolvedLast  = lastName  || existingProfile?.last_name  || '';
    const cardNumber    = existingProfile?.card_number || tgUser?.card_number || generateCard();

    // profiles ga yozish (ism, familiya, karta, telefon)
    const updatePayload = {
      name:        resolvedName,
      first_name:  resolvedFirst || null,
      last_name:   resolvedLast  || null,
      card_number: cardNumber,
      phone:       cleanPhone,
    };

    const ok = await patchProfile('id', userId, updatePayload);
    if (!ok) {
      await patchProfile('phone', cleanPhone, updatePayload);
      await patchProfile('phone', digits, updatePayload);
    }

    // telegram_users ni ham yangilash (kartani va ismni admin panel ko'rishi uchun)
    try {
      await supabase
        .from('telegram_users')
        .update({ card_number: cardNumber, full_name: resolvedName })
        .eq('phone', cleanPhone);
    } catch {}

    await loadProfile(userId, { email, phone: cleanPhone });
    return { success: true };
  };

  // ── Profil ismini yangilash (profiles jadvaliga) ───────────────────────
  const updateProfileName = async (firstNameVal, lastNameVal = '') => {
    if (!user && !profile) return { error: 'Tizimga kirmagansiz' };

    let cleanFirst = '', cleanLast = '';
    if (typeof firstNameVal === 'object' && firstNameVal !== null) {
      cleanFirst = (firstNameVal.firstName || firstNameVal.first_name || '').trim();
      cleanLast  = (firstNameVal.lastName  || firstNameVal.last_name  || '').trim();
    } else if (typeof firstNameVal === 'string' && lastNameVal) {
      cleanFirst = firstNameVal.trim();
      cleanLast  = lastNameVal.trim();
    } else if (typeof firstNameVal === 'string') {
      const parts = firstNameVal.trim().split(' ');
      cleanFirst = parts[0] || '';
      cleanLast  = parts.slice(1).join(' ') || '';
    }

    const fullName = [cleanFirst, cleanLast].filter(Boolean).join(' ').trim();
    if (!fullName) return { error: 'Ism bo\'sh bo\'lishi mumkin emas' };

    const targetId = profile?.id || user?.id;
    let cleanPhone = profile?.phone || user?.phone || '';
    if (!cleanPhone && user?.email) {
      const d = user.email.split('@')[0].split('_')[0].replace(/\D/g, '');
      if (d) cleanPhone = '+' + d;
    }

    const payload = {
      name:       fullName,
      first_name: cleanFirst || null,
      last_name:  cleanLast  || null,
    };

    // UI ni darhol yangilash
    setProfile(prev => ({ ...(prev || {}), name: fullName, first_name: cleanFirst, last_name: cleanLast }));

    // Supabase ga saqlash (profiles)
    const ok = await patchProfile('id', targetId, payload);
    if (!ok && cleanPhone) {
      const d = getDigits(cleanPhone);
      await patchProfile('phone', '+' + d, payload);
      await patchProfile('phone', d, payload);
    }

    // telegram_users ga saqlash
    if (cleanPhone) {
      try {
        await supabase
          .from('telegram_users')
          .update({ full_name: fullName })
          .eq('phone', cleanPhone);
      } catch {}
    }

    return { success: true };
  };

  // ── Chiqish ────────────────────────────────────────────────────────────
  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
  };

  // ── Balansni yangilash ─────────────────────────────────────────────────
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
