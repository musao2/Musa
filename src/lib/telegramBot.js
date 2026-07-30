import { supabase } from './supabase';

// Tasodifiy 4 xonali OTP kod
const generateOTP = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

/**
 * OTP kodni Supabase'ga yozadi.
 * Bot (telegram-bot.js) uni avtomatik o'qib, Telegramga yuboradi.
 * 
 * CORS xatolik bo'lmasligi uchun brauzerdan Telegram API chaqirilmaydi.
 */
export const sendOTPViaTelegram = async (phone) => {
  try {
    // 1. Telegram foydalanuvchi ro'yxatdan o'tganini tekshirish
    const { data: tgUser, error: tgError } = await supabase
      .from('telegram_users')
      .select('chat_id')
      .eq('phone', phone)
      .maybeSingle();

    if (tgError) {
      return { error: 'Ma\'lumotlar bazasi bilan ulanishda xatolik.' };
    }

    if (!tgUser) {
      return { 
        notRegistered: true,
        error: 'Ushbu raqam Telegram botda ro\'yxatdan o\'tmagan. Kod olish uchun avval Telegram botimizga kirib /start bosing va telefon raqamingizni ulang.' 
      };
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 2. Avvalgi eski kodni o'chirish
    await supabase
      .from('otp_codes')
      .delete()
      .eq('phone', phone);

    // 3. Yangi kodni yozish (status ustuni bor bo'lsa 'pending' yozamiz)
    const insertData = {
      phone,
      code,
      expires_at: expiresAt,
    };

    // status ustuni borligini sinab ko'ramiz
    try {
      insertData.status = 'pending';
      const { error: insertError } = await supabase
        .from('otp_codes')
        .insert(insertData);

      if (insertError) {
        // status ustuni yo'q bo'lsa, usiz qayta yozamiz
        delete insertData.status;
        const { error: retryError } = await supabase
          .from('otp_codes')
          .insert(insertData);

        if (retryError) {
          return { error: 'Kod saqlashda xatolik: ' + retryError.message };
        }
      }
    } catch {
      delete insertData.status;
      await supabase.from('otp_codes').insert(insertData);
    }

    // Bot 1-2 soniyada avtomatik yuboradi — kutishning hojati yo'q
    return { success: true };

  } catch (err) {
    return { error: 'Xatolik: ' + err.message };
  }
};
