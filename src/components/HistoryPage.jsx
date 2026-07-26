import React from 'react';
import { BsFuelPump } from 'react-icons/bs';

// Faqat shu bir shaxobchadagi barcha to'lovlar
const transactions = [
  { id: 1,  date: 'Bugun, 14:20',   amount: '- 240,000 so\'m', cashback: '+ 12,000 so\'m' },
  { id: 2,  date: 'Kecha, 18:45',   amount: '- 150,000 so\'m', cashback: '+ 7,500 so\'m'  },
  { id: 3,  date: '24 Dek, 09:12',  amount: '- 300,000 so\'m', cashback: '+ 15,000 so\'m' },
  { id: 4,  date: '22 Dek, 11:30',  amount: '- 200,000 so\'m', cashback: '+ 10,000 so\'m' },
  { id: 5,  date: '20 Dek, 16:05',  amount: '- 180,000 so\'m', cashback: '+ 9,000 so\'m'  },
  { id: 6,  date: '18 Dek, 08:22',  amount: '- 120,000 so\'m', cashback: '+ 6,000 so\'m'  },
];

const totalCashback = '59,500 so\'m';
const totalSpent    = '1,190,000 so\'m';

const HistoryPage = () => {
  return (
    <div className="flex-1 bg-gray-50 w-full font-sans">

      {/* Umumiy natija */}
      <div className="mx-4 mt-5 mb-4 bg-[#0f7b4c] rounded-2xl p-5 text-white">
        <p className="text-white/70 text-[12px] font-medium mb-1">Jami keshbek (bu oy)</p>
        <h2 className="text-[32px] font-extrabold leading-none mb-4">{totalCashback}</h2>
        <div className="flex justify-between">
          <div>
            <p className="text-white/60 text-[11px]">Sarflangan</p>
            <p className="font-bold text-[15px]">{totalSpent}</p>
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

      {/* To'lovlar ro'yxati */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        {transactions.map((item, index) => (
          <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
                <BsFuelPump size={18} />
              </div>
              <div>
                <p className="font-bold text-[14px] text-[#1a1a1a]">To'lov #{transactions.length - index}</p>
                <p className="text-gray-400 text-[12px]">{item.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-[14px] text-[#1a1a1a]">{item.amount}</p>
              <p className="text-[#0f7b4c] text-[13px] font-semibold">{item.cashback}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
