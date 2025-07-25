import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, RotateCcw, Users, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DailyStats {
  total: number;
  completed: number;
  cancelled: number;
  postponed: number;
  current: number;
  waiting: number;
  xray: number;
  ultrasound: number;
  ct_scan: number;
  mri: number;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<DailyStats>({
    total: 0,
    completed: 0,
    cancelled: 0,
    postponed: 0,
    current: 0,
    waiting: 0,
    xray: 0,
    ultrasound: 0,
    ct_scan: 0,
    mri: 0
  });
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: users } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', 'admin');
      
      if (users && users.length > 0) {
        // In a real implementation, you'd verify the password hash here
        // For now, we'll check against the plain password
        if (password === 'admin123') {
          setIsAuthenticated(true);
          loadStats();
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "مرحباً بك في لوحة التحكم"
          });
        } else {
          toast({
            title: "خطأ في كلمة المرور",
            description: "كلمة المرور غير صحيحة",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "خطأ في الاتصال",
        description: "فشل في الاتصال بقاعدة البيانات",
        variant: "destructive"
      });
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('date', today);

      if (tickets) {
        const newStats: DailyStats = {
          total: tickets.length,
          completed: tickets.filter(t => t.status === 'completed').length,
          cancelled: tickets.filter(t => t.status === 'cancelled').length,
          postponed: tickets.filter(t => t.status === 'postponed').length,
          current: tickets.filter(t => t.status === 'current').length,
          waiting: tickets.filter(t => t.status === 'waiting').length,
          xray: tickets.filter(t => t.exam_type === 'xray').length,
          ultrasound: tickets.filter(t => t.exam_type === 'ultrasound').length,
          ct_scan: tickets.filter(t => t.exam_type === 'ct_scan').length,
          mri: tickets.filter(t => t.exam_type === 'mri').length
        };
        
        setStats(newStats);
      }
    } catch (error) {
      toast({
        title: "خطأ في تحميل الإحصائيات",
        description: "فشل في تحميل إحصائيات اليوم",
        variant: "destructive"
      });
    }
  };

  const resetDay = async () => {
    if (!confirm('هل أنت متأكد من إعادة ضبط بيانات اليوم؟ سيتم حذف جميع التذاكر!')) {
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Delete all tickets for today
      await supabase
        .from('tickets')
        .delete()
        .eq('date', today);
      
      // Update daily settings with new random starting numbers
      await supabase
        .from('daily_settings')
        .upsert({
          date: today,
          xray_start_number: Math.floor(Math.random() * 50) + 1,
          ultrasound_start_number: Math.floor(Math.random() * 50) + 1,
          ct_scan_start_number: Math.floor(Math.random() * 50) + 1,
          mri_start_number: Math.floor(Math.random() * 50) + 1
        });

      loadStats();
      toast({
        title: "تم إعادة ضبط اليوم",
        description: "تم حذف جميع البيانات وإعادة تعيين أرقام البداية"
      });
    } catch (error) {
      toast({
        title: "خطأ في إعادة الضبط",
        description: "فشل في إعادة ضبط بيانات اليوم",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !newPassword) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال اسم المستخدم وكلمة المرور الجديدة",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, you'd hash the password before storing
      const { error } = await supabase
        .from('system_users')
        .update({ password_hash: newPassword })
        .eq('username', username);

      if (error) throw error;

      toast({
        title: "تم تغيير كلمة المرور",
        description: `تم تغيير كلمة مرور المستخدم ${username} بنجاح`
      });
      
      setUsername('');
      setNewPassword('');
    } catch (error) {
      toast({
        title: "خطأ في تغيير كلمة المرور",
        description: "فشل في تغيير كلمة المرور",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">لوحة تحكم المدير</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
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
            <Alert className="mt-4">
              <AlertDescription>
                كلمة المرور الافتراضية: admin123
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">لوحة تحكم المدير</h1>
          <div className="flex gap-2">
            <Button onClick={loadStats} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث الإحصائيات
            </Button>
            <Button onClick={resetDay} variant="destructive" disabled={loading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              إعادة ضبط اليوم
            </Button>
          </div>
        </div>

        {/* Daily Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">مكتملة</p>
                  <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">ملغاة</p>
                  <p className="text-2xl font-bold text-red-500">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">مؤجلة</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.postponed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">جاري الفحص</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.current}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">في الانتظار</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.waiting}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exam Type Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>إحصائيات حسب نوع الفحص</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-lg font-semibold">أشعة عادية</p>
                <p className="text-3xl font-bold text-primary">{stats.xray}</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-lg font-semibold">سونار</p>
                <p className="text-3xl font-bold text-primary">{stats.ultrasound}</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-lg font-semibold">مقطعية</p>
                <p className="text-3xl font-bold text-primary">{stats.ct_scan}</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-lg font-semibold">رنين مغناطيسي</p>
                <p className="text-3xl font-bold text-primary">{stats.mri}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>تغيير كلمة مرور المستخدم</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                </div>
              </div>
              <Button type="submit">
                تغيير كلمة المرور
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;