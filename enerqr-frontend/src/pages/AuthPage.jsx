import React, { useState } from 'react';
// استخدام React Router للانتقال بين الصفحات برمجياً (مثل التوجيه بعد تسجيل الدخول)
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, UserCheck, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function AuthPage() {
  const navigate = useNavigate();

  // حالة (State) لتتبع هل نحن في صفحة "الدخول" أو "التسجيل"
  const [isLogin, setIsLogin] = useState(true);
  // حالة الدور (Role) لمعرفة هل الزائر زبون أم تقني
  const [role, setRole] = useState('client');

  // حالة تخزن كل ما يكتبه المستخدم في الحقول
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    numero_serie: '',
    admin_code: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false); // لإظهار جاري التحميل ومنع الضغط المتكرر

  // دالة تُنفذ عند الضغط على زر الدخول أو التسجيل
  const handleSubmit = (e) => {
    e.preventDefault(); // منع الصفحة من إعادة التحميل (تحديث المتصفح)
    setLoading(true);
    setErrorMsg('');

    // تحديد مسار الـ API بناءً على ما إذا كانت العملية دخول أو إنشاء حساب
    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    // تحضير البيانات التي سيتم إرسالها للباك اند كـ JSON
    // إذا كان المود تسجيل حساب جديد، نرسل كل البيانات. وإذا كان تقنياً نرسل رقمه التسلسلي
    const bodyData = {
      username: formData.username,
      password: formData.password,
      role: role,
      ...(role === 'technicien' && { numero_serie: formData.numero_serie }),
      ...(role === 'admin' && { numero_serie: formData.admin_code }),
      ...(!isLogin && { email: formData.email })
    };

    // إرسال الطلب نحو خادم Python (FastAPI)
    fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    })
      .then(async res => {
        const data = await res.json();
        // إذا كان رد السيرفر خطأ (مثلا رقم سري خاطئ)، نظهر رسالة
        if (!res.ok) throw new Error(data.detail || "Erreur de connexion");
        return data;
      })
      .then(data => {
        setLoading(false);
        const userRole = data.role || role;
        const userId = data.user_id || data.id;

        localStorage.setItem('role', userRole);

        // التوجيه (Routing) الذكي:
        if (userRole === 'admin' || userRole === 'technicien') {
          if (userRole === 'technicien') localStorage.setItem('user_id', userId);
          navigate('/admin');
        } else {
          // إذا كان زبوناً، نتحقق: هل وافق على الخصوصية (RGPD) ؟
          if (data.consentement_rgpd === false) {
            navigate(`/activate/${userId}`);
          } else {
            navigate(`/dashboard/${userId}`);
          }
        }
      })
      .catch(err => {
        setLoading(false);
        setErrorMsg(err.message); // عرض الخطأ للمستخدم
      });
  };

  return (
    // واجهة واجهة الدخول بتأثير تلاشي متحرك (animate-fade-in)
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', paddingTop: '10vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* عنوان الصفحة يتغير ديناميكيا */}
        <h2 style={{ textAlign: 'center' }}>
          {isLogin ? 'Connexion' : 'Créer un compte'} <span style={{ color: 'var(--highlight-color)' }}>EnerQR</span>
        </h2>

        {/* عرض رسالة الخطأ إذا وجدت */}
        {!!errorMsg && (
          <div style={{ padding: '0.8rem', background: 'rgba(239, 71, 111, 0.1)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* أزرار اختيار نوع الحساب (تظهر دائماً) */}
          <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: '8px', padding: '4px', gap: '2px' }}>
            <button
              type="button"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', background: role === 'client' ? 'var(--highlight-color)' : 'transparent', color: role === 'client' ? '#fff' : 'inherit', fontWeight: '600' }}
              onClick={() => setRole('client')}
            >
              👤 Client
            </button>
            <button
              type="button"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', background: role === 'technicien' ? 'var(--primary-color)' : 'transparent', color: role === 'technicien' ? 'var(--bg-color)' : 'inherit', fontWeight: '600' }}
              onClick={() => setRole('technicien')}
            >
              🔧 Technicien
            </button>
            <button
              type="button"
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', background: role === 'admin' ? '#7c3aed' : 'transparent', color: role === 'admin' ? '#fff' : 'inherit', fontWeight: '600' }}
              onClick={() => setRole('admin')}
            >
              🛡️ Admin
            </button>
          </div>

        {/* نموذج الإدخال (Form) */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              required
              type="text"
              placeholder="Nom d'utilisateur"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
            />
          </div>

          {/* الإيميل يظهر فقط عند إنشاء حساب */}
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                required
                type="email"
                placeholder="Adresse Email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
              />
            </div>
          )}

          {/* الرقم التسلسلي يظهر عند اختيار تقني */}
          {role === 'technicien' && (
            <div style={{ position: 'relative' }}>
              <UserCheck size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                required
                type="text"
                placeholder="Numéro de Série (Obligatoire)"
                value={formData.numero_serie}
                onChange={e => setFormData({ ...formData, numero_serie: e.target.value })}
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
              />
            </div>
          )}

          {/* كود الأدمن السري يظهر عند اختيار Admin */}
          {role === 'admin' && (
            <div style={{ position: 'relative' }}>
              <ShieldCheck size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#7c3aed' }} />
              <input
                required
                type="password"
                placeholder="Code Admin Secret (Obligatoire)"
                value={formData.admin_code}
                onChange={e => setFormData({ ...formData, admin_code: e.target.value })}
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #7c3aed55', background: 'var(--bg-color)', color: 'var(--text-main)' }}
              />
            </div>
          )}

          {/* كلمة السر مطلوبة دائما */}
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              required
              type="password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
            />
          </div>

          {/* زر التأكيد (يتغير أوتوماتيكيا حسب الحالة) */}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
            style={{ color: 'var(--highlight-color)', fontWeight: 'bold', marginLeft: '0.5rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>

      </div>
    </div>
  );
}
