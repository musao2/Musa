import { createClient } from '@supabase/supabase-js';

// Supabase sozlamalari
const SUPABASE_URL = 'https://ycffsnlrxalxcpfsrdjq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZmZzbmxyeGFseGNwZnNyZGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjUxMDMsImV4cCI6MjEwMDY0MTEwM30.hI1bZSn1RJCalO1nQtJKAMYljflo1_3JtEdh3Q9-GUA';

const BOT_TOKEN = '8555069737:AAHJpPA93rB-fkLdolekcc8kSmGruPm-9dw';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let offset = 0;

// Allaqachon yuborilgan kodlarni eslab qolish (takroriy yuborishni oldini olish)
const sentCodes = new Set();

// ========== Telegram API ==========
async function botRequest(method, data = {}) {
  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error(`❌ Telegram API [${method}]:`, json.description);
    }
    return json;
  } catch (err) {
    console.error(`❌ Fetch xatolik [${method}]:`, err.message);
    return { ok: false };
  }
}

// ========== Telegram xabarlarni qayta ishlash ==========
async function handleUpdate(update) {
  if (!update.message) return;
  const message = update.message;
  const chatId = message.chat.id;

  console.log(`📩 Xabar: chatId=${chatId}, text="${message.text || ''}", contact=${!!message.contact}`);

  // 1. Kontakt ulashilganda
  if (message.contact) {
    let phone = message.contact.phone_number;
    if (!phone.startsWith('+')) phone = '+' + phone;

    console.log(`📞 Kontakt: ${phone}`);

    const { error } = await supabase
      .from('telegram_users')
      .upsert({ phone, chat_id: chatId.toString() });

    if (error) {
      console.error('❌ DB xatosi:', error.message);
      await botRequest('sendMessage', {
        chat_id: chatId,
        text: '❌ Xatolik: ' + error.message
      });
    } else {
      console.log(`✅ Ulandi: ${phone} -> ${chatId}`);
      await botRequest('sendMessage', {
        chat_id: chatId,
        text: `✅ Telefon raqamingiz muvaffaqiyatli ulandi: *${phone}*\n\nEndi quyidagi tugma orqali KeshBak ilovasiga kirishingiz mumkin:`,
        parse_mode: 'Markdown',
        reply_markup: {
          remove_keyboard: true
        }
      });
      // Ilovani ochish tugmasini yuborish
      await botRequest('sendMessage', {
        chat_id: chatId,
        text: '👇 Ilovaga kirish:',
        reply_markup: {
          inline_keyboard: [[{
            text: '🌐 KeshBak ilovasini ochish',
            web_app: { url: 'https://musa-ashy-six.vercel.app/' }
          }]]
        }
      });
    }
    return;
  }

  // 2. /start buyrug'i
  if (message.text && message.text.startsWith('/start')) {
    console.log('🚀 /start qabul qilindi');

    // Avval telefon raqam ulangan yoki yo'qligini tekshirish
    const { data: existingUser } = await supabase
      .from('telegram_users')
      .select('phone')
      .eq('chat_id', chatId.toString())
      .maybeSingle();

    if (existingUser) {
      // Allaqachon ulangan — faqat ilovani ochish tugmasini ko'rsatish
      await botRequest('sendMessage', {
        chat_id: chatId,
        text: `👋 Xush kelibsiz! Sizning raqamingiz: *${existingUser.phone}*\n\nQuyidagi tugma orqali ilovaga kiring:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{
            text: '🌐 KeshBak ilovasini ochish',
            web_app: { url: 'https://musa-ashy-six.vercel.app/' }
          }]]
        }
      });
    } else {
      // Hali ulanmagan — telefon ulash tugmasini ko'rsatish
      await botRequest('sendMessage', {
        chat_id: chatId,
        text: '👋 *KeshBak* tasdiqlash botiga xush kelibsiz!\n\nIlovaga kirish uchun avval telefon raqamingizni ulang:',
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{
            text: '📞 Telefon raqamni ulash',
            request_contact: true
          }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }
  }
}

// ========== Telegram Long Polling ==========
async function pollUpdates() {
  try {
    const res = await botRequest('getUpdates', { offset, timeout: 10 });
    if (res.ok && res.result && res.result.length > 0) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    }
  } catch (err) {
    console.error('❌ Polling xatosi:', err.message);
  }
  setTimeout(pollUpdates, 500);
}

// ========== OTP Kodlarni Telegramga yuborish ==========
async function checkPendingOTPs() {
  try {
    // otp_codes jadvalidagi barcha kodlarni olish
    const { data: codes, error } = await supabase
      .from('otp_codes')
      .select('*');

    if (error || !codes || codes.length === 0) {
      setTimeout(checkPendingOTPs, 1500);
      return;
    }

    for (const otp of codes) {
      // Muddati o'tgan kodlarni o'tkazib yuborish
      if (new Date(otp.expires_at) < new Date()) continue;

      // Allaqachon yuborilgan kodlarni o'tkazib yuborish
      const key = `${otp.phone}:${otp.code}`;
      if (sentCodes.has(key)) continue;

      // Chat ID ni topish
      const { data: tgUser } = await supabase
        .from('telegram_users')
        .select('chat_id')
        .eq('phone', otp.phone)
        .maybeSingle();

      if (!tgUser) continue;

      // Telegram orqali kod yuborish
      const message = `🔐 KeshBak tasdiqlash kodi:\n\n📱 Raqam: ${otp.phone}\n🔑 Kod: *${otp.code}*\n\n⏰ Kod 5 daqiqa amal qiladi.\n❗ Bu kodni hech kimga bermang!`;

      const result = await botRequest('sendMessage', {
        chat_id: tgUser.chat_id,
        text: message,
        parse_mode: 'Markdown',
      });

      if (result.ok) {
        console.log(`📤 OTP yuborildi: ${otp.phone} -> kod: ${otp.code}`);
        sentCodes.add(key);

        // Agar status ustuni bo'lsa, uni yangilaymiz (xato bo'lsa e'tiborsiz)
        try {
          await supabase
            .from('otp_codes')
            .update({ status: 'sent' })
            .eq('phone', otp.phone);
        } catch {
          // status ustuni yo'q bo'lishi mumkin — OK
        }
      }
    }
  } catch (err) {
    // Xatolik bo'lsa ham to'xtamasin
  }
  setTimeout(checkPendingOTPs, 1500);
}

// ========== Ishga tushirish ==========
async function start() {
  console.log('🤖 KeshBak Bot ishga tushmoqda...');
  
  const me = await botRequest('getMe');
  if (me.ok) {
    console.log(`✅ Bot: @${me.result.username} (${me.result.first_name})`);
  } else {
    console.error('❌ BOT TOKEN NOTO\'G\'RI!');
    return;
  }

  // Eski xabarlarni tozalash
  const old = await botRequest('getUpdates', { offset: -1 });
  if (old.ok && old.result && old.result.length > 0) {
    offset = old.result[old.result.length - 1].update_id + 1;
  }

  console.log('📡 Telegram xabarlarni kutish...');
  console.log('🔄 OTP kodlarni kuzatish...');

  pollUpdates();
  checkPendingOTPs();
}

start();
