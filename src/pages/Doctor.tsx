import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ExamType = 'xray' | 'ultrasound' | 'ct_scan' | 'mri';

const examTypes: Record<ExamType, string> = {
  xray: 'أشعة عادية',
  ultrasound: 'سونار', 
  ct_scan: 'مقطعية',
  mri: 'رنين مغناطيسي'
};

const statusColors = {
  waiting: 'bg-waiting',
  current: 'bg-current',
  postponed: 'bg-postponed',
  completed: 'bg-completed',
  cancelled: 'bg-cancelled'
};

const statusText = {
  waiting: 'انتظار',
  current: 'جاري',
  postponed: 'مؤجل',
  completed: 'مكتمل',
  cancelled: 'ملغى'
};

interface Ticket {
  id: string;
  ticket_number: number;
  exam_type: ExamType;
  status: string;
  postpone_count: number;
  created_at: string;
}

const Doctor = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tickets, setTickets] = useState<Record<ExamType, Ticket[]>>({
    xray: [],
    ultrasound: [],
    ct_scan: [],
    mri: []
  });
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const { toast } = useToast();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: users } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', username)
        .eq('role', 'doctor');
      
      if (users && users.length > 0) {
        // Hash the input password and compare
        const { data: hashedPassword } = await supabase.rpc('hash_password', { password });
        
        if (hashedPassword === users[0].password_hash) {
          setIsAuthenticated(true);
          loadTickets();
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "مرحباً بك في واجهة الدكتور"
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

  const loadTickets = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('date', today)
        .in('status', ['waiting', 'current', 'postponed'])
        .order('created_at');

      if (data) {
        const groupedTickets: Record<ExamType, Ticket[]> = {
          xray: [],
          ultrasound: [],
          ct_scan: [],
          mri: []
        };

        data.forEach((ticket: any) => {
          groupedTickets[ticket.exam_type as ExamType].push(ticket);
        });

        setTickets(groupedTickets);
      }
    } catch (error) {
      toast({
        title: "خطأ في تحميل التذاكر",
        variant: "destructive"
      });
    }
  };

  const nextPatient = async (examType: ExamType) => {
    if (actionInProgress) return;
    
    setLoading(true);
    try {
      const currentTickets = tickets[examType];
      const currentPatient = currentTickets.find(t => t.status === 'current');
      const waitingPatients = currentTickets.filter(t => t.status === 'waiting').sort((a, b) => a.ticket_number - b.ticket_number);

      // Complete current patient if exists
      if (currentPatient) {
        await supabase
          .from('tickets')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', currentPatient.id);
      }

      // Move next waiting patient to current
      if (waitingPatients.length > 0) {
        await supabase
          .from('tickets')
          .update({ status: 'current' })
          .eq('id', waitingPatients[0].id);

        toast({
          title: "تم استدعاء المريض التالي",
          description: `${examTypes[examType]} - رقم ${waitingPatients[0].ticket_number}`
        });
      } else {
        toast({
          title: "لا يوجد مرضى في الانتظار",
          description: `${examTypes[examType]}`
        });
      }

      loadTickets();
      setActionInProgress(null);
    } catch (error) {
      toast({
        title: "خطأ في استدعاء المريض التالي",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const postponePatient = async (ticketId: string, examType: ExamType) => {
    try {
      const ticket = tickets[examType].find(t => t.id === ticketId);
      if (!ticket) return;

      if (ticket.postpone_count >= 4) {
        // Cancel if postponed 5 times
        await supabase
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('id', ticketId);
        
        toast({
          title: "تم إلغاء التذكرة",
          description: "تم تأجيل الحالة 5 مرات",
          variant: "destructive"
        });
      } else {
        await supabase
          .from('tickets')
          .update({ 
            status: 'postponed',
            postpone_count: ticket.postpone_count + 1
          })
          .eq('id', ticketId);

        toast({
          title: "تم تأجيل المريض",
          description: `المرة ${ticket.postpone_count + 1} من 5`
        });
      }

      loadTickets();
      setActionInProgress(null);
    } catch (error) {
      toast({
        title: "خطأ في تأجيل المريض",
        variant: "destructive"
      });
    }
  };

  const completePatient = async (ticketId: string) => {
    try {
      await supabase
        .from('tickets')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      toast({
        title: "تم إكمال الفحص",
        description: "تم إكمال فحص المريض بنجاح"
      });

      loadTickets();
      setActionInProgress(null);
    } catch (error) {
      toast({
        title: "خطأ في إكمال الفحص",
        variant: "destructive"
      });
    }
  };

  const cancelPatient = async (ticketId: string) => {
    try {
      await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', ticketId);

      toast({
        title: "تم إلغاء الفحص",
        description: "تم إلغاء فحص المريض"
      });

      loadTickets();
      setActionInProgress(null);
    } catch (error) {
      toast({
        title: "خطأ في إلغاء الفحص",
        variant: "destructive"
      });
    }
  };

  const recallPostponedPatient = async (ticketId: string) => {
    try {
      await supabase
        .from('tickets')
        .update({ status: 'waiting' })
        .eq('id', ticketId);

      toast({
        title: "تم استدعاء المريض المؤجل",
        description: "تم نقل المريض إلى قائمة الانتظار"
      });

      loadTickets();
    } catch (error) {
      toast({
        title: "خطأ في استدعاء المريض",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('doctor-tickets')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets'
          },
          () => {
            loadTickets();
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
            <CardTitle className="text-center text-2xl">واجهة الدكتور</CardTitle>
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
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">واجهة الدكتور</h1>
          <div className="flex gap-2">
            <Button onClick={loadTickets} variant="outline" size={window.innerWidth < 640 ? "sm" : "default"}>
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              تحديث
            </Button>
            <Button onClick={() => setIsAuthenticated(false)} variant="destructive" size={window.innerWidth < 640 ? "sm" : "default"}>
              تسجيل خروج
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
          {Object.entries(examTypes).map(([type, name]) => {
            const examTickets = tickets[type as ExamType];
            const currentPatient = examTickets.find(t => t.status === 'current');
            const waitingPatients = examTickets.filter(t => t.status === 'waiting').sort((a, b) => a.ticket_number - b.ticket_number);
            const postponedPatients = examTickets.filter(t => t.status === 'postponed');

            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="text-center">{name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Patient */}
                  {currentPatient ? (
                    <div className="border rounded-lg p-2 sm:p-4 bg-current/10">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-current text-xs sm:text-sm">المريض الحالي</Badge>
                        <span className="font-bold text-sm sm:text-lg">{currentPatient.ticket_number}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          size="sm"
                          onClick={() => completePatient(currentPatient.id)}
                          className="w-full h-10 text-xs font-semibold"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          إكمال
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => postponePatient(currentPatient.id, type as ExamType)}
                            className="h-10 text-xs font-semibold"
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            تأجيل
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelPatient(currentPatient.id)}
                            className="h-10 text-xs font-semibold"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription className="text-xs sm:text-sm">لا يوجد مريض حالياً</AlertDescription>
                    </Alert>
                  )}

                  {/* Next Patient Button */}
                  <Button
                    onClick={() => nextPatient(type as ExamType)}
                    disabled={loading || waitingPatients.length === 0 || !!actionInProgress}
                    className="w-full h-12 text-sm font-semibold"
                  >
                    <ChevronRight className="w-5 h-5 mr-2" />
                    المريض التالي
                    {waitingPatients.length > 0 && ` (${waitingPatients[0].ticket_number})`}
                  </Button>

                  {/* Waiting Queue */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">في الانتظار ({waitingPatients.length})</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {waitingPatients.slice(0, 5).map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{ticket.ticket_number}</span>
                          <Badge variant="outline">انتظار</Badge>
                        </div>
                      ))}
                      {waitingPatients.length > 5 && (
                        <div className="text-center text-sm text-muted-foreground">
                          +{waitingPatients.length - 5} آخرين
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Postponed Patients */}
                  {postponedPatients.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs sm:text-sm">مؤجلة ({postponedPatients.length})</h4>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {postponedPatients.map((ticket) => (
                          <div key={ticket.id} className="flex items-center justify-between p-2 bg-postponed/10 rounded">
                            <span className="font-medium text-xs sm:text-sm">{ticket.ticket_number}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => recallPostponedPatient(ticket.id)}
                                className="text-xs px-2 py-1"
                              >
                                استدعاء
                              </Button>
                              <Badge variant="outline" className="text-postponed text-xs">
                                ({ticket.postpone_count}/5)
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Doctor;