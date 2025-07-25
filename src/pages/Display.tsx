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
  xray: 'bg-blue-500',
  ultrasound: 'bg-green-500',
  ct_scan: 'bg-purple-500',
  mri: 'bg-red-500'
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
    
    // Set up real-time subscription for automatic updates
    const channel = supabase
      .channel('display-tickets')
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

    // Auto refresh every 10 seconds
    const interval = setInterval(loadTickets, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">شاشة عرض المرضى</h1>
          <p className="text-xl text-muted-foreground">مركز الأشعة</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(examTypes).map(([type, name]) => {
            const examTickets = tickets[type as ExamType];
            const currentPatient = examTickets.find(t => t.status === 'current');
            const waitingPatients = examTickets
              .filter(t => t.status === 'waiting')
              .sort((a, b) => a.ticket_number - b.ticket_number);
            const nextPatients = waitingPatients.slice(0, 5);

            return (
              <Card key={type} className="min-h-[400px]">
                <CardHeader className={`text-white ${examColors[type as ExamType]}`}>
                  <CardTitle className="text-center text-3xl font-bold">
                    {name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {/* Current Patient */}
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4">المريض الحالي</h3>
                    {currentPatient ? (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                        <div className="text-6xl font-bold text-blue-600 mb-2">
                          {currentPatient.ticket_number}
                        </div>
                        <Badge className="bg-blue-500 text-lg px-4 py-2">
                          جاري الفحص
                        </Badge>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
                        <div className="text-4xl font-bold text-gray-400 mb-2">
                          --
                        </div>
                        <Badge variant="outline" className="text-lg px-4 py-2">
                          لا يوجد
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Next Patients */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-center">
                      المرضى القادمون
                    </h3>
                    {nextPatients.length > 0 ? (
                      <div className="grid grid-cols-5 gap-2">
                        {nextPatients.map((ticket, index) => (
                          <div 
                            key={ticket.id} 
                            className={`text-center p-3 rounded-lg border-2 ${
                              index === 0 
                                ? 'bg-yellow-50 border-yellow-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className={`text-2xl font-bold ${
                              index === 0 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {ticket.ticket_number}
                            </div>
                            {index === 0 && (
                              <Badge variant="outline" className="text-xs mt-1">
                                التالي
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        لا يوجد مرضى في الانتظار
                      </div>
                    )}
                  </div>

                  {/* Waiting Count */}
                  <div className="text-center pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      إجمالي المنتظرين
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
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