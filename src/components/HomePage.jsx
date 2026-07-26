import React, { useState } from 'react';
import { IoTrendingUpOutline } from "react-icons/io5";
import { MdQrCodeScanner } from "react-icons/md";
import { BsFuelPump } from "react-icons/bs";
import QRScanner from './QRScanner';

// ✏️ O'zgartirish uchun shu yerga qarang
const balance = "12,450 so'm";
const growth = "+2.5%";
const promoTitle = "Keshbek 5%";
const promoText = "Yangi yil aksiyasi barcha zapravkalarda";

const transactions = [
  { id: 1, title: "Lukoil",       time: "Bugun, 14:20",   amount: "- 240,000", cashback: "+ 12,000 so'm" },
  { id: 2, title: "Mustang",      time: "Kecha, 18:45",   amount: "- 150,000", cashback: "+ 7,500 so'm"  },
  { id: 3, title: "UNG Petroleum",time: "24 Dek, 09:12",  amount: "- 300,000", cashback: "+ 15,000 so'm" },
];

const HomePage = () => {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
    {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    <div className="flex-1 px-4 pt-6 bg-gray-50 pb-6 w-full font-sans">

      {/* Balans */}
      <div className="flex flex-col items-center mb-8 mt-2">
        <p className="text-gray-600 text-[14px] font-medium mb-1">Umumiy balans</p>
        <h2 className="text-[40px] font-[800] text-[#1a1a1a] tracking-tight leading-none mb-3">
          {balance}
        </h2>
        <div className="flex items-center gap-1.5 bg-[#007b55] text-white px-3.5 py-1 rounded-full text-[13px] font-medium">
          <IoTrendingUpOutline size={16} />
          <span>{growth} o'sish</span>
        </div>
      </div>

      {/* QR Skanerlash */}
      <div onClick={() => setShowScanner(true)} className="bg-[#0bd39a] rounded-2xl h-[140px] flex flex-col items-center justify-center cursor-pointer mb-5 active:scale-95 transition-transform">
        <div className="bg-[#09b382] w-14 h-14 rounded-full flex items-center justify-center text-[#03543d] mb-3">
          <MdQrCodeScanner size={28} />
        </div>
        <span className="text-[#03543d] font-bold text-[15px]">QR skanerlash</span>
      </div>

      {/* Aksiya banneri */}
      <div className="bg-[#fee2cc] rounded-2xl p-5 relative overflow-hidden mb-8 h-[120px] flex flex-col justify-end">
        <div className="absolute right-2 top-2 text-[#f6d0b3]">
          <BsFuelPump size={80} />
        </div>
        <p className="text-[#965b20] font-bold text-[13px] mb-1">{promoTitle}</p>
        <p className="text-[#1a1a1a] font-bold text-[15px] w-[70%] leading-tight">{promoText}</p>
      </div>

      {/* Tranzaksiyalar */}
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-[16px] font-medium text-[#1a1a1a]">Oxirgi tranzaksiyalar</h3>
        <button className="text-[#007b55] text-[14px] font-medium">Hammasi</button>
      </div>

      <div className="flex flex-col gap-3">
        {transactions.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] bg-[#f0f2f5] rounded-xl flex items-center justify-center text-[#007b55]">
                <BsFuelPump size={20} />
              </div>
              <div>
                <p className="font-bold text-[15px] text-[#1a1a1a]">{item.title}</p>
                <p className="text-gray-500 text-[12px]">{item.time}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-[15px] text-[#1a1a1a]">{item.amount}</p>
              <p className="text-[#007b55] text-[13px]">{item.cashback}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
    </>
  );
};

export default HomePage;
