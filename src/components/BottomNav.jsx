import React from 'react';
import { 
  HiMiniHome, HiOutlineHome,
  HiClock, HiOutlineClock,
  HiMapPin, HiOutlineMapPin,
  HiUser, HiOutlineUser 
} from "react-icons/hi2";

const BottomNav = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', label: 'Asosiy', activeIcon: HiMiniHome, inactiveIcon: HiOutlineHome },
    { id: 'history', label: 'Tarix', activeIcon: HiClock, inactiveIcon: HiOutlineClock },
    { id: 'map', label: 'Xarita', activeIcon: HiMapPin, inactiveIcon: HiOutlineMapPin },
    { id: 'profile', label: 'Profil', activeIcon: HiUser, inactiveIcon: HiOutlineUser },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] rounded-t-3xl pb-safe z-50">
      <div className="flex justify-around items-center h-[66px] px-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = isActive ? item.activeIcon : item.inactiveIcon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-all duration-200 ease-out active:scale-90"
            >
              <div className={`p-1.5 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'text-[#0f7b4c] bg-[#e8f5e9] scale-105 shadow-xs' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
                <Icon size={22} />
              </div>
              <span
                className={`text-[11px] tracking-tight transition-colors duration-300 ${
                  isActive ? 'text-[#0f7b4c] font-black' : 'text-gray-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
