import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, RotateCcw, Users, CheckCircle, XCircle, Clock, Activity, UserPlus, Trash2, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('staff');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dailySettings, setDailySettings] = useState({
    xray_start_number: 1,
    ultrasound_start_number: 1,
    ct_scan_start_number: 1,
    mri_start_number: 1
  });
  const { toast } = useToast();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: users } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', 'admin');
      
      if (users && users.length > 0) {
        // Hash the input password and compare
        const { data: hashedPassword } = await supabase.rpc('hash_password', { password });
        
        if (hashedPassword === users[0].password_hash) {
          setIsAuthenticated(true);
          loadStats();
          loadUsers();
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

  const loadUsers = async () => {
    try {
      const { data: allUsers } = await supabase
        .from('system_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (allUsers) {
        setUsers(allUsers);
      }
    } catch (error) {
      toast({
        title: "خطأ في تحميل المستخدمين",
        description: "فشل في تحميل قائمة المستخدمين",
        variant: "destructive"
      });
    }
  };

  const loadDailySettings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: settings } = await supabase
        .from('daily_settings')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (settings) {
        setDailySettings({
          xray_start_number: settings.xray_start_number,
          ultrasound_start_number: settings.ultrasound_start_number,
          ct_scan_start_number: settings.ct_scan_start_number,
          mri_start_number: settings.mri_start_number
        });
      }
    } catch (error) {
      console.error('Error loading daily settings:', error);
    }
  };

  const updateDailySettings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('daily_settings')
        .upsert({
          date: today,
          ...dailySettings
        });

      if (error) throw error;

      toast({
        title: "تم تحديث إعدادات اليوم",
        description: "تم تحديث أرقام البداية بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "فشل في تحديث إعدادات اليوم",
        variant: "destructive"
      });
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
      // Hash the new password before storing
      const { data: hashedPassword } = await supabase.rpc('hash_password', { password: newPassword });
      
      const { error } = await supabase
        .from('system_users')
        .update({ password_hash: hashedPassword })
        .eq('username', username);

      if (error) throw error;

      toast({
        title: "تم تغيير كلمة المرور",
        description: `تم تغيير كلمة مرور المستخدم ${username} بنجاح`
      });
      
      setUsername('');
      setNewPassword('');
      loadUsers();
    } catch (error) {
      toast({
        title: "خطأ في تغيير كلمة المرور",
        description: "فشل في تغيير كلمة المرور",
        variant: "destructive"
      });
    }
  };

  const addNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername || !newUserPassword) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال اسم المستخدم وكلمة المرور",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('system_users')
        .select('username')
        .eq('username', newUsername);

      if (existingUser && existingUser.length > 0) {
        toast({
          title: "اسم المستخدم موجود",
          description: "اسم المستخدم هذا موجود بالفعل",
          variant: "destructive"
        });
        return;
      }

      // Hash the password before storing
      const { data: hashedPassword } = await supabase.rpc('hash_password', { password: newUserPassword });

      const { error } = await supabase
        .from('system_users')
        .insert({
          username: newUsername,
          password_hash: hashedPassword,
          role: newUserRole
        });

      if (error) throw error;

      toast({
        title: "تم إضافة المستخدم",
        description: `تم إضافة المستخدم ${newUsername} بنجاح`
      });
      
      setNewUsername('');
      setNewUserPassword('');
      setNewUserRole('staff');
      loadUsers();
    } catch (error) {
      toast({
        title: "خطأ في إضافة المستخدم",
        description: "فشل في إضافة المستخدم الجديد",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم ${username}؟`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('system_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "تم حذف المستخدم",
        description: `تم حذف المستخدم ${username} بنجاح`
      });
      
      loadUsers();
    } catch (error) {
      toast({
        title: "خطأ في حذف المستخدم",
        description: "فشل في حذف المستخدم",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadUsers();
      loadDailySettings();
      
      // Set up real-time subscription for automatic updates
      const channel = supabase
        .channel('admin-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets'
          },
          () => {
            loadStats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_settings'
          },
          () => {
            loadDailySettings();
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

        {/* Daily Settings */}
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Activity className="w-5 h-5" />
              إعدادات أرقام البداية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="xray_start">أشعة عادية - رقم البداية</Label>
                <Input
                  id="xray_start"
                  type="number"
                  min="1"
                  max="999"
                  value={dailySettings.xray_start_number}
                  onChange={(e) => setDailySettings(prev => ({
                    ...prev,
                    xray_start_number: parseInt(e.target.value) || 1
                  }))}
                  className="border-xray-color/30 focus:border-xray-color"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ultrasound_start">سونار - رقم البداية</Label>
                <Input
                  id="ultrasound_start"
                  type="number"
                  min="1"
                  max="999"
                  value={dailySettings.ultrasound_start_number}
                  onChange={(e) => setDailySettings(prev => ({
                    ...prev,
                    ultrasound_start_number: parseInt(e.target.value) || 1
                  }))}
                  className="border-ultrasound-color/30 focus:border-ultrasound-color"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ct_start">مقطعية - رقم البداية</Label>
                <Input
                  id="ct_start"
                  type="number"
                  min="1"
                  max="999"
                  value={dailySettings.ct_scan_start_number}
                  onChange={(e) => setDailySettings(prev => ({
                    ...prev,
                    ct_scan_start_number: parseInt(e.target.value) || 1
                  }))}
                  className="border-ct-color/30 focus:border-ct-color"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mri_start">رنين مغناطيسي - رقم البداية</Label>
                <Input
                  id="mri_start"
                  type="number"
                  min="1"
                  max="999"
                  value={dailySettings.mri_start_number}
                  onChange={(e) => setDailySettings(prev => ({
                    ...prev,
                    mri_start_number: parseInt(e.target.value) || 1
                  }))}
                  className="border-mri-color/30 focus:border-mri-color"
                />
              </div>
            </div>
            <Button 
              onClick={updateDailySettings} 
              className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              حفظ إعدادات اليوم
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                إضافة مستخدم جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addNewUser} className="space-y-4">
                <div>
                  <Label htmlFor="newUsername">اسم المستخدم</Label>
                  <Input
                    id="newUsername"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم الجديد"
                  />
                </div>
                <div>
                  <Label htmlFor="newUserPassword">كلمة المرور</Label>
                  <Input
                    id="newUserPassword"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
                <div>
                  <Label htmlFor="role">الصلاحية</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصلاحية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">موظف تذاكر</SelectItem>
                      <SelectItem value="doctor">دكتور</SelectItem>
                      <SelectItem value="admin">مدير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  إضافة مستخدم
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة مرور المستخدم</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4">
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
                <Button type="submit" className="w-full">
                  تغيير كلمة المرور
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* User Management Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              إدارة المستخدمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead>آخر تحديث</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : user.role === 'doctor' ? 'secondary' : 'outline'}>
                          {user.role === 'admin' ? 'مدير' : user.role === 'doctor' ? 'دكتور' : 'موظف تذاكر'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        {new Date(user.updated_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUsername(user.username);
                              setNewPassword('');
                              toast({
                                title: "تم اختيار المستخدم",
                                description: `تم اختيار ${user.username} للتعديل. اذهب لقسم تغيير كلمة المرور أعلاه.`
                              });
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.username !== 'admin' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUser(user.id, user.username)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا يوجد مستخدمين
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;