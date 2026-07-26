import React from 'react';
import { IoWalletOutline } from "react-icons/io5";

const Header = () => {
  return (
    <div className="flex justify-between items-center px-4 h-16 bg-white w-full sticky top-0 z-50">
      <div className="text-[22px] font-bold text-[#0f7b4c] tracking-tight">
        KeshBak
      </div>
      <div className="flex items-center gap-1.5 bg-[#f0f2f5] rounded-full px-3 py-1.5">
        <IoWalletOutline size={20} className="text-[#0f7b4c]" />
        <span className="text-[16px] font-medium text-gray-900">$24.50</span>
      </div>
    </div>
  );
};

export default Header;
