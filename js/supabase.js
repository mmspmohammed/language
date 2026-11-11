// إعدادات الاتصال بمشروع سوبابيز الخاص بك
const SUPABASE_URL = 'https://msllqspfzmbaroqhiweh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UIRTo_NrGep0IWK1XD0zfQ_7-JmlGr5';

let sb;

try {
    // التأكد من تحميل مكتبة سوبابيز من الـ CDN
    if (typeof window.supabase === 'undefined') {
        throw new Error("مكتبة Supabase غير محملة. تأكد من وجود وسم <script> لمكتبة سوبابيز في ملف index.html");
    }
    
    // إنشاء عميل سوبابيز وتخزينه في المتغير sb
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");

} catch (error) {
    console.error("❌ خطأ في الاتصال بسوبابيز:", error);
    // إظهار تنبيه للمستخدم في حال فشل الاتصال
    setTimeout(() => {
        alert("خطأ في تهيئة قاعدة البيانات: " + error.message + "\nيرجى تحديث الصفحة.");
    }, 1000);
}