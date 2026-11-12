// ==========================================
// 1. الإعدادات والمتغيرات الأساسية
// ==========================================
if (typeof sb === 'undefined' || !sb) {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;color:red;'>فشل الاتصال بقاعدة البيانات. يرجى تحديث الصفحة أو مراجعة إعدادات supabase.js</h2>";
    throw new Error("Supabase client is not initialized.");
}

let currentUser = null;
let currentStudent = null;
let S = { xp: 0, streak: 0, last: "", done: [] };
let U = []; // سيتم تعبئتها بالمنهاج من قاعدة البيانات

const SUBJECTS_BY_GRADE = {
  "الأول": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية"],
  "الثاني": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية"],
  "الثالث": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية"],
  "الرابع": ["اللغة الإنجليزية", "الرياضيات","الدراسات الاجتماعية", "اللغة العربية", "العلوم"],
  "الخامس": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم"],
  "السادس": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم"],
  "السابع": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الاجتماعيات"],
  "الثامن": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الاجتماعيات"],
  "التاسع": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الاجتماعيات"],
  "العاشر": ["اللغة الإنجليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"],
  "الحادي عشر": ["اللغة الإنجليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"],
  "البكالوريا": ["اللغة الإنجليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"]
};

// ==========================================
// 2. دوال مساعدة (Helpers)
// ==========================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// نظام الإشعارات المنبثقة
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast-notification ${type}`;
  let icon = 'ℹ️'; if (type === 'success') icon = '✅'; if (type === 'error') icon = '❌';
  el.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاتصال. يرجى التحقق من الإنترنت.')), ms))
  ]);
};

function shuf(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function pk(a,n,ex){return shuf(a.filter((x,i)=>a.indexOf(x)==i&&ex.indexOf(x)<0)).slice(0,n)}
function pk2(a,b,n,ex){var r=pk(a,n,ex);return r.length<n?r.concat(pk(b,n-r.length,ex.concat(r))):r}
function say(t){try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t.replace(/[^\x00-\x7F’]/g,""));u.lang="en-US";speechSynthesis.speak(u)}catch(e){}}

// ==========================================
// 3. محرك توليد التمارين
// ==========================================
function generateExercises(lessonData, allWordsAr, allSentencesAr, allWordsEn) {
  const L = [], W = lessonData.w || [], P = lessonData.p || [];
  const wa = W.map(w => w[1]), pa = P.map(p => p[1]);
  
  // 1. المفردات
  if (W.length > 0) {
    let q = [];
    W.forEach(w => {
      q.push(['mc', w[0], w[1], pk2(wa, allWordsAr, 2, [w[1]])]);
      q.push(['ls', w[0], w[0], pk(W.map(z=>z[0]), 2, [w[0]])]);
      
      let isTrue = Math.random() > 0.5;
      let randomAr = isTrue ? w[1] : (pk2(wa, allWordsAr, 1, [w[1]])[0] || 'غير معروف');
      q.push(['tf', w[0], randomAr, isTrue ? 'true' : 'false']);
    });
    L.push({n: 'المفردات', c: W.map(w => [(w[2] || '') + ' ' + w[0], w[1]]), q: q});
  }

  // 2. الجمل
  if (P.length > 0) {
    let q = [];
    P.forEach(p => {
      q.push(['mc', p[0], p[1], pk2(pa, allSentencesAr, 2, [p[1]])]);
      
      let t = p[0].split(' ');
      if (t.length > 1 && t.length < 8) {
        q.push(['bw', p[1], p[0], pk(allWordsEn, 2, t.map(x => x.toLowerCase().replace(/[.,!?]/g, '')))]);
      }
      
      let validWords = t.map((w, idx) => ({w: w.replace(/[.,!?]/g, ''), idx})).filter(x => x.w.length > 2 && !['the','and','you','are','this','that','for','with','what','your','how'].includes(x.w.toLowerCase()));
      if (validWords.length > 0) {
         let target = validWords[Math.floor(Math.random() * validWords.length)];
         let blankWords = [...t];
         blankWords[target.idx] = '___';
         let blankSentence = blankWords.join(' ');
         
         let wrongOptions = pk(allWordsEn, 3, [target.w]);
         if (wrongOptions.length < 3) {
             wrongOptions = wrongOptions.concat(pk(['book', 'pen', 'car', 'dog', 'cat', 'tree', 'house', 'school', 'water', 'food'], 3 - wrongOptions.length, [target.w]));
         }
         q.push(['fb', blankSentence, target.w, wrongOptions]);
      }
    });
    L.push({n: 'الجمل', c: P, q: q});
  }

  const allQs = [].concat(...L.map(l => l.q));
  return { cards: L.flatMap(l => l.c), questions: allQs };
}

// ==========================================
// 4. جلب المنهاج من قاعدة البيانات (مع تقسيم الدروس)
// ==========================================
async function loadCurriculumFromDB(grade, subject) {
  try {
    // إفراغ المصفوفة قبل التحميل الجديد
    U = [];
    
    const { data: units, error: uErr } = await sb.from('units').select('*').eq('grade', grade).eq('subject', subject).order('order_num');
    if (uErr) throw uErr;
    if (!units || units.length === 0) return false;

    const unitIds = units.map(u => u.id);
    const { data: lessons } = await sb.from('lessons').select('*').in('unit_id', unitIds).order('order_num');
    const lessonIds = lessons.map(l => l.id);
    const { data: vocab } = await sb.from('vocabulary').select('*').in('lesson_id', lessonIds).order('order_num');
    const { data: sentences } = await sb.from('sentences').select('*').in('lesson_id', lessonIds).order('order_num');

    const allVocabAr = vocab.map(v => v.word_ar);
    const allVocabEn = vocab.map(v => v.word_en);
    const allSentAr = sentences.map(s => s.sentence_ar);

    U = units.map(unit => {
      const unitLessons = lessons.filter(l => l.unit_id === unit.id);
      let uiLessons = [];

      const createLessonObj = (title, w, p) => {
        const gen = generateExercises({ w, p }, allVocabAr, allSentAr, allVocabEn);
        return { n: title, c: gen.cards, q: gen.questions };
      };

      unitLessons.forEach(lesson => {
        const w = vocab.filter(v => v.lesson_id === lesson.id).map(v => [v.word_en, v.word_ar, v.emoji]);
        const p = sentences.filter(s => s.lesson_id === lesson.id).map(s => [s.sentence_en, s.sentence_ar]);

        // تقسيم المفردات إلى قسمين
        if (w.length > 0) {
            let half = Math.ceil(w.length / 2);
            let w1 = w.slice(0, half);
            let w2 = w.slice(half);
            
            if (w1.length > 0) uiLessons.push(createLessonObj('المفردات (1)', w1, []));
            if (w2.length > 0) uiLessons.push(createLessonObj('المفردات (2)', w2, []));
            
            if (p.length > 0) uiLessons.push(createLessonObj('الجمل', [], p));
        } 
        // تقسيم الجمل إلى ثلاثة أقسام (لوحدات المراجعة)
        else if (p.length > 0) {
            let third = Math.ceil(p.length / 3);
            let p1 = p.slice(0, third);
            let p2 = p.slice(third, third*2);
            let p3 = p.slice(third*2);
            
            if (p1.length > 0) uiLessons.push(createLessonObj('القراءة (1)', [], p1));
            if (p2.length > 0) uiLessons.push(createLessonObj('القراءة (2)', [], p2));
            if (p3.length > 0) uiLessons.push(createLessonObj('القراءة (3)', [], p3));
        }
      });

      // إضافة تدريب النطق لكل وحدة
      const allCards = uiLessons.flatMap(l => l.c);
      const uniqueCards = [];
      const seen = new Set();
      allCards.forEach(c => { if (!seen.has(c[0])) { seen.add(c[0]); uniqueCards.push(c); } });
      const sq = [];
      const n = Math.min(8, uniqueCards.length);
      for (let k = 0; k < n; k++) {
        const c = uniqueCards[Math.floor(k * uniqueCards.length / n)];
        sq.push(['sp', c[0], c[0], c[1]]);
      }
      uiLessons.push({ n: 'تدريب النطق', c: [], q: sq });

      // إضافة اختبار الوحدة
      const pool = uiLessons.flatMap(l => l.q);
      uiLessons.push({ n: 'اختبار الوحدة', c: [], test: 1, pool: pool, q: [] });

      return { t: unit.title, en: unit.title_en, l: uiLessons };
    });

    return true;
  } catch (err) {
    console.error("❌ حدث خطأ أثناء جلب المنهاج:", err);
    return false;
  }
}

// ==========================================
// 5. نظام المصادقة (Auth)
// ==========================================
let isLoginMode = true;

document.getElementById('auth-toggle').onclick = () => {
  isLoginMode = !isLoginMode;
  document.getElementById('auth-title').textContent = isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
  document.getElementById('auth-btn').textContent = isLoginMode ? 'دخول' : 'تسجيل';
  document.getElementById('auth-toggle').textContent = isLoginMode ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول';
};

document.getElementById('auth-btn').onclick = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value.trim();
  if (!email || !pass) return toast('يرجى إدخال البريد وكلمة المرور', 'info');

  const btn = document.getElementById('auth-btn');
  btn.textContent = 'جاري التحميل...'; btn.disabled = true;

  try {
    if (isLoginMode) {
      const { data, error } = await withTimeout(sb.auth.signInWithPassword({ email, password: pass }), 15000);
      if (error) throw error;
      currentUser = data.user;
      showScreen('profiles-screen');
      loadStudents();
      toast('تم تسجيل الدخول بنجاح', 'success');
    } else {
      const { data, error } = await withTimeout(sb.auth.signUp({ email, password: pass }), 15000);
      if (error) throw error;
      toast('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
      isLoginMode = true;
      document.getElementById('auth-title').textContent = 'تسجيل الدخول';
      document.getElementById('auth-toggle').textContent = 'ليس لديك حساب؟ إنشاء حساب جديد';
    }
  } catch (err) {
    toast('خطأ: ' + (err.message || 'حدث خطأ غير متوقع.'), 'error');
  } finally {
    btn.textContent = isLoginMode ? 'دخول' : 'تسجيل'; btn.disabled = false;
  }
};

document.getElementById('logout-btn').onclick = async () => {
  await sb.auth.signOut(); currentUser = null; currentStudent = null;
  showScreen('auth-screen');
};

async function checkSession() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showScreen('profiles-screen');
    loadStudents();
  } else {
    showScreen('auth-screen');
  }
}
checkSession();

// ==========================================
// 6. إدارة الطلاب والمواد
// ==========================================
window.loadSubjectsForGrade = function(grade) {
  const container = document.getElementById('subjects-container');
  const checkboxes = document.getElementById('subjects-checkboxes');
  if (!grade || !SUBJECTS_BY_GRADE[grade]) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  checkboxes.innerHTML = SUBJECTS_BY_GRADE[grade].map(subject => `
    <label style="display:flex; align-items:center; gap:5px; background:var(--bg); padding:5px 10px; border-radius:8px; border:1px solid var(--line); cursor:pointer;">
      <input type="checkbox" value="${subject}" class="subject-cb"> ${subject}
    </label>
  `).join('');
};

async function loadStudents() {
  if (!currentUser) return;
  try {
    const { data: students, error } = await sb.from('students').select('*').eq('parent_id', currentUser.id);
    if (error) throw error;

    const grid = document.getElementById('profiles-list');
    document.getElementById('add-student-form').classList.add('hidden');
    grid.classList.remove('hidden');

    grid.innerHTML = '';
    students.forEach(std => {
      grid.innerHTML += `
        <div class="profile-card" onclick="selectStudent('${std.id}')">
          <div class="profile-avatar">${std.full_name.charAt(0)}</div>
          <div class="profile-name">${std.full_name.split(' ')[0]}</div>
          <div class="profile-info">${std.grade} • ${std.age} سنة</div>
          <div style="font-size:11px;margin-top:5px;color:${std.subscription_status === 'active' ? 'var(--good)' : 'var(--xp)'}">
            ${std.subscription_status === 'active' ? '✅ مشترك' : '⏳ تجريبي'}
          </div>
        </div>
      `;
    });

    grid.innerHTML += `
      <div class="profile-card add-profile" onclick="showAddStudent()">
        <div class="profile-avatar" style="background:transparent;border:2px dashed var(--line);color:var(--mut)">+</div>
        <div class="profile-name" style="color:var(--mut)">إضافة طالب</div>
      </div>
    `;
  } catch (err) { toast('حدث خطأ في جلب بيانات الطلاب', 'error'); }
}

window.showAddStudent = function() {
  document.getElementById('profiles-list').classList.add('hidden');
  document.getElementById('add-student-form').classList.remove('hidden');
};

document.getElementById('cancel-add').onclick = () => {
  document.getElementById('add-student-form').classList.add('hidden');
  document.getElementById('profiles-list').classList.remove('hidden');
};

document.getElementById('save-student-btn').onclick = async () => {
  const name = document.getElementById('std-name').value.trim();
  const age = document.getElementById('std-age').value.trim();
  const grade = document.getElementById('std-grade').value;
  const selectedSubjects = Array.from(document.querySelectorAll('.subject-cb:checked')).map(cb => cb.value);

  if(!name || !age || !grade) return toast('يرجى ملء الحقول واختيار الصف', 'info');
  if(selectedSubjects.length === 0) return toast('يرجى اختيار مادة واحدة على الأقل', 'info');

  const btn = document.getElementById('save-student-btn');
  btn.textContent = 'جاري الحفظ...'; btn.disabled = true;

  try {
    const { error } = await withTimeout(sb.from('students').insert({
      parent_id: currentUser.id, full_name: name, age: parseInt(age), grade: grade, selected_subjects: selectedSubjects
    }), 10000);
    if (error) throw error;
    document.getElementById('std-name').value = ''; document.getElementById('std-age').value = ''; document.getElementById('std-grade').value = '';
    document.getElementById('subjects-container').style.display = 'none';
    loadStudents(); toast('تم إضافة الطالب بنجاح', 'success');
  } catch (err) {
    toast('حدث خطأ أثناء الإضافة: ' + err.message, 'error');
  } finally { btn.textContent = 'حفظ الحساب'; btn.disabled = false; }
};

// اختيار الطالب -> الانتقال لشاشة المواد
window.selectStudent = async function(id) {
  try {
    const { data: student } = await sb.from('students').select('*').eq('id', id).single();
    currentStudent = student;

    let { data: progress } = await sb.from('progress').select('*').eq('student_id', id).single();
    if (!progress) {
      const { data: np } = await sb.from('progress').insert({ student_id: id }).select().single();
      progress = np;
    }

    S = { xp: progress.xp || 0, streak: progress.streak || 0, last: progress.last_active || "", done: progress.completed_lessons || [] };
    
    // إعداد شاشة المواد
    const studentFirstName = currentStudent.full_name.split(' ')[0];
    document.getElementById('subjects-student-name').textContent = studentFirstName + ' - المواد';
    document.getElementById('subjects-student-greeting').textContent = studentFirstName;
    
    const subjects = currentStudent.selected_subjects || [];
    const grid = document.getElementById('subjects-grid');
    
    if (subjects.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--mut);padding:20px;">لم يتم اختيار أي مادة لهذا الطالب.</p>';
    } else {
      const icons = {
        "اللغة الإنجليزية": "🇬🇧",
        "الرياضيات": "🔢",
        "اللغة العربية": "📖",
        "العلوم": "🔬",
        "الاجتماعيات": "🌍",
        "الفيزياء": "⚛️",
        "الكيمياء": "🧪",
        "الأحياء": "🧬"
      };
      
      grid.innerHTML = subjects.map(sub => `
        <div class="profile-card" onclick="openSubject('${sub}')">
          <div class="profile-avatar" style="font-size:32px;">${icons[sub] || '📚'}</div>
          <div class="profile-name">${sub}</div>
        </div>
      `).join('');
    }
    
    showScreen('subjects-screen');
  } catch (err) { toast('حدث خطأ في تحميل بيانات الطالب', 'error'); }
};

// فتح مادة معينة -> جلب الدروس والانتقال لشاشة التطبيق
window.openSubject = async function(subjectName) {
    document.getElementById('app-student-name').textContent = currentStudent.full_name.split(' ')[0] + ' • ' + subjectName;
    showScreen('app-screen');
    document.getElementById('path').innerHTML = '<div style="text-align:center;margin-top:50px;color:var(--mut);">⏳ جاري تحميل المنهاج...</div>';

    const isEnglish = (subjectName === "اللغة الإنجليزية");
    const isSupportedGrade = (currentStudent.grade === "الأول" || currentStudent.grade === "الرابع" || currentStudent.grade === "السابع");

    if (isEnglish && isSupportedGrade) {
        const loaded = await loadCurriculumFromDB(currentStudent.grade, subjectName);
        if (!loaded) {
            document.getElementById('path').innerHTML = `
              <div style="text-align:center; padding:50px 20px; color:var(--mut);">
                <p style="font-size:50px; margin:0;">🚧</p>
                <h2 style="margin:10px 0;">المنهاج قيد الإعداد</h2>
                <p>لم نتمكن من العثور على دروس لمادة <b>${subjectName}</b> للصف <b>${currentStudent.grade}</b> في قاعدة البيانات.</p>
              </div>
            `;
            return;
        }
    } else {
        document.getElementById('path').innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:var(--mut);">
                <p style="font-size:50px; margin:0;">🚧</p>
                <h2 style="margin:10px 0;">المنهاج قيد الإعداد</h2>
                <p>نحن نعمل حالياً على إضافة منهاج مادة <b>${subjectName}</b> للصف <b>${currentStudent.grade}</b>.</p>
                <p>يرجى العودة قريباً!</p>
            </div>
        `;
        return;
    }

    home();
};

