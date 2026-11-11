// ==========================================
// التحقق من الاتصال
// ==========================================
if (typeof sb === 'undefined' || !sb) {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;color:red;'>فشل الاتصال بقاعدة البيانات. يرجى تحديث الصفحة أو مراجعة إعدادات supabase.js</h2>";
    throw new Error("Supabase client is not initialized.");
}

let currentUser = null;
let currentStudent = null;
let S = { xp: 0, streak: 0, last: "", done: [] };

const SUBJECTS_BY_GRADE = {
  "الأول": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية"],
  "الثاني": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية"],
  "الثالث": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية"],
  "الرابع": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم"],
  "الخامس": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم"],
  "السادس": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم"],
  "السابع": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الاجتماعيات"],
  "الثامن": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الاجتماعيات"],
  "التاسع": ["اللغة الإنجليزية", "الرياضيات", "اللغة العربية", "العلوم", "الاجتماعيات"],
  "العاشر": ["اللغة الإنجليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"],
  "الحادي عشر": ["اللغة الإنجليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"],
  "البكالوريا": ["اللغة الإنجليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"]
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function toast(m) {
  var t = document.getElementById("toast");
  t.textContent = m; 
  t.className = "show";
  setTimeout(function() { t.className = ""; }, 3500);
}

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاتصال. يرجى التحقق من الإنترنت.')), ms))
  ]);
};

// ==========================================
// 1. نظام المصادقة (Auth)
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
  
  if (!email || !pass) return toast('يرجى إدخال البريد وكلمة المرور');

  const btn = document.getElementById('auth-btn');
  const originalText = btn.textContent;
  
  btn.textContent = 'جاري التحميل...';
  btn.disabled = true;

  try {
    if (isLoginMode) {
      // تسجيل الدخول باستخدام sb
      const { data, error } = await withTimeout(
        sb.auth.signInWithPassword({ email, password: pass }),
        15000
      );
      
      if (error) throw error;
      
      currentUser = data.user;
      showScreen('profiles-screen');
      loadStudents();
      toast('تم تسجيل الدخول بنجاح');

    } else {
      // إنشاء حساب جديد باستخدام sb
      const { data, error } = await withTimeout(
        sb.auth.signUp({ email, password: pass }),
        15000
      );
      
      if (error) throw error;

      toast('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
      
      isLoginMode = true;
      document.getElementById('auth-title').textContent = 'تسجيل الدخول';
      document.getElementById('auth-toggle').textContent = 'ليس لديك حساب؟ إنشاء حساب جديد';
    }
  } catch (err) {
    console.error('Auth Error:', err);
    toast('خطأ: ' + (err.message || 'حدث خطأ غير متوقع.'));
  } finally {
    btn.textContent = isLoginMode ? 'دخول' : 'تسجيل';
    btn.disabled = false;
  }
};

document.getElementById('logout-btn').onclick = async () => {
  try {
    await sb.auth.signOut();
    currentUser = null;
    currentStudent = null;
    showScreen('auth-screen');
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-pass').value = '';
  } catch (e) {
    toast('حدث خطأ أثناء الخروج');
  }
};

async function checkSession() {
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      currentUser = data.session.user;
      showScreen('profiles-screen');
      loadStudents();
    } else {
      showScreen('auth-screen');
    }
  } catch (e) {
    showScreen('auth-screen');
  }
}
checkSession();

// ==========================================
// 2. إدارة الطلاب
// ==========================================
window.loadSubjectsForGrade = function(grade) {
  const container = document.getElementById('subjects-container');
  const checkboxes = document.getElementById('subjects-checkboxes');
  
  if (!grade || !SUBJECTS_BY_GRADE[grade]) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  checkboxes.innerHTML = SUBJECTS_BY_GRADE[grade].map(subject => `
    <label style="display:flex; align-items:center; gap:5px; background:var(--bg); padding:5px 10px; border-radius:8px; border:1px solid var(--line); cursor:pointer;">
      <input type="checkbox" value="${subject}" class="subject-cb">
      ${subject}
    </label>
  `).join('');
};

