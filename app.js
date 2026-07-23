/* ==========================================
   SISTEMA DE RESERVA DA VIATURA DO COMANDO
   app.js
========================================== */

const API =
"https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec";

let reservas = [];

let militares = [];

let setores = [];

let tiposMissao = [];

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar(){

    mostrarLoader();

    try{

        await carregarDados();

        preencherMilitares();

        preencherTiposMissao();

        montarCalendario();

        atualizarMinhasReservas();

    }

    catch(erro){

        console.error(erro);

        alert("Erro ao carregar o sistema.");

    }

    esconderLoader();

}
async function carregarDados(){

    const resultados = await Promise.all([

        apiGet("getReservas"),

        apiGet("getMilitares"),

        apiGet("getTiposMissao"),

        apiGet("getSetores")

    ]);

    reservas = resultados[0].reservas;

    militares = resultados[1].militares;

    tiposMissao = resultados[2].tipos;

    setores = resultados[3].setores;

}

async function apiGet(action){

    const resposta = await fetch(

        API + "?action=" + action,

        {

            cache:"no-store"

        }

    );

    return await resposta.json();

}

async function apiPost(action,dados){

    const form = new FormData();

    form.append("action",action);

    form.append(

        "payload",

        JSON.stringify(dados)

    );

    const resposta = await fetch(

        API,

        {

            method:"POST",

            body:form

        }

    );

    return await resposta.json();

}

function preencherMilitares() {

    const select = document.getElementById("militar");

    if (!select) return;

    select.innerHTML = '<option value="">Selecione...</option>';

    militares.forEach(m => {

        const option = document.createElement("option");

        option.value = m.militar;
        option.textContent = m.militar;

        select.appendChild(option);

    });

}

function preencherTiposMissao() {

    const select = document.getElementById("tipoMissao");

    if (!select) return;

    select.innerHTML = '<option value="">Selecione...</option>';

    tiposMissao.forEach(tipo => {

        const option = document.createElement("option");

        option.value = tipo;
        option.textContent = tipo;

        select.appendChild(option);

    });

}

function atualizarSetor() {

    const militarSelecionado =
        document.getElementById("militar").value;

    const campoSetor =
        document.getElementById("setor");

    const militar = militares.find(
        x => x.militar === militarSelecionado
    );

    campoSetor.value = militar
        ? militar.setor
        : "";

}
async function salvarReserva() {

    const dados = {

        militar:
            document.getElementById("militar").value,

        tipoMissao:
            document.getElementById("tipoMissao").value,

        data:
            document.getElementById("data").value,

        horaInicio:
            document.getElementById("horaInicio").value,

        horaFim:
            document.getElementById("horaFim").value,

        observacoes:
            document.getElementById("observacoes").value

    };

    if (!validarFormulario(dados))
        return;

    mostrarLoader();

    const resposta = await apiPost(
        "criarReserva",
        dados
    );

    esconderLoader();

    if (!resposta.sucesso) {

        mostrarToast(
            resposta.mensagem,
            "erro"
        );

        return;

    }

    mostrarToast(
        "Reserva realizada com sucesso.",
        "sucesso"
    );

    limparFormulario();

    await carregarDados();

    montarCalendario();

    atualizarMinhasReservas();

}

function validarFormulario(dados){

    if(
        !dados.militar ||
        !dados.tipoMissao ||
        !dados.data ||
        !dados.horaInicio ||
        !dados.horaFim
    ){

        mostrarToast(
            "Preencha todos os campos.",
            "erro"
        );

        return false;

    }

    if(dados.horaFim<=dados.horaInicio){

        mostrarToast(
            "Horário inválido.",
            "erro"
        );

        return false;

    }

    return true;

}

function limparFormulario(){

    document.getElementById("militar").value="";

    document.getElementById("setor").value="";

    document.getElementById("tipoMissao").value="";

    document.getElementById("data").value="";

    document.getElementById("horaInicio").value="";

    document.getElementById("horaFim").value="";

    document.getElementById("observacoes").value="";

}