// أزرار الرجوع
document.getElementById('back-to-profiles').onclick = () => { 
    showScreen('subjects-screen'); 
};

document.getElementById('back-to-profiles-from-subjects').onclick = () => { 
    showScreen('profiles-screen'); 
    loadStudents(); 
};

// حفظ التقدم
async function save() {
  if (!currentStudent) return;
  await sb.from('progress').update({
    xp: S.xp, streak: S.streak, last_active: S.last ? new Date(S.last).toISOString() : null, completed_lessons: S.done
  }).eq('student_id', currentStudent.id);
}

// ==========================================
// 7. محرك عرض الدروس والتمارين
// ==========================================
var cur=null,$=function(s){return document.querySelector(s)};

function home(){
 if(!currentStudent) return;
 document.getElementById("cs").textContent="🔥 "+S.streak;
 document.getElementById("cx").textContent="⭐ "+S.xp;

 var h="",k=0,off=[0,26,38,26,0,-26,-38,-26],cu=false;
 U.forEach(function(u,ui){
  h+='<div class="unit"><h2>'+u.t+'</h2><p>'+u.en+'</p></div>';
  if(!u.l.length)h+='<p class="soon">قريباً</p>';
  u.l.forEach(function(q,li){
   var id=ui+"-"+li,d=S.done.indexOf(id)>-1,c=!d&&!cu,st=d?"done":c?"":"lock";if(c)cu=true;
   h+='<button class="node '+st+'" style="transform:translateX('+off[k%8]+'px)" data-u="'+ui+'" data-l="'+li+'">'+(d?"✓":q.test?"🏆":"★")+'</button>';k++;
  });
 });
 document.getElementById("path").innerHTML=h;
}

