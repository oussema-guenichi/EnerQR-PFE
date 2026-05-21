import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// استيراد أيقونات عصرية من مكتبة Lucide (مثل السحب، المطر، والشمس) للزينة
import { CloudRain, Sun, Cloud, ThermometerSun, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  // حالة (State) لتخزين بيانات الطقس التي نجلبها من الإنترنت
  const [weather, setWeather] = useState(null);

  // useEffect تعمل مرة واحدة فقط عند فتح الصفحة الرئيسية لأول مرة
  useEffect(() => {
    // الاتصال بواجهة (API) خارجية مجانية للطقس (Open-Meteo) لجلب درجات الحرارة لمدينة باريس
    fetch('https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FParis')
      .then(res => res.json())
      .then(data => {
        if (data && data.daily) {
          // دمج وترتيب بيانات الطقس في مصفوفة (Array) سهلة القراءة
          const forecast = data.daily.time.map((t, idx) => ({
            date: new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
            max: Math.round(data.daily.temperature_2m_max[idx]),
            min: Math.round(data.daily.temperature_2m_min[idx]),
            code: data.daily.weathercode[idx]
          }));
          // تخزين طقس الأيام الخمسة القادمة فقط في الـ State
          setWeather(forecast.slice(0, 5)); 
        }
      })
      .catch(err => console.error("Weather API error", err));
  }, []);

  // دالة صغيرة لاختيار الأيقونة المناسبة حسب كود الطقس القادم من الـ API
  const getWeatherIcon = (code) => {
    if (code <= 3) return <Sun size={24} color="#ffd166" />; // الطقس مشمس
    if (code <= 69) return <CloudRain size={24} color="#8da9c4" />; // الطقس ممطر
    return <Cloud size={24} color="#cbd5e1" />; // الطقس غائم
  };

  return (
    // كلاس animate-fade-in وضعناه في CSS لجعل الصفحة تظهر بنعومة
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* القسم الأول: الترحيب (Hero Section) */}
      <div style={{ textAlign: 'center', margin: '4rem 0' }} className="delay-1">
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
          Gérez votre <span style={{ color: 'var(--highlight-color)' }}>Pompe à Chaleur</span> intelligemment
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
          EnerQR est la plateforme nº1 pour le suivi énergétique et la détection d'anomalies par Intelligence Artificielle.
        </p>
        
        {/* زر الذهاب لصفحة الدخول (استعملنا Link لتسريع التنقل دون تحميل المتصفح) */}
        <Link to="/auth" className="btn-primary" style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none' }}>
          Se Connecter / S'inscrire <ArrowRight size={20} />
        </Link>
      </div>

      {/* القسم الثاني: شريط الطقس (Weather Bar) */}
      <div className="glass-card delay-2" style={{ marginBottom: '4rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ThermometerSun size={20} color="var(--warning)" /> Aperçu Météo (Impact sur conso)
        </h3>
        
        {/* إذا كانت الـ weather موجودة، نقوم برسم الأيام. إذا لا، نكتب جملة "جاري التحميل" */}
        {weather ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            {/* عملية التكرار (Map) لرسم كل يوم بشكل آلي */}
            {weather.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1, minWidth: '80px', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{d.date}</p>
                {getWeatherIcon(d.code)}
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{d.max}° / {d.min}°</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Chargement de la météo...</p>
        )}
      </div>

      {/* القسم الثالث: الخدمات والعروض (Offers Section) */}
      <h3 className="delay-3" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Nos Offres & Services</h3>
      <div className="delay-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        <div className="glass-card" style={{ borderTop: '4px solid var(--highlight-color)' }}>
          <ShieldCheck size={32} color="var(--highlight-color)" style={{ marginBottom: '1rem' }} />
          <h3>Contrat Entretien Pro</h3>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
            Un nettoyage complet annuel et une garantie sur pièces pour une durée de 5 ans. Votre PAC comme neuve.
          </p>
          <button style={{ color: 'var(--highlight-color)', fontWeight: 'bold', textDecoration: 'underline' }}>En savoir plus</button>
        </div>

        <div className="glass-card" style={{ borderTop: '4px solid var(--accent-color)' }}>
          <Zap size={32} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
          <h3>Module IA Premium</h3>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
            Débloquez notre Chatbot IA sur-mesure ! Il surveille 24/7 votre PAC et vous notifie par SMS d'une anomalie.
          </p>
          <button style={{ color: 'var(--accent-color)', fontWeight: 'bold', textDecoration: 'underline' }}>Découvrir</button>
        </div>

      </div>

    </div>
  );
}
