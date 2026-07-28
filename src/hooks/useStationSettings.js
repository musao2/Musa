import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_STATION = {
  name: 'Lukoil — Yunusobod',
  address: 'Yunusobod tumani, 14-mavze, 7-uy',
  phone: '+998 71 234 56 78',
  work_hours: 'Har kuni: 07:00 – 23:00',
  cashback_percent: 5.0,
  rating: 4.8,
  fuel_types: ['AI-80', 'AI-91', 'AI-95', 'Dizel'],
  is_open: true,
  lat: 41.3653226,
  lng: 69.2870051,
};

export const useStationSettings = () => {
  const [station, setStation] = useState(DEFAULT_STATION);
  const [loading, setLoading] = useState(true);

  const fetchStationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('station_settings')
        .select('*')
        .eq('id', 'main')
        .maybeSingle();

      if (!error && data) {
        setStation({
          ...DEFAULT_STATION,
          ...data,
          lat: data.lat || DEFAULT_STATION.lat,
          lng: data.lng || DEFAULT_STATION.lng,
          cashback_percent: data.cashback_percent ? parseFloat(data.cashback_percent) : DEFAULT_STATION.cashback_percent,
        });
      }
    } catch (err) {
      console.error('Station settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStationSettings();

    // Realtime — Super Admin o'zgartirganda darhol barcha sahifalarda yangilanadi
    const channel = supabase
      .channel('station_settings_global_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'station_settings',
        },
        () => fetchStationSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { station, loading, refetch: fetchStationSettings };
};
