import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useNotifications – foydalanuvchi bildirishnomalarini boshqarish
 * Jadval: xabarlar (yangi, hech qanday constraint yo'q)
 * Ustunlar: id, chat_id (TEXT), title, message, amount, category, is_read, created_at
 */
export function useNotifications(userPhone) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [chatId, setChatId]               = useState(null);

  // ── Telefon raqami orqali chat_id ni topamiz ──────────────────────────
  useEffect(() => {
    if (!userPhone) return;

    const findChatId = async () => {
      try {
        const digits = userPhone.replace(/\D/g, '');
        const cleanPhone = '+' + digits;

        const { data } = await supabase
          .from('telegram_users')
          .select('chat_id')
          .or(`phone.eq.${cleanPhone},phone.eq.${digits}`)
          .maybeSingle();

        if (data?.chat_id) {
          setChatId(data.chat_id);
        }
      } catch {
        // ignore
      }
    };

    findChatId();
  }, [userPhone]);

  // ── Bildirishnomalarni yuklash ──────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('xabarlar')
        .select('*')
        .eq('chat_id', String(chatId))
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // ── Real-time obuna ────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;

    fetchNotifications();

    const channelName = `xabarlar_${String(chatId).replace(/[^a-zA-Z0-9]/g, '_')}`;
    let channel;
    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event:  'INSERT',
          schema: 'public',
          table:  'xabarlar',
          filter: `chat_id=eq.${chatId}`,
        }, (payload) => {
          if (payload.new) {
            setNotifications((prev) => [payload.new, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        })
        .on('postgres_changes', {
          event:  'UPDATE',
          schema: 'public',
          table:  'xabarlar',
          filter: `chat_id=eq.${chatId}`,
        }, (payload) => {
          if (payload.new) {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? { ...n, ...payload.new } : n))
            );
            setNotifications((prev) => {
              setUnreadCount(prev.filter((n) => !n.is_read).length);
              return prev;
            });
          }
        })
        .subscribe();
    } catch {
      // ignore
    }

    return () => {
      if (channel) { try { supabase.removeChannel(channel); } catch {} }
    };
  }, [chatId, fetchNotifications]);

  // ── Bitta xabarni o'qildi deb belgilash ────────────────────────────────
  const markAsRead = async (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await supabase
        .from('xabarlar')
        .update({ is_read: true })
        .eq('id', notifId);
    } catch {}
  };

  // ── Barcha xabarlarni o'qildi deb belgilash ────────────────────────────
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await supabase
        .from('xabarlar')
        .update({ is_read: true })
        .eq('chat_id', String(chatId))
        .eq('is_read', false);
    } catch {}
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, fetchNotifications };
}