document.getElementById("path").onclick=function(e){
 var n=e.target.closest(".node"); if(!n)return;
 if(n.classList.contains("lock")){toast("أكمل الدرس السابق أولاً", 'info');return}
 start(+n.dataset.u,+n.dataset.l)
};

function start(u,l){
 var ls=U[u].l[l];
 cur={id:u+"-"+l,u:u,l:l,t:!!ls.test,qs:ls.test?shuf(ls.pool).slice(0,10):ls.q,i:0,h:5,ok:0};
 $("#L").className="open";
 if(!ls.c.length){q();return}
 $("#L").innerHTML='<div class="lh"><button class="x" id="cl">✕</button><div class="bar"></div></div><div class="lb"><h3>'+ls.n+'</h3><p>اضغط 🔊 لتسمع، ثم كرّر بصوتك</p>'+ls.c.map(function(c,i){return '<div class="card"><b dir="ltr">'+c[0]+'</b><span>'+c[1]+'</span><button class="sp" data-s="'+i+'">🔊</button></div>'}).join("")+'</div><div class="lf"><div><button class="btn" id="go">ابدأ التمارين</button></div></div>';
 $("#cl").onclick=close; $("#go").onclick=function(){q()};
 $(".lb").onclick=function(e){var b=e.target.closest("[data-s]");if(b)say(ls.c[+b.dataset.s][0])}
}

