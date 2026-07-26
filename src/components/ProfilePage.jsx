import React, { useState } from 'react';
import {
  IoPersonCircleOutline,
  IoWalletOutline,
  IoCopyOutline,
  IoCallOutline,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoChevronForwardOutline,
  IoShieldCheckmarkOutline,
  IoNotificationsOutline,
} from 'react-icons/io5';
import { BsFuelPump } from 'react-icons/bs';

// --- Bitta foydalanuvchi ---
const user = {
  name:    'Abdullayev Sherzod',
  phone:   '+998 90 123 45 67',
  card:    'KB-2024-7842',
  balance: '12,450 so\'m',
  thisMonth: '5,200 so\'m',
  totalPayments: 18,
  level: 'Oltin 🥇',
  station: 'Lukoil — Yunusobod',
  stationPhone: '+998 71 234 56 78',
};

const menuItems = [
  { icon: IoShieldCheckmarkOutline, label: 'Xavfsizlik',        sub: 'Parol va biometrik' },
  { icon: IoNotificationsOutline,   label: 'Bildirishnomalar',  sub: 'Push va SMS' },
  { icon: IoHelpCircleOutline,      label: 'Yordam',            sub: 'Savol va qo\'llab-quvvatlash' },
];

const ProfilePage = () => {
  const [copied, setCopied] = useState(false);

  const copyCard = () => {
    navigator.clipboard.writeText(user.card).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-gray-50 w-full font-sans pb-6">

      {/* Profil sarlavhasi */}
      <div className="bg-[#0f7b4c] pt-6 pb-10 px-5 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute right-6 top-16 w-16 h-16 bg-white/5 rounded-full" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
            <IoPersonCircleOutline size={46} className="text-white" />
          </div>
          <div>
            <h2 className="text-[20px] font-extrabold">{user.name}</h2>
            <p className="text-white/70 text-[13px]">{user.phone}</p>
            <div className="flex items-center gap-1 mt-1 text-white/60 text-[12px]">
              <BsFuelPump size={12} />
              <span>{user.station}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balans va karta */}
      <div className="mx-4 -mt-6 bg-white rounded-2xl shadow-md p-5 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-400 text-[12px]">Keshbek balansi</p>
            <h3 className="text-[28px] font-extrabold text-[#1a1a1a] leading-none mt-0.5">{user.balance}</h3>
          </div>
          <div className="w-12 h-12 bg-[#e8f5e9] rounded-xl flex items-center justify-center">
            <IoWalletOutline size={24} className="text-[#0f7b4c]" />
          </div>
        </div>

        {/* Karta raqami */}
        <div className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-3">
          <div>
            <p className="text-gray-400 text-[11px]">Karta raqami</p>
            <p className="font-bold text-[15px] text-[#1a1a1a]">{user.card}</p>
          </div>
          <button
            onClick={copyCard}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${copied ? 'text-[#0f7b4c]' : 'text-gray-400'}`}
          >
            <IoCopyOutline size={16} />
            {copied ? 'Nusxalandi!' : 'Nusxa'}
          </button>
        </div>
      </div>

      {/* Statistika */}
      <div className="flex gap-3 mx-4 mt-4 mb-5">
        {[
          { label: 'Bu oy',        value: user.thisMonth },
          { label: "To'lovlar",    value: `${user.totalPayments} ta` },
          { label: 'Daraja',       value: user.level },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[13px] font-extrabold text-[#1a1a1a]">{s.value}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Shaxobcha aloqa */}
      <div className="mx-4 mb-4 bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
            <BsFuelPump size={18} />
          </div>
          <div>
            <p className="font-bold text-[14px] text-[#1a1a1a]">{user.station}</p>
            <p className="text-gray-400 text-[12px]">{user.stationPhone}</p>
          </div>
        </div>
        <a href={`tel:${user.stationPhone}`} className="w-9 h-9 bg-[#0f7b4c] rounded-xl flex items-center justify-center">
          <IoCallOutline size={17} className="text-white" />
        </a>
      </div>

      {/* Menyu */}
      <div className="mx-4 mb-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 ${idx < menuItems.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[14px] text-[#1a1a1a]">{item.label}</p>
                  <p className="text-gray-400 text-[12px]">{item.sub}</p>
                </div>
                <IoChevronForwardOutline size={15} className="text-gray-300" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Chiqish */}
      <div className="mx-4">
        <button className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 rounded-2xl text-red-400 font-semibold text-[15px] active:bg-red-100 transition-colors">
          <IoLogOutOutline size={20} />
          Chiqish
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
