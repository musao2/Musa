import { supabase } from './supabase';

// Tasodifiy 4 xonali OTP kod generatsiya qilish
const generateOTP = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

/**
 * Telegramga OTP kod yuborish
 * 
 * Frontend faqat Supabase ga kod yozadi (status: 'pending').
 * Bot (telegram-bot.js) esa doimiy ravishda 'pending' kodlarni o'qib,
 * Telegram orqali yuboradi va statusni 'sent' ga o'zgartiradi.
 * 
 * Bu usul CORS xatoligini bartaraf qiladi.
 */
export const sendOTPViaTelegram = async (phone) => {
  try {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 daqiqa

    // 1. Telegram foydalanuvchi ro'yxatdan o'tganini tekshirish
    const { data: tgUser, error: tgError } = await supabase
      .from('telegram_users')
      .select('chat_id')
      .eq('phone', phone)
      .maybeSingle();

    if (tgError) {
      console.error('Telegram foydalanuvchi qidirishda xatolik:', tgError);
      return { error: 'Ma\'lumotlar bazasi bilan ulanishda xatolik.' };
    }

    if (!tgUser) {
      return { 
        error: 'Bu raqam Telegram botda ro\'yxatdan o\'tmagan. Iltimos, Telegram\'da @kechbakbot ga kirib /start bosing va telefon raqamingizni ulang.' 
      };
    }

    // 2. Avvalgi eski kodni o'chirish
    await supabase
      .from('otp_codes')
      .delete()
      .eq('phone', phone);

    // 3. Yangi kodni Supabase ga yozish (status: pending — botga signal)
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        phone:      phone,
        code:       code,
        expires_at: expiresAt,
        status:     'pending',  // Bot buni o'qib Telegramga yuboradi
      });

    if (insertError) {
      console.error('OTP saqlashda xatolik:', insertError);
      return { error: 'Kod saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.' };
    }

    // 4. Bot yuborishini kutish (5 soniya davomida tekshirib turish)
    let sent = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500)); // 0.5 soniya kutish
      
      const { data: check } = await supabase
        .from('otp_codes')
        .select('status')
        .eq('phone', phone)
        .maybeSingle();

      if (check && check.status === 'sent') {
        sent = true;
        break;
      }
    }

    if (!sent) {
      return { error: 'Telegram bot javob bermadi. Bot ishga tushganini tekshiring.' };
    }

    return { success: true };

  } catch (err) {
    console.error('sendOTPViaTelegram xatolik:', err);
    return { error: 'Kutilmagan xatolik: ' + err.message };
  }
};
