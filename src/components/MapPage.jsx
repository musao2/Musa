import React from 'react';
import {
  IoLocationOutline,
  IoCallOutline,
  IoTimeOutline,
  IoNavigateOutline,
  IoStarOutline,
} from 'react-icons/io5';
import { BsFuelPump } from 'react-icons/bs';

// --- Bitta shaxobcha ma'lumotlari ---
const station = {
  name: 'Lukoil — Yunusobod',
  address: 'Yunusobod tumani, 14-mavze, 7-uy',
  phone: '+998 71 234 56 78',
  workHours: 'Har kuni: 07:00 – 23:00',
  cashback: '5%',
  rating: 4.8,
  fuel: ['AI-80', 'AI-91', 'AI-95', 'Dizel'],
  isOpen: true,
};

const MapPage = () => {
  return (
    <div className="flex-1 bg-gray-50 w-full font-sans flex flex-col">

      {/* Xarita (demo) */}
      <div className="relative mx-4 mt-5 rounded-2xl overflow-hidden" style={{ height: 220 }}>
        {/* Gradient background map */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 40%, #66bb6a 100%)',
          }}
        />
        {/* Yo'l chiziqlari */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <line x1="0" y1="90"  x2="100%" y2="90"  stroke="#2e7d32" strokeWidth="12"/>
          <line x1="0" y1="160" x2="100%" y2="160" stroke="#2e7d32" strokeWidth="6"/>
          <line x1="120" y1="0" x2="120" y2="100%" stroke="#2e7d32" strokeWidth="8"/>
          <line x1="280" y1="0" x2="280" y2="100%" stroke="#2e7d32" strokeWidth="6"/>
        </svg>
        {/* Shaxobcha belgisi */}
        <div className="absolute" style={{ left: '45%', top: '38%' }}>
          <div className="w-12 h-12 bg-[#0f7b4c] rounded-full flex items-center justify-center border-3 border-white shadow-xl">
            <BsFuelPump size={22} color="#fff" />
          </div>
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-[#0f7b4c] font-bold text-[11px] px-2 py-0.5 rounded-full shadow whitespace-nowrap">
            Lukoil
          </div>
        </div>
        {/* Mening joylashuvim */}
        <div className="absolute" style={{ left: '65%', top: '62%' }}>
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow animate-pulse" />
        </div>
        <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] text-gray-500 font-medium">
          Xarita (demo)
        </div>
      </div>

      {/* Shaxobcha kartasi */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Yashil chiziq */}
        <div className="h-1.5 bg-[#0f7b4c]" />
        <div className="p-4">
          {/* Nomi va holati */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-extrabold text-[17px] text-[#1a1a1a]">{station.name}</h3>
              <div className="flex items-center gap-1 mt-0.5 text-gray-400 text-[12px]">
                <IoLocationOutline size={13} />
                <span>{station.address}</span>
              </div>
            </div>
            <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${station.isOpen ? 'bg-[#e8f5e9] text-[#0f7b4c]' : 'bg-red-50 text-red-400'}`}>
              {station.isOpen ? '● Ochiq' : '● Yopiq'}
            </span>
          </div>

          {/* Ma'lumotlar */}
          <div className="flex flex-col gap-2.5 mb-4">
            <div className="flex items-center gap-2.5 text-[13px] text-gray-600">
              <IoCallOutline size={16} className="text-[#0f7b4c]" />
              <span>{station.phone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[13px] text-gray-600">
              <IoTimeOutline size={16} className="text-[#0f7b4c]" />
              <span>{station.workHours}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[13px] text-gray-600">
              <IoStarOutline size={16} className="text-yellow-400" />
              <span>Reyting: <strong className="text-[#1a1a1a]">{station.rating}</strong> / 5.0</span>
            </div>
          </div>

          {/* Keshbek badge */}
          <div className="bg-[#f0f7f4] rounded-xl p-3 flex items-center justify-between mb-4">
            <div>
              <p className="text-[12px] text-gray-500">Keshbek foizi</p>
              <p className="text-[22px] font-extrabold text-[#0f7b4c]">{station.cashback}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-gray-500">Yoqilg'i turlari</p>
              <div className="flex flex-wrap gap-1 justify-end mt-1">
                {station.fuel.map(f => (
                  <span key={f} className="bg-white text-gray-600 text-[11px] px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tugmalar */}
          <div className="flex gap-2">
            <a
              href={`tel:${station.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gray-100 rounded-xl text-[14px] text-gray-700 font-semibold"
            >
              <IoCallOutline size={17} />
              Qo'ng'iroq
            </a>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#0f7b4c] rounded-xl text-[14px] text-white font-semibold">
              <IoNavigateOutline size={17} />
              Yo'l ko'rsatish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
