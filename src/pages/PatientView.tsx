import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Users, Activity } from 'lucide-react';

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
}

const PatientView = () => {
  const [searchParams] = useSearchParams();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string>('');
  const [newCaseCount, setNewCaseCount] = useState<number>(0);
  const { toast } = useToast();

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

  const playNotificationSound = () => {
    try {
      // Create a longer, more noticeable sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Sound not supported:', e);
    }
  };

  // Test vibration and sound function
  const testVibrationAndSound = () => {
    strongVibrate();
    playNotificationSound();
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

      // Count new cases since last check
      const currentNewCaseCount = tickets.filter(t => t.status === 'waiting').length;
      if (newCaseCount > 0 && currentNewCaseCount > newCaseCount) {
        // New case entered - light vibration
        vibrate([100, 50, 100]);
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
        isCurrentPatient
      };

      // Check if it's our turn (status changed to current)
      if (lastStatus !== 'current' && newPatientData.isCurrentPatient) {
        strongVibrate();
        playNotificationSound();
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">جاري تحميل بيانات المريض...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
    );
  }

  if (!patientData) return null;

  const prefix = examPrefixes[patientData.examType];
  const examName = examTypes[patientData.examType];
  const examColor = examColors[patientData.examType];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">مركز الحياة للأشعة</h1>
          <p className="text-muted-foreground">متابعة دور المريض</p>
        </div>

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
                <div className="text-4xl font-bold text-primary">
                  {prefix}{patientData.ticketNumber}
                </div>
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
        {!patientData.isCurrentPatient && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Users className="w-8 h-8 mx-auto text-waiting" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">موقعك في الطابور</p>
                  <div className="text-3xl font-bold text-waiting">
                    {patientData.position > 0 ? patientData.position : 'غير محدد'}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    إجمالي المرضى في الانتظار: <span className="font-semibold">{patientData.totalWaiting}</span>
                  </p>
                  {patientData.position > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      باقي {patientData.position} مريض قبل دورك
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Turn Alert */}
        {patientData.isCurrentPatient && (
          <Card className="border-current border-2 bg-current/10">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h2 className="text-2xl font-bold text-current mb-2">
                دورك الآن!
              </h2>
              <p className="text-muted-foreground">
                يرجى التوجه إلى غرفة الفحص
              </p>
            </CardContent>
          </Card>
        )}

        {/* Live indicator and test button */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            تحديث مباشر
          </div>
          <Button onClick={testVibrationAndSound} variant="outline" size="sm">
            اختبار الاهتزاز والصوت
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PatientView;