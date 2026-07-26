import React, { useState } from 'react';
import { BsFuelPump } from 'react-icons/bs';
import { IoFilterOutline } from 'react-icons/io5';

const allTransactions = [
  { id: 1,  title: 'Lukoil',        location: 'Yunusobod, 14-mavze',  date: 'Bugun, 14:20',    amount: '- 240,000', cashback: '+ 12,000 so\'m', color: '#e8f5e9' },
  { id: 2,  title: 'Mustang',       location: 'Mirzo Ulug\'bek ko\'chasi', date: 'Kecha, 18:45', amount: '- 150,000', cashback: '+ 7,500 so\'m',  color: '#e8f5e9' },
  { id: 3,  title: 'UNG Petroleum', location: 'Sergeli tumani',        date: '24 Dek, 09:12',   amount: '- 300,000', cashback: '+ 15,000 so\'m', color: '#e8f5e9' },
  { id: 4,  title: 'Lukoil',        location: 'Chilonzor, 9-mavze',   date: '22 Dek, 11:30',   amount: '- 200,000', cashback: '+ 10,000 so\'m', color: '#e8f5e9' },
  { id: 5,  title: 'Mustang',       location: 'Shayxontohur tumani',  date: '20 Dek, 16:05',   amount: '- 180,000', cashback: '+ 9,000 so\'m',  color: '#e8f5e9' },
  { id: 6,  title: 'IPAGAS',        location: 'Uchtepa tumani',       date: '18 Dek, 08:22',   amount: '- 120,000', cashback: '+ 6,000 so\'m',  color: '#e8f5e9' },
];

const HistoryPage = () => {
  const [filter, setFilter] = useState('barchasi');

  const totalCashback = '59,500 so\'m';
  const totalSpent    = '1,190,000 so\'m';

  return (
    <div className="flex-1 bg-gray-50 w-full font-sans">

      {/* Summary card */}
      <div className="mx-4 mt-5 mb-4 bg-[#0f7b4c] rounded-2xl p-5 text-white">
        <p className="text-white/70 text-[13px] font-medium mb-1">Jami keshbek (bu oy)</p>
        <h2 className="text-[32px] font-extrabold leading-none mb-3">{totalCashback}</h2>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white/60 text-[11px]">Sarflangan</p>
            <p className="text-white text-[15px] font-bold">{totalSpent}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[11px]">Tranzaksiyalar</p>
            <p className="text-white text-[15px] font-bold">{allTransactions.length} ta</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1">
        {['barchasi', 'lukoil', 'mustang', 'ung'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-[#0f7b4c] text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-[13px] font-medium">
          <IoFilterOutline size={14} />
          Filter
        </button>
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        {allTransactions
          .filter(t => filter === 'barchasi' || t.title.toLowerCase() === filter)
          .map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
                <BsFuelPump size={20} />
              </div>
              <div>
                <p className="font-bold text-[15px] text-[#1a1a1a]">{item.title}</p>
                <p className="text-gray-400 text-[12px]">{item.location}</p>
                <p className="text-gray-400 text-[11px] mt-0.5">{item.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-[15px] text-[#1a1a1a]">{item.amount}</p>
              <p className="text-[#0f7b4c] text-[13px] font-semibold">{item.cashback}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
