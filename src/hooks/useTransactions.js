import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Tranzaksiyalarni Supabase dan olish
export const useTransactions = (userId) => {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const fetchTransactions = async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('amount.gt.0,cashback_amount.neq.0')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      // Faqat haqiqiy pul amallarini olamiz (0 so'mlik fake SMS yozuvlari o'tmaydi)
      const valid = (data ?? []).filter(
        (t) => Math.abs(Number(t.amount || 0)) > 0 || Math.abs(Number(t.cashback_amount || 0)) > 0
      );
      setTransactions(valid);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();

    // Real-time — yangi pul amali (transactions) qo'shilsa darhol yangilanadi
    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'transactions',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const tx = payload?.new;
        if (tx) {
          const amtVal = Math.abs(Number(tx.cashback_amount || tx.amount || 0));
          if (amtVal === 0) return; // 0 so'mlik fake SMS yozuvlarini tranzaksiya sifatida qabul qilmaymiz
        }
        fetchTransactions();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  // Yangi tranzaksiya qo'shish + balansni yangilash
  const addTransaction = async ({ amount, cashbackPercent = 5, type = 'cashback', tokenId = null, currentBalance = 0 }) => {
    if (!userId) return { error: 'Foydalanuvchi topilmadi' };

    if (!tokenId) {
      return { error: 'Yaroqsiz QR-kod! (Token ID topilmadi)' };
    }

    // 1. QR Token ID ni Supabase'dan tekshiramiz
    const { data: tokenData, error: tokenError } = await supabase
      .from('qr_tokens')
      .select('*')
      .eq('id', tokenId)
      .maybeSingle();

    if (tokenError) {
      return { error: 'QR-kod holatini tekshirishda xatolik: ' + tokenError.message };
    }

    if (!tokenData) {
      return { error: 'Bu QR-kod topilmadi yoki allaqachon ishlatib bo\'lingan!' };
    }

    if (tokenData.used) {
      return { error: 'Bu QR-kod allaqachon ishlatilingan! (Faqat 1 marta ishlaydi)' };
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return { error: 'Bu QR-kodning amal qilish muddati tugagan!' };
    }

    // 2. Tokenni ishlatilgan deb belgilaymiz (used = true) va darhol bazadan o'chiramiz
    const { error: updateErr } = await supabase
      .from('qr_tokens')
      .update({ used: true })
      .eq('id', tokenId);

    const { error: deleteErr } = await supabase
      .from('qr_tokens')
      .delete()
      .eq('id', tokenId);

    if (updateErr || deleteErr) {
      const dbErr = updateErr || deleteErr;
      console.error("qr_tokens o'chirishda Supabase RLS xatoligi:", dbErr);
      return { error: "Supabase bazasida ruxsat xatosi (RLS): " + dbErr.message };
    }

    let cashbackAmount = 0;
    if (type === 'withdraw') {
      if (Number(currentBalance) < Number(amount)) {
        return { error: 'Balansda yetarli keshbek mavjud emas!' };
      }
      cashbackAmount = -Math.abs(amount); // yechilgan keshbek (manfiy)
    } else {
      cashbackAmount = Math.round(amount * cashbackPercent / 100); // yig'ilgan keshbek (musbat)
    }

    // Tranzaksiya yozish
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id:         userId,
        amount,
        cashback_amount: cashbackAmount,
      });

    if (txError) return { error: txError.message };

    // Balansni yangilash (increment)
    const { error: balError } = await supabase.rpc('increment_balance', {
      user_id_input: userId,
      amount_input:  cashbackAmount,
    });

    if (balError) return { error: balError.message };

    await fetchTransactions();
    return { cashbackAmount, error: null };
  };

  return { transactions, loading, error, addTransaction, refetch: fetchTransactions };
};
