import React, { useState } from 'react';
import { HiSparkles, HiQrCode, HiGift } from 'react-icons/hi2';
import { RiGasStationFill } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useStationSettings } from '../hooks/useStationSettings';
import QRScanner from './QRScanner';
import PostPaymentReviewModal from './PostPaymentReviewModal';

// So'm formatini chiroyli ko'rsatish
const formatSum = (n) =>
  Number(n || 0).toLocaleString('uz-UZ') + " so'm";

const formatDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${day}.${month}.${year} ${hour}:${minute}`;
};

const HomePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { transactions, addTransaction } = useTransactions(user?.id);
  const { station } = useStationSettings();
  const [showScanner, setShowScanner] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  
  // To'lovdan so'ng chiqadigan Sharh Modali state-i
  const [showReviewModal, setShowReviewModal] = useState(false);

  const recentTx = transactions.slice(0, 3);

  const handleScan = async (qrData) => {
    setShowScanner(false);

    let amount = 100000;
    let tokenId = '';
    let scanType = 'cashback';
    let defaultPercent = station.cashback_percent || 5.0;

    let cashbackPercent = defaultPercent;

    if (qrData && qrData.includes('|')) {
      const parts = qrData.split('|');
      if (parts[0] === 'KESHBAK') {
        tokenId = parts[1];
        scanType = parts[2];
        amount = parseInt(parts[3], 10) || 0;
        cashbackPercent = parts.length >= 5 ? parseFloat(parts[4]) : defaultPercent;
      }
    }

    if (!tokenId) {
      setScanMsg('❌ Yaroqsiz QR-kod! Rasmiy KeshBak QR-kodini skanerlang.');
      setTimeout(() => setScanMsg(''), 3500);
      return;
    }

    const { cashbackAmount, error } = await addTransaction({
      amount,
      cashbackPercent: cashbackPercent,
      type: scanType,
      tokenId: tokenId,
      currentBalance: Number(profile?.cashback_balance || 0)
    });

    if (error) {
      setScanMsg('❌ Xatolik: ' + error);
    } else {
      if (scanType === 'withdraw') {
        setScanMsg(`✅ ${formatSum(amount)} keshbek yechib olindi!`);
      } else {
        setScanMsg(`✅ +${formatSum(cashbackAmount)} keshbek yig'ildi! (${cashbackPercent}%)`);
      }
      await refreshProfile();

      // TO'LOV MUVAFFAQIYATLI BAJARILGACH DARHOL SHARH VA YULDUZLI BAHO MODALINI OCHAMIZ
      setTimeout(() => {
        setShowReviewModal(true);
      }, 1000);
    }

    setTimeout(() => setScanMsg(''), 3500);
  };

  return (
    <>
      {showScanner && (
        <QRScanner onClose={() => setShowScanner(false)} onScan={handleScan} />
      )}

      {/* TO'LOVDAN SO'NG CHI QADIGAN SHARH VA YULDUZLI BAHO MODALI */}
      <PostPaymentReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />

      <div className="flex-1 px-4 pt-6 bg-gray-50 pb-6 w-full font-sans">

        {/* Scan xabari */}
        {scanMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-[14px] font-semibold text-center ${scanMsg.startsWith('✅') ? 'bg-[#e8f5e9] text-[#0f7b4c]' : 'bg-red-50 text-red-500'
            }`}>
            {scanMsg}
          </div>
        )}

        {/* Balans kartasi */}
        <div className="bg-gradient-to-br from-[#0c613c] via-[#0f7b4c] to-[#14965d] rounded-3xl p-5 text-white mb-5 shadow-xl shadow-[#0f7b4c]/20 relative overflow-hidden border border-white/10">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-emerald-400/20 rounded-full blur-lg pointer-events-none" />

          <div className="pb-3 mb-3.5 border-b border-white/15 relative z-10">
            <h2 className="text-[16px] text-white font-extrabold leading-tight flex items-center gap-1.5 flex-wrap">
              <span className="text-emerald-200/90 font-medium">Xush kelibsiz,</span>
              <span>{profile?.name || 'Foydalanuvchi'}</span>
              <span>👋</span>
            </h2>
          </div>

          <div className="relative z-10">
            <p className="text-emerald-100/75 text-[12px] font-medium mb-1">Keshbek balansi</p>
            <h3 className="text-[34px] font-black leading-none mb-4 tracking-tight">
              {formatSum(profile?.cashback_balance)}
            </h3>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full text-[12px] font-bold text-emerald-50 border border-white/15">
                <HiSparkles size={14} className="text-amber-300" />
                <span>{station.cashback_percent}% keshbek</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80 text-[12px] font-medium">
                <RiGasStationFill size={15} />
                <span>{station.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* QR Skanerlash tugmasi */}
        <div
          onClick={() => setShowScanner(true)}
          className="bg-[#0bd39a] rounded-2xl h-[130px] flex flex-col items-center justify-center cursor-pointer mb-5 active:scale-95 transition-transform shadow-md shadow-[#0bd39a]/20"
        >
          <div className="bg-[#09b382] w-14 h-14 rounded-full flex items-center justify-center text-[#03543d] mb-2 shadow-inner">
            <HiQrCode size={30} />
          </div>
          <span className="text-[#03543d] font-bold text-[15px]">QR skanerlash</span>
          <span className="text-[#03543d]/70 text-[12px] mt-0.5">To'lov uchun skanerlang</span>
        </div>

        {/* Aksiya banneri */}
        <div className="bg-[#fee2cc] rounded-2xl p-4 mb-6 flex items-center gap-4 border border-[#fcd3b0]">
          <div className="w-12 h-12 bg-[#f6d0b3] rounded-xl flex items-center justify-center text-[#965b20] shrink-0">
            <RiGasStationFill size={22} />
          </div>
          <div>
            <h4 className="font-extrabold text-[15px] text-[#4a2e12]">Har bir to'lovda keshbek!</h4>
            <p className="text-[12px] text-[#784d24] mt-0.5 leading-snug">
              Har bir quyishda {station.cashback_percent}% keshbek yig'ing va keyingi to'lovlarda ishlating.
            </p>
          </div>
        </div>

        {/* Oxirgi amallar */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-extrabold text-[16px] text-gray-900">Oxirgi amallar</h4>
          </div>

          {recentTx.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-[13px] border border-gray-100">
              Hozircha amallar yo'q
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentTx.map((tx) => {
                const isWithdraw = Number(tx.cashback_amount) < 0;
                const amt = isWithdraw ? Math.abs(Number(tx.cashback_amount)) : Number(tx.cashback_amount);

                return (
                  <div
                    key={tx.id}
                    className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-gray-100 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWithdraw ? 'bg-red-50 text-red-500' : 'bg-[#e8f5e9] text-[#0f7b4c]'
                        }`}>
                        {isWithdraw ? <HiGift size={20} /> : <HiSparkles size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-[14px] text-gray-800">
                          {isWithdraw ? "Keshbek yechildi" : "Keshbek yig'ildi"}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <span className={`font-extrabold text-[15px] ${isWithdraw ? 'text-red-500' : 'text-[#0f7b4c]'
                      }`}>
                      {isWithdraw ? '-' : '+'}{formatSum(amt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default HomePage;
