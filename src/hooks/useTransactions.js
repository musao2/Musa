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
  const addTransaction = async ({ amount, cashbackPercent = 5, type = 'cashback' }) => {
    if (!userId) return { error: 'Foydalanuvchi topilmadi' };

    let cashbackAmount = 0;
    if (type === 'withdraw') {
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
