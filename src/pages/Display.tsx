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
            // Fixed sorting: emergency cases after every 2 regular cases
            const waitingPatients = examTickets.filter(t => t.status === 'waiting');
            const emergencyPatients = waitingPatients.filter(t => t.emergency_type).sort((a, b) => a.ticket_number - b.ticket_number);
            const regularPatients = waitingPatients.filter(t => !t.emergency_type).sort((a, b) => a.ticket_number - b.ticket_number);
            
            let finalSorted = [];
            
            if (emergencyPatients.length === 0) {
              finalSorted = regularPatients;
            } else if (regularPatients.length === 0) {
              finalSorted = emergencyPatients;
            } else {
              // Count completed regular patients today (including current)
              const completedRegularToday = examTickets.filter(t => 
                (t.status === 'completed' || t.status === 'current') && !t.emergency_type
              ).length;
              
              let regularIndex = 0;
              let emergencyIndex = 0;
              
              // Calculate pattern: after every 2 regular patients, insert an emergency
              while (regularIndex < regularPatients.length || emergencyIndex < emergencyPatients.length) {
                // Calculate position in the cycle (0 or 1 means regular, 2 means emergency)
                const currentPosition = (completedRegularToday + finalSorted.filter(t => !t.emergency_type).length) % 3;
                
                if (currentPosition < 2 && regularIndex < regularPatients.length) {
                  // Add regular patient (positions 0 and 1 in cycle)
                  finalSorted.push(regularPatients[regularIndex++]);
                } else if (emergencyIndex < emergencyPatients.length) {
                  // Add emergency patient (position 2 in cycle)
                  finalSorted.push(emergencyPatients[emergencyIndex++]);
                } else if (regularIndex < regularPatients.length) {
                  // If no more emergencies, add remaining regular patients
                  finalSorted.push(regularPatients[regularIndex++]);
                } else {
                  break;
                }
              }
            }
            
            const nextPatients = finalSorted.slice(0, 6);

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
                       <div className={`border-2 rounded-lg p-2 sm:p-4 lg:p-6 relative ${
                         currentPatient.emergency_type 
                           ? 'bg-red-50 border-red-500 shadow-red-500/30 shadow-lg' 
                           : 'bg-current/10 border-current/20'
                       }`}>
                         {currentPatient.emergency_type && (
                           <div className="absolute -top-2 -right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                             🚨 طوارئ
                           </div>
                         )}
                         <div className={`text-2xl sm:text-4xl lg:text-6xl font-bold mb-1 sm:mb-2 ${
                           currentPatient.emergency_type 
                             ? 'text-red-600 animate-bounce' 
                             : 'text-current'
                         }`}>
                           {examPrefixes[type as ExamType]}{currentPatient.ticket_number}
                         </div>
                         <div className="space-y-1">
                           <Badge className={`text-xs sm:text-sm lg:text-lg px-2 sm:px-4 py-1 sm:py-2 ${
                             currentPatient.emergency_type 
                               ? 'bg-red-600 text-white animate-pulse' 
                               : 'bg-current text-white'
                           }`}>
                             {currentPatient.emergency_type ? '🚨 حالة طوارئ - جاري الفحص' : 'جاري الفحص'}
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                           {nextPatients.map((ticket, index) => (
                             <div 
                               key={ticket.id} 
                               className={`text-center p-3 sm:p-4 rounded-xl border-2 shadow-lg transition-all duration-300 hover:scale-105 relative ${
                                 index === 0 
                                   ? ticket.emergency_type
                                     ? 'bg-gradient-to-br from-red-500/30 to-red-600/20 border-red-500 shadow-red-500/40 animate-pulse'
                                     : 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-400 shadow-emerald-500/30'
                                   : ticket.emergency_type
                                   ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-400 shadow-red-500/30'
                                   : 'bg-gradient-to-br from-gray-100 to-gray-50 border-gray-300 shadow-gray-400/20 hover:border-primary/50'
                               }`}
                             >
                               {ticket.emergency_type && (
                                 <div className="absolute -top-1 -right-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                                   🚨
                                 </div>
                               )}
                               <div className={`text-xl sm:text-2xl lg:text-4xl font-black mb-2 ${
                                 index === 0 
                                   ? ticket.emergency_type
                                     ? 'text-red-700 animate-bounce'
                                     : 'text-emerald-700'
                                   : ticket.emergency_type
                                   ? 'text-red-700'
                                   : 'text-gray-700'
                               }`}>
                                 {examPrefixes[type as ExamType]}{ticket.ticket_number}
                               </div>
                               {index === 0 && (
                                 <Badge className={`text-xs px-2 py-1 font-semibold ${
                                   ticket.emergency_type 
                                     ? 'bg-red-600 text-white animate-pulse'
                                     : 'bg-emerald-600 text-white'
                                 }`}>
                                   {ticket.emergency_type ? '🚨 طوارئ التالي' : 'التالي'}
                                 </Badge>
                               )}
                               {ticket.emergency_type && index > 0 && (
                                 <Badge className="text-xs px-2 py-1 bg-red-600 text-white font-semibold">
                                   طوارئ
                                 </Badge>
                               )}
                             </div>
                           ))}
                        </div>
                    ) : (
                      <div className="text-center text-gray-500 text-sm sm:text-base p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                        لا يوجد مرضى في الانتظار
                      </div>
                    )}
                  </div>

                  {/* Waiting Count */}
                  <div className="text-center pt-2 sm:pt-4 border-t">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      إجمالي المنتظرين
                    </div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                        {finalSorted.length}
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