const vm=require('vm'),fs=require('fs'),assert=require('assert');
const storage=new Map(),timers=[],elements=new Map(),rows=new Map();let rpcCalls=0,failSave=false,delaySave=null;
const element=()=>({innerHTML:'',textContent:'',hidden:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},focus(){},querySelector(){return element()}});
const el=s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)};
let ctx;const client={auth:{onAuthStateChange(){},async getSession(){return {data:{session:null}}},async signOut(){return {}}},from(){return {select(){return {eq(_,id){return {async maybeSingle(){return {data:rows.get(id)||null}}}}}}}},async rpc(name,args){rpcCalls++;if(delaySave)await delaySave;if(failSave)return {error:{message:'network'}};const uid=vm.runInContext('accountUser.id',ctx),row=rows.get(uid);if((row?.revision||0)!==args.expected_revision)return {error:{message:'WORKSPACE_CONFLICT'}};const revision=args.expected_revision+1;rows.set(uid,{revision,payload:JSON.parse(JSON.stringify(args.new_payload))});return {data:revision}}};
ctx=vm.createContext({console,crypto:require('crypto').webcrypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{querySelector:el,getElementById:id=>el('#'+id),addEventListener(){},activeElement:element()},window:{supabase:{createClient:()=>client},addEventListener(){}},location:{origin:'https://example.com'},setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},FormData:class{constructor(o){this.o=o}get(k){return this.o[k]}getAll(k){return this.o[k]||[]}}});
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/team.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/account.js','utf8'),ctx);const run=s=>vm.runInContext(s,ctx);

run("updateDerived();departments()");assert(el('#content').innerHTML.includes('公司员工'));
run("department(-1);employeePanel(1)");assert(el('#crumb').innerHTML.includes('department(-1)'));assert(el('#crumb').innerHTML.includes('departments()'));assert(!el('#crumb').innerHTML.includes('工作空间'));
run("saveDepartment({dept:'战略部',name:'战略指挥',duties:'目标规划'},-1)");assert.equal(run('agents[0].dept'),'战略部');assert.equal(run('managers[0].duties'),'目标规划');
run("readBeforeRun(projects[0],projects[0].tasks[3]);confirmRemoveMember(1,-1)");assert.equal(run('agents[0].parentId'),null);assert.equal(run('projects[0].tasks[3].status'),'todo');assert.equal(run('projects[0].tasks[3].agent'),null);
for(const f of timers.splice(0))f();assert.equal(run('projects[0].tasks[3].phase'),'paused');run('ensureHierarchy()');assert.equal(run('agents[0].parentId'),null);
run("saveMembers({members:['1','2']},-1)");assert.equal(run('agents[1].parentId'),-1);assert.equal(run('projects[1].tasks[1].agent'),null);
run("confirmDeleteDepartment(-1)");assert.equal(run('agents.length'),4);assert.equal(run('agents[0].parentId'),null);assert.equal(run('projects.length'),4);
run("confirmDeleteEmployee(3)");assert.equal(run('agents.length'),3);assert.equal(run('projects[0].tasks[2].agent'),null);assert.equal(run('projects[0].tasks[2].status'),'todo');
run("saveEmployee({name:'新员工',role:'测试',parentId:''},null)");assert.equal(run('agents.at(-1).parentId'),null);
run("saveDepartment({dept:'测试部',name:'测试指挥',duties:'测试职责'},null)");assert.equal(run('managers.at(-1).dept'),'测试部');
run("home()");assert(!el('#content').innerHTML.includes('总指挥简报'));assert.equal(el('#crumb').innerHTML,'<span aria-current="page">总指挥</span>');
console.log('PASS: breadcrumb ancestry, department CRUD, employee CRUD, transfers, running-task cancellation, deleted employee provenance and removal of briefing.');

run("saveDepartment({dept:'研发部',name:'研发负责人',duties:'研发',role:'研发主管',level:'5'},managers[0].id)");
assert.equal(run('managers[0].role'),'研发主管');assert.equal(run('managers[0].level'),5);
run('accountApply(accountSnapshot());department(managers[0].id)');
assert(el('#content').innerHTML.includes('研发主管'));assert(!el('#content').innerHTML.includes('← 所有部门'));
run('settings()');assert(el('#content').innerHTML.includes('L5 研发主管'));assert(!el('#content').innerHTML.includes('配置 →'));
run('managerPanel(managers[0].id)');assert(el('#content').innerHTML.includes('L5 研发主管'));
run("saveDepartment({dept:'研发部',name:'研发负责人',role:'bad',level:'0'},managers[0].id)");assert.equal(run('managers[0].level'),5);assert.equal(run('managers[0].role'),'研发主管');
console.log('PASS: configurable title and level survive account reload, consistent labels, invalid level rejected.');
