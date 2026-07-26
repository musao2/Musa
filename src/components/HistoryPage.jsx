import React from 'react';
import { BsFuelPump } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useTransactions';

const formatSum = (n) => Number(n || 0).toLocaleString('uz-UZ') + ' so\'m';

const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Bugun, ${time}`;
  if (diffDays === 1) return `Kecha, ${time}`;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }) + `, ${time}`;
};

const HistoryPage = () => {
  const { user } = useAuth();
  const { transactions, loading } = useTransactions(user?.id);

  const totalCashback = transactions.reduce((s, t) => s + Number(t.cashback_amount), 0);
  const totalSpent    = transactions.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="flex-1 bg-gray-50 w-full font-sans">

      {/* Umumiy natija */}
      <div className="mx-4 mt-5 mb-4 bg-[#0f7b4c] rounded-2xl p-5 text-white">
        <p className="text-white/70 text-[12px] font-medium mb-1">Jami keshbek</p>
        <h2 className="text-[32px] font-extrabold leading-none mb-4">
          {formatSum(totalCashback)}
        </h2>
        <div className="flex justify-between">
          <div>
            <p className="text-white/60 text-[11px]">Sarflangan</p>
            <p className="font-bold text-[15px]">{formatSum(totalSpent)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[11px]">To'lovlar soni</p>
            <p className="font-bold text-[15px]">{transactions.length} ta</p>
          </div>
        </div>
      </div>

      {/* Shaxobcha nomi */}
      <div className="flex items-center gap-2 px-5 mb-3">
        <BsFuelPump size={14} className="text-[#0f7b4c]" />
        <p className="text-[13px] text-gray-500 font-medium">Lukoil — Yunusobod shaxobchasi</p>
      </div>

      {/* Yuklash */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#0f7b4c] rounded-full animate-spin" />
        </div>
      )}

      {/* Bo'sh holat */}
      {!loading && transactions.length === 0 && (
        <div className="mx-4 bg-white rounded-2xl p-8 text-center text-gray-400 text-[14px]">
          Hali to'lovlar yo'q. <br />QR skanerlang!
        </div>
      )}

      {/* To'lovlar ro'yxati */}
      {!loading && (
        <div className="flex flex-col gap-3 px-4 pb-6">
          {transactions.map((item, index) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
                  <BsFuelPump size={18} />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#1a1a1a]">
                    To'lov #{transactions.length - index}
                  </p>
                  <p className="text-gray-400 text-[12px]">{formatDate(item.created_at)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[14px] text-[#1a1a1a]">- {formatSum(item.amount)}</p>
                <p className="text-[#0f7b4c] text-[13px] font-semibold">+ {formatSum(item.cashback_amount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
