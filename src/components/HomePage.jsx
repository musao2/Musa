import React, { useState } from 'react';
import { IoTrendingUpOutline } from 'react-icons/io5';
import { MdQrCodeScanner } from 'react-icons/md';
import { BsFuelPump } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import QRScanner from './QRScanner';

// So'm formatini chiroyli ko'rsatish
const formatSum = (n) =>
  Number(n || 0).toLocaleString('uz-UZ') + ' so\'m';

// Vaqtni o'zbek tilida ko'rsatish
const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Bugun, ${time}`;
  if (diffDays === 1) return `Kecha, ${time}`;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }) + `, ${time}`;
};

const HomePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { transactions, addTransaction }  = useTransactions(user?.id);
  const [showScanner, setShowScanner]     = useState(false);
  const [scanMsg, setScanMsg]             = useState('');

  const recentTx = transactions.slice(0, 3);

  const handleScan = async (qrData) => {
    setShowScanner(false);

    // QR dan summani ajratish (masalan: "AMOUNT:50000" yoki raqam)
    const match = qrData.match(/(\d+)/);
    const amount = match ? parseInt(match[1]) : 100000;

    const { cashbackAmount, error } = await addTransaction({ amount, cashbackPercent: 5 });

    if (error) {
      setScanMsg('❌ Xatolik: ' + error);
    } else {
      setScanMsg(`✅ +${formatSum(cashbackAmount)} keshbek yig'ildi!`);
      await refreshProfile();
    }

    setTimeout(() => setScanMsg(''), 3500);
  };

  return (
    <>
      {showScanner && (
        <QRScanner onClose={() => setShowScanner(false)} onScan={handleScan} />
      )}

      <div className="flex-1 px-4 pt-6 bg-gray-50 pb-6 w-full font-sans">

        {/* Salomlashuv */}
        <p className="text-gray-500 text-[13px] mb-0.5">Xush kelibsiz,</p>
        <h2 className="text-[20px] font-extrabold text-[#1a1a1a] mb-5">
          {profile?.name ?? 'Foydalanuvchi'}
        </h2>

        {/* Scan xabari */}
        {scanMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-[14px] font-semibold text-center ${
            scanMsg.startsWith('✅') ? 'bg-[#e8f5e9] text-[#0f7b4c]' : 'bg-red-50 text-red-500'
          }`}>
            {scanMsg}
          </div>
        )}

        {/* Balans kartasi */}
        <div className="bg-[#0f7b4c] rounded-2xl p-5 text-white mb-5">
          <p className="text-white/70 text-[13px] mb-1">Keshbek balansi</p>
          <h3 className="text-[36px] font-extrabold leading-none mb-3">
            {formatSum(profile?.cashback_balance)}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-[13px]">
              <IoTrendingUpOutline size={15} />
              <span>5% keshbek</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70 text-[12px]">
              <BsFuelPump size={14} />
              <span>Lukoil — Yunusobod</span>
            </div>
          </div>
        </div>

        {/* QR Skanerlash tugmasi */}
        <div
          onClick={() => setShowScanner(true)}
          className="bg-[#0bd39a] rounded-2xl h-[130px] flex flex-col items-center justify-center cursor-pointer mb-5 active:scale-95 transition-transform"
        >
          <div className="bg-[#09b382] w-14 h-14 rounded-full flex items-center justify-center text-[#03543d] mb-2">
            <MdQrCodeScanner size={28} />
          </div>
          <span className="text-[#03543d] font-bold text-[15px]">QR skanerlash</span>
          <span className="text-[#03543d]/70 text-[12px] mt-0.5">To'lov uchun skanerlang</span>
        </div>

        {/* Aksiya banneri */}
        <div className="bg-[#fee2cc] rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f6d0b3] rounded-xl flex items-center justify-center text-[#965b20] shrink-0">
            <BsFuelPump size={22} />
          </div>
          <div>
            <p className="text-[#965b20] font-bold text-[13px]">Keshbek 5%</p>
            <p className="text-[#1a1a1a] font-bold text-[14px] leading-snug">
              Har to'lovdan 5% keshbek yig'asiz
            </p>
          </div>
        </div>

        {/* Oxirgi tranzaksiyalar */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Oxirgi to'lovlar</h3>
          <span className="text-[13px] text-[#0f7b4c] font-medium">
            {transactions.length} ta jami
          </span>
        </div>

        {recentTx.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-[14px]">
            Hali to'lovlar yo'q. QR skanerlang!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentTx.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#f0f7f4] rounded-xl flex items-center justify-center text-[#0f7b4c]">
                    <BsFuelPump size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-[#1a1a1a]">Lukoil</p>
                    <p className="text-gray-400 text-[12px]">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[14px] text-[#1a1a1a]">- {formatSum(item.amount)}</p>
                  <p className="text-[#0f7b4c] text-[13px] font-semibold">+ {formatSum(item.cashback_amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default HomePage;
