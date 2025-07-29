import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Printer } from 'lucide-react';

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
          date: today
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Print the ticket
        printTicket(data.ticket_number, examType);
        
        toast({
          title: "تم إنشاء التذكرة بنجاح",
          description: `رقم التذكرة: ${data.ticket_number} - ${examTypes[examType]}`
        });
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

  const generateQRCode = (ticketNumber: number, examType: ExamType): string => {
    const patientUrl = `${window.location.origin}/patient?ticket=${ticketNumber}&type=${examType}&date=${new Date().toISOString().split('T')[0]}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&format=png&data=${encodeURIComponent(patientUrl)}`;
  };

  const printTicket = (ticketNumber: number, examType: ExamType) => {
    const prefix = getExamPrefix(examType);
    const qrCodeUrl = generateQRCode(ticketNumber, examType);
    
      const printContent = `
        <div class="print-ticket">
          <h2 style="margin: 10px 0; font-size: 18px; font-weight: bold;">مركز الحياة للأشعة</h2>
          <div style="margin: 15px 0;">
            <div style="font-size: 16px; margin: 5px 0;">${examTypes[examType]}</div>
            <div style="font-size: 24px; font-weight: bold; margin: 10px 0;">${prefix}${ticketNumber}</div>
            <div style="margin: 15px 0;">
              <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 120px;" />
            </div>
            <div style="font-size: 10px; margin: 3px 0; color: #666;">امسح الكود لمتابعة دورك</div>
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
              @media print {
                body { margin: 0; padding: 0; }
                .print-ticket { padding: 10px; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
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

        data.forEach((ticket: any) => {
          groupedTickets[ticket.exam_type as ExamType].push(ticket);
        });

        setCurrentTickets(groupedTickets);
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
          () => {
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
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">إنشاء تذكرة جديدة</h1>
            <p className="text-muted-foreground text-sm sm:text-base">اختر نوع الفحص لإنشاء تذكرة</p>
          </div>
          <Button onClick={() => setIsAuthenticated(false)} variant="destructive">
            تسجيل خروج
          </Button>
        </div>

        {/* Create New Ticket Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {Object.entries(examTypes).map(([type, name]) => (
            <Card key={type} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-3 sm:p-6 text-center">
                <h3 className="text-sm sm:text-xl font-semibold mb-2 sm:mb-4">{name}</h3>
                <Button 
                  onClick={() => createTicket(type as ExamType)}
                  className="w-full text-xs sm:text-sm"
                  size="lg"
                >
                  <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  إنشاء تذكرة
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Current Queue Status */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-center">الطابور الحالي</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Object.entries(examTypes).map(([type, name]) => {
              const examTickets = currentTickets[type as ExamType] || [];
              const currentPatient = examTickets.find(t => t.status === 'current');
              const waitingCount = examTickets.filter(t => t.status === 'waiting').length;
              const prefix = getExamPrefix(type as ExamType);

              return (
                <Card key={type}>
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-center text-sm sm:text-lg">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-2 sm:space-y-3 pt-0">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">المريض الحالي</p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {currentPatient ? `${prefix}${currentPatient.ticket_number}` : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">في الانتظار</p>
                      <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-3 py-1">
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
    </div>
  );
};

export default PatientQueue;