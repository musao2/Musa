import React, { useState } from 'react';
import { IoLocationOutline, IoCallOutline, IoTimeOutline, IoStarOutline, IoStar, IoNavigateOutline } from 'react-icons/io5';
import { BsFuelPump } from 'react-icons/bs';

const stations = [
  {
    id: 1,
    name: 'Lukoil — Yunusobod',
    address: 'Yunusobod tumani, 14-mavze',
    distance: '0.8 km',
    cashback: '5%',
    rating: 4.8,
    open: true,
    fuel: ['AI-80', 'AI-91', 'AI-95', 'Dizel'],
    phone: '+998 71 234 56 78',
    color: '#ff5f1f',
  },
  {
    id: 2,
    name: 'Mustang — Mirzo Ulug\'bek',
    address: 'Mirzo Ulug\'bek ko\'chasi, 45',
    distance: '1.4 km',
    cashback: '4%',
    rating: 4.6,
    open: true,
    fuel: ['AI-91', 'AI-95', 'Gaz'],
    phone: '+998 71 345 67 89',
    color: '#1565c0',
  },
  {
    id: 3,
    name: 'UNG Petroleum',
    address: 'Sergeli tumani, Yangi hayot ko\'chasi',
    distance: '2.1 km',
    cashback: '5%',
    rating: 4.5,
    open: false,
    fuel: ['AI-80', 'AI-91', 'AI-95', 'Dizel', 'Gaz'],
    phone: '+998 71 456 78 90',
    color: '#2e7d32',
  },
  {
    id: 4,
    name: 'IPAGAS — Uchtepa',
    address: 'Uchtepa tumani, Bunyodkor shoh ko\'chasi',
    distance: '3.0 km',
    cashback: '3%',
    rating: 4.3,
    open: true,
    fuel: ['AI-91', 'AI-95', 'Gaz'],
    phone: '+998 71 567 89 01',
    color: '#6a1b9a',
  },
];

const MapPage = () => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="flex-1 bg-gray-50 w-full font-sans flex flex-col">

      {/* Map placeholder (gradient background simulating a map) */}
      <div className="relative mx-4 mt-5 rounded-2xl overflow-hidden" style={{ height: 220 }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 30%, #81c784 60%, #66bb6a 100%)',
          }}
        />
        {/* Grid lines simulating map roads */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <line x1="0" y1="80"  x2="100%" y2="80"  stroke="#388e3c" strokeWidth="2"/>
          <line x1="0" y1="150" x2="100%" y2="150" stroke="#388e3c" strokeWidth="2"/>
          <line x1="80"  y1="0" x2="80"  y2="100%" stroke="#388e3c" strokeWidth="2"/>
          <line x1="200" y1="0" x2="200" y2="100%" stroke="#388e3c" strokeWidth="2"/>
          <line x1="320" y1="0" x2="320" y2="100%" stroke="#388e3c" strokeWidth="2"/>
        </svg>
        {/* Station pins */}
        {stations.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id === selected ? null : s.id)}
            className="absolute flex flex-col items-center transition-transform active:scale-110"
            style={{ left: `${20 + i * 22}%`, top: `${30 + (i % 2) * 30}%` }}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 ${selected === s.id ? 'border-white scale-125' : 'border-transparent'}`}
              style={{ backgroundColor: s.color }}
            >
              <BsFuelPump size={16} color="#fff" />
            </div>
          </button>
        ))}
        {/* My location */}
        <div className="absolute" style={{ left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }}>
          <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        </div>
        {/* Map label */}
        <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-[12px] text-gray-600 font-medium">
          Xarita (demo)
        </div>
      </div>

      {/* Station list */}
      <p className="px-5 mt-5 mb-3 text-[15px] font-semibold text-[#1a1a1a]">
        Yaqin atrofidagi zapravkalar
      </p>
      <div className="flex flex-col gap-3 px-4 pb-6">
        {stations.map(station => (
          <div
            key={station.id}
            onClick={() => setSelected(station.id === selected ? null : station.id)}
            className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all cursor-pointer ${selected === station.id ? 'ring-2 ring-[#0f7b4c]' : ''}`}
          >
            {/* Header strip */}
            <div className="h-1.5" style={{ backgroundColor: station.color }} />
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-bold text-[15px] text-[#1a1a1a]">{station.name}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-gray-400 text-[12px]">
                    <IoLocationOutline size={13} />
                    <span>{station.address}</span>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <span className="bg-[#e8f5e9] text-[#0f7b4c] font-bold text-[13px] px-2.5 py-1 rounded-full">
                    {station.cashback} keshbek
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[12px] text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <IoNavigateOutline size={13} />
                  <span>{station.distance}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <IoStar size={13} className="text-yellow-400" />
                  <span>{station.rating}</span>
                </div>
                <span className={`font-semibold ${station.open ? 'text-[#0f7b4c]' : 'text-red-400'}`}>
                  {station.open ? '● Ochiq' : '● Yopiq'}
                </span>
              </div>

              {/* Fuel types */}
              <div className="flex flex-wrap gap-1.5">
                {station.fuel.map(f => (
                  <span key={f} className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-medium">
                    {f}
                  </span>
                ))}
              </div>

              {/* Expanded: phone & navigate */}
              {selected === station.id && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <a
                    href={`tel:${station.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-700 font-medium"
                  >
                    <IoCallOutline size={16} />
                    Qo'ng'iroq
                  </a>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#0f7b4c] rounded-xl text-[13px] text-white font-medium">
                    <IoNavigateOutline size={16} />
                    Yo'l olish
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapPage;
