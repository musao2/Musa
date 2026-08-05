import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ─── LOCAL STORAGE HELPERS ──────────────────────────────────────────────────

const getDigits = (phone) => (phone || '').replace(/\D/g, '');

// Karta raqamini telefon raqamiga biriktirib saqlash
const getStoredCard = (phone) => {
  const d = getDigits(phone);
  if (!d) return null;
  try { return localStorage.getItem(`keshbak_card_${d}`) || null; } catch { return null; }
};

const saveStoredCard = (phone, card) => {
  const d = getDigits(phone);
  if (!d || !card || card === '—') return;
  try { localStorage.setItem(`keshbak_card_${d}`, card); } catch {}
};

// Ism/familiyani telefon raqamiga biriktirib saqlash (FAQAT localStorage)
const getStoredName = (phone) => {
  const d = getDigits(phone);
  if (!d) return { name: null, first: null, last: null };
  try {
    return {
      name:  localStorage.getItem(`keshbak_name_${d}`)  || null,
      first: localStorage.getItem(`keshbak_fname_${d}`) || null,
      last:  localStorage.getItem(`keshbak_lname_${d}`) || null,
    };
  } catch { return { name: null, first: null, last: null }; }
};

const saveStoredName = (phone, name, first, last) => {
  const d = getDigits(phone);
  if (!d) return;
  try {
    if (name && name !== 'Mijoz') localStorage.setItem(`keshbak_name_${d}`, name);
    if (first) localStorage.setItem(`keshbak_fname_${d}`, first);
    if (last)  localStorage.setItem(`keshbak_lname_${d}`, last);
  } catch {}
};

