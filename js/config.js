const CONFIG = {
    // تم تعطيل السيرفر الخارجي للنشر على GitHub كنسخة HTML فقط
    API_BASE_URL: null,

    // إعدادات الرسائل (في النسخة النهائية يتم استدعاؤها من السيرفر لحماية مفتاح API)
    SMS_SENDER: "WusulApp",

    // إعدادات فايربيز (Firebase) - تم التحديث ببيانات مشروعك الحقيقية
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyCkVeyrpON5wETANRIq5pMHIfJkVQFiL8w",
        authDomain: "studio-6531463847-82c37.firebaseapp.com",
        databaseURL: "https://studio-6531463847-82c37-default-rtdb.firebaseio.com",
        projectId: "studio-6531463847-82c37",
        storageBucket: "studio-6531463847-82c37.firebasestorage.app",
        messagingSenderId: "632352457616",
        appId: "1:632352457616:web:40eecc03658e3ea3d6e915"
    },

    // محرك قاعدة البيانات السحابية (Google Sheets)
    GOOGLE_SHEET_BRIDGE_URL: "https://script.google.com/macros/s/AKfycbyquvnYpkMw6bsgwL7VA1SBRPXCo_WlgAfi9CBJV6YHAjHTHnk55Zssqj9-yheGCj1h/exec",

    // إعدادات التحقق من الهوية (يمكن للمسؤول تغييرها)
    REQUIRE_IDENTITY_VERIFICATION: false,

    // وضع المطور
    DEBUG_MODE: false
};

// تجميد الإعدادات لمنع التعديل العرضي
Object.freeze(CONFIG);