function q(){
 if(cur.qs[cur.i][0]=='sp') return sp();
 var x=cur.qs[cur.i],ty=x[0];cur.sel=null;cur.ans=[];cur.done=false;
 
 let mc = (ty === 'mc' || ty === 'ls' || ty === 'fb' || ty === 'tf');
 
 if (ty === 'tf') {
   cur.opts = ['true', 'false'];
 } else {
   cur.opts = mc ? shuf([x[2]].concat(x[3])) : null;
 }
 
 // سطر مهم جداً كان مفقوداً وتم إصلاحه (تجهيز الكلمات لترتيب الجملة)
 cur.bank = mc ? null : shuf(x[2].split(" ").concat(x[3]));
 
 var en = mc && /[A-Za-z]/.test(x[1]);
 var b = '';

 if (ty === 'tf') {
   b = `<h3>هل الترجمة صحيحة؟</h3>
        <div style="text-align:center; margin: 20px 0; background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--line);">
           <p style="font-size: 32px; font-weight: bold; color: var(--pri); font-family: monospace;" dir="ltr">${x[1]}</p>
           <p style="font-size: 24px; color: var(--mut); margin: 10px 0;">⬇️</p>
           <p style="font-size: 26px; font-weight: bold;">${x[2]}</p>
        </div>
        <div style="display:flex; gap:10px; margin-top:20px;">
           <button class="opt" style="text-align:center; justify-content:center; border-color: var(--good); color: var(--good); font-weight:700;" data-i="0">✅ صح</button>
           <button class="opt" style="text-align:center; justify-content:center; border-color: var(--bad); color: var(--bad); font-weight:700;" data-i="1">❌ خطأ</button>
        </div>`;
 } 
 else if (ty === 'fb') {
   b = `<h3>أكمل الفراغ بالكلمة الصحيحة:</h3>
        <p class="pr" style="text-align:center; font-size: 24px; margin-bottom: 30px; line-height: 1.8;" dir="ltr">${x[1]}</p>
        ` + cur.opts.map(function(o,i){return '<button class="opt" dir="auto" data-i="'+i+'">'+o+'</button>'}).join("");
 } 
 else {
   b = mc ? '<h3>'+({mc:"اختر المعنى الصحيح",ls:"استمع واختر",rp:"اختر الرد"})[ty]+'</h3>'+(ty=="ls"?'<p class="pr"><button class="sp lg" id="sp">🔊</button></p>':'<p class="pr"><span dir="auto">'+x[1]+'</span>'+(en?'<button class="sp" id="sp">🔊</button>':'')+'</p>')+cur.opts.map(function(o,i){return '<button class="opt" dir="auto" data-i="'+i+'">'+o+'</button>'}).join("")
    : '<h3>رتّب الكلمات</h3><p class="pr">'+x[1]+'</p><div class="line" id="ln"></div><div class="bank" id="bk"></div>';
 }

 $("#L").innerHTML='<div class="lh"><button class="x" id="cl">✕</button><div class="bar"><i style="width:'+(cur.i/cur.qs.length*100)+'%"></i></div><span class="chip">'+(cur.t?'📝 اختبار':'❤️ '+cur.h)+'</span></div><div class="lb">'+b+'</div><div class="lf" id="ft"><div><button class="btn" id="ck" disabled>تحقق</button></div></div>';
 $("#cl").onclick=close;$("#ck").onclick=check;
 if(en && ty !== 'fb' && ty !== 'tf'){say(x[1]);$("#sp").onclick=function(){say(x[1])}}
 if(mc)$(".lb").onclick=function(e){var o=e.target.closest(".opt");if(!o||cur.done)return;
  [].forEach.call(document.querySelectorAll(".opt"),function(z){z.classList.remove("sel")});o.classList.add("sel");cur.sel=+o.dataset.i;$("#ck").disabled=false};
 else bw();
}

