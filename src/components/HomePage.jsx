import React, { useState } from 'react';
import { IoTrendingUpOutline } from "react-icons/io5";
import { MdQrCodeScanner } from "react-icons/md";
import { BsFuelPump } from "react-icons/bs";
import QRScanner from './QRScanner';

// --- Foydalanuvchi ma'lumotlari ---
const user = {
  name: "Abdullayev Sherzod",
  balance: "12,450 so'm",
  growth: "+2.5%",
  station: "Lukoil — Yunusobod",
};

// --- Oxirgi tranzaksiyalar (faqat shu shaxobchada) ---
const transactions = [
  { id: 1, date: "Bugun, 14:20",    amount: "- 240,000 so'm", cashback: "+ 12,000 so'm" },
  { id: 2, date: "Kecha, 18:45",    amount: "- 150,000 so'm", cashback: "+ 7,500 so'm"  },
  { id: 3, date: "24 Dek, 09:12",   amount: "- 300,000 so'm", cashback: "+ 15,000 so'm" },
];

const HomePage = () => {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
      <div className="flex-1 px-4 pt-6 bg-gray-50 pb-6 w-full font-sans">

        {/* Salomlashuv */}
        <p className="text-gray-500 text-[13px] mb-0.5">Xush kelibsiz,</p>
        <h2 className="text-[20px] font-extrabold text-[#1a1a1a] mb-5">{user.name}</h2>

        {/* Balans kartasi */}
        <div className="bg-[#0f7b4c] rounded-2xl p-5 text-white mb-5">
          <p className="text-white/70 text-[13px] mb-1">Keshbek balansi</p>
          <h3 className="text-[36px] font-extrabold leading-none mb-3">{user.balance}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-[13px]">
              <IoTrendingUpOutline size={15} />
              <span>{user.growth} o'sish</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70 text-[12px]">
              <BsFuelPump size={14} />
              <span>{user.station}</span>
            </div>
          </div>
        </div>

        {/* QR Skanerlash */}
        <div
          onClick={() => setShowScanner(true)}
          className="bg-[#0bd39a] rounded-2xl h-[130px] flex flex-col items-center justify-center cursor-pointer mb-5 active:scale-95 transition-transform"
        >
          <div className="bg-[#09b382] w-14 h-14 rounded-full flex items-center justify-center text-[#03543d] mb-2">
            <MdQrCodeScanner size={28} />
          </div>
          <span className="text-[#03543d] font-bold text-[15px]">QR skanerlash</span>
          <span className="text-[#03543d]/70 text-[12px] mt-0.5">To'lov uchun skanerlang</span>
        </div>

        {/* Shaxobcha haqida banner */}
        <div className="bg-[#fee2cc] rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f6d0b3] rounded-xl flex items-center justify-center text-[#965b20] shrink-0">
            <BsFuelPump size={22} />
          </div>
          <div>
            <p className="text-[#965b20] font-bold text-[13px]">Keshbek 5%</p>
            <p className="text-[#1a1a1a] font-bold text-[14px] leading-snug">
              Har to'lovdan 5% keshbek yig'asiz
            </p>
          </div>
        </div>

        {/* Oxirgi tranzaksiyalar */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Oxirgi to'lovlar</h3>
        </div>

        <div className="flex flex-col gap-3">
          {transactions.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
                  <BsFuelPump size={18} />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#1a1a1a]">Lukoil</p>
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
    </>
  );
};

export default HomePage;
