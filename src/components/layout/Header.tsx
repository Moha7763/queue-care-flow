import { Heart } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground py-4 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Heart className="w-8 h-8 text-red-400" />
          <h1 className="text-3xl md:text-4xl font-bold">
            مركز الحياة للأشعة والتحاليل
          </h1>
          <Heart className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-primary-foreground/80 text-sm md:text-base">
          نخدم صحتك بأحدث التقنيات
        </p>
      </div>
    </header>
  );
};

export default Header;