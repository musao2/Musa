import React from 'react';
import { 
  IoHome, IoHomeOutline, 
  IoTime, IoTimeOutline, 
  IoMap, IoMapOutline, 
  IoPerson, IoPersonOutline 
} from "react-icons/io5";

const BottomNav = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', label: 'Home', activeIcon: IoHome, inactiveIcon: IoHomeOutline },
    { id: 'history', label: 'History', activeIcon: IoTime, inactiveIcon: IoTimeOutline },
    { id: 'map', label: 'Map', activeIcon: IoMap, inactiveIcon: IoMapOutline },
    { id: 'profile', label: 'Profile', activeIcon: IoPerson, inactiveIcon: IoPersonOutline },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-[20px] pb-safe z-50">
      <div className="flex justify-around items-center h-[64px] px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = isActive ? item.activeIcon : item.inactiveIcon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center w-[60px] gap-[3px] transition-all duration-200 ease-in-out hover:opacity-80 active:scale-95"
            >
              <div className={`${isActive ? 'text-[#0f7b4c] transform scale-110' : 'text-gray-400'} transition-transform duration-300`}>
                <Icon size={24} />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors duration-300 ${
                  isActive ? 'text-[#0f7b4c]' : 'text-gray-400'
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
