import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, Stethoscope, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">نظام إدارة طابور المرضى</h1>
          <p className="text-xl text-muted-foreground mb-8">مركز الأشعة</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                واجهة المرضى
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                إنشاء تذاكر جديدة ومتابعة الدور الحالي
              </p>
              <Link to="/queue">
                <Button className="w-full">
                  دخول واجهة المرضى
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-6 h-6" />
                واجهة الدكتور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                إدارة المرضى وتقديم الحالات
              </p>
              <Link to="/doctor">
                <Button variant="secondary" className="w-full">
                  دخول واجهة الدكتور
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-6 h-6" />
                شاشة العرض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                عرض الأرقام الحالية للمرضى
              </p>
              <Link to="/display">
                <Button variant="outline" className="w-full">
                  دخول شاشة العرض
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-6 h-6" />
                لوحة تحكم المدير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                إحصائيات اليوم وإدارة النظام
              </p>
              <Link to="/admin">
                <Button variant="destructive" className="w-full">
                  دخول لوحة التحكم
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;