import React, { useState } from 'react';
import { 
  HiMiniArrowDownLeft, 
  HiMiniArrowUpRight, 
  HiWallet, 
  HiClock, 
  HiTag 
} from 'react-icons/hi2';
import { RiGasStationFill } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useStationSettings } from '../hooks/useStationSettings';

const formatSum = (n) => Number(Math.abs(n) || 0).toLocaleString('uz-UZ') + " so'm";

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());

  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return `Bugun, ${hour}:${minute}`;
  if (isYesterday) return `Kecha, ${hour}:${minute}`;
  return `${day}.${month}.${year} ${hour}:${minute}`;
};

const HistoryPage = () => {
  const { user, profile } = useAuth();
  const { transactions, loading } = useTransactions(user?.id);
  const { station }                = useStationSettings();
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'KIRIM' | 'CHIQIM'

  // Faqat haqiqiy pul tushgan yoki yechilgan tranzaksiyalar (0 so'mlik oddiy xabarlar o'tmaydi)
  const validTransactions = transactions.filter(
    (t) => Math.abs(Number(t.amount || 0)) > 0 || Math.abs(Number(t.cashback_amount || 0)) > 0
  );

  // Kirim va Chiqim amallarini ajratish
  const kirimTransactions = validTransactions.filter(
    (t) => Number(t.cashback_amount) > 0 || (t.type || '').toLowerCase() === 'cashback' || (t.type || '').toUpperCase() === 'EARN'
  );
  
  const chiqimTransactions = validTransactions.filter(
    (t) => Number(t.cashback_amount) < 0 || (t.type || '').toLowerCase() === 'withdraw' || (t.type || '').toUpperCase() === 'WITHDRAW'
  );

  const totalKirim = kirimTransactions.reduce((s, t) => s + Number(t.cashback_amount || 0), 0);
  const totalChiqim = chiqimTransactions.reduce((s, t) => s + Math.abs(Number(t.cashback_amount || 0)), 0);
  const currentCashbackBalance = profile?.cashback_balance ?? Math.max(0, totalKirim - totalChiqim);

  // Saralanayotgan ro'yxat
  const filteredList = validTransactions.filter((t) => {
    const isChiqim = Number(t.cashback_amount) < 0 || (t.type || '').toLowerCase() === 'withdraw' || (t.type || '').toUpperCase() === 'WITHDRAW';
    if (activeTab === 'KIRIM') return !isChiqim;
    if (activeTab === 'CHIQIM') return isChiqim;
    return true;
  });

  return (
    <div className="flex-1 bg-gray-50/60 w-full font-sans pb-24 min-h-screen">
      
      {/* Umumiy Natija Kartasi */}
      <div className="mx-4 mt-4 mb-4 bg-gradient-to-br from-[#0c613c] via-[#0f7b4c] to-[#14965d] rounded-3xl p-5 text-white shadow-xl shadow-[#0f7b4c]/20 relative overflow-hidden">
        {/* Orqa fondagi vizual elementlar */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute right-12 -top-8 w-24 h-24 bg-emerald-400/20 rounded-full blur-lg pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
              Sof Keshbek Balansi
            </span>
            <span className="text-white/70 text-xs font-medium">
              {transactions.length} ta operatsiya
            </span>
          </div>

          <h2 className="text-3xl font-black leading-none my-3 tracking-tight">
            {formatSum(currentCashbackBalance)}
          </h2>

          {/* Kirim va Chiqim statistikasi */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-medium mb-1">
                <HiMiniArrowDownLeft className="text-emerald-300 font-bold" size={16} />
                Jami Kirim
              </div>
              <p className="font-extrabold text-base text-white">+ {formatSum(totalKirim)}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-rose-200 text-xs font-medium mb-1">
                <HiMiniArrowUpRight className="text-rose-300 font-bold" size={16} />
                Jami Chiqim
              </div>
              <p className="font-extrabold text-base text-white">- {formatSum(totalChiqim)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtr Tablari */}
      <div className="px-4 mb-4">
        <div className="bg-gray-200/70 p-1 rounded-2xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'ALL'
                ? 'bg-white text-gray-900 shadow-sm scale-[1.01]'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Barchasi ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('KIRIM')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'KIRIM'
                ? 'bg-[#0f7b4c] text-white shadow-sm scale-[1.01]'
                : 'text-gray-600 hover:text-[#0f7b4c]'
            }`}
          >
            <HiMiniArrowDownLeft size={15} />
            Kirim ({kirimTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('CHIQIM')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'CHIQIM'
                ? 'bg-rose-600 text-white shadow-sm scale-[1.01]'
                : 'text-gray-600 hover:text-rose-600'
            }`}
          >
            <HiMiniArrowUpRight size={15} />
            Chiqim ({chiqimTransactions.length})
          </button>
        </div>
      </div>

      {/* Shaxobcha ma'lumoti */}
      <div className="flex items-center justify-between px-5 mb-3">
        <div className="flex items-center gap-2">
          <RiGasStationFill size={16} className="text-[#0f7b4c]" />
          <p className="text-xs text-gray-500 font-semibold">{station.name}</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
          <HiClock size={13} />
          Tarix
        </div>
      </div>

      {/* Yuklanmoqda */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <div className="w-9 h-9 border-3 border-emerald-100 border-t-[#0f7b4c] rounded-full animate-spin" />
        </div>
      )}

      {/* Bo'sh holat */}
      {!loading && filteredList.length === 0 && (
        <div className="mx-4 bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm my-4">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400">
            <HiWallet size={28} />
          </div>
          <h4 className="font-bold text-gray-800 text-base mb-1">
            {activeTab === 'KIRIM'
              ? "Kirim keshbeklar yo'q"
              : activeTab === 'CHIQIM'
              ? "Chiqim amallari yo'q"
              : "Hali to'lovlar tarixi yo'q"}
          </h4>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            Zapravkada QR-kodni skanerlang va keshbekingizni yig'ing yoki ishlating!
          </p>
        </div>
      )}

      {/* Operatsiyalar ro'yxati */}
      {!loading && filteredList.length > 0 && (
        <div className="flex flex-col gap-2.5 px-4">
          {filteredList.map((item, index) => {
            const isChiqim =
              Number(item.cashback_amount) < 0 ||
              (item.type || '').toLowerCase() === 'withdraw' ||
              (item.type || '').toUpperCase() === 'WITHDRAW';

            const cashbackVal = Math.abs(Number(item.cashback_amount || 0));

            return (
              <div
                key={item.id || index}
                className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Chap taraf: Ikonka va ma'lumotlar */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isChiqim
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : 'bg-emerald-50 text-[#0f7b4c] border border-emerald-100'
                    }`}
                  >
                    {isChiqim ? <HiMiniArrowUpRight size={20} /> : <HiMiniArrowDownLeft size={20} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-900">
                        {isChiqim ? "Keshbek ishlatildi" : "Keshbek yig'ildi"}
                      </p>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isChiqim
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-[#0f7b4c]'
                        }`}
                      >
                        {isChiqim ? 'Chiqim' : 'Kirim'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-400 text-xs font-medium">
                        {formatDate(item.created_at)}
                      </p>
                      {item.fuel_type && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <HiTag size={11} />
                          {item.fuel_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* O'ng taraf: Summalar */}
                <div className="text-right">
                  <p
                    className={`font-black text-sm ${
                      isChiqim ? 'text-rose-600' : 'text-[#0f7b4c]'
                    }`}
                  >
                    {isChiqim ? `- ${formatSum(cashbackVal)}` : `+ ${formatSum(cashbackVal)}`}
                  </p>
                  
                  {!isChiqim && Number(item.amount) > 0 && (
                    <p className="text-gray-400 text-[11px] font-medium mt-0.5">
                      To'lov: {formatSum(item.amount)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
