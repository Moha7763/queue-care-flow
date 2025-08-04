import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Camera, Send, Phone, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Feedback = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: '',
    image: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "خطأ",
          description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
          variant: "destructive"
        });
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const sendToTelegram = async () => {
    setLoading(true);
    try {
      const botToken = '7688434662:AAEClituZzBFqlzb_gebf28D1zsZwoEz5hI';
      const chatId = '@alhayascan';
      
      let message = `🏥 رسالة جديدة من مركز الحياة للأشعة\n\n`;
      message += `👤 الاسم: ${formData.name}\n`;
      message += `📱 الهاتف: ${formData.phone}\n`;
      message += `💬 الرسالة: ${formData.message}\n`;
      message += `⏰ التوقيت: ${new Date().toLocaleString('ar-EG')}`;

      // Send text message
      const textResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (!textResponse.ok) {
        throw new Error('فشل في إرسال الرسالة النصية');
      }

      // Send image if exists
      if (formData.image) {
        const formDataToSend = new FormData();
        formDataToSend.append('chat_id', chatId);
        formDataToSend.append('photo', formData.image);
        formDataToSend.append('caption', `📸 صورة مرفقة من: ${formData.name}`);

        const imageResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formDataToSend
        });

        if (!imageResponse.ok) {
          console.error('فشل في إرسال الصورة');
        }
      }

      toast({
        title: "تم الإرسال بنجاح! ✅",
        description: "شكراً لك، سيتم الرد عليك في أقرب وقت",
        duration: 5000
      });

      // Reset form
      setFormData({
        name: '',
        phone: '',
        message: '',
        image: null
      });

      // Reset file input
      const fileInput = document.getElementById('image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error sending to Telegram:', error);
      toast({
        title: "خطأ في الإرسال",
        description: "حاول مرة أخرى أو اتصل بنا مباشرة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.message) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    sendToTelegram();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">الشكاوى والمقترحات</h1>
          <p className="text-muted-foreground text-lg">
            رأيك يهمنا لتطوير خدماتنا وتحسين تجربتك
          </p>
        </div>

        {/* Main Form */}
        <Card className="modern-card">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-center text-primary">
              نموذج الشكاوى والمقترحات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    الاسم الكامل *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسمك الكامل"
                    required
                    className="text-right"
                  />
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="01234567890"
                    required
                    className="text-right"
                  />
                </div>
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <Label htmlFor="message" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  رسالتك (شكوى أو مقترح) *
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="اكتب شكواك أو مقترحك هنا... كلما كانت التفاصيل أكثر، كلما تمكنا من مساعدتك بشكل أفضل"
                  required
                  className="text-right min-h-[120px] resize-none"
                  rows={5}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  إرفاق صورة (اختياري)
                </Label>
                <div className="space-y-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك إرفاق صورة إذا كانت تساعد في توضيح مشكلتك (حد أقصى 5 ميجابايت)
                  </p>
                  {formData.image && (
                    <p className="text-sm text-green-600">
                      ✅ تم اختيار الصورة: {formData.image.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full text-lg py-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    إرسال الرسالة
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-primary">
                طرق التواصل الأخرى
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>الهاتف: 01234567890</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span>نرد خلال 24 ساعة</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Feedback;