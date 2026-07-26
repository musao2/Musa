import React, { useState } from 'react';
import {
  IoPersonCircleOutline,
  IoWalletOutline,
  IoCopyOutline,
  IoSettingsOutline,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoChevronForwardOutline,
  IoGiftOutline,
  IoShieldCheckmarkOutline,
  IoNotificationsOutline,
} from 'react-icons/io5';

const menuItems = [
  {
    section: 'Hisob',
    items: [
      { icon: IoWalletOutline,        label: 'To\'lov usullari',       sub: 'Karta va hisob ma\'lumotlari' },
      { icon: IoGiftOutline,          label: 'Referallar',             sub: 'Do\'stlarni taklif qiling' },
      { icon: IoShieldCheckmarkOutline, label: 'Xavfsizlik',           sub: 'Parol, biometrik' },
    ],
  },
  {
    section: 'Sozlamalar',
    items: [
      { icon: IoNotificationsOutline, label: 'Bildirishnomalar',       sub: 'Push, SMS sozlamalari' },
      { icon: IoSettingsOutline,      label: 'Ilova sozlamalari',      sub: 'Til, tema va boshqalar' },
      { icon: IoHelpCircleOutline,    label: 'Yordam markazi',         sub: 'FAQ va qo\'llab-quvvatlash' },
    ],
  },
];

const ProfilePage = () => {
  const [copied, setCopied] = useState(false);
  const cardNumber = 'KB-2024-7842';

  const copyCard = () => {
    navigator.clipboard.writeText(cardNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-gray-50 w-full font-sans pb-6">

      {/* Profile header */}
      <div className="bg-[#0f7b4c] pt-6 pb-10 px-5 text-white relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full" />
        <div className="absolute -right-4 top-16 w-20 h-20 bg-white/5 rounded-full" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
            <IoPersonCircleOutline size={46} className="text-white" />
          </div>
          <div>
            <h2 className="text-[20px] font-extrabold">Musaiddin Ergashev</h2>
            <p className="text-white/70 text-[13px]">+998 90 123 45 67</p>
          </div>
        </div>
      </div>

      {/* Balance & card */}
      <div className="mx-4 -mt-6 bg-white rounded-2xl shadow-md p-5 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-gray-400 text-[12px] font-medium">Umumiy keshbek balansi</p>
            <h3 className="text-[28px] font-extrabold text-[#1a1a1a] leading-none mt-0.5">12,450 so'm</h3>
          </div>
          <div className="w-12 h-12 bg-[#e8f5e9] rounded-xl flex items-center justify-center">
            <IoWalletOutline size={24} className="text-[#0f7b4c]" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#f8f9fa] rounded-xl px-4 py-3">
          <div>
            <p className="text-gray-400 text-[11px]">Karta raqami</p>
            <p className="font-bold text-[15px] text-[#1a1a1a]">{cardNumber}</p>
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

      {/* Stats row */}
      <div className="flex gap-3 mx-4 mt-4 mb-5">
        {[
          { label: 'Bu oy',   value: '5,200 so\'m', sub: 'keshbek' },
          { label: 'Tranzaksiyalar', value: '18 ta', sub: 'umumiy' },
          { label: 'Daraja',  value: 'Oltin 🥇',   sub: 'a\'zo' },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-white rounded-2xl p-3.5 text-center shadow-sm">
            <p className="text-[14px] font-extrabold text-[#1a1a1a]">{s.value}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Menu sections */}
      {menuItems.map(section => (
        <div key={section.section} className="mx-4 mb-4">
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
            {section.section}
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {section.items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors active:bg-gray-50 ${
                    idx < section.items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="w-9 h-9 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[14px] text-[#1a1a1a]">{item.label}</p>
                    <p className="text-gray-400 text-[12px]">{item.sub}</p>
                  </div>
                  <IoChevronForwardOutline size={16} className="text-gray-300" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div className="mx-4">
        <button className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 rounded-2xl text-red-500 font-semibold text-[15px] active:bg-red-100 transition-colors">
          <IoLogOutOutline size={20} />
          Chiqish
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