function bw(){
 $("#ln").innerHTML=cur.ans.map(function(i,p){return '<button class="w" data-p="'+p+'">'+cur.bank[i]+'</button>'}).join("");
 $("#bk").innerHTML=cur.bank.map(function(w,i){return '<button class="w'+(cur.ans.indexOf(i)>-1?' used':'')+'" data-i="'+i+'">'+w+'</button>'}).join("");
 $("#ck").disabled=!cur.ans.length;
 $("#bk").onclick=function(e){var w=e.target.closest(".w");if(!w||cur.done)return;cur.ans.push(+w.dataset.i);bw()};
 $("#ln").onclick=function(e){var w=e.target.closest(".w");if(!w||cur.done)return;cur.ans.splice(+w.dataset.p,1);bw()};
}

function check(){
 var x=cur.qs[cur.i],ty=x[0],ok;cur.done=true;
 
 if (ty === 'tf') {
   ok = (cur.opts[cur.sel] === x[3]);
 } else if (ty === 'fb') {
   ok = (cur.opts[cur.sel] === x[2]);
 } else if (ty === 'bw') {
   ok = (cur.ans.map(function(i){return cur.bank[i]}).join(" ") === x[2]);
 } else {
   ok = (cur.opts[cur.sel] === x[2]);
 }

 if(ok)cur.ok++;else cur.h--;
 var f=$("#ft");f.className="lf "+(ok?"ok":"no");
 f.innerHTML='<div><p>'+(ok?"أحسنت!":"الإجابة الصحيحة:")+'</p>'+(ok?'':'<p class="en" dir="auto">'+x[2]+'</p>')+'<button class="btn" id="nx">متابعة</button></div>';
 $("#nx").onclick=next;
}

