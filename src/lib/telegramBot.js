import { supabase } from './supabase';

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Tasodifiy 4 xonali OTP kod generatsiya qilish
const generateOTP = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

/**
 * Telegramga OTP kod yuborish
 * 1. Tasodifiy 4 xonali kod hosil qiladi
 * 2. Supabase "otp_codes" jadvaliga yozadi (5 daqiqa muddatli)
 * 3. Telegram bot orqali foydalanuvchiga kod yuboradi
 * 
 * @param {string} phone - Telefon raqami (+998XXXXXXXXX formatda)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendOTPViaTelegram = async (phone) => {
  try {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 daqiqa

    // 1. Avvalgi eski kodni o'chirish (agar bo'lsa)
    await supabase
      .from('otp_codes')
      .delete()
      .eq('phone', phone);

    // 2. Yangi kodni Supabase ga yozish
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        phone: phone,
        code: code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('OTP saqlashda xatolik:', insertError);
      return { error: 'Kod saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.' };
    }

    // 3. Telegram chat_id ni topish (foydalanuvchi botga /start yuborgan bo'lishi kerak)
    //    telegram_users jadvalidan chat_id ni olamiz
    const { data: tgUser, error: tgError } = await supabase
      .from('telegram_users')
      .select('chat_id')
      .eq('phone', phone)
      .maybeSingle();

    if (tgError) {
      console.error('Telegram foydalanuvchi qidirishda xatolik:', tgError);
      return { error: 'Telegram foydalanuvchini topishda xatolik.' };
    }

    if (!tgUser) {
      // Foydalanuvchi hali botga raqam yubormagan
      return { 
        error: `Bu raqam Telegram botda ro'yxatdan o'tmagan. Telegram botga (t.me/) kirib, telefon raqamingizni yuboring.` 
      };
    }

    // 4. Telegram Bot API orqali xabar yuborish
    const message = `🔐 KeshBak tasdiqlash kodi:\n\n` +
                    `📱 Raqam: ${phone}\n` +
                    `🔑 Kod: *${code}*\n\n` +
                    `⏰ Kod 5 daqiqa davomida amal qiladi.\n` +
                    `❗ Bu kodni hech kimga bermang!`;

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tgUser.chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram xabar yuborishda xatolik:', result);
      return { error: 'Telegram orqali xabar yuborishda xatolik. Qayta urinib ko\'ring.' };
    }

    return { success: true };

  } catch (err) {
    console.error('sendOTPViaTelegram xatolik:', err);
    return { error: 'Kutilmagan xatolik yuz berdi. Internet ulanishini tekshiring.' };
  }
};
