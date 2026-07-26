import React, { useState, useEffect } from 'react';
import { IoClose, IoFlashlight, IoImage } from "react-icons/io5";
import { BsXCircle } from "react-icons/bs";

const QRScanner = ({ onClose }) => {
  const [scanLineY, setScanLineY] = useState(0);

  // Skanerlash chizig'i yuqori-pastga harakat qiladi
  useEffect(() => {
    let direction = 1;
    const interval = setInterval(() => {
      setScanLineY(prev => {
        if (prev >= 100) direction = -1;
        if (prev <= 0) direction = 1;
        return prev + direction * 1.2;
      });
    }, 10);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">

      {/* Kamera foni (simulyatsiya) */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black opacity-95" />

      {/* Yuqori tugmalar */}
      <div className="relative z-10 flex justify-between items-center px-5 pt-12 pb-4">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
        >
          <IoClose size={22} />
        </button>
        <div className="flex gap-3">
          <button className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white">
            <IoFlashlight size={20} />
          </button>
          <button className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white">
            <IoImage size={20} />
          </button>
        </div>
      </div>

      {/* Markaziy skanerlash ramkasi */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        <div className="relative w-[260px] h-[260px]">

          {/* To'rt burchak (yashil) */}
          {/* Yuqori chap */}
          <span className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-[#0bd39a] rounded-tl-lg" />
          {/* Yuqori o'ng */}
          <span className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-[#0bd39a] rounded-tr-lg" />
          {/* Pastki chap */}
          <span className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-[#0bd39a] rounded-bl-lg" />
          {/* Pastki o'ng */}
          <span className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-[#0bd39a] rounded-br-lg" />

          {/* Skanerlash chizig'i */}
          <div
            className="absolute left-2 right-2 h-[2px] bg-[#0bd39a] rounded-full opacity-80"
            style={{ top: `${scanLineY}%`, boxShadow: '0 0 8px #0bd39a' }}
          />
        </div>

        {/* Matnlar */}
        <p className="text-white font-semibold text-[15px] mt-6 mb-2">
          QR kodni ramka ichiga joylashtiring
        </p>
        <p className="text-gray-400 text-[13px]">
          To'lovni amalga oshirish uchun skanerlang
        </p>
      </div>

      {/* Pastki tugma */}
      <div className="relative z-10 px-6 pb-12">
        <button
          onClick={onClose}
          className="w-full h-14 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold text-[15px]"
        >
          <BsXCircle size={20} />
          Bekor qilish
        </button>
      </div>

    </div>
  );
};

export default QRScanner;
