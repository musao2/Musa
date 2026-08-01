import React from 'react';
import { 
  Bell, 
  CheckCheck, 
  X, 
  Wallet, 
  Clock, 
  Sparkles,
  Inbox
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatNotificationTime, formatAmount } from '../utils/formatDate';

const NotificationModal = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-start sm:pt-16 p-0 sm:p-4 animate-fadeIn">
      {/* Orqa fon overlay (Fonni bosganda modal yopiladi) */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Oynasi */}
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[80vh] border border-gray-100 z-10 animate-slide-down">
        
        {/* Modal Yuqori Paneli (Header) */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#f0f7f4] text-[#0f7b4c] rounded-2xl flex items-center justify-center relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-[17px] text-gray-900 leading-tight">
                  Bildirishnomalar
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-[#0f7b4c] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} ta yangi
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-400">
                Tizim va keshbek bildirishnomalari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Barchasini o'qilgan deb belgilash"
                className="flex items-center gap-1.5 text-[12px] font-bold text-[#0f7b4c] hover:bg-[#f0f7f4] px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Barchasini o'qilgan qilish</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Kontent Ro'yxati */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-50">
          
          {loading && notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#0f7b4c]/20 border-t-[#0f7b4c] rounded-full animate-spin" />
              <p className="text-[13px] text-gray-400 font-medium">Bildirishnomalar yuklanmoqda...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#f0f7f4] text-[#0f7b4c] rounded-3xl flex items-center justify-center mb-3 shadow-inner">
                <Inbox className="w-8 h-8 opacity-70" />
              </div>
              <h4 className="font-extrabold text-gray-800 text-[16px]">Hali bildirishnomalar yo'q</h4>
              <p className="text-gray-400 text-[13px] mt-1 max-w-[240px] leading-relaxed">
                Admin tomonidan o'tkazilgan pul va SMS izohlar shu yerda paydo bo'ladi.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.is_read;
              const formattedAmt = formatAmount(item.amount);

              return (
                <div
                  key={item.id}
                  onClick={() => isUnread && markAsRead(item.id)}
                  className={`relative group p-4 rounded-2xl transition-all cursor-pointer border ${
                    isUnread 
                      ? 'bg-[#f0fdf4] border-[#bbf7d0] shadow-xs border-l-4 border-l-[#0f7b4c]' 
                      : 'bg-white border-gray-100 hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Ikonka */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                      isUnread 
                        ? 'bg-[#0f7b4c] text-white' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.amount ? (
                        <Wallet className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>

                    {/* Matn va Tafsilotlar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-[14px] leading-snug ${
                          isUnread ? 'font-extrabold text-gray-900' : 'font-semibold text-gray-700'
                        }`}>
                          {item.title || 'Bildirishnoma'}
                        </h4>
                        
                        {/* O'qilmagan nuqta */}
                        {isUnread && (
                          <span className="w-2.5 h-2.5 bg-[#0f7b4c] rounded-full shrink-0 mt-1" />
                        )}
                      </div>

                      {/* Izoh / SMS matni */}
                      {item.message && (
                        <p className={`text-[13px] mt-1 leading-relaxed break-words ${
                          isUnread ? 'text-gray-800 font-medium' : 'text-gray-500'
                        }`}>
                          {item.message}
                        </p>
                      )}

                      {/* Summa va Vaqt */}
                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-gray-100/60 text-[12px]">
                        {formattedAmt ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#0f7b4c] bg-[#e6f4ed] px-2.5 py-0.5 rounded-lg">
                            <Sparkles className="w-3 h-3" />
                            {formattedAmt}
                          </span>
                        ) : <span />}

                        <span className="flex items-center gap-1 text-gray-400 text-[11px] font-medium">
                          <Clock className="w-3 h-3" />
                          {formatNotificationTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

        </div>

        {/* Modal Pastki Paneli (Footer) */}
        {notifications.length > 0 && (
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-center sticky bottom-0">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-[13px] font-bold text-[#0f7b4c] disabled:text-gray-400 hover:underline transition-all cursor-pointer disabled:cursor-default"
            >
              {unreadCount > 0 ? "Barchasini o'qilgan deb belgilash" : "Barcha xabarlar o'qilgan"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationModal;
