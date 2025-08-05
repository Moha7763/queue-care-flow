import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';
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

interface Ticket {
  id: string;
  ticket_number: number;
  exam_type: ExamType;
  status: string;
  postpone_count: number;
  created_at: string;
  emergency_type?: string;
}

const Display = () => {
  const [tickets, setTickets] = useState<Record<ExamType, Ticket[]>>({
    xray: [],
    ultrasound: [],
    ct_scan: [],
    mri: []
  });
  const [emergencyCount, setEmergencyCount] = useState(0);

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

        let emergencyTotal = 0;
        data.forEach((ticket: any) => {
          groupedTickets[ticket.exam_type as ExamType].push(ticket);
          if (ticket.emergency_type) {
            emergencyTotal++;
          }
        });

        setTickets(groupedTickets);
        setEmergencyCount(emergencyTotal);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  useEffect(() => {
    loadTickets();
    
    // Set up real-time subscription with improved handling
    const channel = supabase
      .channel('display-tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Display real-time update received:', payload);
          // Reload tickets immediately when any change occurs
          setTimeout(() => loadTickets(), 100);
        }
      )
      .subscribe((status) => {
        console.log('Display realtime subscription status:', status);
      });

    // Auto refresh every 2 seconds as backup for fast updates
    const interval = setInterval(() => {
      loadTickets();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-3 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">شاشة عرض المرضى</h1>
          {emergencyCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg mb-4">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">يوجد {emergencyCount} حالة طوارئ</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {Object.entries(examTypes).map(([type, name]) => {
            const examTickets = tickets[type as ExamType];
            const currentPatient = examTickets.find(t => t.status === 'current');
            // Sort waiting patients by priority: emergency cases after 2 patients
            const waitingPatients = examTickets.filter(t => t.status === 'waiting');
            const emergencyPatients = waitingPatients.filter(t => t.emergency_type);
            const regularPatients = waitingPatients.filter(t => !t.emergency_type);
            
            // Regular patients first 2, then emergency, then rest
            const sortedWaiting = [
              ...regularPatients.slice(0, 2).sort((a, b) => a.ticket_number - b.ticket_number),
              ...emergencyPatients.sort((a, b) => a.ticket_number - b.ticket_number),
              ...regularPatients.slice(2).sort((a, b) => a.ticket_number - b.ticket_number)
            ];
            const nextPatients = sortedWaiting.slice(0, 5);

            return (
              <Card key={type} className="min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]">
                <CardHeader className={`text-white ${examColors[type as ExamType]} p-2 sm:p-4 lg:p-6`}>
                  <CardTitle className="text-center text-sm sm:text-lg lg:text-3xl font-bold">
                    {name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 lg:p-8 space-y-2 sm:space-y-4 lg:space-y-6">
                   {/* Current Patient */}
                   <div className="text-center">
                     <h3 className="text-xs sm:text-sm lg:text-xl font-semibold mb-2 sm:mb-4">المريض الحالي</h3>
                     {currentPatient ? (
                       <div className={`border-2 rounded-lg p-2 sm:p-4 lg:p-6 ${
                         currentPatient.emergency_type 
                           ? 'bg-red-50 border-red-300' 
                           : 'bg-current/10 border-current/20'
                       }`}>
                         <div className={`text-2xl sm:text-4xl lg:text-6xl font-bold mb-1 sm:mb-2 ${
                           currentPatient.emergency_type 
                             ? 'text-red-600' 
                             : 'text-current'
                         }`}>
                           {currentPatient.emergency_type && '🚨 '}
                           {examPrefixes[type as ExamType]}{currentPatient.ticket_number}
                         </div>
                         <div className="space-y-1">
                           <Badge className={`text-xs sm:text-sm lg:text-lg px-2 sm:px-4 py-1 sm:py-2 ${
                             currentPatient.emergency_type 
                               ? 'bg-red-600 text-white' 
                               : 'bg-current text-white'
                           }`}>
                             {currentPatient.emergency_type ? 'طوارئ - جاري الفحص' : 'جاري الفحص'}
                           </Badge>
                         </div>
                       </div>
                    ) : (
                      <div className="bg-muted border-2 border-border rounded-lg p-2 sm:p-4 lg:p-6">
                        <div className="text-xl sm:text-2xl lg:text-4xl font-bold text-muted-foreground mb-1 sm:mb-2">
                          --
                        </div>
                        <Badge variant="outline" className="text-xs sm:text-sm lg:text-lg px-2 sm:px-4 py-1 sm:py-2">
                          لا يوجد
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Next Patients */}
                  <div>
                    <h3 className="text-xs sm:text-sm lg:text-lg font-semibold mb-2 sm:mb-4 text-center">
                      المرضى القادمون
                    </h3>
                    {nextPatients.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2">
                         {nextPatients.slice(0, window.innerWidth < 640 ? 3 : 5).map((ticket, index) => (
                           <div 
                             key={ticket.id} 
                             className={`text-center p-1 sm:p-2 lg:p-3 rounded-lg border-2 ${
                               index === 0 
                                 ? 'bg-waiting/10 border-waiting/20' 
                                 : ticket.emergency_type
                                 ? 'bg-red-50 border-red-300'
                                 : 'bg-muted border-border'
                             }`}
                           >
                             <div className={`text-sm sm:text-lg lg:text-2xl font-bold ${
                               index === 0 
                                 ? 'text-waiting' 
                                 : ticket.emergency_type
                                 ? 'text-red-600'
                                 : 'text-muted-foreground'
                             }`}>
                               {ticket.emergency_type && '🚨 '}
                               {examPrefixes[type as ExamType]}{ticket.ticket_number}
                             </div>
                             {index === 0 && (
                               <Badge variant="outline" className="text-xs mt-1 hidden sm:inline-flex">
                                 {ticket.emergency_type ? 'طوارئ التالي' : 'التالي'}
                               </Badge>
                             )}
                           </div>
                         ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-xs sm:text-sm">
                        لا يوجد مرضى في الانتظار
                      </div>
                    )}
                  </div>

                  {/* Waiting Count */}
                  <div className="text-center pt-2 sm:pt-4 border-t">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      إجمالي المنتظرين
                    </div>
                     <div className="text-lg sm:text-xl lg:text-2xl font-bold text-postponed">
                       {sortedWaiting.length}
                     </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live indicator */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            تحديث مباشر
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Display;