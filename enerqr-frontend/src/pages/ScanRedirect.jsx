import React, { useEffect, useState } from 'react';
// استخدام الخطافات (Hooks) للتعامل مع الروابط والانتقالات
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ScanFace } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function ScanRedirect() {
  // للبحث في الـ URL عن المعلمات المخفية (مثل ?id=123 أو ?pump=456)
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // استخراج المتغيرات من الرابط
  const id = searchParams.get('id');       // الرابط القديم (يتعامل مع الزبون كأنه هو الآلة)
  const pump_id = searchParams.get('pump');// الرابط الجديد (الكاميرا تمسح الكود الخاص بالآلة نفسها)

  // حالات التحميل وعرض الأخطاء
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // useEffect ينطلق فوراً بمجرد فتح الصفحة (عندما يمسح الشخص الكود من هاتفه)
  useEffect(() => {
    // إذا لم نجد أي ID في الرابط، نتوقف ونظهر خطأ
    if (!id && !pump_id) {
      setError("Aucun identifiant trouvé dans le QR Code. Veuillez scanner à nouveau.");
      setLoading(false);
      return;
    }

    // دالة غير متزامنة (async) للتحقق من هوية صاحب الآلة في قاعدة البيانات
    const checkIdentifier = async () => {
      try {
        let userId = id;

        // التدفق الذكي: إذا كان الرابط يخص المضخة، فهذا يعني أننا يجب أن نسأل السيرفر: لمن تعود هذه المضخة؟
        if (pump_id) {
          const pRes = await fetch(`${API_BASE_URL}/pump/${pump_id}`);
          if (!pRes.ok) throw new Error("Pompe inconnue ou non enregistrée."); // خطأ إذا كانت المضخة غير مسجلة
          
          const pData = await pRes.json();
          userId = pData.owner_id; // استخراج رقم مالك المضخة!
        }

        // الآن نتصل بالسيرفر لنتفقد حالة الحساب (هل الزبون قد وافق على الخصوصية (RGPD) أم لا؟)
        const res = await fetch(`${API_BASE_URL}/client/${userId}`);
        if (!res.ok) throw new Error("Compte client introuvable ou inactif.");
        
        const data = await res.json();

        // ننتظر 1.5 ثانية (فقط للزينة ولإعطاء شعور بأن السيستام يقوم بتحليل معقد)
        // ثم نوجه (Route) الزائر بناء على حالته
        setTimeout(() => {
          if (!data.consentement_rgpd) {
            navigate(`/activate/${userId}`); // إجباره على قراءة شروط التتبع
          } else {
            navigate(`/dashboard/${userId}`); // تمريره للوحة عرض المعلومات مباشر
          }
        }, 1500);

      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    checkIdentifier();
  }, [id, pump_id, navigate]);

  return (
    // واجهة الماسح (UI Simulation)
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '400px', padding: '3rem' }}>
        
        {loading ? (
          <>
            {/* تأثير اللمضان الجميل بالـ CSS أثناء فحص الـ QR Code */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '2rem' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--highlight-color)', filter: 'blur(20px)', opacity: 0.3, animation: 'pulseGlow 2s infinite' }}></div>
              <ScanFace size={64} color="var(--highlight-color)" style={{ position: 'relative' }} />
            </div>
            <h3>Scan du QR Code en cours</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Vérification de votre équipement et de vos accès...</p>
          </>
        ) : (
          <>
            <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Erreur de Scan</h3>
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
            <Link to="/auth" className="btn-primary" style={{ marginTop: '2rem', display: 'inline-block' }}>Retour à l'accueil</Link>
          </>
        )}

      </div>
    </div>
  );
}
