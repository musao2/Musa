import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const READ_NOTIFS_KEY = 'keshbak_read_notification_ids';

const getReadNotificationIds = () => {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

const saveReadNotificationIds = (readSet) => {
  try {
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(readSet)));
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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestToast, setLatestToast] = useState(null);

  // Unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Supabase 'transactions' jadvalidan bildirishnomalar ro'yxatini yuklash
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const { data: txData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setNotifications([]);
        return;
      }

      const readSet = getReadNotificationIds();

      const items = (txData || []).map((tx) => {
        const isKirim = Number(tx.cashback_amount ?? tx.amount ?? 0) >= 0;
        const amtVal = Math.abs(Number(tx.cashback_amount || tx.amount || 0));
        
        // SMS/Izoh textini qr_data, comment yoki description dan olish
        let msgText = tx.qr_data || tx.comment || tx.description || '';
        if (msgText.startsWith('{"') || msgText.startsWith('http')) {
          msgText = isKirim ? "Hisobingizga keshbek o'tkazildi" : "Keshbek ishlatildi";
        }
        if (!msgText) {
          msgText = isKirim ? "Hisobingizga keshbek o'tkazildi" : "Keshbek ishlatildi";
        }

        return {
          id: tx.id,
          user_id: tx.user_id,
          title: isKirim ? "Kartangizga pul tushdi! 💳" : "Keshbek yechib olindi 💳",
          message: msgText,
          amount: amtVal,
          is_read: readSet.has(tx.id),
          created_at: tx.created_at
        };
      });

      setNotifications(items);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Bitta bildirishnomani o'qilgan deb belgilash
  const markAsRead = async (notificationId) => {
    if (!notificationId) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );

    const readSet = getReadNotificationIds();
    readSet.add(notificationId);
    saveReadNotificationIds(readSet);
  };

  // Barcha bildirishnomalarni o'qilgan deb belgilash
  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;

    const readSet = getReadNotificationIds();
    notifications.forEach((n) => readSet.add(n.id));
    saveReadNotificationIds(readSet);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Real-time obuna (transactions jadvaliga - Admin pul va SMS yuborganda)
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    let channel = null;
    try {
      const channelName = `realtime_user_tx_${user.id}_${Date.now()}`;
      channel = supabase.channel(channelName);
      
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
          playNotificationSound();
          triggerVibration();

          const isKirim = Number(tx.cashback_amount ?? tx.amount ?? 0) >= 0;
          const amtVal = Math.abs(Number(tx.cashback_amount || tx.amount || 0));

          let msgText = tx.qr_data || tx.comment || tx.description || '';
          if (msgText.startsWith('{"') || msgText.startsWith('http')) {
            msgText = isKirim ? "Hisobingizga pul o'tkazildi" : "Keshbek ishlatildi";
          }
          if (!msgText) {
            msgText = isKirim ? "Hisobingizga pul o'tkazildi" : "Keshbek ishlatildi";
          }

          const newNotif = {
            id: tx.id,
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

      channel.subscribe();
    } catch (e) {}

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [user?.id, fetchNotifications]);

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
