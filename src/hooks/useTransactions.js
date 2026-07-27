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
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else       setTransactions(data ?? []);

    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();

    // Real-time — yangi tranzaksiya qo'shilsa darhol yangilanadi
    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'transactions',
        filter: `user_id=eq.${userId}`,
      }, () => fetchTransactions())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  // Yangi tranzaksiya qo'shish + balansni yangilash
  const addTransaction = async ({ amount, cashbackPercent = 5, type = 'cashback', tokenId = null, currentBalance = 0 }) => {
    if (!userId) return { error: 'Foydalanuvchi topilmadi' };

    // 1. Agar QR Token ID bo'lsa, ishlatilinganligini va muddati o'tmaganligini tekshiramiz
    if (tokenId) {
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('qr_tokens')
          .select('*')
          .eq('id', tokenId)
          .maybeSingle();

        if (tokenError) {
          return { error: 'QR-kod holatini tekshirishda xatolik: ' + tokenError.message };
        }

        if (!tokenData) {
          return { error: 'QR-kod topilmadi yoki yaroqsiz!' };
        }

        if (tokenData.used) {
          return { error: 'Bu QR-kod allaqachon ishlatilingan! (Faqat 1 marta ishlaydi)' };
        }

        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
          return { error: 'Bu QR-kodning amal qilish muddati tugagan!' };
        }
      } catch (err) {
        console.error("Token tekshirishda xatolik:", err);
      }
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

    // Agar QR Token ID bo'lsa, qr_tokens jadvalida used = true qilamiz
    if (tokenId) {
      try {
        await supabase
          .from('qr_tokens')
          .update({ used: true })
          .eq('id', tokenId);
      } catch (err) {
        console.error("qr_tokens used yangilashda xatolik:", err);
      }
    }

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