function atualizarMinhasReservas() {

    const tbody = document.getElementById("tabelaReservas");

    if (!tbody) return;

    tbody.innerHTML = "";

    reservas.forEach(reserva => {

        const tr = document.createElement("tr");

        tr.innerHTML = `

            <td>${formatarDataBR(reserva.data)}</td>

            <td>${reserva.horaInicio}</td>

            <td>${reserva.horaFim}</td>

            <td>${reserva.militar}</td>

            <td>${reserva.tipoMissao}</td>

            <td>${reserva.status}</td>

            <td>

                ${
                    reserva.status === "CONFIRMADO"

                    ?

                    `<button class="btnCancelar"
                        onclick="cancelarReserva('${reserva.id}')">
                        Cancelar
                    </button>`

                    :

                    ""

                }

            </td>

        `;

        tbody.appendChild(tr);

    });

}
async function cancelarReserva(id){

    if(!confirm("Deseja cancelar esta reserva?"))
        return;

    mostrarLoader();

    const resposta = await apiPost(

        "cancelarReserva",

        {id}

    );

    esconderLoader();

    if(!resposta.sucesso){

        mostrarToast(

            resposta.mensagem,

            "erro"

        );

        return;

    }

    mostrarToast(

        "Reserva cancelada.",

        "sucesso"

    );

    await carregarDados();

    montarCalendario();

    atualizarMinhasReservas();

}

function mostrarLoader(){

    const loader=document.getElementById("loader");

    if(loader)

        loader.style.display="flex";

}



function esconderLoader(){

    const loader=document.getElementById("loader");

    if(loader)

        loader.style.display="none";

}

function mostrarToast(texto,tipo){

    const toast=document.getElementById("toast");

    if(!toast){

        alert(texto);

        return;

    }

    toast.innerText=texto;

    toast.className="toast "+tipo;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}

function formatarDataBR(data){

    if(!data) return "";

    const partes=data.split("-");

    return partes[2]+"/"+partes[1]+"/"+partes[0];

}

function reservasDoDia(data){

    return reservas.filter(r=>r.data===data);

}

function ordenarReservas(){

    reservas.sort((a,b)=>{

        if(a.data!=b.data)

            return a.data.localeCompare(b.data);

        return a.horaInicio.localeCompare(b.horaInicio);

    });

}

let hoje = new Date();

let mesAtual = hoje.getMonth();

let anoAtual = hoje.getFullYear();


function montarCalendario(){

    const calendario =
        document.getElementById("calendario");

    if(!calendario) return;

    calendario.innerHTML="";

    const primeiroDia =
        new Date(anoAtual,mesAtual,1);

    const ultimoDia =
        new Date(anoAtual,mesAtual+1,0);

    const inicio =
        primeiroDia.getDay();

    const diasMes =
        ultimoDia.getDate();

    for(let i=0;i<inicio;i++){

        calendario.appendChild(
            document.createElement("div")
        );

    }

    for(let dia=1;dia<=diasMes;dia++){

        calendario.appendChild(
            criarDiaCalendario(dia)
          
        );
      
atualizarTituloCalendario();
      
    }

}



   function criarDiaCalendario(dia){

    const data =
        `${anoAtual}-${String(mesAtual+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

    const div =
        document.createElement("div");

    div.className="diaCalendario";

    div.innerHTML=dia;

    const possuiReserva=
        reservas.some(r=>
            r.data===data &&
            r.status==="CONFIRMADO"
        );

    if(possuiReserva){

        div.classList.add("ocupado");

    }

    div.onclick=()=>{

        mostrarReservasDia(data);

    };

    return div;

}

function mostrarReservasDia(data){

    const lista =
        document.getElementById("listaDia");

    if(!lista) return;

    lista.innerHTML="";

    const reservasDia=
        reservas
        .filter(r=>r.data===data)
        .sort((a,b)=>
            a.horaInicio.localeCompare(b.horaInicio)
        );

    if(reservasDia.length===0){

        lista.innerHTML=
            "<p>Nenhuma reserva.</p>";

        return;

    }

    reservasDia.forEach(r=>{

        const item=
            document.createElement("div");

        item.className="itemReserva";

        item.innerHTML=`

            <strong>${r.horaInicio}</strong>
            às
            <strong>${r.horaFim}</strong>

            <br>

            ${r.militar}

            <br>

            ${r.tipoMissao}

        `;

        lista.appendChild(item);

    });

}

function mesAnterior(){

    mesAtual--;

    if(mesAtual<0){

        mesAtual=11;

        anoAtual--;

    }

    montarCalendario();

}

function proximoMes(){

    mesAtual++;

    if(mesAtual>11){

        mesAtual=0;

        anoAtual++;

    }

    montarCalendario();

}

function atualizarTituloCalendario(){

    const meses=[

        "Janeiro",

        "Fevereiro",

        "Março",

        "Abril",

        "Maio",

        "Junho",

        "Julho",

        "Agosto",

        "Setembro",

        "Outubro",

        "Novembro",

        "Dezembro"

    ];

    const titulo=
        document.getElementById("tituloCalendario");

    if(titulo){

        titulo.innerHTML=
            meses[mesAtual]+" / "+anoAtual;

    }

}



