export type SupportedLocale = 'en' | 'ta' | 'hi';

export interface LocalizedNotificationTemplate {
  templateKey: string;
  en: { title: string; body: string };
  ta: { title: string; body: string };
  hi: { title: string; body: string };
}

export const NOTIFICATION_TEMPLATES: Record<string, LocalizedNotificationTemplate> = {
  ORDER_CONFIRMED: {
    templateKey: 'ORDER_CONFIRMED',
    en: {
      title: 'Order Confirmed',
      body: 'Your order #{orderId} has been confirmed by {merchantName}.',
    },
    ta: {
      title: 'ஆர்டர் உறுதி செய்யப்பட்டது',
      body: 'உங்கள் ஆர்டர் #{orderId} {merchantName} ஆல் உறுதி செய்யப்பட்டுள்ளது.',
    },
    hi: {
      title: 'ऑर्डर की पुष्टि हुई',
      body: 'आपका ऑर्डर #{orderId} {merchantName} द्वारा स्वीकार कर लिया गया है।',
    },
  },
  PARTNER_ARRIVED: {
    templateKey: 'PARTNER_ARRIVED',
    en: { title: 'Partner Arrived', body: 'Delivery partner has arrived at your location.' },
    ta: { title: 'டெலிவரி பார்ட்னர் வந்துவிட்டார்', body: 'டெலிவரி பார்ட்னர் உங்கள் இருப்பிடத்திற்கு வந்துவிட்டார்.' },
    hi: { title: 'डिलीवरी पार्टनर आ गया', body: 'डिलीवरी पार्टनर आपके पते पर पहुँच गया है।' },
  },
  ORDER_DELIVERED: {
    templateKey: 'ORDER_DELIVERED',
    en: { title: 'Order Delivered', body: 'Your order #{orderId} was delivered safely. Enjoy!' },
    ta: {
      title: 'ஆர்டர் டெலிவரி செய்யப்பட்டது',
      body: 'உங்கள் ஆர்டர் #{orderId} வெற்றிகரமாக டெலிவரி செய்யப்பட்டது.',
    },
    hi: {
      title: 'ऑर्डर डिलीवर हो गया',
      body: 'आपका ऑर्डर #{orderId} सफलतापूर्वक डिलीवर कर दिया गया है।',
    },
  },
};