// Profil keshini saqlash va o'qish
const getCachedProfile = (userId, phone) => {
  try {
    const byId    = userId ? localStorage.getItem(`keshbak_profile_${userId}`) : null;
    const byPhone = phone  ? localStorage.getItem(`keshbak_profile_${getDigits(phone)}`) : null;
    const raw = byId || byPhone || localStorage.getItem('keshbak_profile_global');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveCachedProfile = (userId, phone, data) => {
  if (!data) return;
  try {
    const str = JSON.stringify(data);
    if (userId) localStorage.setItem(`keshbak_profile_${userId}`, str);
    if (phone)  localStorage.setItem(`keshbak_profile_${getDigits(phone)}`, str);
    localStorage.setItem('keshbak_profile_global', str);
  } catch {}
};

// Karta raqamni hal qilish: DB → kesh → localStorage → yangi
const resolveCard = (dbCard, cachedCard, phone) => {
  const c1 = (dbCard     || '').trim();
  const c2 = (cachedCard || '').trim();
  const c3 = getStoredCard(phone) || '';
  const existing = c1 || c2 || c3;
  if (existing && existing !== '—') {
    saveStoredCard(phone, existing);
    return existing;
  }
  const newCard = `KB-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  saveStoredCard(phone, newCard);
  return newCard;
};

// Supabase dan profilni so'rash – * select, xatolar yutib yuboriladi
const fetchProfileFromDB = async (field, value) => {
  if (!value) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq(field, value)
      .maybeSingle();
    if (error) return null;   // jadval yoki ustun yo'q bo'lsa – jim yutib yuborish
    return data || null;
  } catch { return null; }
};

// Supabase ga faqat xavfsiz ustunlar bilan yozish (xatolar yutib yuboriladi)
const safePatch = async (filter, value, payload) => {
  try {
    await supabase.from('profiles').update(payload).eq(filter, value);
  } catch {}
};

const safeUpsert = async (payload) => {
  try {
    await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  } catch {}
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

    const cached = getCachedProfile(userId, cleanPhone);
    const stored = getStoredName(cleanPhone);

    // DB dan profil yuklash (xatolar yutib yuboriladi)
    let data = await fetchProfileFromDB('id', userId);

    // ID bo'yicha topilmasa – telefon bo'yicha
    if (!data && cleanPhone) {
      const d = getDigits(cleanPhone);
      data = await fetchProfileFromDB('phone', '+' + d)
          || await fetchProfileFromDB('phone', d);
    }

    const validName = (v) => v && v !== 'Mijoz' && v.trim() ? v.trim() : null;
    const finalName  = validName(data?.name)
                    || validName(cached?.name)
                    || validName(stored.name)
                    || 'Mijoz';

    const parts      = finalName !== 'Mijoz' ? finalName.split(' ') : [];
    const finalFirst = cached?.first_name || stored.first || parts[0] || '';
    const finalLast  = cached?.last_name  || stored.last  || parts.slice(1).join(' ') || '';

    const cardNumber = resolveCard(data?.card_number, cached?.card_number, cleanPhone || data?.phone);

    const mergedProfile = {
      id:               userId,
      name:             finalName,
      first_name:       finalFirst,
      last_name:        finalLast,
      phone:            data?.phone || cleanPhone || cached?.phone || '',
      card_number:      cardNumber,
      cashback_balance: data?.cashback_balance ?? cached?.cashback_balance ?? 0,
      level:            data?.level || cached?.level || 'Standart',
    };

    // localStorage ga darhol saqlash
    saveCachedProfile(userId, cleanPhone, mergedProfile);
    if (cleanPhone) saveStoredName(cleanPhone, finalName, finalFirst, finalLast);

    // DB ni kerak bo'lsa tuzatish (xatolar yutiladi)
    if (data) {
      if (!data.card_number && cardNumber) {
        safePatch('id', userId, { card_number: cardNumber });
      }
      if (!validName(data.name) && validName(finalName)) {
        safePatch('id', userId, { name: finalName });
      }
    } else {
      // Profil DB da yo'q bo'lsa – xavfsiz yaratish
      safeUpsert({
        id:               userId,
        name:             finalName !== 'Mijoz' ? finalName : 'Mijoz',
        phone:            cleanPhone || '',
        card_number:      cardNumber,
        cashback_balance: 0,
        level:            'Standart',
      });
    }

    setProfile(mergedProfile);
  };

  // ── Auth o'zgarishlarini tinglash ──────────────────────────────────────
  useEffect(() => {
    let profileChannel = null;
    let subscribedId = null;

    const setupSub = (userId) => {
      if (!userId || subscribedId === userId) return;
      if (profileChannel) { try { supabase.removeChannel(profileChannel); } catch {} }
      subscribedId = userId;

      const ch = supabase.channel(`profile_${userId}`);
      ch.on('postgres_changes', {
        event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
      }, (payload) => {
        if (payload.new) {
          setProfile(prev => {
            const updated = { ...(prev || {}), ...payload.new };
            if (!updated.card_number && prev?.card_number) updated.card_number = prev.card_number;
            if ((!updated.name || updated.name === 'Mijoz') && prev?.name && prev.name !== 'Mijoz') {
              updated.name = prev.name;
            }
            saveCachedProfile(userId, updated.phone, updated);
            return updated;
          });
        }
      }).subscribe();
      profileChannel = ch;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfile(u.id, u);
        setupSub(u.id);
      } else {
        setProfile(null);
        subscribedId = null;
        if (profileChannel) { try { supabase.removeChannel(profileChannel); } catch {} profileChannel = null; }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (profileChannel) { try { supabase.removeChannel(profileChannel); } catch {} }
    };
  }, []);

  // ── OTP tasdiqlash va tizimga kirish ───────────────────────────────────
  const verifyOTPAndLogin = async (phone, code, nameInput = '', lastNameInput = '') => {
    const cleanPhone = phone.trim();
    const cleanCode  = code.trim();

    // OTP kodni tekshirish
    let otpData = null;
    try {
      const res = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();
      otpData = res.data;
    } catch {}

    if (!otpData) return { error: 'Keshbek uchun kod yuborilmagan yoki topilmadi.' };
    if (new Date(otpData.expires_at) < new Date()) return { error: 'Tasdiqlash kodining vaqti o\'tgan. Qayta kod yuboring.' };
    if (otpData.code !== cleanCode) return { error: 'Kiritilgan tasdiqlash kodi noto\'g\'ri!' };

    try { await supabase.from('otp_codes').delete().eq('phone', cleanPhone); } catch {}

    // Ism va familiyani ajratish
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

    // Supabase Auth orqali kirish yoki ro'yxatdan o'tish
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
    } catch (e) {
      return { error: 'Internet ulanish xatosi. Qayta urinib ko\'ring.' };
    }

    if (!userId) return { error: 'Tizimga kirishda kutilmagan xatolik yuz berdi.' };

    const cached  = getCachedProfile(userId, cleanPhone);
    const stored  = getStoredName(cleanPhone);
    const existingProfile = await fetchProfileFromDB('phone', cleanPhone)
                         || await fetchProfileFromDB('phone', digits);

    const validName = (v) => v && v !== 'Mijoz' && v.trim() ? v.trim() : null;
    const resolvedName  = validName(fullName)
                       || validName(existingProfile?.name)
                       || validName(cached?.name)
                       || validName(stored.name)
                       || 'Mijoz';
    const resolvedFirst = firstName || cached?.first_name || stored.first || '';
    const resolvedLast  = lastName  || cached?.last_name  || stored.last  || '';
    const cardNumber    = resolveCard(existingProfile?.card_number, cached?.card_number, cleanPhone);

    if (resolvedName !== 'Mijoz') saveStoredName(cleanPhone, resolvedName, resolvedFirst, resolvedLast);

    const newProfile = {
      id:               userId,
      name:             resolvedName,
      first_name:       resolvedFirst,
      last_name:        resolvedLast,
      phone:            cleanPhone,
      card_number:      cardNumber,
      cashback_balance: existingProfile?.cashback_balance ?? cached?.cashback_balance ?? 0,
      level:            existingProfile?.level || cached?.level || 'Standart',
    };

    saveCachedProfile(userId, cleanPhone, newProfile);

    // Supabase ga xavfsiz yozish (xatolar yutiladi)
    if (resolvedName !== 'Mijoz') {
      safePatch('id', userId, { name: resolvedName, card_number: cardNumber });
      safePatch('phone', cleanPhone, { name: resolvedName, card_number: cardNumber });
    }

    await loadProfile(userId, { email, phone: cleanPhone });
    return { success: true };
  };

  // ── Profil ismini yangilash ────────────────────────────────────────────
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

    const cached     = getCachedProfile(targetId, cleanPhone);
    const cardNumber = resolveCard(profile?.card_number, cached?.card_number, cleanPhone);

    const updatedProfile = {
      ...(profile || {}),
      id:               targetId,
      name:             fullName,
      first_name:       cleanFirst || '',
      last_name:        cleanLast  || '',
      card_number:      cardNumber,
      phone:            cleanPhone || profile?.phone || '',
      cashback_balance: profile?.cashback_balance ?? 0,
      level:            profile?.level || 'Standart',
    };

    // 1. UI ni darhol yangilash
    setProfile(updatedProfile);

    // 2. localStorage ga saqlash
    saveCachedProfile(targetId, cleanPhone, updatedProfile);
    saveStoredName(cleanPhone, fullName, cleanFirst, cleanLast);

    // 3. Supabase ga xavfsiz yozish (xatolar yutiladi)
    safePatch('id', targetId, { name: fullName, card_number: cardNumber });
    if (cleanPhone) {
      const d = getDigits(cleanPhone);
      safePatch('phone', '+' + d, { name: fullName, card_number: cardNumber });
      safePatch('phone', d,       { name: fullName, card_number: cardNumber });
    }

    return { success: true };
  };

  // ── Chiqish – keshni SAQLAYMIZ, faqat auth sessionni tugatamiz ─────────
  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    // localStorage profil keshi O'CHIRILMAYDI – qayta kirganida ism so'ralmasin
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
