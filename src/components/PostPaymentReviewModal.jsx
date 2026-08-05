import React, { useState, useEffect } from 'react';
import { 
  IoStar, 
  IoStarOutline, 
  IoSend, 
  IoClose, 
  IoSparkles, 
  IoCheckmarkCircle,
  IoTimeOutline
} from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 1 hafta (7 kun) millisonaniiyada

const PostPaymentReviewModal = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewedThisWeek, setAlreadyReviewedThisWeek] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(7);

  // Tekshiruv: Foydalanuvchi bu hafta (oxirgi 7 kunda) fikr bildirganmi?
  useEffect(() => {
    if (!isOpen || !user) return;
    checkWeeklyLimit();
  }, [isOpen, user]);

  const checkWeeklyLimit = async () => {
    // 1. LocalStorage orqali tezkor tekshiruv
    const lastReviewTs = localStorage.getItem(`keshbek_last_review_at_${user?.id}`);
    if (lastReviewTs) {
      const elapsed = Date.now() - parseInt(lastReviewTs, 10);
      if (elapsed < SEVEN_DAYS_MS) {
        const daysLeft = Math.ceil((SEVEN_DAYS_MS - elapsed) / (1000 * 3600 * 24));
        setDaysRemaining(daysLeft);
        setAlreadyReviewedThisWeek(true);
        return;
      }
    }

    // 2. Supabase station_reviews jadvalidan oxirgi sharh vaqtini tekshirish
    // Jadval mavjud bo'lmasa xato consola chiqmaydi – jim o'tiladi
    try {
      const { data, error } = await supabase
        .from('station_reviews')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const lastDate = new Date(data[0].created_at).getTime();
        const elapsed = Date.now() - lastDate;
        if (elapsed < SEVEN_DAYS_MS) {
          const daysLeft = Math.ceil((SEVEN_DAYS_MS - elapsed) / (1000 * 3600 * 24));
          setDaysRemaining(daysLeft);
          setAlreadyReviewedThisWeek(true);
          localStorage.setItem(`keshbek_last_review_at_${user.id}`, lastDate.toString());
          return;
        }
      }
    } catch {
      // station_reviews jadvali yo'q – jim o'tiladi
    }

    setAlreadyReviewedThisWeek(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);

    const reviewPayload = {
      id: 'rev-' + Date.now(),
      user_id: user?.id || 'guest',
      user_name: profile?.name || 'Mijoz',
      rating: rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };

    // 1. Supabase station_reviews jadvaliga saqlash
    // Jadval mavjud bo'lmasa xato consola chiqmaydi – jim o'tiladi
    try {
      await supabase
        .from('station_reviews')
        .insert([{
          user_id: user?.id || 'guest',
          user_name: profile?.name || 'Mijoz',
          rating: rating,
          comment: comment.trim(),
          created_at: new Date().toISOString(),
        }]);
    } catch {
      // station_reviews jadvali yo'q – localStorage ga saqlanadi
    }

    // 2. Local storage-ga saqlash va haftalik cheklov taymerini o'rnatish
    try {
      const existingLocal = JSON.parse(localStorage.getItem('keshbek_station_reviews') || '[]');
      localStorage.setItem('keshbek_station_reviews', JSON.stringify([reviewPayload, ...existingLocal]));
      if (user?.id) {
        localStorage.setItem(`keshbek_last_review_at_${user.id}`, Date.now().toString());
      }
    } catch (e) {}

    setSubmitting(false);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setComment('');
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden animate-scale-up border border-gray-100">
        
        {/* Yuqori chiziq */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#0c613c] via-[#0f7b4c] to-[#0bd39a]" />

        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <IoClose size={18} />
        </button>

        {/* AGAR BU HAFTA ALLAQACHON SHARH QOLDIRGAN BO'LSA (1 HAFTADA 1 MARTA CHEKLOV) */}
        {alreadyReviewedThisWeek ? (
          <div className="py-6 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <IoTimeOutline size={32} />
            </div>
            <h3 className="font-extrabold text-[17px] text-gray-900 leading-tight">
              Eslatma: 1 haftada 1 marta sharh
            </h3>
            <p className="text-[13px] text-gray-600 leading-relaxed max-w-[260px]">
              Siz bu hafta allaqachon xizmatimizga yulduzli baho va fikr bildirgansiz. ⭐️
            </p>
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2 text-[12px] font-bold text-amber-800">
              Keyingi sharh {daysRemaining} kundan so'ng ochiq bo'ladi
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-[13px] transition-colors"
            >
              Tushunarli
            </button>
          </div>
        ) : submitted ? (
          /* MUVAFFAQIYATLI SAQLANDI */
          <div className="py-8 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-[#e6f4ed] text-[#0f7b4c] rounded-full flex items-center justify-center animate-bounce">
              <IoCheckmarkCircle size={40} />
            </div>
            <h3 className="font-extrabold text-[18px] text-gray-900">Katta rahmat!</h3>
            <p className="text-[13px] text-gray-500 max-w-[240px]">
              Fikringiz va bahoingiz saqlandi hamda mijozlar sharhlariga qo'shildi.
            </p>
          </div>
        ) : (
          /* FORMA (1-5 Yulduzli baho + Sharh) */
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            
            {/* Sarlavha */}
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-inner">
                <IoSparkles size={24} />
              </div>
              <h3 className="font-extrabold text-[18px] text-gray-900 leading-tight">
                To'lov muvaffaqiyatli! 🎉
              </h3>
              <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                Xaridingiz uchun rahmat! Xizmatimizga yulduzli baho va fikr bering:
              </p>
            </div>

            {/* Yulduzchalar bilan baholash (1-5 Star Rating) */}
            <div className="flex items-center gap-2 justify-center py-2 bg-amber-50/60 rounded-2xl border border-amber-100">
              {[1, 2, 3, 4, 5].map((starIndex) => {
                const isFilled = starIndex <= (hoverRating || rating);
                return (
                  <button
                    key={starIndex}
                    type="button"
                    onClick={() => setRating(starIndex)}
                    onMouseEnter={() => setHoverRating(starIndex)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    {isFilled ? (
                      <IoStar className="text-amber-400 text-[32px] drop-shadow-xs" />
                    ) : (
                      <IoStarOutline className="text-gray-300 text-[32px]" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-center text-[12px] font-bold text-amber-700">
              {rating === 5 && "⭐ A'lo xizmat! (5/5)"}
              {rating === 4 && "⭐ Yaxshi (4/5)"}
              {rating === 3 && "⭐ Qoniqarli (3/5)"}
              {rating === 2 && "⭐ Yomon emas (2/5)"}
              {rating === 1 && "⭐ Yomon (1/5)"}
            </p>

            {/* Comment Textarea */}
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Xizmat ko'rsatish va yoqilg'i sifati haqida fikringizni yozing..."
              required
              autoFocus
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] outline-none focus:border-[#0f7b4c] text-gray-800 resize-none font-medium"
            />

            {/* Yuborish tugmasi */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#0f7b4c] text-white font-extrabold rounded-2xl text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#0f7b4c]/20 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <span>Saqlanmoqda...</span>
              ) : (
                <>
                  <IoSend size={16} />
                  <span>Baho va Sharhni Yuborish</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default PostPaymentReviewModal;
