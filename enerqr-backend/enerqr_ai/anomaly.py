import numpy as np

def detect_anomaly(client):
    """
    تقوم هذه الدالة (الذكاء الاصطناعي) باكتشاف العيوب أو الاستهلاك المفرط للطاقة في الآلة.
    في المشاريع المتقدمة نستخدم IsolationForest من sklearn. هنا نستخدم عملية حسابية للتبسيط.
    """
    
    # نقوم بحساب نسبة الاستهلاك الجديد مقارنة بالاستهلاك القديم
    # تجنب القسمة على صفر في حال كان الاستهلاك القديم غير مسجل
    if client.conso_avant_kwh and client.conso_avant_kwh > 0:
        ratio = client.conso_estimee_apres_kwh / client.conso_avant_kwh
    else:
        ratio = 1.0 # نسبة إفتراضية
    
    # رقم عشوائي كتمثيل لدرجة الخطر في خوارزمية الذكاء الاصطناعي الحقيقية
    score = float(np.random.rand()) 
    
    is_anomaly = False # المتغير الذي يحدد هل نرسل إنذارا أم لا
    
    # حد القرار: إذا كان معدل الاستهلاك أعلى من 80% من الاستهلاك القديم نضع إنذار (True)
    if ratio > 0.8 or score > 0.9:
        is_anomaly = True
        
    # نرجع النتيجة ليقرأها المسؤول (Admin) في لوحة القيادة
    return is_anomaly, score
