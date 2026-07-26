import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profil ma'lumotlarini yuklash
  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) setProfile(data);
  };

  useEffect(() => {
    // Joriy sessiyani tekshirish
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      setLoading(false);
    });

    // Auth o'zgarishlarini tinglash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await loadProfile(u.id);
        else    setProfile(null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Login
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // Ro'yxatdan o'tish
  const signUp = async (email, password, name, phone) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    // Profil yaratish
    if (data.user) {
      const cardNumber = 'KB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
      await supabase.from('profiles').insert({
        id:               data.user.id,
        name,
        phone,
        card_number:      cardNumber,
        cashback_balance: 0,
        level:            'Standart',
      });
    }
    return { data, error: null };
  };

  // Chiqish
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Balansni yangilash (tranzaksiyadan keyin)
  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
