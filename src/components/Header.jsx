import React from 'react';
import { IoWalletOutline } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { profile } = useAuth();

  const balance = profile
    ? Number(profile.cashback_balance).toLocaleString('uz-UZ') + ' so\'m'
    : '...';

  return (
    <div className="flex justify-between items-center px-4 h-16 bg-white w-full sticky top-0 z-50 shadow-sm">
      <div className="text-[22px] font-bold text-[#0f7b4c] tracking-tight">
        KeshBak
      </div>
      <div className="flex items-center gap-1.5 bg-[#f0f7f4] rounded-full px-3 py-1.5">
        <IoWalletOutline size={20} className="text-[#0f7b4c]" />
        <span className="text-[15px] font-bold text-[#0f7b4c]">{balance}</span>
      </div>
    </div>
  );
};

export default Header;
