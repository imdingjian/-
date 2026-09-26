const KEY="socialLaborPWA.v1";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{
  records:[],totalHours:0,dailyTarget:8
};
let view=new Date(); view.setDate(1);
let selected=formatDate(new Date()), editing=null, deferredPrompt=null;

const $=id=>document.getElementById(id);
function pad(n){return String(n).padStart(2,"0")}
function formatDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function monthName(d){return `${d.getFullYear()} 年 ${d.getMonth()+1} 月`}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function hoursText(h){
  h=Math.max(0,Number(h)||0); const mins=Math.round(h*60), hh=Math.floor(mins/60), mm=mins%60;
  return mm?`${hh} 小時 ${mm} 分`: `${hh} 小時`;
}
function calc(start,end,br){
  if(!start||!end)return 0;
  let a=start.split(":").map(Number),b=end.split(":").map(Number);
  let am=a[0]*60+a[1], bm=b[0]*60+b[1]; if(bm<am)bm+=1440;
  return Math.max(0,(bm-am-Number(br||0))/60);
}
function recordsFor(date){return state.records.filter(r=>r.date===date)}
function sum(rs){return rs.reduce((x,r)=>x+Number(r.hours||0),0)}
function monthTotal(){
  const y=view.getFullYear(),m=view.getMonth();
  return sum(state.records.filter(r=>{const d=new Date(r.date+"T12:00:00");return d.getFullYear()===y&&d.getMonth()===m}))
}
function yearTotal(){
  const y=view.getFullYear();
  return sum(state.records.filter(r=>new Date(r.date+"T12:00:00").getFullYear()===y))
}
function updateStats(){
  const mh=monthTotal(),yh=yearTotal(),dh=sum(recordsFor(selected)),total=Number(state.totalHours)||0,rem=Math.max(0,total-yh);
  $("monthHours").textContent=hoursText(mh);$("yearHours").textContent=hoursText(yh);$("dayHours").textContent=hoursText(dh);$("remaining").textContent=hoursText(rem);
  const pct=total?Math.min(100,yh/total*100):0;$("progressText").textContent=pct.toFixed(1)+"%";$("progressBar").style.width=pct+"%";
  if(!total){$("finishInfo").textContent="請設定應完成總時數";}
  else if(rem<=0){$("finishInfo").textContent="已完成全部社會勞動時數 🎉";}
  else{
    const target=Math.max(.25,Number(state.dailyTarget)||8),days=Math.ceil(rem/target);
    const finish=new Date(); finish.setDate(finish.getDate()+days);
    $("finishInfo").textContent=`剩 ${days} 個預計工作日（以 ${target} 小時/日計），預估完成：${formatDate(finish)}`;
  }
}
function renderCalendar(){
  $("monthTitle").textContent=monthName(view); const box=$("days");box.innerHTML="";
  const y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),today=formatDate(new Date());
  for(let i=0;i<first;i++)box.appendChild(document.createElement("div"));
  for(let n=1;n<=last;n++){
    const d=new Date(y,m,n),ds=formatDate(d),rs=recordsFor(ds),h=sum(rs),el=document.createElement("div");
    el.className="day"+(ds===today?" today":"")+(h?" work":"")+(ds===selected?" selected":"");
    el.innerHTML=`<div class="num">${n}</div>${h?`<div class="dh">${hoursText(h)}</div>`:""}`;
    el.onclick=()=>{selected=ds;render()};
    box.appendChild(el);
  }
}
function renderRecords(){
  $("selectedTitle").textContent=`${selected} 紀錄`;
  const box=$("records"),rs=recordsFor(selected);box.innerHTML="";
  if(!rs.length){box.innerHTML=`<div class="card empty">今天尚無社會勞動紀錄</div>`;return}
  rs.forEach(r=>{
    const el=document.createElement("div");el.className="record";
    el.innerHTML=`<div class="record-head"><div class="record-title">${esc(r.title)}</div><div class="hours">${hoursText(r.hours)}</div></div>
      <div class="meta">📍 ${esc(r.location||"未填寫地點")}</div>
      <div class="meta">🕐 ${r.start} ～ ${r.end}　☕ 休息 ${r.breakMinutes} 分</div>
      ${r.description?`<div class="desc">${esc(r.description)}</div>`:""}
      <div class="actions"><button class="edit" data-edit="${r.id}">編輯</button><button class="del" data-del="${r.id}">刪除</button></div>`;
    box.appendChild(el);
  });
  box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));
  box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>delRecord(b.dataset.del));
}
function render(){ $("totalHours").value=state.totalHours||"";$("dailyTarget").value=state.dailyTarget||8;renderCalendar();renderRecords();updateStats(); }
function openModal(r=null){
  editing=r?.id||null;$("modalTitle").textContent=r?"編輯社會勞動":"新增社會勞動";
  $("date").value=r?.date||selected;$("title").value=r?.title||"";$("location").value=r?.location||"";
  $("start").value=r?.start||"09:00";$("end").value=r?.end||"17:00";$("break").value=String(r?.breakMinutes??60);$("description").value=r?.description||"";
  $("modal").classList.add("show");
}
function closeModal(){$("modal").classList.remove("show");editing=null}
function saveRecord(){
  const date=$("date").value,title=$("title").value.trim(),location=$("location").value.trim(),start=$("start").value,end=$("end").value,br=Number($("break").value),description=$("description").value.trim(),h=calc(start,end,br);
  if(!date||!title||!start||!end){toast("請完整填寫日期、標題與時間");return}
  if(h<=0){toast("有效工時必須大於 0");return}
  const item={id:editing||crypto.randomUUID(),date,title,location,start,end,breakMinutes:br,description,hours:h};
  if(editing){const i=state.records.findIndex(r=>r.id===editing);if(i>=0)state.records[i]=item}else state.records.push(item);
  selected=date;view=new Date(date+"T12:00:00");view.setDate(1);save();closeModal();render();toast("紀錄已儲存");
}
function openEdit(id){const r=state.records.find(x=>x.id===id);if(r)openModal(r)}
function delRecord(id){if(!confirm("確定刪除這筆紀錄？"))return;state.records=state.records.filter(r=>r.id!==id);save();render();toast("已刪除")}
function toast(s){const t=$("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function download(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function backup(){
  const data={...state,exportedAt:new Date().toISOString(),app:"social-labor-pwa"};
  download(`social-labor-backup-${formatDate(new Date())}.json`,new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
}
function restore(file){
  const rd=new FileReader();rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!Array.isArray(d.records))throw 0;state={records:d.records,totalHours:Number(d.totalHours)||0,dailyTarget:Number(d.dailyTarget)||8};save();render();toast("資料已還原")}catch{toast("備份檔格式錯誤")}};rd.readAsText(file);
}
function csv(){
  const rows=[["日期","標題","地點","開始","結束","休息分鐘","工時","說明"],...state.records.sort((a,b)=>a.date.localeCompare(b.date)).map(r=>[r.date,r.title,r.location,r.start,r.end,r.breakMinutes,r.hours,r.description])];
  const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  download(`social-labor-${formatDate(new Date())}.csv`,new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
}
function pdf(){
  const y=view.getFullYear(),rows=state.records.filter(r=>new Date(r.date+"T12:00:00").getFullYear()===y).sort((a,b)=>a.date.localeCompare(b.date));
  const w=window.open("","_blank");if(!w){toast("請允許開啟報表視窗");return}
  w.document.write(`<html><head><title>社會勞動時數報表</title><style>body{font-family:Arial,"Noto Sans TC",sans-serif;padding:28px;color:#222}h1{margin-bottom:4px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ccc;padding:7px;font-size:12px}th{background:#f1f3f5}.summary{margin:10px 0}</style></head><body><h1>社會勞動時數報表</h1><div class="summary">年度：${y}　總時數：${hoursText(sum(rows))}　應完成：${state.totalHours||0} 小時　剩餘：${hoursText(Math.max(0,(state.totalHours||0)-sum(rows)))}</div><table><tr><th>日期</th><th>標題</th><th>地點</th><th>時間</th><th>休息</th><th>工時</th><th>說明</th></tr>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.title)}</td><td>${esc(r.location)}</td><td>${r.start}～${r.end}</td><td>${r.breakMinutes}分</td><td>${hoursText(r.hours)}</td><td>${esc(r.description)}</td></tr>`).join("")}</table><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
$("prevMonth").onclick=()=>{view.setMonth(view.getMonth()-1);renderCalendar()}
$("nextMonth").onclick=()=>{view.setMonth(view.getMonth()+1);renderCalendar()}
$("addBtn").onclick=()=>openModal();$("cancelBtn").onclick=closeModal;$("saveBtn").onclick=saveRecord;
$("totalHours").onchange=e=>{state.totalHours=Number(e.target.value)||0;save();updateStats()}
$("dailyTarget").onchange=e=>{state.dailyTarget=Number(e.target.value)||8;save();updateStats()}
$("backupBtn").onclick=backup;$("restoreBtn").onclick=()=>$("restoreInput").click();$("restoreInput").onchange=e=>e.target.files[0]&&restore(e.target.files[0]);$("csvBtn").onclick=csv;$("pdfBtn").onclick=pdf;
$("clearBtn").onclick=()=>{if(confirm("確定清除全部紀錄？此操作無法復原。")){state.records=[];save();render();toast("已清除")}}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBox").style.display="block"});
$("installBtn").onclick=async()=>{if(!deferredPrompt){toast("iPhone 請用 Safari 的「分享 → 加入主畫面」");return}deferredPrompt.prompt();deferredPrompt=null;$("installBox").style.display="none"};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();
