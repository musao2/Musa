import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { IoWalletOutline } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationModal from './NotificationModal';

const Header = () => {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const balance = profile
    ? Number(profile.cashback_balance).toLocaleString('uz-UZ') + " so'm"
    : '...';

  return (
    <>
      <header className="flex justify-between items-center px-4 h-16 bg-white w-full sticky top-0 z-50 shadow-xs border-b border-gray-100">
        {/* Logotip */}
        <div className="text-[22px] font-extrabold text-[#0f7b4c] tracking-tight flex items-center gap-1">
          KeshBak
        </div>

        {/* O'ng tomondagi tugmalar: Bildirishnomalar (Bell) & Balans */}
        <div className="flex items-center gap-2.5">
          {/* Bildirishnomalar ikonkasi (Bell) */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="relative p-2 rounded-full text-gray-600 hover:text-[#0f7b4c] hover:bg-[#f0f7f4] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            aria-label="Bildirishnomalar"
          >
            <Bell className="w-6 h-6 text-gray-700 hover:text-[#0f7b4c] transition-colors" />

            {/* O'qilmagan xabarlar soni (Badge) - agar 0 bo'lsa ko'rinmaydi */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm ring-2 ring-white animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Balans */}
          <div className="flex items-center gap-1.5 bg-[#f0f7f4] border border-[#d2e9dd] rounded-full px-3 py-1.5">
            <IoWalletOutline size={20} className="text-[#0f7b4c]" />
            <span className="text-[15px] font-bold text-[#0f7b4c]">{balance}</span>
          </div>
        </div>
      </header>

      {/* Bildirishnomalar Modali / Dropdown oyna */}
      <NotificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default Header;
