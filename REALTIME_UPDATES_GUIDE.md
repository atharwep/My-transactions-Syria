# دليل التحديثات الفورية (Real-time Updates)

## نظرة عامة
تم إضافة نظام التحديثات الفورية باستخدام Firebase Realtime Database لضمان تحديث البيانات فوريًا لجميع المستخدمين دون الحاجة لإعادة تحميل الصفحة.

## المشاكل التي تم حلها

### 1. عدم تحديث الرصيد فوريًا
**المشكلة**: عند إرسال رصيد لمستخدم من لوحة التحكم، لا يتم تحديث الرصيد لدى المستخدم إلا بعد إعادة تحميل الصفحة.

**الحل**: 
- تم تحديث دالة `updateUserBalance` في `auth.js` لمزامنة التغييرات مع Firebase فورًا
- تم إضافة مستمع (listener) في `realtime-sync.js` يراقب التغييرات في بيانات المستخدم
- عند تحديث الرصيد في Firebase، يتم تحديث localStorage والواجهة تلقائيًا

### 2. عدم ظهور الأطباء الجدد فوريًا
**المشكلة**: عند إضافة طبيب جديد، لا يظهر للمستخدمين الآخرين إلا بعد إعادة تحميل الصفحة.

**الحل**:
- تم تحديث دالة `addDoctor` لمزامنة الطبيب الجديد مع Firebase فورًا
- تم إضافة مستمع يراقب التغييرات في قائمة الأطباء
- عند إضافة طبيب جديد، يتم تحديث القائمة تلقائيًا لجميع المستخدمين

## الملفات المعدلة

### 1. `js/realtime-sync.js` (جديد)
ملف جديد يحتوي على:
- `RealtimeSync.init()`: تهيئة المستمعات الفورية
- `listenToUsers()`: مراقبة تغييرات بيانات المستخدمين
- `listenToDoctors()`: مراقبة تغييرات قائمة الأطباء
- `listenToTransactions()`: مراقبة المعاملات المالية
- `listenToBookings()`: مراقبة الحجوزات

### 2. `js/auth.js`
التحديثات:
- `updateUserBalance()`: أصبحت async وتزامن مع Firebase
- `addDoctor()`: تزامن الطبيب الجديد مع Firebase فورًا
- `approveDoctor()`: تزامن الموافقة مع Firebase فورًا

### 3. `js/dashboard.js`
إضافة مستمعات للأحداث:
- `balanceUpdated`: يحدث عند تغيير الرصيد
- `doctorsUpdated`: يحدث عند تحديث قائمة الأطباء

### 4. `doctors.html`
- إضافة Firebase SDK
- إضافة `realtime-sync.js`
- إضافة مستمع لتحديث قائمة الأطباء فوريًا

### 5. `dashboard.html`
- إضافة Firebase SDK
- إضافة `realtime-sync.js`

## كيفية الاستخدام

### متطلبات Firebase
يجب تكوين Firebase في ملف `js/config.js`:

```javascript
const CONFIG = {
    FIREBASE_CONFIG: {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        databaseURL: "https://YOUR_PROJECT.firebaseio.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    }
};
```

### قواعد Firebase Database
يجب تعيين القواعد التالية في Firebase Console:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "doctors": {
      ".read": true,
      ".write": "auth != null"
    },
    "transactions": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "bookings": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## سيناريوهات الاستخدام

### سيناريو 1: شحن رصيد مستخدم
1. المدير يفتح لوحة التحكم
2. يبحث عن المستخدم ويدخل المبلغ
3. يضغط "إيداع رصيد"
4. **فوريًا**: يتم تحديث الرصيد في Firebase
5. **فوريًا**: المستخدم يرى الرصيد الجديد دون إعادة تحميل

### سيناريو 2: إضافة طبيب جديد
1. المدير يضيف طبيب جديد من لوحة التحكم
2. **فوريًا**: يتم حفظ الطبيب في Firebase
3. **فوريًا**: جميع المستخدمين في صفحة الأطباء يرون الطبيب الجديد
4. لا حاجة لإعادة تحميل الصفحة

## الأحداث المخصصة (Custom Events)

### `balanceUpdated`
يتم إطلاقه عند تحديث رصيد المستخدم:
```javascript
window.addEventListener('balanceUpdated', (event) => {
    console.log('New balance:', event.detail.balanceUSD, event.detail.balanceSYP);
});
```

### `doctorsUpdated`
يتم إطلاقه عند تحديث قائمة الأطباء:
```javascript
window.addEventListener('doctorsUpdated', (event) => {
    console.log('Doctors list updated:', event.detail.doctors);
});
```

## استكشاف الأخطاء

### المشكلة: التحديثات لا تعمل
**الحلول**:
1. تأكد من تكوين Firebase بشكل صحيح في `config.js`
2. افتح Console في المتصفح وابحث عن أخطاء Firebase
3. تأكد من أن المستخدم مسجل دخول
4. تحقق من قواعد Firebase Database

### المشكلة: التحديثات بطيئة
**الحلول**:
1. تحقق من سرعة الإنترنت
2. تأكد من أن Firebase في منطقة قريبة
3. قلل عدد المستمعات غير الضرورية

## الأداء

### التحسينات
- استخدام Firebase Realtime Database للتحديثات الفورية
- التخزين المحلي (localStorage) كنسخة احتياطية
- تحديث الواجهة فقط عند الحاجة

### استهلاك البيانات
- كل تحديث يستهلك بيانات صغيرة جدًا (بضع بايتات)
- Firebase يستخدم WebSocket للاتصال المستمر
- التحديثات تحدث فقط عند وجود تغييرات فعلية

## الخطوات التالية

لإضافة تحديثات فورية لبيانات أخرى:

1. أضف مستمع في `realtime-sync.js`:
```javascript
listenToYourData: function() {
    const ref = firebaseDB.ref('your_data_path');
    this.listeners.yourData = ref.on('value', (snapshot) => {
        // معالجة البيانات
        this.triggerYourDataUpdate(data);
    });
}
```

2. أضف دالة لإطلاق الحدث:
```javascript
triggerYourDataUpdate: function(data) {
    const event = new CustomEvent('yourDataUpdated', {
        detail: { data }
    });
    window.dispatchEvent(event);
}
```

3. استمع للحدث في صفحتك:
```javascript
window.addEventListener('yourDataUpdated', (event) => {
    // تحديث الواجهة
});
```

## الدعم
للمساعدة أو الإبلاغ عن مشاكل، يرجى التواصل مع فريق التطوير.
