import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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
}

const Display = () => {
  const [tickets, setTickets] = useState<Record<ExamType, Ticket[]>>({
    xray: [],
    ultrasound: [],
    ct_scan: [],
    mri: []
  });

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
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">شاشة عرض المرضى</h1>
          <p className="text-sm sm:text-xl text-muted-foreground">مركز الحياة للأشعة</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {Object.entries(examTypes).map(([type, name]) => {
            const examTickets = tickets[type as ExamType];
            const currentPatient = examTickets.find(t => t.status === 'current');
            const waitingPatients = examTickets
              .filter(t => t.status === 'waiting')
              .sort((a, b) => a.ticket_number - b.ticket_number);
            const nextPatients = waitingPatients.slice(0, 5);

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
                      <div className="bg-current/10 border-2 border-current/20 rounded-lg p-2 sm:p-4 lg:p-6">
                        <div className="text-2xl sm:text-4xl lg:text-6xl font-bold text-current mb-1 sm:mb-2">
                          {examPrefixes[type as ExamType]}{currentPatient.ticket_number}
                        </div>
                        <Badge className="bg-current text-xs sm:text-sm lg:text-lg px-2 sm:px-4 py-1 sm:py-2">
                          جاري الفحص
                        </Badge>
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
                                : 'bg-muted border-border'
                            }`}
                          >
                            <div className={`text-sm sm:text-lg lg:text-2xl font-bold ${
                              index === 0 ? 'text-waiting' : 'text-muted-foreground'
                            }`}>
                              {examPrefixes[type as ExamType]}{ticket.ticket_number}
                            </div>
                            {index === 0 && (
                              <Badge variant="outline" className="text-xs mt-1 hidden sm:inline-flex">
                                التالي
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
                      {waitingPatients.length}
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
    </div>
  );
};

export default Display;