async function loadStudents() {
  if (!currentUser) return;
  
  try {
    const { data: students, error } = await sb
      .from('students')
      .select('*')
      .eq('parent_id', currentUser.id);

    if (error) throw error;

    const grid = document.getElementById('profiles-list');
    const form = document.getElementById('add-student-form');
    form.classList.add('hidden');
    document.getElementById('profiles-list').classList.remove('hidden');

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
  } catch (err) {
    console.error('Error loading students:', err);
    toast('حدث خطأ في جلب بيانات الطلاب');
  }
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

  if(!name || !age || !grade) return toast('يرجى ملء الحقول واختيار الصف');
  if(selectedSubjects.length === 0) return toast('يرجى اختيار مادة واحدة على الأقل');

  const btn = document.getElementById('save-student-btn');
  const originalText = btn.textContent;
  btn.textContent = 'جاري الحفظ...';
  btn.disabled = true;

  try {
    const { error } = await withTimeout(
      sb.from('students').insert({
        parent_id: currentUser.id,
        full_name: name,
        age: parseInt(age),
        grade: grade,
        selected_subjects: selectedSubjects
      }),
      10000
    );

    if (error) throw error;

    document.getElementById('std-name').value = '';
    document.getElementById('std-age').value = '';
    document.getElementById('std-grade').value = '';
    document.getElementById('subjects-container').style.display = 'none';
    
    loadStudents();
    toast('تم إضافة الطالب بنجاح');
  } catch (err) {
    console.error('Error adding student:', err);
    toast('حدث خطأ أثناء الإضافة: ' + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

window.selectStudent = async function(id) {
  try {
    const { data: student, error: stdError } = await sb.from('students').select('*').eq('id', id).single();
    if (stdError) throw stdError;
    
    currentStudent = student;

    let { data: progress, error: progError } = await sb.from('progress').select('*').eq('student_id', id).single();
    
    if (progError && progError.code !== 'PGRST116') {
      throw progError;
    }

    if (!progress) {
      const { data: newProgress, error: createErr } = await sb.from('progress').insert({ student_id: id }).select().single();
      if (createErr) throw createErr;
      progress = newProgress;
    }

    S = {
      xp: progress.xp || 0,
      streak: progress.streak || 0,
      last: progress.last_active || "",
      done: progress.completed_lessons || []
    };

    document.getElementById('app-student-name').textContent = currentStudent.full_name.split(' ')[0];
    showScreen('app-screen');
    home(); 
  } catch (err) {
    console.error('Error selecting student:', err);
    toast('حدث خطأ في تحميل بيانات الطالب');
  }
};

document.getElementById('back-to-profiles').onclick = () => {
  showScreen('profiles-screen');
  loadStudents();
};

async function save() {
  if (!currentStudent) return;
  try {
    await sb.from('progress').update({
      xp: S.xp,
      streak: S.streak,
      last_active: S.last ? new Date(S.last).toISOString() : null,
      completed_lessons: S.done
    }).eq('student_id', currentStudent.id);
  } catch (e) {
    console.error('Error saving progress:', e);
  }
}

// ==========================================
// 3. محرك التعلم (الدروس)
// ==========================================
var GW=[],GP=[],GQ=[],GL=[],PW=[];
RAW.forEach(u=>{(u.w||[]).forEach(w=>GW.push(w[1]));(u.p||[]).forEach(p=>{GP.push(p[1]);p[0].split(' ').forEach(w=>{if(/^[a-z’]+$/.test(w)&&PW.indexOf(w)<0)PW.push(w)})});(u.qa||[]).forEach(a=>GQ.push(a[1]));(u.lt||[]).forEach(z=>{if(!GL.some(g=>g[0]==z[0]))GL.push(z)})});
var LAB=GL.map(z=>z[1]).filter((v,i,a)=>a.indexOf(v)==i),YN=/^(Yes|No)/;

function pk(a,n,ex){return shuf(a.filter((x,i)=>a.indexOf(x)==i&&ex.indexOf(x)<0)).slice(0,n)}
function pk2(a,b,n,ex){var r=pk(a,n,ex);return r.length<n?r.concat(pk(b,n-r.length,ex.concat(r))):r}
function gen(u){
 var L=[],W=u.w||[],P=u.p||[],Q=u.qa||[],T=u.lt||[],wa=W.map(w=>w[1]),pa=P.map(p=>p[1]),i;
 for(i=0;i<W.length;i+=6){let c=W.slice(i,i+6),q=[];
  c.forEach(w=>q.push(['mc',w[0],w[1],pk2(wa,GW,2,[w[1]])]));
  c.forEach(w=>q.push(['ls',w[0],w[0],pk(W.map(z=>z[0]),2,[w[0]])]));
  L.push({n:'الكلمات الجديدة'+(W.length>6?' ('+(i/6+1)+')':''),c:c.map(w=>[(w[2]||'')+' '+w[0],w[1]]),q:q})}
 for(i=0;i<P.length;i+=5){let c=P.slice(i,i+5),q=[];
  c.forEach(p=>q.push(['mc',p[0],p[1],pk2(pa,GP,2,[p[1]])]));
  c.forEach(p=>{let t=p[0].split(' ');if(t.length>1&&t.length<7)q.push(['bw',p[1],p[0],pk(PW,2,t.map(x=>x.toLowerCase().replace(/[.,!?]/g,'')))])});
  c.slice(0,2).forEach(p=>q.push(['ls',p[0],p[0],pk(P.map(z=>z[0]),2,[p[0]])]));
  L.push({n:'الجمل'+(P.length>5?' ('+(i/5+1)+')':''),c:c,q:q})}
 if(Q.length)L.push({n:'اسأل وأجب',c:[],q:Q.map(a=>['rp',a[0],a[1],YN.test(a[1])?[a[1][0]=='Y'?'No, it isn’t.':'Yes, it is.']:pk2(Q.map(z=>z[1]).filter(x=>!YN.test(x)),GQ.filter(x=>!YN.test(x)),2,[a[1]])])});
 if(T.length){let q=[],u2=T.filter((z,k)=>T.findIndex(y=>y[0]==z[0])==k);
  u2.forEach(z=>q.push(['lt',z[0],z[1],pk2(LAB,LAB,2,[z[1]])]));
  u2.slice(0,Math.max(1,8-q.length)).forEach(z=>q.push(['lw',z[1],z[0],pk(GL.filter(g=>g[1]!=z[1]).map(g=>g[0]),2,[])]));
  u2.slice(0,Math.max(1,8-q.length)).forEach(z=>q.push(['ls',z[0],z[0],pk(GL.map(g=>g[0]),2,[z[0]])]));
  L.push({n:'الحروف والأصوات',c:u2.map(z=>[z[0],'حرف '+z[1]]),q:q})}
 var all=[].concat(...L.map(l=>l.q));
 if(L.length>1){let s=Math.max(1,Math.floor(all.length/8)),r=[];for(i=0;i<all.length&&r.length<8;i+=s)r.push(all[i]);L.push({n:'مراجعة الوحدة',c:[],q:r})}
 return {t:u.t,en:u.en,l:L}}

var U=RAW.map(gen);
U.forEach(u=>{if(!u.l.length)return;var seen={},cd=[],pool=[];
 u.l.forEach(l=>{l.q.forEach(x=>{if(pool.indexOf(x)<0)pool.push(x)});l.c.forEach(c=>{var e=c[0].replace(/[^\x00-\x7F’]/g,'').trim();if(e&&!seen[e]){seen[e]=1;cd.push([e,c[1]])}})});
 var n=Math.min(8,cd.length),sq=[];for(var k=0;k<n;k++){var c=cd[Math.floor(k*cd.length/n)];sq.push(['sp',c[0],c[0],c[1]])}
 var ri=u.l.findIndex(l=>l.n=='مراجعة الوحدة'),pl={n:'تدريب النطق',c:[],q:sq};
 if(ri<0)u.l.push(pl);else u.l.splice(ri,0,pl);
 u.l.push({n:'اختبار الوحدة',c:[],test:1,pool:pool,q:[]})});

var cur=null,$=function(s){return document.querySelector(s)};
function shuf(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function say(t){try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t.replace(/[^\x00-\x7F’]/g,""));u.lang="en-US";speechSynthesis.speak(u)}catch(e){}}

function home(){
 if(!currentStudent) return;
 document.getElementById("cs").textContent="🔥 "+S.streak;
 document.getElementById("cx").textContent="⭐ "+S.xp;
 
 const isEnglishSelected = currentStudent.selected_subjects.includes("اللغة الإنجليزية");
 const isFirstGrade = currentStudent.grade === "الأول";

 if (!isEnglishSelected || !isFirstGrade) {
   document.getElementById("path").innerHTML = `
     <div style="text-align:center; padding:50px 20px; color:var(--mut);">
       <p style="font-size:50px; margin:0;">🚧</p>
       <h2 style="margin:10px 0;">المنهاج قيد الإعداد</h2>
       <p>نحن نعمل حالياً على إضافة منهاج <b>${currentStudent.grade}</b> لمادة <b>اللغة الإنجليزية</b>.</p>
       <p>يرجى العودة قريباً!</p>
     </div>
   `;
   return;
 }

 var h="",k=0,off=[0,26,38,26,0,-26,-38,-26],cu=false;
 U.forEach(function(u,ui){
  h+='<div class="unit"><h2>'+u.t+'</h2><p>'+u.en+'</p></div>';
  if(!u.l.length)h+='<p class="soon">قريباً</p>';
  u.l.forEach(function(q,li){
   var id=ui+"-"+li,d=S.done.indexOf(id)>-1,c=!d&&!cu,st=d?"done":c?"":"lock";if(c)cu=true;
   h+='<button class="node '+st+'" style="transform:translateX('+off[k%8]+'px)" data-u="'+ui+'" data-l="'+li+'" aria-label="درس '+(li+1)+'">'+(d?"✓":q.test?"🏆":"★")+'</button>';k++;
  });
 });
 document.getElementById("path").innerHTML=h;
}

document.getElementById("path").onclick=function(e){
 var n=e.target.closest(".node");
 if(!n)return;
 if(n.classList.contains("lock")){toast(+n.dataset.l==0?"انجح في اختبار الوحدة السابقة أولاً":"أكمل الدرس السابق أولاً");return}
 start(+n.dataset.u,+n.dataset.l)
};

function start(u,l){
 var ls=U[u].l[l];
 cur={id:u+"-"+l,u:u,l:l,t:!!ls.test,qs:ls.test?shuf(ls.pool).slice(0,10):ls.q,i:0,h:5,ok:0};
 $("#L").className="open";
 if(!ls.c.length){q();return}
 $("#L").innerHTML='<div class="lh"><button class="x" id="cl" aria-label="إغلاق">✕</button><div class="bar"></div></div><div class="lb"><h3>'+ls.n+'</h3><p>اضغط 🔊 لتسمع، ثم كرّر بصوتك</p>'+ls.c.map(function(c,i){return '<div class="card"><b dir="ltr">'+c[0]+'</b><span>'+c[1]+'</span><button class="sp" data-s="'+i+'" aria-label="استمع">🔊</button></div>'}).join("")+'</div><div class="lf"><div><button class="btn" id="go">ابدأ التمارين</button></div></div>';
 $("#cl").onclick=close;
 $("#go").onclick=function(){q()};
 $(".lb").onclick=function(e){var b=e.target.closest("[data-s]");if(b)say(ls.c[+b.dataset.s][0])}
}

function q(){
 if(cur.qs[cur.i][0]=='sp')return sp();
 var x=cur.qs[cur.i],mc=x[0]!="bw",ty=x[0];cur.sel=null;cur.ans=[];cur.done=false;
 cur.opts=mc?shuf([x[2]].concat(x[3])):null;cur.bank=mc?null:shuf(x[2].split(" ").concat(x[3]));
 var en=mc&&/[A-Za-z]/.test(x[1]);
 var b=mc?'<h3>'+({mc:"اختر المعنى الصحيح",ls:"استمع واختر ما سمعت",rp:"اختر الرد المناسب",lt:"اختر الحرف الأول من الكلمة",lw:"اختر الكلمة التي تبدأ بهذا الحرف"})[ty]+'</h3>'+(ty=="ls"?'<p class="pr"><button class="sp lg" id="sp" aria-label="استمع">🔊</button></p>':'<p class="pr"><span dir="auto">'+x[1]+'</span>'+(en?'<button class="sp" id="sp" aria-label="استمع">🔊</button>':'')+'</p>')+cur.opts.map(function(o,i){return '<button class="opt" dir="auto" data-i="'+i+'">'+o+'</button>'}).join("")
  :'<h3>رتّب الكلمات بالإنجليزية</h3><p class="pr">'+x[1]+'</p><div class="line" id="ln"></div><div class="bank" id="bk"></div>';
 $("#L").innerHTML='<div class="lh"><button class="x" id="cl" aria-label="إغلاق">✕</button><div class="bar"><i style="width:'+(cur.i/cur.qs.length*100)+'%"></i></div><span class="chip">'+(cur.t?'📝 اختبار':'❤️ '+cur.h)+'</span></div><div class="lb">'+b+'</div><div class="lf" id="ft"><div><button class="btn" id="ck" disabled>تحقق</button></div></div>';
 $("#cl").onclick=close;$("#ck").onclick=check;
 if(en){say(x[1]);$("#sp").onclick=function(){say(x[1])}}
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
 var x=cur.qs[cur.i],mc=x[0]!="bw",ok;cur.done=true;
 ok=mc?cur.opts[cur.sel]==x[2]:cur.ans.map(function(i){return cur.bank[i]}).join(" ")==x[2];
 if(ok)cur.ok++;else cur.h--;
 var f=$("#ft");f.className="lf "+(ok?"ok":"no");
 f.innerHTML='<div><p>'+(ok?"أحسنت! إجابة صحيحة":"الإجابة الصحيحة:")+'</p>'+(ok?'':'<p class="en" dir="auto">'+x[2]+'</p>')+'<button class="btn" id="nx">متابعة</button></div>';
 $("#nx").onclick=next;$("#nx").focus();
}

function next(){
 if(cur.h<=0&&!cur.t)return end(false);
 cur.i++;cur.i>=cur.qs.length?(cur.t?endT():end(true)):q()
}

function end(w){
 var g=0;
 if(w){g=10+cur.ok*2;S.xp+=g;if(S.done.indexOf(cur.id)<0)S.done.push(cur.id);
  var t=new Date().toDateString(),y=new Date(Date.now()-864e5).toDateString();
  if(S.last!=t){S.streak=S.last==y?S.streak+1:1;S.last=t}save()}
 $("#L").innerHTML='<div class="lb end"><p class="big">'+(w?"🎉":"💔")+'</p><h2>'+(w?"أكملت الدرس!":"انتهت القلوب")+'</h2><p>'+(w?"حصلت على "+g+" نقطة":"جرّب الدرس مرة ثانية")+'</p></div><div class="lf"><div><button class="btn" id="bk2">'+(w?"متابعة":"رجوع")+'</button></div></div>';
 $("#bk2").onclick=close;
}

function fb(ok,m){cur.done=true;var f=$('#ft');f.className='lf '+(ok?'ok':'no');f.innerHTML=`<div><p>${m}</p><button class='btn' id='nx'>متابعة</button></div>`;$('#nx').onclick=next;$('#nx').focus()}
function lv(a,b){var d=[],i,j;for(i=0;i<=a.length;i++)d[i]=[i];for(j=1;j<=b.length;j++)d[0][j]=j;for(i=1;i<=a.length;i++)for(j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));return d[a.length][b.length]}
function sim(h,t){var NW=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
 var N=function(s){return s.toLowerCase().replace(/[’‘]/g,`'`).replace(/\b(\d+)\b/g,function(m){return NW[+m]||m}).replace(/\b(i) am\b/g,`i'm`).replace(/\b(it|he|she|what|who|that|there) is\b/g,`$1's`).replace(/[^a-z' ]/g,'').trim().split(/\s+/)};
 var a=N(h),b=N(t),m=0;b.forEach(function(w){if(a.some(function(v){return v==w||(w.length>3&&lv(v,w)<=1)}))m++});return m/b.length}

function sp(){
 var x=cur.qs[cur.i],SR=window.SpeechRecognition||window.webkitSpeechRecognition,tr=0;cur.done=false;
 $('#L').innerHTML=`<div class='lh'><button class='x' id='cl' aria-label='إغلاق'>✕</button><div class='bar'><i style='width:${cur.i/cur.qs.length*100}%'></i></div><span class='chip'>${cur.t?'📝 اختبار':'❤️ '+cur.h}</span></div><div class='lb'><h3>انطق بصوتك</h3><p class='pr'><span dir='ltr'>${x[1]}</span><button class='sp' id='sp' aria-label='استمع'>🔊</button></p><p>${x[3]}</p>${SR?`<button class='mic' id='mic' aria-label='تحدّث'>🎤</button>`:''}<p id='hr' style='text-align:center'>${SR?'اضغط على الميكروفون وانطق':'جهازك لا يدعم التعرّف على الصوت. استمع ثم كرّر بصوتك.'}</p><button class='btn' id='sf' style='${SR?'display:none':''}'>كرّرتها بصوتي ✔</button></div><div class='lf' id='ft'><div><button class='btn alt' id='sk'>تخطّي</button></div></div>`;
 $('#cl').onclick=close;say(x[1]);$('#sp').onclick=function(){say(x[1])};
 $('#sk').onclick=function(){cur.i++;cur.i>=cur.qs.length?(cur.t?endT():end(true)):q()};
 $('#sf').onclick=function(){cur.ok++;fb(1,'أحسنت! استمر في التدريب')};
 if(SR)$('#mic').onclick=function(){var m=$('#mic');
  try{var rec=new SR();rec.lang='en-US';rec.maxAlternatives=3;
   rec.onresult=function(e){var al=[].map.call(e.results[0],function(a){return a.transcript}),ok=al.some(function(a){return sim(a,x[1])>=.6});
    if(ok){cur.ok++;fb(1,'نطق ممتاز! 🎉')}else{tr++;$('#hr').textContent='سمعتُ: '+al[0]+' — جرّب مرة ثانية';if(tr>=2)$('#sf').style.display='block'}};
   rec.onerror=function(e){$('#hr').textContent=(e.error=='not-allowed'||e.error=='service-not-allowed')?'الميكروفون غير مسموح. فعّله من إعدادات المتصفح، أو كرّر بدون تحقق.':'لم أسمعك، جرّب مرة ثانية';$('#sf').style.display='block'};
   rec.onend=function(){m.classList.remove('on')};m.classList.add('on');rec.start()}catch(err){$('#sf').style.display='block'}}
}

function endT(){
 var n=cur.qs.length,ok=cur.ok,pass=ok/n>=.8,g=30;
 if(pass){S.xp+=g;if(S.done.indexOf(cur.id)<0)S.done.push(cur.id);var t=new Date().toDateString(),y=new Date(Date.now()-864e5).toDateString();if(S.last!=t){S.streak=S.last==y?S.streak+1:1;S.last=t}save()}
 $('#L').innerHTML=`<div class='lb end'><p class='big'>${pass?'🏆':'📝'}</p><h2>${pass?'نجحت في الاختبار!':'لم تنجح هذه المرة'}</h2><p>نتيجتك: ${ok} من ${n}${pass?' — فُتحت الوحدة التالية وحصلت على '+g+' نقطة':' — تحتاج 80% على الأقل. راجع الدروس وحاول مرة ثانية'}</p></div><div class='lf'><div>${pass?'':`<button class='btn' id='rt' style='margin-bottom:10px'>أعد الاختبار</button>`}<button class='btn${pass?'':' alt'}' id='bk2'>${pass?'متابعة':'رجوع'}</button></div></div>`;
 $('#bk2').onclick=close;
 if(!pass){var u=cur.u,l=cur.l;$('#rt').onclick=function(){start(u,l)}}
}

function close(){$("#L").className="";cur=null;home()}