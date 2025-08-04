import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Users, Activity, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

type ExamType = 'xray' | 'ultrasound' | 'ct_scan' | 'mri';

const examTypes: Record<ExamType, string> = {
  xray: 'أشعة عادية',
  ultrasound: 'سونار', 
  ct_scan: 'مقطعية',
  mri: 'رنين مغناطيسي'
};

const examColors: Record<ExamType, string> = {
  xray: 'bg-xray text-white',
  ultrasound: 'bg-ultrasound text-white',
  ct_scan: 'bg-ct text-white',
  mri: 'bg-mri text-white'
};

const examPrefixes: Record<ExamType, string> = {
  xray: 'X',
  ultrasound: 'U',
  ct_scan: 'C',
  mri: 'M'
};

interface PatientData {
  ticketNumber: number;
  examType: ExamType;
  status: string;
  position: number;
  totalWaiting: number;
  currentPatient: number | null;
  isCurrentPatient: boolean;
  emergencyType?: string;
}

const PatientView = () => {
  const [searchParams] = useSearchParams();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string>('');
  const [newCaseCount, setNewCaseCount] = useState<number>(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const { toast } = useToast();

  // Initialize audio context after user interaction
  const initAudioContext = () => {
    if (!audioContext && !userInteracted) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      setUserInteracted(true);
    }
  };

  // Prevent page closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'هل أنت متأكد من مغادرة الصفحة؟ ستفقد تنبيهات الطابور.';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Keep page active even when hidden
        navigator.serviceWorker?.getRegistration().then(registration => {
          if (registration) {
            registration.showNotification('مركز الحياة للأشعة', {
              body: 'النظام يعمل في الخلفية لتنبيهك عند دورك',
              icon: '/favicon.ico',
              tag: 'queue-status'
            });
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Enhanced vibration and sound functions
  const vibrate = (pattern: number[] = [200, 100, 200, 100, 200]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const strongVibrate = () => {
    if ('vibrate' in navigator) {
      // Strong vibration pattern for your turn
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
    }
  };

  const playNotificationSound = async () => {
    try {
      let ctx = audioContext;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
      }
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Create multiple oscillators for richer sound
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // First tone
      oscillator1.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5);
      
      // Second harmony tone
      oscillator2.frequency.setValueAtTime(1000, ctx.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      
      oscillator1.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 1);
      oscillator2.start(ctx.currentTime);
      oscillator2.stop(ctx.currentTime + 1);

      // Show notification if page is hidden
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🔔 دورك الآن!', {
          body: 'يرجى التوجه إلى غرفة الفحص',
          icon: '/favicon.ico',
          tag: 'your-turn'
        });
      }
    } catch (e) {
      console.log('Sound not supported:', e);
    }
  };

  // Test vibration and sound function
  const testVibrationAndSound = async () => {
    initAudioContext();
    strongVibrate();
    await playNotificationSound();
    toast({
      title: "اختبار الاهتزاز والصوت",
      description: "تم تشغيل الاهتزاز والصوت للاختبار"
    });
  };

  // Get patient info from secure token
  const getPatientFromParams = () => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('رابط التذكرة غير صحيح');
      setLoading(false);
      return null;
    }
    
    return { secureToken: token };
  };

  const loadPatientStatus = async () => {
    const patientInfo = getPatientFromParams();
    if (!patientInfo) return;

    try {
      // Find our ticket using secure token
      const { data: ourTicket } = await supabase
        .from('tickets')
        .select('*')
        .eq('secure_token', patientInfo.secureToken)
        .single();

      if (!ourTicket) {
        setError('التذكرة غير موجودة أو انتهت صلاحيتها');
        return;
      }

      // Get all tickets for the same exam type and date
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('exam_type', ourTicket.exam_type)
        .eq('date', ourTicket.date)
        .in('status', ['waiting', 'current', 'postponed'])
        .order('ticket_number');

      if (!tickets) {
        setError('لا توجد بيانات للتذاكر');
        return;
      }

      // Count emergency tickets
      const emergencyTotal = tickets.filter(t => t.emergency_type).length;
      setEmergencyCount(emergencyTotal);

      // Count new cases since last check
      const currentNewCaseCount = tickets.filter(t => t.status === 'waiting').length;
      if (newCaseCount > 0 && currentNewCaseCount > newCaseCount) {
        // New case entered - light vibration and sound
        vibrate([100, 50, 100]);
        await playNotificationSound();
        toast({
          title: "حالة جديدة",
          description: "تم دخول حالة جديدة للطابور"
        });
      }
      setNewCaseCount(currentNewCaseCount);

      // Find current patient
      const currentPatient = tickets.find(t => t.status === 'current');
      const currentPatientNumber = currentPatient?.ticket_number || null;

      // Calculate position in queue
      const waitingTickets = tickets
        .filter(t => t.status === 'waiting')
        .sort((a, b) => a.ticket_number - b.ticket_number);
      
      const ourPosition = waitingTickets.findIndex(t => t.ticket_number === ourTicket.ticket_number) + 1;
      const isCurrentPatient = ourTicket.status === 'current';

      const newPatientData: PatientData = {
        ticketNumber: ourTicket.ticket_number,
        examType: ourTicket.exam_type,
        status: ourTicket.status,
        position: isCurrentPatient ? 0 : ourPosition,
        totalWaiting: waitingTickets.length,
        currentPatient: currentPatientNumber,
        isCurrentPatient,
        emergencyType: ourTicket.emergency_type
      };

      // Check if it's our turn (status changed to current)
      if (lastStatus !== 'current' && newPatientData.isCurrentPatient) {
        strongVibrate();
        await playNotificationSound();
        
        // Repeat alert every 10 seconds until acknowledged
        const alertInterval = setInterval(async () => {
          strongVibrate();
          await playNotificationSound();
        }, 10000);
        
        setTimeout(() => clearInterval(alertInterval), 60000); // Stop after 1 minute
        
        toast({
          title: "🔔 دورك الآن!",
          description: "يرجى التوجه إلى غرفة الفحص",
          duration: 10000,
        });
      }

      setPatientData(newPatientData);
      setLastStatus(newPatientData.status);
      setError(null);
    } catch (error) {
      console.error('Error loading patient status:', error);
      setError('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientStatus();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('patient-view-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          loadPatientStatus();
        }
      )
      .subscribe();

    // Auto refresh every 5 seconds
    const interval = setInterval(() => {
      loadPatientStatus();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [searchParams, lastStatus, newCaseCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center p-4 min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-lg">جاري تحميل بيانات المريض...</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center p-4 min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">خطأ</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={() => window.location.reload()}>
                  إعادة المحاولة
                </Button>
                <Button onClick={testVibrationAndSound} variant="outline" className="w-full">
                  اختبار الاهتزاز والصوت
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (!patientData) return null;

  const prefix = examPrefixes[patientData.examType];
  const examName = examTypes[patientData.examType];
  const examColor = examColors[patientData.examType];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Emergency Alert */}
        {emergencyCount > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">
                  تنبيه: يوجد {emergencyCount} حالة طوارئ قد تؤثر على أوقات الانتظار
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Ticket Info */}
        <Card>
          <CardHeader className={`text-white ${examColor}`}>
            <CardTitle className="text-center text-2xl">
              {examName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">رقم التذكرة</p>
                <div className={`text-4xl font-bold ${
                  patientData.emergencyType ? 'text-red-600' : 'text-primary'
                }`}>
                  {patientData.emergencyType && '🚨 '}
                  {prefix}{patientData.ticketNumber}
                  {patientData.emergencyType && ' 🚨'}
                </div>
                {patientData.emergencyType && (
                  <Badge className="bg-red-600 text-white text-sm px-3 py-1 mt-2">
                    حالة طوارئ - أولوية عاجلة
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-current" />
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge 
                    className={`text-sm px-3 py-1 ${
                      patientData.isCurrentPatient 
                        ? 'bg-current text-white'
                        : patientData.status === 'waiting'
                        ? 'bg-waiting text-white'
                        : 'bg-postponed text-white'
                    }`}
                  >
                    {patientData.isCurrentPatient ? 'دورك الآن!' 
                     : patientData.status === 'waiting' ? 'في الانتظار'
                     : 'مؤجل'}
                  </Badge>
                </div>
                
                <div className="text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">المريض الحالي</p>
                  <p className="text-lg font-semibold">
                    {patientData.currentPatient ? `${prefix}${patientData.currentPatient}` : '--'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <Users className="w-8 h-8 mx-auto mb-2 text-waiting" />
                <p className="text-sm text-muted-foreground mb-1">موقعك في الطابور</p>
                <p className="text-2xl font-bold text-waiting">
                  {patientData.isCurrentPatient ? '🎯' : patientData.position || '--'}
                </p>
              </div>
              <div>
                <Clock className="w-8 h-8 mx-auto mb-2 text-postponed" />
                <p className="text-sm text-muted-foreground mb-1">إجمالي المنتظرين</p>
                <p className="text-2xl font-bold text-postponed">
                  {patientData.totalWaiting}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Button 
                onClick={testVibrationAndSound}
                className="w-full"
                variant="outline"
              >
                🔔 اختبار الاهتزاز والصوت
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>💡 احتفظ بالصفحة مفتوحة لتلقي التنبيهات</p>
                <p>🔊 الصوت والاهتزاز سيعملان عند دورك</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Status */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            تحديث مباشر - آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PatientView;
