// ==========================================
// 1. الإعدادات والمتغيرات الأساسية
// ==========================================
if (typeof sb === 'undefined' || !sb) {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;color:red;'>فشل الاتصال بقاعدة البيانات. يرجى تحديث الصفحة.</h2>";
    throw new Error("Supabase client is not initialized.");
}

let currentUser = null;
let currentStudent = null;
let editingStudentId = null;
let currentStudentsList = [];
let S = { xp: 0, streak: 0, last: "", done: [] };
let U = [];

const SUBJECTS_BY_GRADE = {
  "الأول": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية"],
  "الرابع": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الدراسات الاجتماعية"],
  "السابع": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الاجتماعيات"],
};

// ==========================================
// 2. دوال مساعدة
// ==========================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

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
    new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاتصال.')), ms))
  ]);
};

function shuf(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function pk(a,n,ex){return shuf(a.filter((x,i)=>a.indexOf(x)==i&&ex.indexOf(x)<0)).slice(0,n)}
function pk2(a,b,n,ex){var r=pk(a,n,ex);return r.length<n?r.concat(pk(b,n-r.length,ex.concat(r))):r}

function say(t, rate) {
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t.replace(/[^\x00-\x7F']/g, ""));
    u.lang = "en-US";
    u.rate = rate || 1;
    speechSynthesis.speak(u);
  } catch(e) {}
}

// ==========================================
// 3. محرك توليد التمارين (يدعم question_type)
// ==========================================
function generateExercises(lessonData, allWordsAr, allSentencesAr, allWordsEn, subject) {
  const L = [], W = lessonData.w || [], P = lessonData.p || [];
  const wa = W.map(w => w[1]), pa = P.map(p => p[1]);
  const isArabic = (subject === "الدراسات الاجتماعية" || subject === "اللغة العربية" || subject === "الاجتماعيات");
  const allQuestions = [];

  if (W.length > 0) {
    const wordQs = [];
    W.forEach(w => {
      const qs = [];
      qs.push(['mc', w[0], w[1], pk2(wa, allWordsAr, 2, [w[1]])]);
      let isTrue = Math.random() > 0.5;
      let randomAr = isTrue ? w[1] : (pk2(wa, allWordsAr, 1, [w[1]])[0] || 'غير معروف');
      qs.push(['tf', w[0], randomAr, isTrue ? 'true' : 'false']);
      if (!isArabic) {
        qs.push(['ls', w[0], w[0], pk(W.map(z => z[0]), 2, [w[0]])]);
        if (w[0].length >= 3 && w[0].length <= 8 && !w[0].includes(' ')) {
          const shuffled = shuf(w[0].toLowerCase().split('')).join('');
          if (shuffled !== w[0].toLowerCase()) qs.push(['us', w[0], w[0].toLowerCase(), null, w[1]]);
        }
      }
      wordQs.push(qs);
    });

    const maxQs = Math.max(...wordQs.map(qs => qs.length));
    for (let round = 0; round < maxQs; round++) {
      const roundQs = [];
      wordQs.forEach(qs => { if (qs[round]) roundQs.push(qs[round]); });
      allQuestions.push(...shuf(roundQs));
    }

    if (W.length >= 4) {
      for (let i = 0; i <= W.length - 4; i += 4) {
        const group = W.slice(i, i + 4);
        if (group.length === 4) {
          const oddIndex = Math.floor(Math.random() * 4);
          const oddWord = group[oddIndex];
          const others = group.filter((_, idx) => idx !== oddIndex).map(x => x[1]);
          allQuestions.push(['oo', others.join('، ') + '، ' + oddWord[1], oddWord[1], others]);
        }
      }
    }
    L.push({n: 'المصطلحات والمفاهيم', c: W.map(w => [(w[2] || '') + ' ' + w[0], w[1]]), q: []});
  }

  if (P.length > 0) {
    const sentQs = [];
    P.forEach(p => {
      const qs = [];
      const qText = p[0];
      const qAnswer = p[1];
      const qType = p[2] || 'fill_in_blank';

      if (qType === 'true_false') {
        const isTrue = (qAnswer === 'صح' || qAnswer === 'true');
        qs.push(['tf', qText, isTrue ? '✅ صح' : '❌ خطأ', isTrue ? 'true' : 'false']);
      } else if (qType === 'multiple_choice') {
        qs.push(['mc', qText, qAnswer, pk2(pa, allSentencesAr, 2, [qAnswer])]);
      } else {
        qs.push(['fb', qText + ' .....', qAnswer, pk2(pa, allSentencesAr, 3, [qAnswer])]);
      }
      sentQs.push(qs);
    });

    const maxQs = Math.max(...sentQs.map(qs => qs.length));
    for (let round = 0; round < maxQs; round++) {
      const roundQs = [];
      sentQs.forEach(qs => { if (qs[round]) roundQs.push(qs[round]); });
      allQuestions.push(...shuf(roundQs));
    }
    L.push({n: 'الأسئلة والمعلومات', c: P.map(p => [p[0], p[1]]), q: []});
  }

  return { cards: L.flatMap(l => l.c), questions: shuf(allQuestions) };
}

// ==========================================
// 4. جلب المنهاج وبناء 7 عقد لكل وحدة
// ==========================================
async function loadCurriculumFromDB(grade, subject) {
  try {
    U = [];
    const { data: units, error: uErr } = await sb.from('units').select('*').eq('grade', grade).eq('subject', subject).order('order_num');
    if (uErr) throw uErr;
    if (!units || units.length === 0) return false;

    const unitIds = units.map(u => u.id);
    const { data: lessons } = await sb.from('lessons').select('*').in('unit_id', unitIds).order('order_num');
    const lessonIds = lessons.map(l => l.id);
    const { data: vocab } = await sb.from('vocabulary').select('*').in('lesson_id', lessonIds).order('order_num');
    const { data: sentences } = await sb.from('sentences').select('id, lesson_id, sentence_en, sentence_ar, question_type, order_num').in('lesson_id', lessonIds).order('order_num');

    const allVocabAr = vocab.map(v => v.word_ar);
    const allVocabEn = vocab.map(v => v.word_en);
    const allSentAr = sentences.map(s => s.sentence_ar);
    const isArabic = (subject === "الدراسات الاجتماعية" || subject === "اللغة العربية" || subject === "الاجتماعيات");

    U = units.map(unit => {
      const unitLessons = lessons.filter(l => l.unit_id === unit.id);
      const allWords = [];
      const allSents = [];

      unitLessons.forEach(lesson => {
        vocab.filter(v => v.lesson_id === lesson.id).forEach(v => {
          allWords.push([v.word_en, v.word_ar, v.emoji]);
        });
        sentences.filter(s => s.lesson_id === lesson.id).forEach(s => {
          allSents.push([s.sentence_en, s.sentence_ar, s.question_type]);
        });
      });

      const uiLessons = [];
      const WORDS_PER_NODE = Math.max(3, Math.ceil(allWords.length / 5));
      const SENTS_PER_NODE = Math.max(2, Math.ceil(allSents.length / 5));

      const wordChunks = [];
      for (let i = 0; i < allWords.length; i += WORDS_PER_NODE) wordChunks.push(allWords.slice(i, i + WORDS_PER_NODE));
      const sentChunks = [];
      for (let i = 0; i < allSents.length; i += SENTS_PER_NODE) sentChunks.push(allSents.slice(i, i + SENTS_PER_NODE));

      const maxChunks = Math.max(wordChunks.length, sentChunks.length);
      const contentNodes = Math.min(5, maxChunks);

      for (let i = 0; i < contentNodes; i++) {
        const w = wordChunks[i] || [];
        const p = sentChunks[i] || [];
        const innerLessons = [];

        if (w.length > 0) {
          const genW = generateExercises({w: w, p: []}, allVocabAr, allSentAr, allVocabEn, subject);
          innerLessons.push({n: 'المفردات الجديدة', c: genW.cards, q: genW.questions});
        }
        if (p.length > 0) {
          const genP = generateExercises({w: [], p: p}, allVocabAr, allSentAr, allVocabEn, subject);
          innerLessons.push({n: 'الجمل والعبارات', c: genP.cards, q: genP.questions});
        }
        if (w.length > 0 && p.length > 0) {
          const genAll = generateExercises({w: w, p: p}, allVocabAr, allSentAr, allVocabEn, subject);
          innerLessons.push({n: 'تمارين شاملة', c: [], q: genAll.questions});
        }

        uiLessons.push({n: 'الجزء ' + (i + 1), lessons: innerLessons});
      }

      if (!isArabic && allSents.length > 0) {
        const sq = [];
        const n = Math.min(8, allSents.length);
        for (let k = 0; k < n; k++) {
          const idx = Math.floor(k * allSents.length / n);
          const sent = allSents[idx];
          sq.push(['sp', sent[0], sent[0], sent[1]]);
        }
        uiLessons.push({n: 'تدريب النطق', c: [], q: sq});
      } else if (!isArabic && allWords.length > 0) {
        const uniqueWords = [];
        const seenWords = new Set();
        allWords.forEach(w => { if (!seenWords.has(w[0])) { seenWords.add(w[0]); uniqueWords.push(w); } });
        const sq = [];
        const n = Math.min(8, uniqueWords.length);
        for (let k = 0; k < n; k++) {
          const idx = Math.floor(k * uniqueWords.length / n);
          const word = uniqueWords[idx];
          sq.push(['sp', word[0], word[0], word[1]]);
        }
        uiLessons.push({n: 'تدريب النطق', c: [], q: sq});
      } else {
        const reviewPool = uiLessons.flatMap(l => l.lessons ? l.lessons.flatMap(il => il.q) : (l.q || [])).filter(q => q[0] === 'mc' || q[0] === 'tf');
        uiLessons.push({n: 'مراجعة سريعة', c: [], q: shuf(reviewPool).slice(0, 8)});
      }

      const pool = uiLessons.flatMap(l => l.lessons ? l.lessons.flatMap(il => il.q) : (l.q || []));
      uiLessons.push({n: 'اختبار الوحدة', c: [], test: 1, pool: pool, q: []});

      return { t: unit.title, en: unit.title_en, l: uiLessons };
    });

    return true;
  } catch (err) {
    console.error("❌ حدث خطأ أثناء جلب المنهاج:", err);
    return false;
  }
}

// ==========================================
// 5. المصادقة وإدارة الطلاب
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
  if (data.session) { currentUser = data.session.user; showScreen('profiles-screen'); loadStudents(); }
  else { showScreen('auth-screen'); }
}
checkSession();

window.loadSubjectsForGrade = function(grade, selectedSubjects = []) {
  const container = document.getElementById('subjects-container');
  const checkboxes = document.getElementById('subjects-checkboxes');
  if (!grade || !SUBJECTS_BY_GRADE[grade]) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  checkboxes.innerHTML = SUBJECTS_BY_GRADE[grade].map(subject => `
    <label style="display:flex; align-items:center; gap:5px; background:var(--bg); padding:5px 10px; border-radius:8px; border:1px solid var(--line); cursor:pointer;">
      <input type="checkbox" value="${subject}" class="subject-cb" ${selectedSubjects.includes(subject) ? 'checked' : ''}> ${subject}
    </label>
  `).join('');
};

async function loadStudents() {
  if (!currentUser) return;
  try {
    const { data: students, error } = await sb.from('students').select('*').eq('parent_id', currentUser.id);
    if (error) throw error;
    currentStudentsList = students;
    const grid = document.getElementById('profiles-list');
    document.getElementById('add-student-form').classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    students.forEach(std => {
      grid.innerHTML += `
        <div class="profile-card" onclick="selectStudent('${std.id}')">
          <div class="profile-actions">
            <button class="btn-edit" onclick="editStudent(event, '${std.id}')" title="تعديل">✏️</button>
            <button class="btn-del" onclick="deleteStudent(event, '${std.id}')" title="حذف">🗑️</button>
          </div>
          <div class="profile-avatar">${std.full_name.charAt(0)}</div>
          <div class="profile-name">${std.full_name.split(' ')[0]}</div>
          <div class="profile-info">${std.grade} • ${std.age} سنة</div>
          <div style="font-size:11px;margin-top:5px;color:${std.subscription_status === 'active' ? 'var(--good)' : 'var(--xp)'}">
            ${std.subscription_status === 'active' ? '✅ مشترك' : '⏳ تجريبي'}
          </div>
        </div>`;
    });
    grid.innerHTML += `
      <div class="profile-card add-profile" onclick="showAddStudent()">
        <div class="profile-avatar" style="background:transparent;border:2px dashed var(--line);color:var(--mut)">+</div>
        <div class="profile-name" style="color:var(--mut)">إضافة طالب</div>
      </div>`;
  } catch (err) { toast('حدث خطأ في جلب بيانات الطلاب', 'error'); }
}

window.showAddStudent = function() {
  editingStudentId = null;
  document.getElementById('form-title').textContent = 'إضافة طالب جديد';
  document.getElementById('save-student-btn').textContent = 'حفظ الحساب';
  document.getElementById('std-name').value = '';
  document.getElementById('std-age').value = '';
  document.getElementById('std-grade').value = '';
  document.getElementById('subjects-container').style.display = 'none';
  document.getElementById('profiles-list').classList.add('hidden');
  document.getElementById('add-student-form').classList.remove('hidden');
};

window.editStudent = function(e, id) {
  e.stopPropagation();
  const std = currentStudentsList.find(s => s.id === id);
  if (!std) return;
  editingStudentId = id;
  document.getElementById('form-title').textContent = 'تعديل بيانات الطالب';
  document.getElementById('save-student-btn').textContent = 'حفظ التعديلات';
  document.getElementById('std-name').value = std.full_name;
  document.getElementById('std-age').value = std.age;
  document.getElementById('std-grade').value = std.grade;
  loadSubjectsForGrade(std.grade, std.selected_subjects || []);
  document.getElementById('profiles-list').classList.add('hidden');
  document.getElementById('add-student-form').classList.remove('hidden');
};

window.deleteStudent = async function(e, id) {
  e.stopPropagation();
  if (!confirm('هل أنت متأكد من حذف هذا الطالب؟ سيتم حذف كل تقدمه أيضاً.')) return;
  try {
    const { error } = await sb.from('students').delete().eq('id', id);
    if (error) throw error;
    toast('تم حذف الطالب بنجاح', 'success');
    loadStudents();
  } catch (err) { toast('حدث خطأ أثناء الحذف', 'error'); }
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
    let error;
    if (editingStudentId) {
      const res = await withTimeout(sb.from('students').update({ full_name: name, age: parseInt(age), grade: grade, selected_subjects: selectedSubjects }).eq('id', editingStudentId), 10000);
      error = res.error;
    } else {
      const res = await withTimeout(sb.from('students').insert({ parent_id: currentUser.id, full_name: name, age: parseInt(age), grade: grade, selected_subjects: selectedSubjects }), 10000);
      error = res.error;
    }
    if (error) throw error;
    document.getElementById('std-name').value = ''; document.getElementById('std-age').value = ''; document.getElementById('std-grade').value = '';
    document.getElementById('subjects-container').style.display = 'none';
    loadStudents();
    toast(editingStudentId ? 'تم تعديل الطالب بنجاح' : 'تم إضافة الطالب بنجاح', 'success');
    editingStudentId = null;
  } catch (err) { toast('حدث خطأ: ' + err.message, 'error'); }
  finally { btn.textContent = editingStudentId ? 'حفظ التعديلات' : 'حفظ الحساب'; btn.disabled = false; }
};

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
    const studentFirstName = currentStudent.full_name.split(' ')[0];
    document.getElementById('subjects-student-name').textContent = studentFirstName + ' - المواد';
    document.getElementById('subjects-student-greeting').textContent = studentFirstName;
    const subjects = currentStudent.selected_subjects || [];
    const grid = document.getElementById('subjects-grid');
    if (subjects.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--mut);padding:20px;">لم يتم اختيار أي مادة لهذا الطالب.</p>';
    } else {
      const icons = {
        "اللغة الإنجليزية": "🇬🇧", "الرياضيات": "🔢", "اللغة العربية": "📖",
        "العلوم": "🔬", "الاجتماعيات": "🌍", "الدراسات الاجتماعية": "🏛️",
        "الفيزياء": "⚛️", "الكيمياء": "🧪", "الأحياء": "🧬"
      };
      grid.innerHTML = subjects.map(sub => `
        <div class="profile-card" onclick="openSubject('${sub}')">
          <div class="profile-avatar" style="font-size:32px;">${icons[sub] || '📚'}</div>
          <div class="profile-name">${sub}</div>
        </div>`).join('');
    }
    showScreen('subjects-screen');
  } catch (err) { toast('حدث خطأ في تحميل بيانات الطالب', 'error'); }
};

