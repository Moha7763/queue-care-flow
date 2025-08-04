import { MapPin, Phone, Heart } from 'lucide-react';

const Footer = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/201010657763', '_blank');
  };

  return (
    <footer className="bg-muted/50 border-t mt-8 py-6 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* الفرع الأول */}
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">الفرع الأول</h3>
            </div>
            <p className="text-muted-foreground mb-2">
              كفر الزيات - شارع الجيش أول المنشية
            </p>
            <p className="text-muted-foreground mb-3">
              أمام مضيفة الست زكية
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">للاستفسار: 01234567890</span>
            </div>
          </div>

          {/* الفرع الثاني */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">الفرع الثاني</h3>
            </div>
            <p className="text-muted-foreground mb-2">
              كفر الزيات - شارع السوق
            </p>
            <p className="text-muted-foreground mb-3">
              بجوار صيدلية الشعب
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">للاستفسار: 01234567890</span>
            </div>
          </div>
        </div>

        {/* خط فاصل */}
        <div className="border-t border-border pt-4">
          <div className="text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p>تم البرمجة لمركز الحياة للأشعة والتحاليل بإشراف من</p>
              <Heart className="w-4 h-4 text-red-500" />
            </div>
            <button
              onClick={handleWhatsAppClick}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Mohamed Ashraf
            </button>
            <p className="mt-1 text-xs">
              💚 نظام آمن لإنقاذ الأرواح 💚
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;