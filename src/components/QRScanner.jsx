import React, { useEffect, useRef, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { BsXCircle, BsCheckCircleFill } from 'react-icons/bs';
import jsQR from 'jsqr';

const QRScanner = ({ onClose, onScan }) => {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const detectorRef = useRef(null);

  const [status, setStatus]       = useState('loading'); // loading | scanning | success | error
  const [result, setResult]       = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [scanLineY, setScanLineY] = useState(0);

  /* ---------- Skanerlash chizig'i animatsiyasi ---------- */
  useEffect(() => {
    let dir = 1;
    const id = setInterval(() => {
      setScanLineY(prev => {
        if (prev >= 100) dir = -1;
        if (prev <= 0)   dir =  1;
        return prev + dir * 1.5;
      });
    }, 10);
    return () => clearInterval(id);
  }, []);

  /* ---------- Universal Kamera va QR Dekoder (JSQR + BarcodeDetector) ---------- */
  useEffect(() => {
    let stopped = false;

    const startCamera = async () => {
      try {
        // Native BarcodeDetector (agar brauzerda bor bo'lsa)
        if ('BarcodeDetector' in window) {
          try {
            detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
          } catch (e) {
            detectorRef.current = null;
          }
        }

        // Barcha mobil va desktop brauzerlar uchun kamera ruxsatini olish
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch (e1) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          } catch (e2) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        }

        if (stopped) {
          if (stream) stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('muted', 'true');
          await videoRef.current.play();
        }

        setStatus('scanning');
        scanFrame();
      } catch (err) {
        if (stopped) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatus('error');
          setErrorMsg('Kameraga ruxsat berilmadi.\nIltimos, brauzeringiz sozlamalaridan kameraga ruxsat bering.');
        } else {
          setStatus('error');
          setErrorMsg('Kamera ochilmadi: ' + (err.message || 'Xatolik yuz berdi'));
        }
      }
    };

    const scanFrame = async () => {
      if (stopped || !videoRef.current || !canvasRef.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let foundText = null;

      // 1. Native BarcodeDetector tekshirish (Tezkor)
      if (detectorRef.current) {
        try {
          const barcodes = await detectorRef.current.detect(canvas);
          if (barcodes.length > 0) {
            foundText = barcodes[0].rawValue;
          }
        } catch (e) {}
      }

      // 2. jsQR orqali dekod qilish (iOS Safari, Mobile Firefox, Telegram WebApp universal fallback)
      if (!foundText) {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            foundText = code.data;
          }
        } catch (e) {}
      }

      if (stopped) return;

      if (foundText) {
        setResult(foundText);
        setStatus('success');
        stopCamera();
        if (onScan) onScan(foundText);
      } else {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    };

    const stopCamera = () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };

    startCamera();

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [onScan]);

  /* ---------- Render ---------- */
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">

      {/* Kamera oqimi */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: status === 'scanning' ? 1 : 0 }}
      />
      {/* QR dekodlash uchun ko'rinmas canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Qoraytirilgan overlay */}
      {status === 'scanning' && (
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 260px 260px at 50% 45%, transparent 98%, rgba(0,0,0,0.65) 100%)',
          backgroundColor: 'rgba(0,0,0,0.55)',
        }} />
      )}

      {/* Yuklash holati */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[14px] text-white/70">Kamera yoqilmoqda...</p>
          </div>
        </div>
      )}

      {/* Yuqori tugmalar */}
      <div className="relative z-10 flex justify-between items-center px-5 pt-12 pb-4">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
        >
          <IoClose size={22} />
        </button>
        <span className="text-white font-semibold text-[15px]">QR Skaner</span>
        <div className="w-10" />
      </div>

      {/* Markaziy qism */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">

        {/* Skanerlash ramkasi */}
        {status === 'scanning' && (
          <div className="relative w-[260px] h-[260px] mb-6">
            {/* To'rt burchak */}
            <span className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-[#0bd39a] rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-[#0bd39a] rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-[#0bd39a] rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-[#0bd39a] rounded-br-lg" />
            {/* Skanerlash chizig'i */}
            <div
              className="absolute left-2 right-2 h-[2px] bg-[#0bd39a] rounded-full opacity-90"
              style={{ top: `${scanLineY}%`, boxShadow: '0 0 10px #0bd39a, 0 0 20px #0bd39a' }}
            />
          </div>
        )}

        {/* Muvaffaqiyat holati */}
        {status === 'success' && (
          <div className="flex flex-col items-center px-8 text-center">
            <BsCheckCircleFill size={64} className="text-[#0bd39a] mb-4" />
            <p className="text-white font-bold text-[18px] mb-2">Muvaffaqiyatli skanerlandi!</p>
            <div className="bg-white/10 rounded-xl px-4 py-3 w-full mt-2">
              <p className="text-white/60 text-[11px] mb-1">Natija:</p>
              <p className="text-white font-semibold text-[14px] break-all">{result}</p>
            </div>
          </div>
        )}

        {/* Xatolik holati */}
        {status === 'error' && (
          <div className="flex flex-col items-center px-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <IoClose size={32} className="text-red-400" />
            </div>
            <p className="text-white font-bold text-[16px] mb-2">Xatolik yuz berdi</p>
            <p className="text-white/60 text-[13px] leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Matn */}
        {status === 'scanning' && (
          <div className="text-center">
            <p className="text-white font-semibold text-[15px] mb-1">QR kodni ramka ichiga joylashtiring</p>
            <p className="text-gray-400 text-[13px]">To'lovni amalga oshirish uchun skanerlang</p>
          </div>
        )}
      </div>

      {/* Pastki tugma */}
      <div className="relative z-10 px-6 pb-12">
        {status === 'success' ? (
          <button
            onClick={onClose}
            className="w-full h-14 bg-[#0bd39a] rounded-2xl flex items-center justify-center gap-2 text-[#03543d] font-bold text-[15px]"
          >
            <BsCheckCircleFill size={20} />
            Davom etish
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full h-14 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold text-[15px]"
          >
            <BsXCircle size={20} />
            Bekor qilish
          </button>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