function next(){ if(cur.h<=0&&!cur.t)return end(false); cur.i++; cur.i>=cur.qs.length?(cur.t?endT():end(true)):q() }

function end(w){
 var g=0;
 if(w){g=10+cur.ok*2;S.xp+=g;if(S.done.indexOf(cur.id)<0)S.done.push(cur.id);save()}
 $("#L").innerHTML='<div class="lb end"><p class="big">'+(w?"🎉":"💔")+'</p><h2>'+(w?"أكملت!":"انتهت القلوب")+'</h2></div><div class="lf"><div><button class="btn" id="bk2">متابعة</button></div></div>';
 $("#bk2").onclick=close;
}

function sp(){
 var x=cur.qs[cur.i],SR=window.SpeechRecognition||window.webkitSpeechRecognition;cur.done=false;
 $('#L').innerHTML=`<div class='lh'><button class='x' id='cl'>✕</button><div class='bar'><i style='width:${cur.i/cur.qs.length*100}%'></i></div></div><div class='lb'><h3>انطق بصوتك</h3><p class='pr'><span dir='ltr'>${x[1]}</span><button class='sp' id='sp'>🔊</button></p><p>${x[3]}</p>${SR?`<button class='mic' id='mic'>🎤</button>`:''}<button class='btn' id='sf' style='${SR?'display:none':''}'>كرّرتها ✔</button></div><div class='lf' id='ft'><div><button class='btn alt' id='sk'>تخطّي</button></div></div>`;
 $('#cl').onclick=close;say(x[1]);$('#sp').onclick=function(){say(x[1])};
 $('#sk').onclick=function(){cur.i++;cur.i>=cur.qs.length?(cur.t?endT():end(true)):q()};
 $('#sf').onclick=function(){cur.ok++;fb(1,'أحسنت!')};
 if(SR)$('#mic').onclick=function(){var m=$('#mic');
  try{var rec=new SR();rec.lang='en-US';rec.maxAlternatives=3;
   rec.onresult=function(e){fb(1,'نطق ممتاز! 🎉')};
   rec.onerror=function(e){$('#sf').style.display='block'};
   rec.onend=function(){m.classList.remove('on')};m.classList.add('on');rec.start()}catch(err){$('#sf').style.display='block'}}
}

function fb(ok,m){cur.done=true;var f=$('#ft');f.className='lf '+(ok?'ok':'no');f.innerHTML=`<div><p>${m}</p><button class='btn' id='nx'>متابعة</button></div>`;$('#nx').onclick=next;}
function endT(){
 var n=cur.qs.length,ok=cur.ok,pass=ok/n>=.8,g=30;
 if(pass){S.xp+=g;if(S.done.indexOf(cur.id)<0)S.done.push(cur.id);save()}
 $('#L').innerHTML=`<div class='lb end'><p class='big'>${pass?'🏆':'📝'}</p><h2>${pass?'نجحت!':'حاول مجدداً'}</h2><p>نتيجتك: ${ok} من ${n}</p></div><div class='lf'><div><button class='btn' id='bk2'>متابعة</button></div></div>`;
 $('#bk2').onclick=close;
}
function close(){$("#L").className="";cur=null;home()}