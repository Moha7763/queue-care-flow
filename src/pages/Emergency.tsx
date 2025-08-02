import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Phone, MapPin, Clock } from 'lucide-react';

type EmergencyType = 'urgent' | 'critical' | 'emergency';

interface EmergencyTicket {
  id: string;
  ticketNumber: number;
  examType: string;
  emergencyType: EmergencyType;
  reason: string;
  createdAt: string;
}

const Emergency = () => {
  const [loading, setLoading] = useState(false);
  const [emergencyTickets, setEmergencyTickets] = useState<EmergencyTicket[]>([]);
  const { toast } = useToast();

  const emergencyTypes = {
    urgent: { label: 'عاجل', color: 'bg-yellow-500', priority: 1 },
    critical: { label: 'حرج', color: 'bg-orange-500', priority: 2 },
    emergency: { label: 'طوارئ', color: 'bg-red-500', priority: 3 }
  };

  const createEmergencyTicket = async (examType: 'xray' | 'ultrasound' | 'ct_scan' | 'mri', emergencyType: EmergencyType, reason: string) => {
    setLoading(true);
    try {
      // Get next ticket number for emergency
      const { data: lastTicket } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('date', new Date().toISOString().split('T')[0])
        .order('ticket_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = (lastTicket?.ticket_number || 0) + 1;

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ticket_number: nextNumber,
          exam_type: examType,
          status: emergencyType === 'emergency' ? 'current' : 'waiting',
          date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      // Add to emergency list
      const emergencyTicket: EmergencyTicket = {
        id: data.id,
        ticketNumber: data.ticket_number,
        examType: examType,
        emergencyType,
        reason,
        createdAt: new Date().toISOString()
      };

      setEmergencyTickets(prev => [emergencyTicket, ...prev]);

      toast({
        title: `تم إنشاء تذكرة ${emergencyTypes[emergencyType].label}`,
        description: `رقم التذكرة: ${data.ticket_number}`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Error creating emergency ticket:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء تذكرة الطوارئ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-3xl font-bold mb-2 text-red-600">نظام الطوارئ</h1>
          <p className="text-muted-foreground">إدارة الحالات العاجلة والطوارئ</p>
        </div>

        {/* Emergency Controls */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700">إنشاء تذكرة طوارئ</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Critical Emergency */}
              <Card className="border-red-300">
                <CardContent className="p-4 text-center">
                  <div className="text-red-500 text-4xl mb-2">🚨</div>
                  <h3 className="font-bold text-red-700 mb-2">طوارئ فورية</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    حالات تهدد الحياة - أولوية قصوى
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => createEmergencyTicket('xray', 'emergency', 'كسر - حادث')}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={loading}
                    >
                      أشعة طوارئ
                    </Button>
                    <Button 
                      onClick={() => createEmergencyTicket('ct_scan', 'emergency', 'جلطة - نزيف')}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={loading}
                    >
                      مقطعية طوارئ
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Critical Cases */}
              <Card className="border-orange-300">
                <CardContent className="p-4 text-center">
                  <div className="text-orange-500 text-4xl mb-2">⚠️</div>
                  <h3 className="font-bold text-orange-700 mb-2">حالات حرجة</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    حالات تحتاج فحص سريع
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => createEmergencyTicket('ultrasound', 'critical', 'ألم شديد')}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      disabled={loading}
                    >
                      سونار عاجل
                    </Button>
                    <Button 
                      onClick={() => createEmergencyTicket('mri', 'critical', 'شك في ورم')}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      disabled={loading}
                    >
                      رنين عاجل
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Urgent Cases */}
              <Card className="border-yellow-300">
                <CardContent className="p-4 text-center">
                  <div className="text-yellow-500 text-4xl mb-2">🔔</div>
                  <h3 className="font-bold text-yellow-700 mb-2">حالات عاجلة</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    أولوية متقدمة في الطابور
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => createEmergencyTicket('xray', 'urgent', 'مراجعة سريعة')}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                      disabled={loading}
                    >
                      أشعة عاجلة
                    </Button>
                    <Button 
                      onClick={() => createEmergencyTicket('ultrasound', 'urgent', 'متابعة حالة')}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                      disabled={loading}
                    >
                      سونار عاجل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              أرقام الطوارئ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <Phone className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold">الإسعاف</p>
                  <p className="text-lg font-bold text-red-600">123</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Phone className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-semibold">مركز الحياة</p>
                  <p className="text-lg font-bold text-blue-600">01234567890</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <MapPin className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold">العنوان</p>
                  <p className="text-sm">شارع الجمهورية، وسط البلد</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-semibold">الطوارئ 24/7</p>
                  <p className="text-sm">متاح طوال اليوم</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Emergency Tickets */}
        {emergencyTickets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>التذاكر الطارئة الحديثة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emergencyTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={`${emergencyTypes[ticket.emergencyType].color} text-white`}>
                        {emergencyTypes[ticket.emergencyType].label}
                      </Badge>
                      <div>
                        <p className="font-semibold">تذكرة #{ticket.ticketNumber}</p>
                        <p className="text-sm text-muted-foreground">{ticket.examType} - {ticket.reason}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleTimeString('ar-EG')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Emergency;