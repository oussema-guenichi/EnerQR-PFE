from datetime import datetime

def predict_weekly_consumption(client):
    """
    تقوم هذه الدالة بتوقع استهلاك الكيلوواط للأسبوع القادم.
    باستخدام المنطقة المناخية للزبون (H1 الجو بارد، H2 متوسط، H3 دافئ).
    """
    
    # نجلب الاستهلاك السنوي من قاعدة البيانات
    base_kwh_per_year = client.conso_estimee_apres_kwh
    # نقسمه على 52 أسبوع لمعرفة الاستهلاك العادي كل أسبوع
    base_weekly = base_kwh_per_year / 52.0
    
    # معامل التغيير حسب المنطقة المناخية
    multiplier = 1.0
    
    # تغيير الاستهلاك حسب الشهر (إذا كنا في الشتاء فالاستهلاك يرتفع)
    current_month = datetime.now().month
    if current_month in [11, 12, 1, 2, 3]: # أشهر الشتاء الباردة
        if client.zone_climatique == "H1": # شمال وبارد
            multiplier = 1.5
        elif client.zone_climatique == "H2": # وسط
            multiplier = 1.2
        elif client.zone_climatique == "H3": # جنوب ودافئ
            multiplier = 1.0

    # النتيجة النهائية: الاستهلاك العادي للأسبوع مضروبا في معامل الشتاء
    predicted_weekly = base_weekly * multiplier
    
    # نرجع النتيجة للواجهة الأمامية لكي يراها الزبون
    return round(predicted_weekly, 2)
