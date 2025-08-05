import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Printer, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

type ExamType = 'xray' | 'ultrasound' | 'ct_scan' | 'mri';

const examTypes: Record<ExamType, string> = {
  xray: 'أشعة عادية',
  ultrasound: 'سونار', 
  ct_scan: 'مقطعية',
  mri: 'رنين مغناطيسي'
};

const PatientQueue = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentTickets, setCurrentTickets] = useState<Record<ExamType, any[]>>({
    xray: [],
    ultrasound: [],
    ct_scan: [],
    mri: []
  });
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [emergencySelections, setEmergencySelections] = useState<Record<ExamType, boolean>>({
    xray: false,
    ultrasound: false,
    ct_scan: false,
    mri: false
  });
  const { toast } = useToast();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: users } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', username)
        .eq('role', 'staff');
      
      if (users && users.length > 0) {
        // Hash the input password and compare
        const { data: hashedPassword } = await supabase.rpc('hash_password', { password });
        
        if (hashedPassword === users[0].password_hash) {
          setIsAuthenticated(true);
          loadCurrentTickets();
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "مرحباً بك في واجهة التذاكر"
          });
        } else {
          toast({
            title: "خطأ في كلمة المرور",
            description: "كلمة المرور غير صحيحة",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "خطأ في اسم المستخدم",
          description: "اسم المستخدم غير موجود",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الاتصال",
        description: "فشل في الاتصال بقاعدة البيانات",
        variant: "destructive"
      });
    }
  };

  const createTicket = async (examType: ExamType) => {
    const isEmergency = emergencySelections[examType];
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get or create daily settings with random start numbers
      let settingsData;
      const { data: existingSettings } = await supabase
        .from('daily_settings')
        .select('*')
        .eq('date', today)
        .single();

      if (!existingSettings) {
        // Generate random start numbers for the day
        await supabase.rpc('generate_random_start_numbers');
        
        const { data: newSettings } = await supabase
          .from('daily_settings')
          .select('*')
          .eq('date', today)
          .single();
        
        settingsData = newSettings;
      } else {
        settingsData = existingSettings;
      }

      let startNumber = 1;
      if (settingsData) {
        const settingKey = `${examType}_start_number` as keyof typeof settingsData;
        startNumber = settingsData[settingKey] as number;
      }

      // Get the last ticket number for this exam type today
      const { data: lastTicket } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('exam_type', examType)
        .eq('date', today)
        .order('ticket_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = lastTicket ? lastTicket.ticket_number + 1 : startNumber;

      // Create new ticket
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ticket_number: nextNumber,
          exam_type: examType,
          date: today,
          emergency_type: isEmergency ? 'urgent' : null
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Print the ticket with secure token
        printTicket(data.ticket_number, examType, data.secure_token, isEmergency);
        
        toast({
          title: isEmergency ? "تم إنشاء تذكرة طوارئ بنجاح" : "تم إنشاء التذكرة بنجاح",
          description: `رقم التذكرة: ${data.ticket_number} - ${examTypes[examType]}${isEmergency ? ' (طوارئ)' : ''}`
        });
        
        // Reset emergency selection
        setEmergencySelections(prev => ({ ...prev, [examType]: false }));
        loadCurrentTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "خطأ في إنشاء التذكرة",
        variant: "destructive"
      });
    }
  };

  const getExamPrefix = (examType: ExamType): string => {
    const prefixes = {
      xray: 'X',
      ultrasound: 'U', 
      ct_scan: 'C',
      mri: 'M'
    };
    return prefixes[examType];
  };

  const generateQRCode = (ticketNumber: number, examType: ExamType, secureToken: string): string => {
    const patientUrl = `${window.location.origin}/patient?token=${secureToken}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&format=png&data=${encodeURIComponent(patientUrl)}`;
  };

  const printTicket = (ticketNumber: number, examType: ExamType, secureToken: string, isEmergency = false) => {
    const prefix = getExamPrefix(examType);
    const qrCodeUrl = generateQRCode(ticketNumber, examType, secureToken);
    
    const printContent = `
      <div class="print-ticket">
        <h2 style="margin: 10px 0; font-size: 18px; font-weight: bold;">مركز الحياة للأشعة والتحاليل</h2>
        <div style="margin: 15px 0;">
          <div style="font-size: 16px; margin: 5px 0;">${examTypes[examType]}</div>
          ${isEmergency ? '<div style="font-size: 16px; margin: 5px 0; color: red; font-weight: bold;">🚨 حالة طوارئ 🚨</div>' : ''}
          <div style="font-size: 24px; font-weight: bold; margin: 10px 0; ${isEmergency ? 'color: red;' : ''}">${prefix}${ticketNumber}</div>
          <div style="margin: 15px 0;">
            <img src="${qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; display: block; margin: 0 auto;" crossOrigin="anonymous" />
          </div>
          <div style="font-size: 10px; margin: 3px 0; color: #666;">امسح الكود لمتابعة دورك</div>
          ${isEmergency ? '<div style="font-size: 10px; margin: 3px 0; color: red;">سيتم استدعاؤك بأولوية عاجلة</div>' : ''}
          <div style="font-size: 12px; margin: 5px 0;">${new Date().toLocaleDateString('ar-EG')}</div>
          <div style="font-size: 12px; margin: 5px 0;">${new Date().toLocaleTimeString('ar-EG')}</div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>طباعة التذكرة</title>
            <style>
              body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; }
              .print-ticket { text-align: center; max-width: 300px; margin: 0 auto; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; padding: 0; }
                .print-ticket { padding: 10px; }
                img { max-width: 150px !important; height: 150px !important; }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const loadCurrentTickets = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('date', today)
        .in('status', ['current', 'waiting', 'postponed'])
        .order('created_at');

      if (data) {
        const groupedTickets: Record<ExamType, any[]> = {
          xray: [],
          ultrasound: [],
          ct_scan: [],
          mri: []
        };

        let emergencyTotal = 0;
        data.forEach((ticket: any) => {
          groupedTickets[ticket.exam_type as ExamType].push(ticket);
          if (ticket.emergency_type) {
            emergencyTotal++;
          }
        });

        setCurrentTickets(groupedTickets);
        setEmergencyCount(emergencyTotal);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentTickets();
      
      // Set up real-time subscription for automatic updates
      const channel = supabase
        .channel('queue-tickets')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets'
          },
          (payload) => {
            // Only reload if this is a new ticket to prevent duplicate prints
            console.log('Real-time update:', payload);
            loadCurrentTickets();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">واجهة التذاكر</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
              <div>
                <Label htmlFor="username">اسم المستخدم</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                دخول
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-4 sm:space-y-8">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">إنشاء تذكرة جديدة</h1>
            <p className="text-muted-foreground text-sm sm:text-base">اختر نوع الفحص لإنشاء تذكرة</p>
            {emergencyCount > 0 && (
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg mt-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-semibold">تنبيه: يوجد {emergencyCount} حالة طوارئ</span>
              </div>
            )}
          </div>
          <Button onClick={() => setIsAuthenticated(false)} variant="destructive">
            تسجيل خروج
          </Button>
        </div>

        {/* Create New Ticket Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Object.entries(examTypes).map(([type, name]) => {
            return (
              <Card key={type} className="medical-card">
                <CardContent className="p-4 sm:p-6 text-center">
                  <h3 className="text-sm sm:text-lg font-medium mb-3 sm:mb-4 text-foreground">{name}</h3>
                  
                  {/* Emergency Checkbox */}
                  <div className="mb-3 sm:mb-4">
                    <label className="flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emergencySelections[type as ExamType]}
                        onChange={(e) => setEmergencySelections(prev => ({ 
                          ...prev, 
                          [type]: e.target.checked 
                        }))}
                        className="w-4 h-4 text-red-600 border-2 border-red-300 rounded focus:ring-red-500"
                      />
                      <span className={`font-medium ${emergencySelections[type as ExamType] ? 'text-red-600' : 'text-muted-foreground'}`}>
                        🚨 طوارئ
                      </span>
                    </label>
                  </div>
                  
                  <Button 
                    onClick={() => createTicket(type as ExamType)}
                    className={`w-full text-xs sm:text-sm ${emergencySelections[type as ExamType] ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    size="default"
                  >
                    <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {emergencySelections[type as ExamType] ? 'إنشاء تذكرة طوارئ' : 'إنشاء تذكرة'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Current Queue Status */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-xl font-medium text-center">الطابور الحالي</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Object.entries(examTypes).map(([type, name]) => {
              const examTickets = currentTickets[type as ExamType] || [];
              const currentPatient = examTickets.find(t => t.status === 'current');
              const waitingCount = examTickets.filter(t => t.status === 'waiting').length;
              const prefix = getExamPrefix(type as ExamType);

              return (
                <Card key={type} className="modern-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-center text-sm sm:text-base font-medium">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-3 pt-0">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">المريض الحالي</p>
                      <p className="text-lg sm:text-xl font-semibold text-foreground">
                        {currentPatient ? `${prefix}${currentPatient.ticket_number}` : '--'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">في الانتظار</p>
                      <Badge variant="secondary" className="text-sm px-2 py-1">
                        {waitingCount}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PatientQueue;