const $ = (s) => document.querySelector(s);
let token = sessionStorage.getItem("ff_token");
let currentUser = JSON.parse(sessionStorage.getItem("ff_user") || "null");
let activePage = "dashboard";

const menus = {
  STUDENT: [["dashboard","Dashboard","fa-house"],["faculty","Faculty availability","fa-users"],["calendar","Approved leave calendar","fa-calendar-days"]],
  FACULTY: [["dashboard","Dashboard","fa-house"],["apply","Apply for leave","fa-file-circle-plus"],["history","My applications","fa-clock-rotate-left"],["balances","Leave balances","fa-wallet"]],
  HOD: [["dashboard","Dashboard","fa-house"],["approvals","Department approvals","fa-stamp"],["faculty","Faculty availability","fa-users"]],
  ADMIN: [["dashboard","Dashboard","fa-house"],["approvals","Final approvals","fa-stamp"],["users","User management","fa-user-gear"],["departments","Departments","fa-building"],["balances","Leave balances","fa-wallet"],["reports","Reports","fa-chart-column"]]
};
const iconMap = {dashboard:"fa-house",faculty:"fa-users",calendar:"fa-calendar-days",apply:"fa-file-circle-plus",history:"fa-clock-rotate-left",balances:"fa-wallet",approvals:"fa-stamp",users:"fa-user-gear",departments:"fa-building",reports:"fa-chart-column"};
const roleName = {STUDENT:"STUDENT PORTAL",FACULTY:"FACULTY PORTAL",HOD:"HOD PORTAL",ADMIN:"ADMIN PORTAL"};
async function api(path, options={}) {
  const res = await fetch("/api"+path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.headers||{})}});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message||"Request failed");
  return data;
}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3200)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function status(v){return `<span class="status ${String(v).toLowerCase().replaceAll("_","-")}">${esc(String(v).replaceAll("_"," "))}</span>`}
function showLogin(){$("#loginView").classList.remove("d-none");$("#appView").classList.add("d-none")}
function showApp(){
  $("#loginView").classList.add("d-none");$("#appView").classList.remove("d-none");
  $("#userName").textContent=currentUser.name;$("#userRole").textContent=roleName[currentUser.role];$("#avatar").textContent=currentUser.name.slice(0,1).toUpperCase();
  $("#navLinks").innerHTML=menus[currentUser.role].map(([id,label,ic])=>`<button class="nav-link ${activePage===id?"active":""}" data-page="${id}"><i class="fa-solid ${ic}"></i>${label}</button>`).join("");
  $("#navLinks").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
  navigate(activePage);
}
function navigate(page){activePage=page;$("#pageTitle").textContent=(menus[currentUser.role].find(x=>x[0]===page)||[])[1]||"Dashboard";$("#navLinks").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#sidebar").classList.remove("open");render(page)}
function heading(title,desc,action=""){return `<div class="page-heading"><div><h2>${title}</h2><p>${desc}</p></div>${action}</div>`}
function table(headers,rows){return `<div class="table-responsive"><table class="table align-middle"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows||""}</tbody></table></div>`}
function empty(msg="No records found."){return `<div class="empty"><i class="fa-regular fa-folder-open d-block mb-2 fs-4"></i>${msg}</div>`}
async function render(page){
  const c=$("#content");c.innerHTML=`<div class="empty">Loading workspace…</div>`;
  try{
    if(page==="dashboard") return await dashboard();
    if(page==="faculty") return await faculty();
    if(page==="calendar") return await calendar();
    if(page==="apply") return await applyLeave();
    if(page==="history") return await history();
    if(page==="balances") return await balances();
    if(page==="approvals") return await approvals();
    if(page==="users") return await users();
    if(page==="departments") return await departments();
    if(page==="reports") return await reports();
  }catch(e){c.innerHTML=`<div class="panel">${empty(esc(e.message))}</div>`}
}
async function dashboard(){
  const c=$("#content");let sub="",cards=[];
  if(currentUser.role==="STUDENT"){
    const [f,l]=await Promise.all([api("/faculty-directory"),api("/student/approved-leaves")]);
    const away=f.filter(x=>x.availability==="ON LEAVE").length;
    sub=`<div class="welcome-strip"><h2>Welcome to your campus view</h2><p>Find faculty members and check currently approved leave information.</p></div><div class="stats-grid">${stat("Faculty listed",f.length,"fa-users")}${stat("Currently on leave",away,"fa-calendar-xmark")}${stat("Upcoming / active leaves",l.length,"fa-calendar-check")}</div><div class="panel"><div class="panel-head"><h3>Faculty availability</h3><button class="btn btn-sm btn-outline-secondary" data-go="faculty">View directory</button></div>${table(["Faculty","Department","Availability"],f.slice(0,6).map(x=>`<tr><td>${esc(x.full_name)}</td><td>${esc(x.department)}</td><td>${status(x.availability)}</td></tr>`).join(""))}</div>`;
  }else if(currentUser.role==="FACULTY"){
    const [l,b]=await Promise.all([api("/my-leaves"),api("/balances")]);
    sub=`<div class="welcome-strip"><h2>Welcome, ${esc(currentUser.name)}</h2><p>Manage leave applications and keep track of your leave records.</p></div><div class="stats-grid">${stat("Applications",l.length,"fa-file-lines")}${stat("Pending",l.filter(x=>x.status.startsWith("PENDING")).length,"fa-hourglass-half")}${stat("Approved",l.filter(x=>x.status==="APPROVED").length,"fa-circle-check")}${stat("Leave types",b.length,"fa-wallet")}</div><div class="panel"><div class="panel-head"><h3>Recent applications</h3></div>${table(["Leave type","Dates","Days","Status"],l.slice(0,6).map(x=>`<tr><td>${esc(x.leave_type)}</td><td>${esc(x.start_date)} – ${esc(x.end_date)}</td><td>${x.total_days}</td><td>${status(x.status)}</td></tr>`).join(""))||empty()}</div>`;
  }else{
    const a=await api("/approvals");
    sub=`<div class="welcome-strip"><h2>${currentUser.role==="HOD"?"Department overview":"Administration overview"}</h2><p>${currentUser.role==="HOD"?"Review requests submitted by faculty in your department.":"Manage the final stage of faculty leave approvals and campus administration."}</p></div><div class="stats-grid">${stat("Awaiting your review",a.length,"fa-inbox")}${stat("Your role",currentUser.role,"fa-user-shield")}</div><div class="panel"><div class="panel-head"><h3>Pending approvals</h3><button class="btn btn-sm btn-outline-secondary" data-go="approvals">Open queue</button></div>${table(["Faculty","Department","Leave type","Dates","Status"],a.slice(0,6).map(x=>`<tr><td>${esc(x.faculty_name)}</td><td>${esc(x.department)}</td><td>${esc(x.leave_type)}</td><td>${esc(x.start_date)} – ${esc(x.end_date)}</td><td>${status(x.status)}</td></tr>`).join(""))||empty()}</div>`;
  }
  c.innerHTML=sub;c.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>navigate(b.dataset.go));
}
function stat(label,value,ic){return `<div class="stat-card"><div class="stat-icon"><i class="fa-solid ${ic}"></i></div><div><small>${label}</small><strong>${value}</strong></div></div>`}
async function faculty(){
  const rows=await api("/faculty-directory");$("#content").innerHTML=heading("Faculty availability","Search the university faculty directory and current availability.")+`<div class="panel"><div class="search-row"><input id="facultySearch" class="form-control" placeholder="Search faculty or department"><select id="availabilityFilter" class="form-select"><option value="">All availability</option><option>AVAILABLE</option><option>ON LEAVE</option></select></div><div id="facultyTable"></div></div>`;
  const draw=()=>{const q=$("#facultySearch").value.toLowerCase(),f=$("#availabilityFilter").value;const filtered=rows.filter(x=>(x.full_name+" "+x.department).toLowerCase().includes(q)&&(!f||x.availability===f));$("#facultyTable").innerHTML=filtered.length?table(["Faculty member","Designation","Department","Availability"],filtered.map(x=>`<tr><td><b>${esc(x.full_name)}</b></td><td>${esc(x.designation||"Faculty")}</td><td>${esc(x.department)}</td><td>${status(x.availability)}</td></tr>`).join("")):empty();};
  $("#facultySearch").oninput=draw;$("#availabilityFilter").onchange=draw;draw();
}
async function calendar(){
  const rows=await api("/student/approved-leaves");$("#content").innerHTML=heading("Approved faculty leave calendar","Only approved leave information is visible to students.")+`<div class="panel">${rows.length?table(["Faculty","Department","Leave type","From","To","Days"],rows.map(x=>`<tr><td>${esc(x.full_name)}</td><td>${esc(x.department)}</td><td>${esc(x.leave_type)}</td><td>${esc(x.start_date)}</td><td>${esc(x.end_date)}</td><td>${x.total_days}</td></tr>`).join("")):empty("No upcoming or active approved leaves.")}</div>`;
}
async function applyLeave(){
  const types=await api("/leave-types");$("#content").innerHTML=heading("Apply for leave","Submit a leave request for review by your Head of Department.")+`<div class="panel" style="max-width:760px"><form id="leaveForm"><div class="mb-3"><label class="form-label">Leave type</label><select class="form-select" name="leave_type_id" required><option value="">Select leave type</option>${types.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select></div><div class="row"><div class="col-md-6 mb-3"><label class="form-label">Start date</label><input class="form-control" name="start_date" type="date" required></div><div class="col-md-6 mb-3"><label class="form-label">End date</label><input class="form-control" name="end_date" type="date" required></div></div><div class="mb-3"><label class="form-label">Reason for leave (visible to approvers only)</label><textarea class="form-control" name="reason" rows="4" required maxlength="1500"></textarea></div><div class="form-actions"><button class="btn btn-primary">Submit application</button></div></form></div>`;
  $("#leaveForm").onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{const r=await api("/leaves",{method:"POST",body:JSON.stringify(data)});toast(r.message);navigate("history")}catch(err){toast(err.message)}};
}
async function history(){
  const rows=await api("/my-leaves");$("#content").innerHTML=heading("My applications","Track submitted leave requests and their approval status.")+`<div class="panel">${rows.length?table(["Leave type","Start","End","Days","Status","Submitted"],rows.map(x=>`<tr><td>${esc(x.leave_type)}</td><td>${esc(x.start_date)}</td><td>${esc(x.end_date)}</td><td>${x.total_days}</td><td>${status(x.status)}</td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join("")):empty("You have not submitted any leave applications.")}</div>`;
}
async function balances(){
  const rows=await api("/balances");$("#content").innerHTML=heading("Leave balances","Your configured leave entitlements and usage.")+`<div class="panel">${rows.length?table(["Leave type","Opening balance","Used","Available"],rows.map(x=>`<tr><td>${esc(x.leave_type)}</td><td>${x.opening_balance}</td><td>${x.used_days}</td><td><b>${x.available}</b></td></tr>`).join("")):empty("No leave balances have been configured yet. Contact Admin.")}</div>`;
}
async function approvals(){
  const rows=await api("/approvals");const admin=currentUser.role==="ADMIN";
  $("#content").innerHTML=heading(admin?"Final approval queue":"Department approval queue","Review each application and record a decision.")+`<div class="panel" id="approvalPanel">${rows.length?table(["Faculty","Department","Type","Dates","Days","Reason","Decision"],rows.map(x=>`<tr><td>${esc(x.faculty_name)}</td><td>${esc(x.department)}</td><td>${esc(x.leave_type)}</td><td>${esc(x.start_date)} – ${esc(x.end_date)}</td><td>${x.total_days}</td><td class="reason-cell">${esc(x.reason)}</td><td><div class="d-flex gap-1"><button class="btn btn-sm btn-success" data-decision="APPROVE" data-id="${x.id}">Approve</button><button class="btn btn-sm btn-outline-danger" data-decision="REJECT" data-id="${x.id}">Reject</button></div></td></tr>`).join("")):empty("There are no applications awaiting your review.")}</div>`;
  $("#approvalPanel").querySelectorAll("[data-decision]").forEach(b=>b.onclick=async()=>{const comment=prompt("Optional comment for the record:")||"";try{const r=await api(`/leaves/${b.dataset.id}/decision`,{method:"POST",body:JSON.stringify({decision:b.dataset.decision,comment})});toast(r.message);approvals()}catch(e){toast(e.message)}});
}
async function users(){
  const [rows,deps]=await Promise.all([api("/admin/users"),api("/departments")]);$("#content").innerHTML=heading("User management","Create student, faculty, HOD and Admin accounts.")+`<div class="panel"><h3 class="mb-3">Create account</h3><form id="userForm" class="row g-3"><div class="col-md-4"><label class="form-label">ID / Roll number</label><input class="form-control" name="employee_student_id" required></div><div class="col-md-4"><label class="form-label">Full name</label><input class="form-control" name="full_name" required></div><div class="col-md-4"><label class="form-label">Email</label><input class="form-control" name="email" type="email" required></div><div class="col-md-4"><label class="form-label">Temporary password</label><input class="form-control" name="password" type="password" minlength="10" required></div><div class="col-md-4"><label class="form-label">Role</label><select class="form-select" name="role"><option>STUDENT</option><option>FACULTY</option><option>HOD</option><option>ADMIN</option></select></div><div class="col-md-4"><label class="form-label">Department</label><select class="form-select" name="department_id"><option value="">No department</option>${deps.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div><div class="col-md-6"><label class="form-label">Designation (optional)</label><input class="form-control" name="designation"></div><div class="col-12"><button class="btn btn-primary">Create account</button></div></form></div><div class="panel"><h3 class="mb-3">Existing accounts</h3>${table(["ID","Name","Email","Role","Department","Status"],rows.map(x=>`<tr><td>${esc(x.employee_student_id)}</td><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${esc(x.department)}</td><td>${x.is_active?"Active":"Inactive"}</td></tr>`).join(""))}</div>`;
  $("#userForm").onsubmit=async e=>{e.preventDefault();try{const r=await api("/admin/users",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});toast(r.message);users()}catch(err){toast(err.message)}};
}
async function departments(){
  const rows=await api("/departments");$("#content").innerHTML=heading("Departments","Maintain the departments used for role assignment and approval routing.")+`<div class="panel"><form id="deptForm" class="row g-2 mb-4"><div class="col-md-5"><input class="form-control" name="name" placeholder="Department name" required></div><div class="col-md-3"><input class="form-control" name="code" placeholder="Code" required></div><div class="col-md-3"><button class="btn btn-primary w-100">Add department</button></div></form>${table(["Department","Code"],rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.code)}</td></tr>`).join(""))}</div>`;
  $("#deptForm").onsubmit=async e=>{e.preventDefault();try{const r=await api("/admin/departments",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});toast(r.message);departments()}catch(err){toast(err.message)}};
}
async function reports(){
  const r=await api("/admin/reports/summary");$("#content").innerHTML=heading("Reports and overview","A summary of application statuses and active user accounts.")+`<div class="stats-grid">${r.leaveStatuses.map(x=>stat(x.status.replaceAll("_"," "),x.total,"fa-file-lines")).join("")}</div><div class="panel"><h3 class="mb-3">Accounts by role</h3>${table(["Role","Active accounts"],r.userRoles.map(x=>`<tr><td>${esc(x.role)}</td><td>${x.total}</td></tr>`).join(""))}</div>`;
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("#email").value,password:$("#password").value})});const data=await r.json();if(!r.ok)throw new Error(data.message);token=data.token;currentUser=data.user;sessionStorage.setItem("ff_token",token);sessionStorage.setItem("ff_user",JSON.stringify(currentUser));activePage="dashboard";showApp()}catch(err){toast(err.message)}});
$("#logoutBtn").onclick=()=>{sessionStorage.clear();token=null;currentUser=null;showLogin()};
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
if(token&&currentUser)showApp();else showLogin();
