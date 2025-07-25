import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const examTypes = {
  xray: 'أشعة عادية',
  ultrasound: 'سونار', 
  ct_scan: 'مقطعية',
  mri: 'رنين مغناطيسي'
};

const PatientQueue = () => {
  const [currentTickets, setCurrentTickets] = useState<any[]>([]);
  const { toast } = useToast();

  const createTicket = async (examType: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get daily settings
      const { data: settings } = await supabase
        .from('daily_settings')
        .select('*')
        .eq('date', today)
        .single();

      // Get last ticket number for this exam type
      const { data: lastTicket } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('exam_type', examType)
        .eq('date', today)
        .order('ticket_number', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (settings && lastTicket && lastTicket.length > 0) {
        nextNumber = lastTicket[0].ticket_number + 1;
      } else if (settings) {
        nextNumber = settings[`${examType}_start_number`];
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ticket_number: nextNumber,
          exam_type: examType,
          status: 'waiting',
          date: today
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "تم إنشاء التذكرة",
        description: `رقم التذكرة: ${nextNumber} - ${examTypes[examType as keyof typeof examTypes]}`
      });

      loadCurrentTickets();
    } catch (error) {
      toast({
        title: "خطأ في إنشاء التذكرة",
        variant: "destructive"
      });
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

      setCurrentTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  useEffect(() => {
    loadCurrentTickets();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">نظام طابور المرضى</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(examTypes).map(([type, name]) => (
            <Card key={type} className="text-center">
              <CardHeader>
                <CardTitle>{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => createTicket(type)}
                  className="w-full"
                >
                  إنشاء تذكرة جديدة
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>الدور الحالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(examTypes).map(([type, name]) => {
                const tickets = currentTickets.filter(t => t.exam_type === type);
                const current = tickets.find(t => t.status === 'current');
                const waiting = tickets.filter(t => t.status === 'waiting').length;
                
                return (
                  <div key={type} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{name}</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">الحالي: </span>
                        <Badge variant={current ? "default" : "secondary"}>
                          {current ? current.ticket_number : 'لا يوجد'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">في الانتظار: </span>
                        <Badge variant="outline">{waiting}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientQueue;