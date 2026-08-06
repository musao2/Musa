import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const READ_NOTIFS_KEY = 'keshbak_read_notification_map';
const OLD_READ_NOTIFS_KEY = 'keshbak_read_notification_ids';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 kun (millisekundda)

const getReadNotificationMap = () => {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    if (!raw) {
      // Eski array formatdan yangi map formatga o'tkazish (migratsiya)
      const oldRaw = localStorage.getItem(OLD_READ_NOTIFS_KEY);
      if (oldRaw) {
        const oldArr = JSON.parse(oldRaw);
        const map = {};
        const now = Date.now();
        if (Array.isArray(oldArr)) {
          oldArr.forEach((id) => {
            map[id] = now;
          });
        }
        localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(map));
        return map;
      }
      return {};
    }
    const map = JSON.parse(raw);
    if (typeof map === 'object' && map !== null && !Array.isArray(map)) {
      return map;
    }
    return {};
  } catch (e) {
    return {};
  }
};

const saveReadNotificationMap = (readMap) => {
  try {
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(readMap));
  } catch (e) {}
};

// Ovoz berish (AudioContext)
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {}
};

// Tebranish (Vibration)
const triggerVibration = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }
};

export const NotificationProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestToast, setLatestToast] = useState(null);

  // Unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Supabase 'notifications' va 'transactions' jadvallaridan bildirishnomalarni yuklash
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch from 'notifications' table (SMS va ommaviy xabarnomalar)
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      // 2. Fetch from 'transactions' table (haqiqiy keshbek tushganda/yechilganda)
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .or('amount.gt.0,cashback_amount.neq.0')
        .order('created_at', { ascending: false });

      // 3. Fetch from 'xabarlar' table (chat_id orqali)
      let xabarlarData = [];
      if (profile?.chat_id) {
        const { data: xbData } = await supabase
          .from('xabarlar')
          .select('*')
          .eq('chat_id', String(profile.chat_id))
          .order('created_at', { ascending: false });
        if (xbData) xabarlarData = xbData;
      }

      const readMap = getReadNotificationMap();
      const now = Date.now();
      const updatedReadMap = { ...readMap };
      let mapChanged = false;

      const items = [];

      // Process notifications table items
      (notifData || []).forEach((n) => {
        const readTimestamp = readMap[n.id];
        const isRead = !!readTimestamp || !!n.is_read;

        if (isRead && readTimestamp) {
          if (now - readTimestamp > THREE_DAYS_MS) return;
        }

        items.push({
          id: n.id,
          user_id: n.user_id,
          title: n.title || "Yangi Xabarnoma 🔔",
          message: n.message || "",
          category: n.category || "AKSIYA",
          amount: 0,
          is_read: isRead,
          read_at: readTimestamp || null,
          created_at: n.created_at
        });
      });

      // Process valid transactions (> 0 amount)
      (txData || []).forEach((tx) => {
        const amtVal = Math.abs(Number(tx.cashback_amount || tx.amount || 0));
        if (amtVal === 0) return; // Ignore 0 amount fake SMS records if any exist in transactions

        const isKirim = Number(tx.cashback_amount ?? tx.amount ?? 0) >= 0;
        let msgText = tx.qr_data || tx.comment || tx.description || '';
        if (msgText.startsWith('{"') || msgText.startsWith('http') || !msgText) {
          msgText = isKirim ? "Hisobingizga keshbek o'tkazildi" : "Keshbek ishlatildi";
        }

        const txNotifId = `tx_${tx.id}`;
        const readTimestamp = readMap[txNotifId];
        const isRead = !!readTimestamp;

        if (isRead && readTimestamp) {
          if (now - readTimestamp > THREE_DAYS_MS) return;
        }

        items.push({
          id: txNotifId,
          user_id: tx.user_id,
          title: isKirim ? "Kartangizga pul tushdi! 💳" : "Keshbek yechib olindi 💳",
          message: msgText,
          amount: amtVal,
          is_read: isRead,
          read_at: readTimestamp || null,
          created_at: tx.created_at
        });
      });

      // Process xabarlar table items
      xabarlarData.forEach((xb) => {
        const xbId = `xb_${xb.id}`;
        const readTimestamp = readMap[xbId];
        const isRead = !!readTimestamp || !!xb.is_read;

        if (isRead && readTimestamp) {
          if (now - readTimestamp > THREE_DAYS_MS) return;
        }

        items.push({
          id: xbId,
          orig_id: xb.id, // xabarlar jadvalidagi original id
          is_xabar: true,
          title: xb.title || "Xabar",
          message: xb.message || "",
          category: xb.category || "GENERAL",
          amount: xb.amount || 0,
          is_read: isRead,
          read_at: readTimestamp || null,
          created_at: xb.created_at
        });
      });

      // Sort combined list descending by created_at
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Eskirgan local storage keylarini tozalash
      Object.keys(updatedReadMap).forEach((id) => {
        if (now - updatedReadMap[id] > THREE_DAYS_MS) {
          delete updatedReadMap[id];
          mapChanged = true;
        }
      });

      if (mapChanged) {
        saveReadNotificationMap(updatedReadMap);
      }

      setNotifications(items);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.chat_id]);

  // Bitta bildirishnomani o'qilgan deb belgilash
  const markAsRead = async (notificationId) => {
    if (!notificationId) return;

    const now = Date.now();

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: now } : n))
    );

    const readMap = getReadNotificationMap();
    readMap[notificationId] = now;
    saveReadNotificationMap(readMap);

    // Agar bu 'xabarlar' jadvalidan bo'lsa, bazada ham is_read = true qilamiz
    const notif = notifications.find(n => n.id === notificationId);
    if (notif?.is_xabar && notif.orig_id) {
      try {
        await supabase.from('xabarlar').update({ is_read: true }).eq('id', notif.orig_id);
      } catch {}
    }
  };

  // Barcha bildirishnomalarni o'qilgan deb belgilash
  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;

    const now = Date.now();
    const readMap = getReadNotificationMap();
    let hasXabarlar = false;

    notifications.forEach((n) => {
      if (!n.is_read) {
        readMap[n.id] = now;
        if (n.is_xabar) hasXabarlar = true;
      }
    });

    saveReadNotificationMap(readMap);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || now }))
    );

    if (hasXabarlar && profile?.chat_id) {
      try {
        await supabase
          .from('xabarlar')
          .update({ is_read: true })
          .eq('chat_id', String(profile.chat_id))
          .eq('is_read', false);
      } catch {}
    }
  };

  // Real-time obuna (notifications va transactions jadvallariga)
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    let channel = null;
    try {
      const channelName = `realtime_user_notif_${user.id}_${Date.now()}`;
      channel = supabase.channel(channelName);
      
      // 1. Realtime notification table insert
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const n = payload.new;
          if (n.user_id && n.user_id !== user.id) return;
          playNotificationSound();
          triggerVibration();

          const newNotif = {
            id: n.id,
            user_id: n.user_id,
            title: n.title || "Yangi Xabarnoma 🔔",
            message: n.message || "",
            category: n.category || "AKSIYA",
            amount: 0,
            is_read: false,
            created_at: n.created_at
          };

          setLatestToast(newNotif);
          setTimeout(() => setLatestToast(null), 5000);
          setNotifications((prev) => [newNotif, ...prev.filter((item) => item.id !== newNotif.id)]);
        }
      );

      // 2. Realtime transaction table insert (> 0 amount)
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const tx = payload.new;
          const amtVal = Math.abs(Number(tx.cashback_amount || tx.amount || 0));
          if (amtVal === 0) return; // Skip zero amount SMS

          playNotificationSound();
          triggerVibration();

          const isKirim = Number(tx.cashback_amount ?? tx.amount ?? 0) >= 0;
          let msgText = tx.qr_data || tx.comment || tx.description || '';
          if (msgText.startsWith('{"') || msgText.startsWith('http') || !msgText) {
            msgText = isKirim ? "Hisobingizga pul o'tkazildi" : "Keshbek ishlatildi";
          }

          const newNotif = {
            id: `tx_${tx.id}`,
            user_id: tx.user_id,
            title: isKirim ? "Kartangizga pul tushdi! 💳" : "Keshbek yechib olindi 💳",
            message: msgText,
            amount: amtVal,
            is_read: false,
            created_at: tx.created_at
          };

          setLatestToast(newNotif);
          setTimeout(() => setLatestToast(null), 5000);

          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
        }
      );

      // 3. Realtime xabarlar table insert
      if (profile?.chat_id) {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'xabarlar',
            filter: `chat_id=eq.${profile.chat_id}`,
          },
          (payload) => {
            const xb = payload.new;
            playNotificationSound();
            triggerVibration();

            const newNotif = {
              id: `xb_${xb.id}`,
              orig_id: xb.id,
              is_xabar: true,
              title: xb.title || "Xabar",
              message: xb.message || "",
              category: xb.category || "GENERAL",
              amount: xb.amount || 0,
              is_read: false,
              created_at: xb.created_at
            };

            setLatestToast(newNotif);
            setTimeout(() => setLatestToast(null), 5000);
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
          }
        );
      }

      channel.subscribe();
    } catch (e) {}

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [user?.id, profile?.chat_id, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        latestToast,
        setLatestToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications MUST be used within a NotificationProvider');
  }
  return context;
};
