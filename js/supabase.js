const SUPABASE_URL = 'https://msllqspfzmbaroqhiweh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UIRTo_NrGep0IWK1XD0zfQ_7-JmlGr5';

let sb;

try {
    if (typeof window.supabase === 'undefined') {
        throw new Error("مكتبة Supabase غير محملة. تأكد من وجود وسم <script> في ملف index.html");
    }
    // إعدادات الجلسة لتبقى محفوظة
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
} catch (error) {
    console.error("❌ خطأ في الاتصال بسوبابيز:", error);
    setTimeout(() => {
        alert("خطأ في تهيئة قاعدة البيانات: " + error.message + "\nيرجى تحديث الصفحة.");
    }, 1000);
}