window.openSubject = async function(subjectName) {
    document.getElementById('app-student-name').textContent = currentStudent.full_name.split(' ')[0] + ' • ' + subjectName;
    showScreen('app-screen');
    document.getElementById('path').innerHTML = '<div style="text-align:center;margin-top:50px;color:var(--mut);">⏳ جاري تحميل المنهاج...</div>';
    const isEnglish = (subjectName === "اللغة الإنجليزية");
    const isSocial = (subjectName === "الدراسات الاجتماعية" || subjectName === "الاجتماعيات");
    const isSupportedGrade = (currentStudent.grade === "الأول" || currentStudent.grade === "الرابع" || currentStudent.grade === "السابع");
    const isSupported = (isEnglish && isSupportedGrade) || (isSocial && currentStudent.grade === "الرابع");
    if (isSupported) {
        const loaded = await loadCurriculumFromDB(currentStudent.grade, subjectName);
        if (!loaded) {
            document.getElementById('path').innerHTML = `
              <div style="text-align:center; padding:50px 20px; color:var(--mut);">
                <p style="font-size:50px; margin:0;">🚧</p>
                <h2 style="margin:10px 0;">المنهاج قيد الإعداد</h2>
                <p>لم نتمكن من العثور على دروس لمادة <b>${subjectName}</b> للصف <b>${currentStudent.grade}</b>.</p>
              </div>`;
            return;
        }
    } else {
        document.getElementById('path').innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:var(--mut);">
                <p style="font-size:50px; margin:0;">🚧</p>
                <h2 style="margin:10px 0;">المنهاج قيد الإعداد</h2>
                <p>نحن نعمل حالياً على إضافة منهاج مادة <b>${subjectName}</b> لهذا الصف.</p>
            </div>`;
        return;
    }
    home();
};

document.getElementById('back-to-profiles').onclick = () => { showScreen('subjects-screen'); };
document.getElementById('back-to-profiles-from-subjects').onclick = () => { showScreen('profiles-screen'); loadStudents(); };

async function save() {
  if (!currentStudent) return;
  await sb.from('progress').update({
    xp: S.xp, streak: S.streak, last_active: S.last ? new Date(S.last).toISOString() : null, completed_lessons: S.done
  }).eq('student_id', currentStudent.id);
}

var cur=null,$=function(s){return document.querySelector(s)};

// ==========================================
// 6. عرض المسار
// ==========================================
function home(){
 if(!currentStudent) return;
 document.getElementById("cs").textContent="🔥 "+S.streak;
 document.getElementById("cx").textContent="⭐ "+S.xp;
 var h="",k=0,off=[0,26,38,26,0,-26,-38,-26],cu=false;
 U.forEach(function(u,ui){
  h+='<div class="unit"><h2>'+u.t+'</h2><p>'+u.en+'</p></div>';
  if(!u.l.length)h+='<p class="soon">قريباً</p>';
  u.l.forEach(function(q,li){
   var id=ui+"-"+li;
   var d;
   if(q.lessons){
     d = q.lessons.every(function(_, ili){ return S.done.indexOf(id+"-"+ili) > -1; });
   } else {
     d = S.done.indexOf(id) > -1;
   }
   var c=!d&&!cu,st=d?"done":c?"":"lock";if(c)cu=true;
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

// ==========================================
// 7. بدء العقدة
// ==========================================
function start(u,l){
 var ls=U[u].l[l];
 if(ls.test){
   cur={id:u+"-"+l,u:u,l:l,t:true,qs:shuf(ls.pool).slice(0,10),i:0,h:5,ok:0};
   $("#L").className="open"; q(); return;
 }
 if(ls.lessons){
   var startLi = 0;
   var baseId = u+"-"+l;
   for(var i=0; i<ls.lessons.length; i++){
     if(S.done.indexOf(baseId+"-"+i) === -1){ startLi = i; break; }
   }
   cur={id:baseId,u:u,l:l,t:false,lessons:ls.lessons,li:startLi,h:5,ok:0,totalOk:0};
   $("#L").className="open"; showLesson(); return;
 }
 cur={id:u+"-"+l,u:u,l:l,t:false,qs:ls.q,i:0,h:5,ok:0};
 $("#L").className="open";
 if(!ls.c || !ls.c.length){q();return}
 $("#L").innerHTML='<div class="lh"><button class="x" id="cl">✕</button><div class="bar"></div></div><div class="lb"><h3>'+ls.n+'</h3><p>اقرأ المعلومات التالية بتركيز:</p>'+ls.c.map(function(c,i){return '<div class="card"><b dir="auto">'+c[0]+'</b><span>'+c[1]+'</span></div>'}).join("")+'</div><div class="lf"><div><button class="btn" id="go">ابدأ التمارين</button></div></div>';
 $("#cl").onclick=close; $("#go").onclick=function(){q()};
}

function showLesson(){
 var lesson=cur.lessons[cur.li];
 cur.qs=lesson.q; cur.i=0; cur.ok=0; cur.h=5;
 var lessonNum=cur.li+1; var totalLessons=cur.lessons.length;
 var progressDots='';
 for(var i=0;i<totalLessons;i++){
   var isDone=S.done.indexOf(cur.id+"-"+i)>-1;
   var isCurrent=i===cur.li;
   var dotStyle='width:12px;height:12px;border-radius:50%;display:inline-block;margin:0 3px;';
   if(isDone) dotStyle+='background:var(--good);';
   else if(isCurrent) dotStyle+='background:var(--pri);';
   else dotStyle+='background:var(--line);';
   progressDots+='<span style="'+dotStyle+'"></span>';
 }
 if(!lesson.c || !lesson.c.length){
   $("#L").innerHTML='<div class="lh"><button class="x" id="cl">✕</button><div class="bar"></div><span class="chip">📖 '+lessonNum+'/'+totalLessons+'</span></div><div style="text-align:center;padding:10px;">'+progressDots+'</div><div class="lb" id="lb-content"></div><div class="lf" id="ft"><div><button class="btn" id="ck" disabled>تحقق</button></div></div>';
   $("#cl").onclick=close; q(); return;
 }
 $("#L").innerHTML='<div class="lh"><button class="x" id="cl">✕</button><div class="bar"></div><span class="chip">📖 '+lessonNum+'/'+totalLessons+'</span></div><div style="text-align:center;padding:10px;">'+progressDots+'</div><div class="lb"><h3>'+lesson.n+'</h3><p>اقرأ المعلومات التالية بتركيز:</p>'+lesson.c.map(function(c,i){return '<div class="card"><b dir="auto">'+c[0]+'</b><span>'+c[1]+'</span></div>'}).join("")+'</div><div class="lf"><div><button class="btn" id="go">ابدأ التمارين</button></div></div>';
 $("#cl").onclick=close; $("#go").onclick=function(){q()};
}

// ==========================================
// 8. عرض التمارين
// ==========================================
function q(){
 if(cur.qs[cur.i][0]=='sp') return sp();
 var x=cur.qs[cur.i],ty=x[0];cur.sel=null;cur.ans=[];cur.done=false;
 let mc = (ty === 'mc' || ty === 'ls' || ty === 'fb' || ty === 'tf' || ty === 'oo');

 if (ty === 'tf') {
   cur.opts = ['true', 'false'];
 } else {
   var uniqueOpts = [x[2]];
   if (x[3]) {
     x[3].forEach(function(opt) {
       if (uniqueOpts.indexOf(opt) === -1 && opt !== x[2]) uniqueOpts.push(opt);
     });
   }
   cur.opts = shuf(uniqueOpts);
 }
 cur.bank = mc ? null : shuf(x[2].split(" ").concat(x[3]));
 var b = '';

 var hasAudio = false; var audioText = '';
 if (ty === 'mc' || ty === 'tf' || ty === 'fb' || ty === 'ls') {
   var potentialText = x[1] || '';
   if (/[a-zA-Z]/.test(potentialText)) { hasAudio = true; audioText = potentialText.replace(/___/g, '...'); }
 }

 if (ty === 'tf') {
   b = '<h3>هل هذه المعلومة صحيحة؟</h3><div style="text-align:center; margin: 20px 0; background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--line);"><p style="font-size: 24px; font-weight: bold; color: var(--pri); margin-bottom: 10px;" dir="auto">'+x[1]+'</p><p style="font-size: 20px; color: var(--mut); margin: 10px 0;">⬇️</p><p style="font-size: 22px; font-weight: bold;" dir="auto">'+x[2]+'</p></div>';
   if(hasAudio) b+='<div style="display:flex; gap:10px; justify-content:center; margin-bottom:15px;"><button class="sp" id="say-normal" title="استمع" style="font-size:22px; padding:8px 16px;">🔊</button><button class="sp" id="say-slow" title="استمع ببطء" style="font-size:22px; padding:8px 16px;">🐢</button></div>';
   b+='<div style="display:flex; gap:10px; margin-top:20px;"><button class="opt" style="text-align:center; justify-content:center; border-color: var(--good); color: var(--good); font-weight:700;" data-i="0">✅ صح</button><button class="opt" style="text-align:center; justify-content:center; border-color: var(--bad); color: var(--bad); font-weight:700;" data-i="1">❌ خطأ</button></div>';
 }
 else if (ty === 'oo') {
   b = '<h3>🎯 اختر الكلمة الشاذة:</h3><p style="text-align:center; color:var(--mut); margin-bottom:20px;">واحدة من هذه الكلمات لا تنتمي للمجموعة</p><div style="margin: 20px 0;">' + cur.opts.map(function(o,i){return '<button class="opt" dir="auto" data-i="'+i+'" style="text-align:center; font-size:20px; padding:18px; margin-bottom:12px;">'+o+'</button>'}).join("") + '</div>';
 }
 else if (ty === 'us') {
   var word = x[2]; var meaning = x[4] || x[1];
   var letters = shuf(word.split(''));
   while (letters.join('') === word && letters.length > 1) { letters = shuf(letters); }
   cur.usWord = word; cur.usLetters = letters; cur.usSelected = [];
   b = '<h3>🔤 رتّب الحروف لتكوين الكلمة:</h3><div style="text-align:center; margin: 20px 0;">';
   b += '<p style="font-size: 20px; margin-bottom: 5px;">الترجمة: <b dir="auto" style="color:var(--pri); font-size:22px;">'+meaning+'</b></p>';
   b += '<div style="display:flex; gap:10px; justify-content:center; margin: 15px 0;">';
   b += '<button class="sp" id="us-say" title="استمع" style="font-size:24px; padding:10px 18px;">🔊</button>';
   b += '<button class="sp" id="us-say-slow" title="استمع ببطء" style="font-size:24px; padding:10px 18px;">🐢</button></div>';
   b += '<div id="us-selected" style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap; min-height:60px; margin:15px 0; padding:12px; border:2px dashed var(--line); border-radius:12px; background:var(--card);"></div>';
   b += '<div id="us-bank" style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin:15px 0;"></div>';
   b += '<button id="us-clear" class="btn alt" style="width:auto; padding:10px 25px; margin-top:10px; font-size:15px;">🔄 مسح</button></div>';
 }
 else if (ty === 'fb') {
   b = '<h3>أكمل الفراغ بالإجابة الصحيحة:</h3><p class="pr" style="text-align:center; font-size: 22px; margin-bottom: 15px; line-height: 1.8;" dir="auto">'+x[1]+'</p>';
   if(hasAudio) b+='<div style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;"><button class="sp" id="say-normal" title="استمع" style="font-size:22px; padding:8px 16px;">🔊</button><button class="sp" id="say-slow" title="استمع ببطء" style="font-size:22px; padding:8px 16px;">🐢</button></div>';
   b += cur.opts.map(function(o,i){return '<button class="opt" dir="auto" data-i="'+i+'">'+o+'</button>'}).join("");
 }
 else {
   if(ty === 'ls'){
     b = '<h3>استمع واختر</h3><p class="pr" style="display:flex; gap:10px; justify-content:center; align-items:center;"><button class="sp lg" id="sp">🔊</button><button class="sp lg" id="sp-slow" style="font-size:28px;">🐢</button></p>';
     b += cur.opts.map(function(o,i){return '<button class="opt" dir="auto" data-i="'+i+'">'+o+'</button>'}).join("");
   } else if(mc){
     b = '<h3>اختر الإجابة الصحيحة</h3><p class="pr"><span dir="auto" style="font-size: 22px;">'+x[1]+'</span></p>';
     if(hasAudio) b+='<div style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;"><button class="sp" id="say-normal" title="استمع" style="font-size:22px; padding:8px 16px;">🔊</button><button class="sp" id="say-slow" title="استمع ببطء" style="font-size:22px; padding:8px 16px;">🐢</button></div>';
     b += cur.opts.map(function(o,i){return '<button class="opt" dir="auto" data-i="'+i+'">'+o+'</button>'}).join("");
   } else {
     b = '<h3>رتّب الكلمات لتكوين جملة صحيحة</h3><p class="pr">'+x[1]+'</p><div class="line" id="ln"></div><div class="bank" id="bk"></div>';
   }
 }

 var progressBar = cur.lessons ? '' : '<div class="bar"><i style="width:'+(cur.i/cur.qs.length*100)+'%"></i></div>';
 $("#L").innerHTML='<div class="lh"><button class="x" id="cl">✕</button>'+progressBar+'<span class="chip">'+(cur.t?'📝 اختبار':'❤️ '+cur.h)+'</span></div><div class="lb">'+b+'</div><div class="lf" id="ft"><div><button class="btn" id="ck" disabled>تحقق</button></div></div>';
 $("#cl").onclick=close;$("#ck").onclick=check;

 if(hasAudio){
   var sayNormal=document.getElementById('say-normal');
   var saySlow=document.getElementById('say-slow');
   if(sayNormal) sayNormal.onclick=function(e){e.stopPropagation();say(audioText,1);};
   if(saySlow) saySlow.onclick=function(e){e.stopPropagation();say(audioText,0.5);};
 }
 if(ty === 'ls'){
   var spBtn=document.getElementById('sp'); var spSlow=document.getElementById('sp-slow');
   if(spBtn) spBtn.onclick=function(){say(x[1],1);};
   if(spSlow) spSlow.onclick=function(){say(x[1],0.5);};
 }
 if(ty === 'us'){
   usRender();
   document.getElementById('us-say').onclick=function(e){e.stopPropagation();say(cur.usWord,1);};
   document.getElementById('us-say-slow').onclick=function(e){e.stopPropagation();say(cur.usWord,0.5);};
 }
 else if(mc){
   $(".lb").onclick=function(e){
     var o=e.target.closest(".opt");
     if(!o||cur.done)return;
     if(o.id==='say-normal'||o.id==='say-slow'||o.id==='sp'||o.id==='sp-slow')return;
     [].forEach.call(document.querySelectorAll(".opt"),function(z){z.classList.remove("sel")});
     o.classList.add("sel"); cur.sel=+o.dataset.i; $("#ck").disabled=false;
   };
 }
 else if(ty !== 'us') bw();
}

function usRender(){
 var selEl=document.getElementById('us-selected'); var bankEl=document.getElementById('us-bank');
 if(!selEl||!bankEl)return;
 selEl.innerHTML=cur.usSelected.map(function(idx,pos){
   return '<button class="w" data-pos="'+pos+'" style="width:48px;height:52px;font-size:24px;background:var(--pri);color:var(--onpri);border:none;border-radius:10px;box-shadow:0 3px 0 var(--pri2);">'+cur.usLetters[idx].toUpperCase()+'</button>';
 }).join('');
 bankEl.innerHTML=cur.usLetters.map(function(letter,i){
   var used=cur.usSelected.indexOf(i)>-1;
   return '<button class="w'+(used?' used':'')+'" data-i="'+i+'" style="width:48px;height:52px;font-size:24px;">'+letter.toUpperCase()+'</button>';
 }).join('');
 $("#ck").disabled=cur.usSelected.length!==cur.usLetters.length;
 bankEl.onclick=function(e){
   var btn=e.target.closest('.w'); if(!btn||cur.done)return;
   var idx=+btn.dataset.i; if(cur.usSelected.indexOf(idx)===-1){ cur.usSelected.push(idx); usRender(); }
 };
 selEl.onclick=function(e){
   var btn=e.target.closest('.w'); if(!btn||cur.done)return;
   var pos=+btn.dataset.pos; cur.usSelected.splice(pos,1); usRender();
 };
 var clearBtn=document.getElementById('us-clear');
 if(clearBtn) clearBtn.onclick=function(){ cur.usSelected=[]; usRender(); };
}

function bw(){
 $("#ln").innerHTML=cur.ans.map(function(i,p){return '<button class="w" data-p="'+p+'">'+cur.bank[i]+'</button>'}).join("");
 $("#bk").innerHTML=cur.bank.map(function(w,i){return '<button class="w'+(cur.ans.indexOf(i)>-1?' used':'')+'" data-i="'+i+'">'+w+'</button>'}).join("");
 $("#ck").disabled=!cur.ans.length;
 $("#bk").onclick=function(e){var w=e.target.closest(".w");if(!w||cur.done)return;cur.ans.push(+w.dataset.i);bw()};
 $("#ln").onclick=function(e){var w=e.target.closest(".w");if(!w||cur.done)return;cur.ans.splice(+w.dataset.p,1);bw()};
}

// ==========================================
// 9. تقييم الإجابات
// ==========================================
function check(){
 var x=cur.qs[cur.i],ty=x[0],ok;cur.done=true;
 var correctAnswer = x[2];

 if (ty === 'tf') {
   ok = (cur.opts[cur.sel] === x[3]);
   correctAnswer = x[3] === 'true' ? '✅ صح' : '❌ خطأ';
 }
 else if (ty === 'fb') { ok = (cur.opts[cur.sel] === x[2]); }
 else if (ty === 'bw') { ok = (cur.ans.map(function(i){return cur.bank[i]}).join(" ") === x[2]); }
 else if (ty === 'oo') { ok = (cur.opts[cur.sel] === x[2]); }
 else if (ty === 'us') {
   var userWord = cur.usSelected.map(function(i){return cur.usLetters[i]}).join('');
   ok = (userWord === cur.usWord); correctAnswer = cur.usWord;
 }
 else { ok = (cur.opts[cur.sel] === x[2]); }

 if(ok)cur.ok++;else cur.h--;
 var f=$("#ft");f.className="lf "+(ok?"ok":"no");
 f.innerHTML='<div><p>'+(ok?"أحسنت! إجابة صحيحة 🎉":"الإجابة الصحيحة:")+'</p>'+(ok?'':'<p class="en" dir="auto" style="font-size:18px; color:var(--pri); font-weight:bold;">'+correctAnswer+'</p>')+'<button class="btn" id="nx">متابعة</button></div>';
 $("#nx").onclick=next;
}

function next(){ if(cur.h<=0&&!cur.t)return end(false); cur.i++; cur.i>=cur.qs.length?(cur.t?endT():end(true)):q() }

// ==========================================
// 10. إنهاء الدرس/العقدة
// ==========================================
function end(w){
 if(cur.lessons){
   if(w){
     var lessonId = cur.id+"-"+cur.li;
     if(S.done.indexOf(lessonId)<0) S.done.push(lessonId);
     save();
     cur.totalOk += cur.ok; cur.li++;
     while(cur.li < cur.lessons.length && S.done.indexOf(cur.id+"-"+cur.li) > -1) cur.li++;
     if(cur.li < cur.lessons.length){ showLesson(); return; }
     var g=10+cur.totalOk*2; S.xp+=g; save();
     $("#L").innerHTML='<div class="lb end"><p class="big">🎉</p><h2>أكملت كل الدروس!</h2><p>أحسنت! أنهيت '+cur.lessons.length+' دروس بنجاح</p></div><div class="lf"><div><button class="btn" id="bk2">متابعة</button></div></div>';
     $("#bk2").onclick=close;
   } else {
     $("#L").innerHTML='<div class="lb end"><p class="big">💔</p><h2>انتهت القلوب!</h2><p>لا بأس، حاول مجدداً</p></div><div class="lf"><div><button class="btn" id="bk2">إعادة المحاولة 🔄</button></div></div>';
     $("#bk2").onclick=function(){ showLesson(); };
   }
   return;
 }
 var g=0;
 if(w){g=10+cur.ok*2;S.xp+=g;if(S.done.indexOf(cur.id)<0)S.done.push(cur.id);save()}
 $("#L").innerHTML='<div class="lb end"><p class="big">'+(w?"🎉":"💔")+'</p><h2>'+(w?"أكملت!":"انتهت القلوب")+'</h2></div><div class="lf"><div><button class="btn" id="bk2">متابعة</button></div></div>';
 $("#bk2").onclick=close;
}

// ==========================================
// 11. تمرين النطق
// ==========================================
function sp(){
 var x=cur.qs[cur.i],SR=window.SpeechRecognition||window.webkitSpeechRecognition;cur.done=false;
 var targetText = x[1];
 var cleanText = targetText.toLowerCase().replace(/[.,!?;:]/g, '');
 var targetWords = cleanText.split(/\s+/).filter(function(w){return w.length > 0});

 var wordsHtml = targetWords.map(function(w, i){
   return '<span id="spw-'+i+'" style="display:inline-block; padding:6px 12px; margin:4px; border-radius:8px; background:var(--card); border:2px solid var(--line); font-size:22px; font-weight:bold; transition:all 0.3s;">'+w+'</span>';
 }).join(' ');

 $('#L').innerHTML='<div class="lh"><button class="x" id="cl">✕</button><div class="bar"><i style="width:'+(cur.i/cur.qs.length*100)+'%"></i></div></div>'
 +'<div class="lb"><h3>🎤 انطق بصوتك</h3><div style="text-align:center; margin:15px 0;">'
 +'<div style="display:flex; gap:10px; justify-content:center; margin-bottom:15px;">'
 +'<button class="sp" id="sp" title="استمع" style="font-size:24px; padding:10px 18px;">🔊</button>'
 +'<button class="sp" id="sp-slow" title="استمع ببطء" style="font-size:24px; padding:10px 18px;">🐢</button></div>'
 +'<p style="color:var(--mut); margin-bottom:10px;">الترجمة: <b dir="auto" style="color:var(--pri);">'+x[3]+'</b></p></div>'
 +'<div id="sp-words" style="text-align:center; margin:20px 0; line-height:2.2;">'+wordsHtml+'</div>'
 +(SR?'<button class="mic" id="mic">🎤</button>':'')
 +'<button class="btn" id="sf" style="'+(SR?'display:none':'')+'">كرّرتها ✔</button></div>'
 +'<div class="lf" id="ft"><div><button class="btn alt" id="sk">تخطّي</button></div></div>';

 $('#cl').onclick=close; say(targetText, 1);
 $('#sp').onclick=function(){say(targetText, 1)};
 $('#sp-slow').onclick=function(){say(targetText, 0.5)};
 $('#sk').onclick=function(){cur.i++;cur.i>=cur.qs.length?(cur.t?endT():end(true)):q()};
 $('#sf').onclick=function(){cur.ok++;fb(1,'أحسنت! 🎉')};

 if(SR){
   $('#mic').onclick=function(){
     var m=$('#mic');
     try{
       var rec=new SR(); rec.lang='en-US'; rec.maxAlternatives=1;
       rec.onresult=function(e){
         var spoken = e.results[0][0].transcript.toLowerCase().replace(/[.,!?;:]/g, '').trim();
         var spokenWords = spoken.split(/\s+/).filter(function(w){return w.length > 0});
         var correctCount = 0;
         targetWords.forEach(function(word, i){
           var el = document.getElementById('spw-'+i); if(!el) return;
           var isCorrect = spokenWords.some(function(sw){ return sw === word; });
           if(isCorrect){ el.style.color = 'var(--good)'; el.style.background = 'var(--okbg)'; el.style.borderColor = 'var(--good)'; correctCount++; }
           else { el.style.color = 'var(--bad)'; el.style.background = 'var(--badbg)'; el.style.borderColor = 'var(--bad)'; }
         });
         var total = targetWords.length;
         var percentage = total > 0 ? correctCount / total : 0;
         if(percentage >= 0.7){
           cur.ok++;
           setTimeout(function(){ fb(1, 'نطق ممتاز! 🎉 ('+correctCount+'/'+total+' كلمات صحيحة)'); }, 800);
         } else {
           setTimeout(function(){
             var f=$('#ft'); f.className='lf no';
             f.innerHTML='<div><p>حاول مرة أخرى! ('+correctCount+'/'+total+' كلمات صحيحة)</p><p style="font-size:13px; color:var(--mut);">🟢 أخضر = صحيح &nbsp; 🔴 أحمر = يحتاج تدريب</p><div style="display:flex; gap:10px; margin-top:10px;"><button class="btn alt" id="retry" style="flex:1;">🔄 إعادة</button><button class="btn" id="skip2" style="flex:1;">متابعة</button></div></div>';
             $('#retry').onclick=function(){
               f.className='lf'; f.innerHTML='<div><button class="btn alt" id="sk">تخطّي</button></div>';
               $('#sk').onclick=function(){cur.i++;cur.i>=cur.qs.length?(cur.t?endT():end(true)):q()};
               targetWords.forEach(function(w, i){ var el = document.getElementById('spw-'+i); if(el){ el.style.color=''; el.style.background='var(--card)'; el.style.borderColor='var(--line)'; } });
             };
             $('#skip2').onclick=function(){cur.i++;cur.i>=cur.qs.length?(cur.t?endT():end(true)):q()};
           }, 800);
         }
       };
       rec.onerror=function(e){ $('#sf').style.display='block'; };
       rec.onend=function(){ m.classList.remove('on'); };
       m.classList.add('on'); rec.start();
     }catch(err){ $('#sf').style.display='block'; }
   };
 }
}

function fb(ok,m){cur.done=true;var f=$('#ft');f.className='lf '+(ok?'ok':'no');f.innerHTML='<div><p>'+m+'</p><button class="btn" id="nx">متابعة</button></div>';$('#nx').onclick=next;}

function endT(){
 var n=cur.qs.length,ok=cur.ok,pass=ok/n>=.8,g=30;
 if(pass){S.xp+=g;if(S.done.indexOf(cur.id)<0)S.done.push(cur.id);save()}
 $('#L').innerHTML='<div class="lb end"><p class="big">'+(pass?'🏆':'📝')+'</p><h2>'+(pass?'نجحت!':'حاول مجدداً')+'</h2><p>نتيجتك: '+ok+' من '+n+'</p></div><div class="lf"><div><button class="btn" id="bk2">متابعة</button></div></div>';
 $('#bk2').onclick=close;
}

function close(){$("#L").className="";cur=null;home()}