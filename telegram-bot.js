import { createClient } from '@supabase/supabase-js';

// Supabase sozlamalari
const SUPABASE_URL = 'https://ycffsnlrxalxcpfsrdjq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZmZzbmxyeGFseGNwZnNyZGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjUxMDMsImV4cCI6MjEwMDY0MTEwM30.hI1bZSn1RJCalO1nQtJKAMYljflo1_3JtEdh3Q9-GUA';

const BOT_TOKEN = '8555069737:AAHJpPA93rB-fkLdolekcc8kSmGruPm-9dw';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let offset = 0;

// Telegram API ga fetch orqali so'rov
async function botRequest(method, data = {}) {
  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error(`❌ Telegram API xatolik [${method}]:`, json.description);
    }
    return json;
  } catch (err) {
    console.error(`❌ Fetch xatolik [${method}]:`, err.message);
    return { ok: false };
  }
}

// Kelgan xabarni qayta ishlash
async function handleUpdate(update) {
  if (!update.message) return;
  const message = update.message;
  const chatId = message.chat.id;

  console.log(`📩 Xabar keldi: chatId=${chatId}, text="${message.text || ''}", contact=${!!message.contact}`);

  // 1. Kontakt ulashilganda
  if (message.contact) {
    let phone = message.contact.phone_number;
    if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }

    console.log(`📞 Kontakt ulashildi: ${phone}`);

    // Telefon raqamini va Chat ID'ni Supabase'ga yozish
    const { error } = await supabase
      .from('telegram_users')
      .upsert({ phone, chat_id: chatId.toString() });

    if (error) {
      console.error('❌ DB yozish xatosi:', error.message);
      await botRequest('sendMessage', {
        chat_id: chatId,
        text: '❌ Xatolik yuz berdi: ' + error.message
      });
    } else {
      console.log(`✅ Muvaffaqiyat: ${phone} -> ChatID: ${chatId}`);
      await botRequest('sendMessage', {
        chat_id: chatId,
        text: `✅ Tabriklaymiz! Telefon raqamingiz muvaffaqiyatli ulandi: *${phone}*\n\nEndi KeshBak ilovasiga ushbu telefon raqam orqali kirishingiz mumkin.`,
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
      });
    }
    return;
  }

  // 2. /start buyrug'i kelganda
  if (message.text && message.text.startsWith('/start')) {
    console.log('🚀 /start buyrug\'i qabul qilindi');
    const result = await botRequest('sendMessage', {
      chat_id: chatId,
      text: '👋 *KeshBak* tasdiqlash botiga xush kelibsiz!\n\nIlovaga kirish uchun quyidagi tugma orqali telefon raqamingizni ulashib tasdiqlang:',
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
    console.log('📤 /start javobi:', result.ok ? 'muvaffaqiyatli' : 'xatolik');
  }
}

// Long polling
async function pollUpdates() {
  try {
    const res = await botRequest('getUpdates', { offset, timeout: 30 });
    if (res.ok && res.result && res.result.length > 0) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } else if (!res.ok) {
      console.error('⚠️ getUpdates javob xato:', res.description || 'noma\'lum');
    }
  } catch (err) {
    console.error('❌ Polling xatosi:', err.message);
  }
  setTimeout(pollUpdates, 1000);
}

// Ishga tushirish — avval bot ma'lumotini tekshirish
async function start() {
  console.log('🤖 Bot ishga tushmoqda...');
  
  // Bot tokenini tekshirish
  const me = await botRequest('getMe');
  if (me.ok) {
    console.log(`✅ Bot topildi: @${me.result.username} (${me.result.first_name})`);
  } else {
    console.error('❌ BOT TOKEN NOTO\'G\'RI! Tekshiring: ' + BOT_TOKEN.substring(0, 10) + '...');
    return;
  }

  // Eski xabarlarni tozalash (bot o'chirilgan vaqtdagi xabarlar)
  console.log('🧹 Eski xabarlarni tozalash...');
  const old = await botRequest('getUpdates', { offset: -1 });
  if (old.ok && old.result && old.result.length > 0) {
    offset = old.result[old.result.length - 1].update_id + 1;
    console.log(`  → ${old.result.length} ta eski xabar o'tkazib yuborildi`);
  }

  console.log('📡 Xabarlarni kutish boshlandi...');
  pollUpdates();
}

start();
