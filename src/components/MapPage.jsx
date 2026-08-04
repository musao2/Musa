import React from 'react';
import {
  IoLocationOutline,
  IoCallOutline,
  IoTimeOutline,
  IoNavigateOutline,
  IoStarOutline,
  IoMapOutline,
} from 'react-icons/io5';
import { BsFuelPump } from 'react-icons/bs';
import { useStationSettings } from '../hooks/useStationSettings';
import CustomerReviews from './CustomerReviews';

const MapPage = () => {
  const { station } = useStationSettings();

  // Yandex va Google Maps orqali Navigatsiyani ochish
  const handleOpenNavigation = () => {
    const lat = station.lat || 41.3653226;
    const lng = station.lng || 69.2870051;
    const yandexUrl = `https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto`;
    window.open(yandexUrl, '_blank');
  };

  const lat = station.lat || 41.3653226;
  const lng = station.lng || 69.2870051;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.003}%2C${lng + 0.005}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="flex-1 bg-gray-50 w-full font-sans flex flex-col pb-10">

      {/* Real Interaktiv Xarita (OpenStreetMap Embed) */}
      <div className="relative mx-4 mt-5 rounded-2xl overflow-hidden shadow-sm border border-gray-200" style={{ height: 230 }}>
        <iframe
          title="Stansiya joylashuvi"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={osmEmbedUrl}
          className="w-full h-full"
        />

        {/* Xarita ustidagi markazi va sarlavhasi */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow border border-gray-100 flex items-center gap-1.5">
          <BsFuelPump size={16} className="text-[#0f7b4c]" />
          <span className="text-[12px] font-bold text-[#1a1a1a]">{station.name}</span>
        </div>

        <button
          onClick={handleOpenNavigation}
          className="absolute bottom-3 right-3 bg-[#0f7b4c] text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow flex items-center gap-1 active:scale-95 transition-all"
        >
          <IoMapOutline size={14} />
          Xaritasida ochish
        </button>
      </div>

      {/* Shaxobcha kartasi */}
      <div className={`mx-4 mt-4 bg-white rounded-2xl overflow-hidden transition-all ${
        station.is_open 
          ? 'border border-[#0f7b4c] shadow-sm shadow-emerald-50' 
          : 'border border-red-500 shadow-sm shadow-red-100'
      }`}>
        {/* Yashil/Qizil indikator chiziq */}
        <div className={`h-1.5 ${station.is_open ? 'bg-[#0f7b4c]' : 'bg-red-500'}`} />
        <div className="p-4">
          {/* Nomi va holati */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-extrabold text-[17px] text-[#1a1a1a]">{station.name}</h3>
              <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-[12px]">
                <IoLocationOutline size={14} className="text-[#0f7b4c]" />
                <span>{station.address}</span>
              </div>
            </div>
            <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
              station.is_open 
                ? 'bg-emerald-50 text-[#0f7b4c] border border-emerald-200' 
                : 'bg-red-100 text-red-600 border border-red-200'
            }`}>
              {station.is_open ? '● Ochiq' : '● Yopiq'}
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
              <span>{station.work_hours}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[13px] text-gray-600">
              <IoStarOutline size={16} className="text-yellow-400" />
              <span>Reyting: <strong className="text-[#1a1a1a]">{station.rating ?? 4.8}</strong> / 5.0</span>
            </div>
          </div>

          {/* Keshbek badge */}
          <div className="bg-[#f0f7f4] rounded-xl p-3 flex items-center justify-between mb-4">
            <div>
              <p className="text-[12px] text-gray-500">Keshbek foizi</p>
              <p className="text-[22px] font-extrabold text-[#0f7b4c]">{station.cashback_percent}%</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-gray-500">Yoqilg'i turlari</p>
              <div className="flex flex-wrap gap-1 justify-end mt-1">
                {(station.fuel_types || []).map(f => (
                  <span key={f} className="bg-white text-gray-700 text-[11px] px-2 py-0.5 rounded-full border border-gray-200 font-semibold shadow-2xs">
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
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gray-100 rounded-xl text-[14px] text-gray-700 font-semibold active:scale-95 transition-all"
            >
              <IoCallOutline size={17} />
              Qo'ng'iroq
            </a>
            <button
              onClick={handleOpenNavigation}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#0f7b4c] rounded-xl text-[14px] text-white font-semibold active:scale-95 transition-all shadow-sm"
            >
              <IoNavigateOutline size={17} />
              Yo'l ko'rsatish
            </button>
          </div>
        </div>
      </div>

      {/* BIZNING MIJOZLAR FIKRLARI BO'LIMI */}
      <CustomerReviews />

    </div>
  );
};

export default MapPage;
