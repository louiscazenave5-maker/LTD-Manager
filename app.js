(() => {
'use strict';
const cfg=window.LTD_CONFIG||{};
const ready=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
const db=ready?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n)||0)+' $';
const day=s=>s?new Date(s+'T12:00:00').toLocaleDateString('fr-FR'):'—';
const today=()=>new Date().toLocaleDateString('en-CA');
const icons={dashboard:'▦',transactions:'⇄',employees:'♙',stock:'▤',invoices:'▧',tasks:'☷',settings:'⚙'};
const sections={dashboard:'Tableau de bord',transactions:'Trésorerie',employees:'Employés',stock:'Stocks',invoices:'Factures',tasks:'Tâches',settings:'Paramètres'};
const tables=['transactions','employees','stock','invoices','tasks'];
let user=null,view='dashboard',data={daily_balances:[],transactions:[],employees:[],stock:[],invoices:[],tasks:[],settings:null},modal=null,search='';
let toastTimer;
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500)}
function problem(e){console.error(e);toast('Erreur : '+(e.message||String(e)))}
function signInPage(){ $('#app').innerHTML=`<div class="auth"><div class="auth-card"><div class="logo">LTD</div><div class="eyebrow">LITTLE SEOUL • DIRECTION</div><h1>Bienvenue sur LTD Manager</h1><p>Votre espace privé de gestion administrative.</p>${!ready?`<div class="notice">Le site est prêt, mais la connexion cloud n'est pas encore configurée. Suivez le fichier <strong>README.md</strong> pour renseigner Supabase et activer votre compte.</div>`:''}<form id="login"><div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" required></div><div class="field"><label>Mot de passe</label><input name="password" type="password" autocomplete="current-password" required></div><button class="btn" style="width:100%" ${!ready?'disabled':''}>Se connecter</button></form><p class="hint">Accès réservé au directeur. Aucun compte public ne peut être créé depuis le site.</p></div></div>`;$('#login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)problem(error)};}
async function load(){if(!user)return;try{const results=await Promise.all([...tables.map(t=>db.from(t).select('*').order('created_at',{ascending:false})),db.from('settings').select('*').maybeSingle(),fetchBalances().then(rows=>({data:rows}),error=>({error}))]);results.forEach((r,i)=>{if(r.error)throw r.error;if(i<tables.length)data[tables[i]]=r.data||[];else if(i===tables.length)data.settings=r.data;else data.daily_balances=r.data});render()}catch(e){problem(e);render()}}
function layout(){return `<div class="shell"><aside class="sidebar"><div class="brand"><div class="logo">LTD</div><div><strong>MANAGER</strong><small>LITTLE SEOUL</small></div></div><nav class="nav">${Object.entries(sections).map(([k,v])=>`<button data-nav="${k}" class="${view===k?'active':''}"><span>${icons[k]}</span>${v}</button>`).join('')}</nav><div class="sidebar-foot">ESPACE DIRECTION<br>${esc(user?.email||'')}<br><button class="btn secondary small" data-action="logout" style="margin-top:12px">Déconnexion</button></div></aside><main class="main"><header class="topbar"><div><div class="eyebrow">LTD LITTLE SEOUL / DIRECTION</div><h1>${sections[view]}</h1><div class="muted">${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div><span class="pill">● Accès privé</span></header><div id="content">${page()}</div></main><nav class="mobile-nav">${['dashboard','transactions','employees','stock','tasks'].map(k=>`<button data-nav="${k}" class="${view===k?'active':''}"><b style="font-size:19px">${icons[k]}</b>${sections[k]}</button>`).join('')}<button data-nav="settings"><b style="font-size:19px">⚙</b>Plus</button></nav></div>${modal||''}`}
function render(){if(!user){signInPage();return}$('#app').innerHTML=layout()}
function balance() {
  const latest = data.daily_balances[0];
  if (latest) return Number(latest.amount);
  const start = Number(data.settings?.opening_balance || 0);
  return start + data.transactions.reduce((total, transaction) =>
    total + (transaction.type === 'credit' ? 1 : -1) * Number(transaction.amount), 0);
}
function metric(label,value,sub){return `<div class="metric"><small>${label}</small><strong>${value}</strong><em>${sub}</em></div>`}
function sectionHead(title,type){return `<div class="section-head"><h2>${title}</h2><button class="btn" data-add="${type}">+ Ajouter</button></div>`}
function empty(s='Aucune donnée pour le moment.'){return `<div class="empty">${s}</div>`}
function badge(s){const k=/payée|terminée|actif|réglée/i.test(s)?'good':/attente|à faire|en cours/i.test(s)?'warn':'bad';return `<span class="tag ${k}">${esc(s)}</span>`}
function page(){switch(view){case'dashboard':return dashboard();case'transactions':return transactions();case'employees':return employees();case'stock':return stock();case'invoices':return invoices();case'tasks':return tasks();case'settings':return settings();}}
function formatBalance(amount) {
  return Number(amount).toLocaleString('fr-FR', {maximumFractionDigits: 2}) + ' $';
}
function balanceChange(current, previous) {
  if (!previous) return 'Premier relevé';
  const delta = Math.round(Number(current.amount)*100) - Math.round(Number(previous.amount)*100);
  return (delta > 0 ? '+' : '') + formatBalance(delta/100);
}
async function fetchBalances() {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const {data: page, error} = await db.from('daily_balances').select('date,amount')
      .order('date', {ascending:false}).range(start, start+499);
    if (error) throw error;
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
function dailyPanel() {
  const rows = data.daily_balances;
  const header = '<div class="section-head"><h2>Évolution du solde</h2><button class="btn" data-action="daily">Saisir un solde</button></div>';
  if (!rows.length) return '<section class="panel daily-panel">'+header+empty('Saisissez le solde du compte en jeu pour commencer le suivi.')+'</section>';
  const week = Array.from({length:7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate()-6+i);
    const date = d.toLocaleDateString('en-CA');
    return {label:d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}), row:rows.find(r=>r.date===date)};
  });
  const max = Math.max(1,...week.map(d=>Number(d.row?.amount || 0)));
  const bars = week.map(({row,label})=>`<div class="daily-slot"><small>${row?formatBalance(row.amount):'—'}</small><div class="daily-bar" style="height:${row?Math.max(2,Number(row.amount)/max*95):0}px"></div><small>${label}</small></div>`).join('');
  const history = rows.map((r,i)=>`<tr><td>${day(r.date)}</td><td>${formatBalance(r.amount)}</td><td>${balanceChange(r,rows[i+1])}</td></tr>`).join('');
  return `<section class="panel daily-panel">${header}<p>Dernier solde relevé le ${day(rows[0].date)} · <strong>${formatBalance(rows[0].amount)}</strong></p>
    <p class="muted">${balanceChange(rows[0],rows[1])}${rows[1]?' depuis le '+day(rows[1].date):''}</p>
    <div class="daily-scroll"><div class="daily-week">${bars}</div></div>
    <details><summary>Historique des relevés (${rows.length})</summary><div class="table-wrap"><table><thead><tr><th>Date</th><th>Solde</th><th>Écart avec le relevé précédent</th></tr></thead><tbody>${history}</tbody></table></div></details></section>`;
}
function openDaily(fromSettings = false) {
  const dateInput = `<input id="daily-date" name="date" type="${fromSettings ? 'hidden' : 'date'}" required value="${today()}" max="${today()}">`;
  modal = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="balance-title"><h2 id="balance-title">${fromSettings ? 'Modifier le solde du compte' : 'Relever le solde du compte'}</h2>
    <form id="daily-form">${fromSettings ? dateInput : `<div class="field"><label for="daily-date">Date du relevé</label>${dateInput}</div>`}
    <div class="field"><label for="daily-amount">Solde du compte ($)</label><input id="daily-amount" name="amount" type="number" required min="0" max="9999999999999.99" step="0.01"></div>
    <p class="hint">Le relevé le plus récent actualise le solde du compte dans les paramètres et le tableau de bord. Une nouvelle saisie pour la même date corrige le relevé existant.</p>
    <div class="form-actions"><button type="button" class="btn secondary" data-action="close">Annuler</button><button class="btn" type="submit">Enregistrer</button></div></form></div></div>`;
  render();
  const date = $('#daily-date'), amount = $('#daily-amount');
  const fill = () => {amount.value = data.daily_balances.find(r=>r.date===date.value)?.amount ?? (fromSettings ? balance() : '');};
  date.oninput = fill;
  fill();
}
async function saveDaily(form) {
  const values = new FormData(form);
  const date = values.get('date');
  const rawAmount = values.get('amount');
  const amount = Number(rawAmount);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) throw Error('Date de relevé invalide.');
  if (!rawAmount?.trim() || !Number.isFinite(amount) || amount < 0 || amount > 9999999999999.99) throw Error('Solde invalide.');
  const ownerId = user.id;
  const {data: record, error} = await db.from('daily_balances').upsert({
    user_id:ownerId, date, amount
  }, {onConflict:'user_id,date'}).select('date,amount').single();
  if (error) throw error;
  if (user?.id !== ownerId) return;
  data.daily_balances = [record, ...data.daily_balances.filter(row => row.date !== record.date)]
    .sort((first, second) => second.date.localeCompare(first.date));
  modal = null;
  render();
  toast('Solde et historique actualisés');
}

function accountMetric() {
  const latest = data.daily_balances[0];
  return metric('Solde du compte', formatBalance(balance()), latest ? 'Dernier relevé du ' + day(latest.date) : 'À actualiser dans les paramètres');
}
function dashboard(){const m=new Date().toISOString().slice(0,7),ts=data.transactions.filter(t=>t.date?.startsWith(m)),expenses=ts.filter(t=>t.type==='debit').reduce((a,t)=>a+Number(t.amount),0),pending=data.invoices.filter(i=>i.status!=='Payée').length,low=data.stock.filter(s=>Number(s.quantity)<=Number(s.threshold)).length,upcoming=data.tasks.filter(t=>t.status!=='Terminée').slice(0,5);const buckets=Array.from({length:7},(_,i)=>{let d=new Date();d.setDate(d.getDate()-6+i);let iso=d.toLocaleDateString('en-CA');return {label:d.toLocaleDateString('fr-FR',{weekday:'short'}),amount:data.transactions.filter(t=>t.date===iso&&t.type==='debit').reduce((a,t)=>a+Number(t.amount),0)}});let max=Math.max(...buckets.map(b=>b.amount),1);return `<div class="grid">${accountMetric()}${metric('Dépenses du mois',money(expenses),'Hors ventes')}${metric('Employés',String(data.employees.length),'Répertoire interne')}${metric('Stocks faibles',String(low),'Seuils atteints')}</div>${dailyPanel()}<div class="panels"><div class="panel"><div class="section-head"><h2>Dépenses sur 7 jours</h2><span class="muted">Saisie manuelle</span></div><div class="chart">${buckets.map(b=>`<div class="bar-slot" title="${esc(b.label)} : ${money(b.amount)}"><div class="bar" style="height:${Math.max(3,Math.round(b.amount/max*145))}px"></div><small>${esc(b.label)}</small></div>`).join('')}</div></div><div class="panel"><h2>À surveiller</h2><div class="list-row"><span>Factures non payées</span><strong>${pending}</strong></div><div class="list-row"><span>Stocks à réapprovisionner</span><strong>${low}</strong></div><div class="list-row"><span>Tâches ouvertes</span><strong>${data.tasks.filter(t=>t.status!=='Terminée').length}</strong></div><button class="btn secondary small" data-nav="tasks" style="margin-top:15px">Voir les tâches</button></div></div><div class="panels"><div class="panel"><div class="section-head"><h2>Derniers mouvements</h2><button class="btn secondary small" data-nav="transactions">Tout voir</button></div>${data.transactions.length?data.transactions.slice(0,5).map(t=>`<div class="list-row"><div><strong>${esc(t.label)}</strong><small>${day(t.date)} • ${esc(t.category||'Autre')}</small></div><b class="${t.type==='credit'?'positive':'negative'}">${t.type==='credit'?'+':'−'} ${money(t.amount)}</b></div>`).join(''):empty()}</div><div class="panel"><h2>À faire</h2>${upcoming.length?upcoming.map(t=>`<div class="list-row"><div><strong>${esc(t.title)}</strong><small>${day(t.due_date)} • ${esc(t.status)}</small></div></div>`).join(''):empty('Aucune tâche ouverte.')}</div></div>`}
function transactions(){return `<div class="panel">${sectionHead('Journal des mouvements','transactions')}<p class="hint">Enregistrez uniquement les entrées et sorties que vous connaissez (apports, achats, primes, etc.). Pas de ventes automatiques.</p><div class="toolbar" style="margin-bottom:15px"><button class="btn secondary small" data-action="export-transactions">Exporter CSV</button><button class="btn secondary small" data-action="account">Actualiser le solde</button></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Type</th><th>Montant</th><th>Actions</th></tr></thead><tbody>${data.transactions.map(t=>`<tr><td>${day(t.date)}</td><td>${esc(t.label)}</td><td>${esc(t.category||'—')}</td><td>${badge(t.type==='credit'?'Entrée':'Sortie')}</td><td class="${t.type==='credit'?'positive':'negative'}">${t.type==='credit'?'+':'−'} ${money(t.amount)}</td><td>${actions('transactions',t.id)}</td></tr>`).join('')}</tbody></table></div>${!data.transactions.length?empty():''}</div>`}
function employees(){return `<div class="panel">${sectionHead('Équipe LTD','employees')}<div class="table-wrap"><table><thead><tr><th>Nom</th><th>Grade</th><th>Embauche</th><th>Prime cumulée</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${data.employees.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.grade||'—')}</td><td>${day(x.hired_at)}</td><td>${money(x.bonus_total)}</td><td>${esc(x.notes||'—')}</td><td>${actions('employees',x.id)}</td></tr>`).join('')}</tbody></table></div>${!data.employees.length?empty():''}</div>`}
function stock(){return `<div class="panel">${sectionHead('Inventaire','stock')}<div class="table-wrap"><table><thead><tr><th>Article</th><th>Catégorie</th><th>Quantité</th><th>Seuil alerte</th><th>Coût unitaire</th><th>État</th><th>Actions</th></tr></thead><tbody>${data.stock.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.category||'—')}</td><td>${Number(x.quantity)}</td><td>${Number(x.threshold)}</td><td>${money(x.unit_cost)}</td><td>${Number(x.quantity)<=Number(x.threshold)?badge('Stock faible'):badge('OK')}</td><td>${actions('stock',x.id)}</td></tr>`).join('')}</tbody></table></div>${!data.stock.length?empty():''}</div>`}
function invoices(){return `<div class="panel">${sectionHead('Factures et contrats','invoices')}<p class="hint">Le PDF est généré à partir des données enregistrées. Une facture n'ajoute pas automatiquement un mouvement bancaire.</p><div class="table-wrap"><table><thead><tr><th>Référence</th><th>Client / fournisseur</th><th>Objet</th><th>Échéance</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${data.invoices.map(x=>`<tr><td>${esc(x.reference)}</td><td>${esc(x.partner)}</td><td>${esc(x.description)}</td><td>${day(x.due_date)}</td><td>${money(x.amount)}</td><td>${badge(x.status)}</td><td><button class="btn secondary small" data-print="${x.id}">PDF</button>${actions('invoices',x.id)}</td></tr>`).join('')}</tbody></table></div>${!data.invoices.length?empty():''}</div>`}
function tasks(){return `<div class="panel">${sectionHead('Tâches et rappels','tasks')}<div class="table-wrap"><table><thead><tr><th>Tâche</th><th>Échéance</th><th>Priorité</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${data.tasks.map(x=>`<tr><td><strong>${esc(x.title)}</strong><div class="muted">${esc(x.notes||'')}</div></td><td>${day(x.due_date)}</td><td>${badge(x.priority)}</td><td>${badge(x.status)}</td><td>${actions('tasks',x.id)}</td></tr>`).join('')}</tbody></table></div>${!data.tasks.length?empty():''}</div>`}
function settings() {
  const latest = data.daily_balances[0];
  return `<div class="panel settings-note"><h2>Solde du compte</h2>
    <p>Définissez ici le solde réel du compte. Vos relevés quotidiens dans « Évolution du solde » actualisent ce même montant.</p>
    <div class="list-row"><span>Solde du compte</span><strong>${formatBalance(balance())}</strong></div>
    ${latest ? `<div class="list-row"><span>Date du dernier relevé</span><strong>${day(latest.date)}</strong></div>` : ''}
    <div class="toolbar" style="margin-top:18px"><button class="btn" data-action="account">Modifier le solde du compte</button></div>
    <p class="hint">Chaque modification dans les paramètres enregistre le solde du jour dans l’historique.</p>
    </div><div class="panel settings-note"><h2>Sécurité et données</h2><p>Les données sont stockées dans Supabase, protégées par authentification et par des règles RLS liées à votre compte. Pensez à activer la double authentification dans votre compte Supabase si elle est disponible et à effectuer des exports réguliers.</p><button class="btn secondary" data-action="export-all">Exporter toutes les données (JSON)</button><button class="btn secondary" data-action="logout" style="margin-left:8px">Se déconnecter</button></div>`;
}
function actions(t,id){return `<button class="btn secondary small" data-edit="${t}:${id}">Modifier</button><button class="btn danger small" data-delete="${t}:${id}">Supprimer</button>`}
const specs={transactions:{title:'Mouvement',fields:[['date','Date','date'],['label','Libellé','text'],['category','Catégorie','select',['Achats','Marchandises','Prime','Salaire','Contrat','Apport','Ajustement','Autre']],['type','Sens','select',['debit:Sortie','credit:Entrée']],['amount','Montant ($)','number'],['notes','Notes','textarea']]},employees:{title:'Employé',fields:[['name','Nom','text'],['grade','Grade','text'],['hired_at','Date d’embauche','date'],['bonus_total','Total des primes ($)','number'],['notes','Notes','textarea']]},stock:{title:'Article',fields:[['name','Nom de l’article','text'],['category','Catégorie','select',['Boissons','Nourriture','Peluches','Tickets','Magazines','Autre']],['quantity','Quantité','number'],['threshold','Seuil d’alerte','number'],['unit_cost','Coût unitaire ($)','number']]},invoices:{title:'Facture / contrat',fields:[['reference','Référence','text'],['partner','Client ou fournisseur','text'],['description','Objet','text'],['amount','Montant ($)','number'],['due_date','Échéance','date'],['status','Statut','select',['En attente','Payée','Annulée']],['notes','Notes','textarea']]},tasks:{title:'Tâche',fields:[['title','Titre','text'],['due_date','Échéance','date'],['priority','Priorité','select',['Basse','Normale','Haute']],['status','Statut','select',['À faire','En cours','Terminée']],['notes','Notes','textarea']]}};
function fieldHTML(f,obj){const [key,label,type,opts]=f,v=obj?.[key]??(type==='date'?today():type==='number'?0:'');let el=type==='textarea'?`<textarea name="${key}">${esc(v)}</textarea>`:type==='select'?`<select name="${key}">${opts.map(opt=>{const [value,text]=opt.includes(':')?opt.split(':'):[opt,opt];return `<option value="${esc(value)}" ${v===value?'selected':''}>${esc(text)}</option>`}).join('')}</select>`:`<input name="${key}" type="${type}" value="${esc(v)}" ${type==='number'?'min="0" step="0.01"':''} ${['label','name','title','reference','partner','description','amount'].includes(key)?'required':''}>`;return `<div class="field"><label>${label}</label>${el}</div>`}
function openForm(t,id){const spec=specs[t],obj=id?data[t].find(x=>x.id===id):null;modal=`<div class="modal-backdrop" id="modal"><div class="modal" role="dialog" aria-modal="true"><div class="section-head"><h2>${obj?'Modifier':'Ajouter'} • ${spec.title}</h2><button class="btn secondary small" data-action="close">✕</button></div><form id="record-form" data-table="${t}" data-id="${id||''}"><div class="form-grid">${spec.fields.map(f=>fieldHTML(f,obj)).join('')}</div><div class="form-actions"><button type="button" class="btn secondary" data-action="close">Annuler</button><button class="btn" type="submit">Enregistrer</button></div></form></div></div>`;render()}
async function saveRecord(form){const t=form.dataset.table,id=form.dataset.id;const obj={};for(const [key,,type] of specs[t].fields){let val=new FormData(form).get(key);obj[key]=type==='number'?Number(val):val||null}if(t==='transactions'&&obj.amount<=0)throw Error('Le montant doit être supérieur à zéro.');if(t==='invoices'&&obj.amount<0)throw Error('Montant invalide.');const q=id?db.from(t).update(obj).eq('id',id):db.from(t).insert({...obj,user_id:user.id});const {error}=await q;if(error)throw error;modal=null;await load();toast('Enregistré avec succès')}
function csvExport(){const rows=[['Date','Libellé','Catégorie','Type','Montant','Notes'],...data.transactions.map(x=>[x.date,x.label,x.category,x.type,x.amount,x.notes])];const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download('ltd-mouvements.csv','\ufeff'+rows.map(r=>r.map(quote).join(';')).join('\r\n'),'text/csv;charset=utf-8')}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function printInvoice(id){const x=data.invoices.find(x=>x.id===id);if(!x)return;const w=window.open('','_blank');if(!w){toast('Autorisez les fenêtres contextuelles pour générer le PDF.');return}w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(x.reference)}</title><style>body{font:16px Arial;margin:55px;color:#1b2534}header{border-bottom:3px solid #c49c48;padding-bottom:20px}h1{font-size:34px}section{margin:30px 0}.total{font-size:26px;font-weight:bold;text-align:right}small{color:#677}</style></head><body><header><h1>LTD LITTLE SEOUL</h1><small>Document de gestion RP • Référence ${esc(x.reference)}</small></header><section><p><b>Partenaire :</b> ${esc(x.partner)}</p><p><b>Objet :</b> ${esc(x.description)}</p><p><b>Échéance :</b> ${day(x.due_date)}</p><p><b>Statut :</b> ${esc(x.status)}</p><p><b>Notes :</b> ${esc(x.notes||'—')}</p></section><hr><p class="total">Montant : ${money(x.amount)}</p><small>Document généré par LTD Manager. Compléter les mentions nécessaires selon votre serveur RP.</small><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
async function clickHandler(e){const btn=e.target.closest('button');if(!btn)return;if(btn.dataset.nav){view=btn.dataset.nav;modal=null;render();window.scrollTo(0,0);return}if(btn.dataset.add){openForm(btn.dataset.add);return}if(btn.dataset.edit){const [t,id]=btn.dataset.edit.split(':');openForm(t,id);return}if(btn.dataset.print){printInvoice(btn.dataset.print);return}if(btn.dataset.delete){const [t,id]=btn.dataset.delete.split(':');if(!confirm('Supprimer définitivement cet élément ?'))return;const {error}=await db.from(t).delete().eq('id',id);if(error)problem(error);else{await load();toast('Élément supprimé')}return}if(btn.dataset.action){const a=btn.dataset.action;if(a==='daily')openDaily();if(a==='close'){modal=null;render()}if(a==='logout'){await db.auth.signOut()}if(a==='account')openDaily(true);if(a==='export-transactions')csvExport();if(a==='export-all')download('ltd-sauvegarde-'+today()+'.json',JSON.stringify({exported_at:new Date().toISOString(),...data},null,2),'application/json')}}
async function submitHandler(e){if(e.target.id==='daily-form'||e.target.id==='record-form'){e.preventDefault();const b=e.target.querySelector('[type=submit]');b.disabled=true;try{if(e.target.id==='daily-form')await saveDaily(e.target);else await saveRecord(e.target)}catch(err){problem(err);b.disabled=false}}}
document.addEventListener('click',e=>{clickHandler(e).catch(problem)});document.addEventListener('submit',e=>{submitHandler(e).catch(problem)});
if(!ready){signInPage();return}
db.auth.onAuthStateChange((_event,session)=>{const next=session?.user||null;if(next?.id!==user?.id){user=next;if(user){render();setTimeout(()=>load(),0)}else{data={daily_balances:[],transactions:[],employees:[],stock:[],invoices:[],tasks:[],settings:null};modal=null;render()}}});
db.auth.getSession().then(({data:sessionData,error})=>{if(error)problem(error);user=sessionData.session?.user||null;render();if(user)load()});
})();
