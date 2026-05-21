// استيراد مكتبة React الأساسية
import React from 'react';
// استيراد أدوات التوجيه (Routing) لكي نتمكن من التنقل بين الصفحات دون تحميل الصفحة من جديد
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// استيراد جميع الصفحات (Pages) التي قمنا ببرمجتها
import ScanRedirect from './pages/ScanRedirect'; // صفحة قراءة الـ QR Code
import ActivationPage from './pages/ActivationPage';// صفحة الموافقة على الخصوصية RGPD
import DashboardClient from './pages/DashboardClient'; // لوحة القيادة للزبون
import AdminDashboard from './pages/AdminDashboard'; // لوحة الإدارة للتقني
import RobotAssistant from './components/RobotAssistant'; // مكون الروبوت المساعد
import HomePage from './pages/HomePage'; // الصفحة الرئيسية
import AuthPage from './pages/AuthPage'; // صفحة تسجيل الدخول والاشتراك
import TechnicianDashboard from './pages/TechnicianDashboard'; // لوحة التقني الجديدة

// استيراد ملف الستايل (CSS) الذي يحمل كل الألوان والأنيميشن
import './index.css';
import ThemeToggle from './components/ThemeToggle'; // مكون تغيير الثيم

// الكلاس الرئيسي للتطبيق
function App() {
  return (
    // نقوم بتغليف التطبيق بـ Router لكي يفهم مسارات الروابط
    <Router>
      <div className="app-container">
        
        {/* زر تبديل الثيم (فاتح / داكن) يظهر في كل الصفحات */}
        <ThemeToggle />
        
        {/* استدعاء الروبوت هنا يجعله يظهر في كل الصفحات بشكل دائم! */}
        <RobotAssistant />
        
        {/* Routes تحدد أي مكون (Component) سيتم عرضه عند الدخول لرابط معين */}
        <Routes>
          {/* مسار الصفحة الرئيسية */}
          <Route path="/" element={<HomePage />} />
          
          {/* مسار صفحة الدخول (تفتح عند الضغط على زر كونكسيون) */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* المسار الخفي الذي يقرأ منه الكاميرا سكانر الـ QR Code */}
          <Route path="/scan" element={<ScanRedirect />} />
          
          {/* مسار الموافقة نمرر فيه الـ id الخاص بالزبون */}
          <Route path="/activate/:id" element={<ActivationPage />} />
          
          {/* لوحة قيادة الزبون، الرابط يكون ديناميكي حسب الآي دي */}
          <Route path="/dashboard/:id" element={<DashboardClient />} />
                    {/* لوحة التقنيين فقط */}
          <Route path="/admin" element={<AdminDashboard />} />

        </Routes>
      </div>
    </Router>
  );
}

// تصدير الكومبوننت لكي يقرأه ملف main.jsx الخاص بـ Vite
export default App;
