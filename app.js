/* app.js - versão consolidada */

const API="COLE_AQUI_O_URL_DO_SEU_APPS_SCRIPT";

let reservas=[];
let militares=[];
let setores=[];
let tiposMissao=[];

let hoje=new Date();
let mesAtual=hoje.getMonth();
let anoAtual=hoje.getFullYear();

document.addEventListener("DOMContentLoaded",iniciar);

async function iniciar(){
 mostrarLoader();
 await carregarDados();
 preencherMilitares();
 preencherTiposMissao();
 document.getElementById("militar")?.addEventListener("change",atualizarSetor);
 montarCalendario();
 atualizarMinhasReservas();
 esconderLoader();
}

async function carregarDados(){
 const r=await Promise.all([
   apiGet("getReservas"),
   apiGet("getMilitares"),
   apiGet("getTiposMissao"),
   apiGet("getSetores")
 ]);
 reservas=r[0].reservas||[];
 militares=r[1].militares||[];
 tiposMissao=r[2].tipos||[];
 setores=r[3].setores||[];
}

async function apiGet(action){
 const x=await fetch(API+"?action="+action,{cache:"no-store"});
 return await x.json();
}

async function apiPost(action,dados){
 const f=new FormData();
 f.append("action",action);
 f.append("payload",JSON.stringify(dados));
 const x=await fetch(API,{method:"POST",body:f});
 return await x.json();
}

function preencherMilitares(){
 const s=document.getElementById("militar"); if(!s)return;
 s.innerHTML='<option value="">Selecione...</option>';
 militares.forEach(m=>s.add(new Option(m.militar,m.militar)));
}

function preencherTiposMissao(){
 const s=document.getElementById("tipoMissao"); if(!s)return;
 s.innerHTML='<option value="">Selecione...</option>';
 tiposMissao.forEach(t=>s.add(new Option(t,t)));
}

function atualizarSetor(){
 const c=document.getElementById("setor");
 const m=militares.find(x=>x.militar===document.getElementById("militar").value);
 c.value=m?m.setor:"";
}

async function salvarReserva(){
 const dados={
  militar:militar.value,
  tipoMissao:tipoMissao.value,
  data:data.value,
  horaInicio:horaInicio.value,
  horaFim:horaFim.value,
  observacoes:observacoes.value
 };
 const r=await apiPost("criarReserva",dados);
 if(!r.sucesso){mostrarToast(r.mensagem,"erro");return;}
 mostrarToast("Reserva criada.","sucesso");
 limparFormulario();
 await carregarDados();
 montarCalendario();
 atualizarMinhasReservas();
}

function limparFormulario(){
 ["militar","setor","tipoMissao","data","horaInicio","horaFim","observacoes"]
 .forEach(id=>document.getElementById(id).value="");
}

function atualizarMinhasReservas(){
 const tb=document.getElementById("tabelaReservas"); if(!tb)return;
 tb.innerHTML="";
 reservas.forEach(r=>{
  const tr=document.createElement("tr");
  tr.innerHTML=`<td>${r.data}</td><td>${r.horaInicio}</td><td>${r.horaFim}</td><td>${r.militar}</td><td>${r.tipoMissao}</td><td>${r.status}</td><td>${r.status=="CONFIRMADO"?`<button onclick="cancelarReserva('${r.id}')">Cancelar</button>`:""}</td>`;
  tb.appendChild(tr);
 });
}

async function cancelarReserva(id){
 if(!confirm("Cancelar reserva?"))return;
 await apiPost("cancelarReserva",{id});
 await carregarDados();
 montarCalendario();
 atualizarMinhasReservas();
}

function montarCalendario(){
 const c=document.getElementById("calendario"); if(!c)return;
 c.innerHTML="";
 atualizarTituloCalendario();
 const p=new Date(anoAtual,mesAtual,1);
 const u=new Date(anoAtual,mesAtual+1,0);
 for(let i=0;i<p.getDay();i++)c.appendChild(document.createElement("div"));
 for(let d=1;d<=u.getDate();d++){
   const box=document.createElement("div");
   box.className="diaCalendario";
   const dataStr=`${anoAtual}-${String(mesAtual+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
   if(reservas.some(r=>r.data===dataStr&&r.status==="CONFIRMADO"))box.classList.add("ocupado");
   box.textContent=d;
   box.onclick=()=>mostrarReservasDia(dataStr);
   c.appendChild(box);
 }
}

function mostrarReservasDia(data){
 const l=document.getElementById("listaDia"); if(!l)return;
 const rs=reservas.filter(r=>r.data===data);
 l.innerHTML=rs.length?rs.map(r=>`<p><b>${r.horaInicio}-${r.horaFim}</b><br>${r.militar}<br>${r.tipoMissao}</p>`).join(""):"<p>Nenhuma reserva.</p>";
}
function mesAnterior(){if(--mesAtual<0){mesAtual=11;anoAtual--;}montarCalendario();}
function proximoMes(){if(++mesAtual>11){mesAtual=0;anoAtual++;}montarCalendario();}
function atualizarTituloCalendario(){
 const meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
 const t=document.getElementById("tituloCalendario"); if(t)t.textContent=meses[mesAtual]+" / "+anoAtual;
}
function mostrarLoader(){loader&&(loader.style.display="flex");}
function esconderLoader(){loader&&(loader.style.display="none");}
function mostrarToast(txt,tipo){
 const t=document.getElementById("toast");
 if(!t){alert(txt);return;}
 t.className="toast "+tipo+" show";t.textContent=txt;
 setTimeout(()=>t.classList.remove("show"),3000);
}
