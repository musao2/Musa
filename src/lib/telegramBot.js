import { supabase } from './supabase';

// Tasodifiy 4 xonali OTP kod
const generateOTP = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

/**
 * OTP kodni Supabase DB (otp_codes) jadvaliga yozadi.
 * Telegram bot talab etilmaydi.
 */
export const sendOTPViaTelegram = async (phone) => {
  try {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 1. Avvalgi eski kodni o'chirish
    await supabase
      .from('otp_codes')
      .delete()
      .eq('phone', phone);

    // 2. Yangi kodni yozish
    const insertData = {
      phone,
      code,
      expires_at: expiresAt,
    };

    try {
      insertData.status = 'pending';
      const { error: insertError } = await supabase
        .from('otp_codes')
        .insert(insertData);

      if (insertError) {
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

    return { success: true, code };

  } catch (err) {
    return { error: 'Xatolik: ' + err.message };
  }
};

