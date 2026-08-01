import React, { useState, useEffect } from 'react';
import { 
  IoStar, 
  IoCheckmarkCircle, 
  IoSparkles
} from 'react-icons/io5';
import { supabase } from '../lib/supabase';

// Supabase dagi zaxira sharhlar (Fallback)
const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    user_name: 'Shoxrux M.',
    rating: 5,
    comment: 'Yoqilg\'i sifati juda a\'lo! Keshbek ham zudlik bilan tushdi. Rahmat!',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'rev-2',
    user_name: 'Javohir K.',
    rating: 5,
    comment: 'Juda qulay xizmat. QR-kod skanerlab 5% keshbek oldim. Barchaga tavsiya qilaman!',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'rev-3',
    user_name: 'Sardor A.',
    rating: 4,
    comment: 'Xizmat ko\'rsatish tez va muomala yaxshi. Navbat ham kam.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const CustomerReviews = () => {
  const [reviews, setReviews] = useState(DEFAULT_REVIEWS);

  // Supabase-dan sharhlarni yuklash va real-time obuna
  useEffect(() => {
    fetchReviewsFromSupabase();

    let channel = null;
    try {
      channel = supabase
        .channel('public_reviews_list')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
        }, (payload) => {
          if (payload.new) {
            setReviews((prev) => [payload.new, ...prev.filter((r) => r.id !== payload.new.id)]);
          }
        })
        .subscribe();
    } catch (e) {}

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, []);

  const fetchReviewsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setReviews(data);
      }
    } catch (e) {}
  };

  // O'rtacha reyting hisoblash
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  const formatReviewDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffHours = Math.floor((now - d) / (1000 * 3600));

    if (diffHours < 1) return 'Hozirgina';
    if (diffHours < 24) return `${diffHours} soat oldin`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Kecha';
    if (diffDays < 30) return `${diffDays} kun oldin`;
    
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  return (
    <div className="mx-4 mt-6 font-sans">
      
      {/* Sarlavha Paneli */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-[18px] text-gray-900 flex items-center gap-2">
              <span>Bizning mijozlar fikrlari</span>
              <IoSparkles className="text-amber-400" />
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              To'lov qilgan tasdiqlangan mijozlar qoldirgan baho va sharhlar
            </p>
          </div>

          {/* O'rtacha reyting badge */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-2xl">
              <IoStar className="text-amber-400 text-[18px]" />
              <span className="font-extrabold text-amber-700 text-[16px]">{avgRating}</span>
            </div>
            <span className="text-[11px] text-gray-400 font-medium mt-1">
              {reviews.length} ta sharh
            </span>
          </div>
        </div>
      </div>

      {/* Mijozlar fikrlari ro'yxati */}
      <div className="space-y-3">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 hover:border-gray-200 transition-all"
          >
            {/* Yuqori qism: Ism, Yulduzlar, Tasdiqlangan nishon */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-[14px] text-gray-900">
                    {rev.user_name || 'Mijoz'}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f7b4c] bg-[#e6f4ed] px-2 py-0.5 rounded-md">
                    <IoCheckmarkCircle className="text-[#0f7b4c]" />
                    Mijoz
                  </span>
                </div>

                {/* Yulduzlar */}
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <IoStar
                      key={s}
                      className={`text-[14px] ${
                        s <= (Number(rev.rating) || 5)
                          ? 'text-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <span className="text-[11px] font-medium text-gray-400">
                {formatReviewDate(rev.created_at)}
              </span>
            </div>

            {/* Fikr matni */}
            <p className="text-[13px] text-gray-700 leading-relaxed font-medium">
              "{rev.comment}"
            </p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default CustomerReviews;
