/*=========================================================
    CONTROLE DA VIATURA DO COMANDO - BABR
    api.js
=========================================================*/


/*=========================================================
CONFIGURAÇÃO
=========================================================*/

const API_URL =
    "COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT";

const API_TIMEOUT = 30000;


/*=========================================================
FUNÇÃO BASE
=========================================================*/

async function api(endpoint, method = "GET", body = null){

    let url = API_URL + "?action=" + endpoint;

    const options = {

        method,

        headers:{
            "Content-Type":"application/json"
        }

    };

    if(method !== "GET"){

        options.body = JSON.stringify(body);

    }

    try{

        const controller = new AbortController();

        const timeout = setTimeout(()=>{

            controller.abort();

        },API_TIMEOUT);

        options.signal = controller.signal;

        const response = await fetch(url,options);

        clearTimeout(timeout);

        if(!response.ok){

            throw new Error("Erro HTTP " + response.status);

        }

        const json = await response.json();

        if(json.success===false){

            throw new Error(json.message);

        }

        return json;

    }

    catch(error){

        console.error(error);

        mostrarErro(error.message);

        return null;

    }

}


/*=========================================================
USUÁRIO
=========================================================*/

async function carregarUsuarios(){

    return await api(

        "usuarios"

    );

}


async function salvarUsuario(dados){

    return await api(

        "salvarUsuario",

        "POST",

        dados

    );

}


/*=========================================================
CONFIGURAÇÕES
=========================================================*/

async function carregarConfiguracao(){

    return await api(

        "configuracao"

    );

}


/*=========================================================
RESERVAS
=========================================================*/

async function carregarReservas(){

    return await api(

        "reservas"

    );

}


async function criarReserva(reserva){

    return await api(

        "criarReserva",

        "POST",

        reserva

    );

}


async function cancelarReserva(id){

    return await api(

        "cancelarReserva",

        "POST",

        {

            id:id

        }

    );

}


/*=========================================================
DASHBOARD
=========================================================*/

async function carregarDashboard(){

    return await api(

        "dashboard"

    );

}


/*=========================================================
PERFIL
=========================================================*/

async function carregarPerfil(id){

    return await api(

        "perfil&id=" + id

    );

}


async function atualizarPerfil(dados){

    return await api(

        "atualizarPerfil",

        "POST",

        dados

    );

}


/*=========================================================
CALENDÁRIO
=========================================================*/

async function carregarEventos(){

    return await api(

        "eventos"

    );

}


/*=========================================================
LOGIN
=========================================================*/

async function login(nome){

    return await api(

        "login&nome=" +

        encodeURIComponent(nome)

    );

}


/*=========================================================
LOGOUT
=========================================================*/

function logout(){

    localStorage.removeItem("usuario");

    location.reload();

}


/*=========================================================
LOCAL STORAGE
=========================================================*/

function usuarioLogado(){

    const dados =

        localStorage.getItem(

            "usuario"

        );

    if(!dados){

        return null;

    }

    return JSON.parse(dados);

}


function salvarUsuarioLocal(usuario){

    localStorage.setItem(

        "usuario",

        JSON.stringify(usuario)

    );

}


/*=========================================================
UTILITÁRIOS
=========================================================*/

function mostrarErro(texto){

    if(typeof toast==="function"){

        toast(

            "Erro",

            texto,

            "error"

        );

    }

    else{

        alert(texto);

    }

}


function mostrarSucesso(texto){

    if(typeof toast==="function"){

        toast(

            "Sucesso",

            texto,

            "success"

        );

    }

}


/*=========================================================
VERIFICAÇÃO DE LOGIN
=========================================================*/

function verificarLogin(){

    const usuario = usuarioLogado();

    if(usuario==null){

        location.href="login.html";

        return false;

    }

    return true;

}


/*=========================================================
TESTE DA API
=========================================================*/

async function testarAPI(){

    console.log(

        await carregarDashboard()

    );

  /*=========================================================
CACHE LOCAL
=========================================================*/

const CACHE = {

    usuarios:null,

    configuracao:null,

    dashboard:null,

    reservas:null,

    eventos:null,

    ultimaAtualizacao:null

};


function limparCache(){

    CACHE.usuarios = null;
    CACHE.configuracao = null;
    CACHE.dashboard = null;
    CACHE.reservas = null;
    CACHE.eventos = null;
    CACHE.ultimaAtualizacao = null;

}


function atualizarCache(nome,dados){

    CACHE[nome]=dados;

    CACHE.ultimaAtualizacao=new Date();

}


function obterCache(nome){

    return CACHE[nome];

}


/*=========================================================
REQUISIÇÃO COM CACHE
=========================================================*/

async function apiCache(

    endpoint,

    cacheName

){

    const cache=obterCache(cacheName);

    if(cache){

        return cache;

    }

    const resposta=await api(endpoint);

    if(resposta){

        atualizarCache(

            cacheName,

            resposta

        );

    }

    return resposta;

}


/*=========================================================
VERSÕES COM CACHE
=========================================================*/

async function usuarios(){

    return await apiCache(

        "usuarios",

        "usuarios"

    );

}


async function configuracao(){

    return await apiCache(

        "configuracao",

        "configuracao"

    );

}


async function dashboard(){

    return await apiCache(

        "dashboard",

        "dashboard"

    );

}


async function reservas(){

    return await apiCache(

        "reservas",

        "reservas"

    );

}


async function eventos(){

    return await apiCache(

        "eventos",

        "eventos"

    );

}


/*=========================================================
RECARREGAMENTO FORÇADO
=========================================================*/

async function atualizarUsuarios(){

    limparUsuariosCache();

    return await usuarios();

}


function limparUsuariosCache(){

    CACHE.usuarios=null;

}


async function atualizarReservas(){

    CACHE.reservas=null;

    return await reservas();

}


async function atualizarDashboard(){

    CACHE.dashboard=null;

    return await dashboard();

}


async function atualizarEventos(){

    CACHE.eventos=null;

    return await eventos();

}


async function atualizarConfiguracao(){

    CACHE.configuracao=null;

    return await configuracao();

}


/*=========================================================
EXECUÇÃO PARALELA
=========================================================*/

async function carregarSistema(){

    const respostas=

        await Promise.all([

            dashboard(),

            reservas(),

            configuracao(),

            usuarios()

        ]);

    return{

        dashboard:respostas[0],

        reservas:respostas[1],

        configuracao:respostas[2],

        usuarios:respostas[3]

    };

}


/*=========================================================
EXECUÇÃO PARALELA COMPLETA
=========================================================*/

async function carregarTudo(){

    const dados=

        await Promise.all([

            dashboard(),

            reservas(),

            usuarios(),

            eventos(),

            configuracao()

        ]);

    return{

        dashboard:dados[0],

        reservas:dados[1],

        usuarios:dados[2],

        eventos:dados[3],

        configuracao:dados[4]

    };

}


/*=========================================================
RETRY AUTOMÁTICO
=========================================================*/

async function apiRetry(

    endpoint,

    tentativas=3

){

    let ultimaErro;

    for(

        let i=0;

        i<tentativas;

        i++

    ){

        try{

            const resposta=

                await api(endpoint);

            if(resposta){

                return resposta;

            }

        }

        catch(e){

            ultimaErro=e;

        }

    }

    throw ultimaErro;

}


/*=========================================================
POST COM RETRY
=========================================================*/

async function apiRetryPost(

    endpoint,

    body,

    tentativas=3

){

    let ultimaErro;

    for(

        let i=0;

        i<tentativas;

        i++

    ){

        try{

            const resposta=

                await api(

                    endpoint,

                    "POST",

                    body

                );

            if(resposta){

                return resposta;

            }

        }

        catch(e){

            ultimaErro=e;

        }

    }

    throw ultimaErro;

}


/*=========================================================
SINCRONIZAÇÃO
=========================================================*/

let sincronizando=false;


async function sincronizar(){

    if(sincronizando){

        return;

    }

    sincronizando=true;

    limparCache();

    await carregarTudo();

    sincronizando=false;

}


/*=========================================================
AUTO REFRESH
=========================================================*/

let refreshSistema=null;


function iniciarAutoRefresh(){

    pararAutoRefresh();

    refreshSistema=

        setInterval(

            sincronizar,

            60000

        );

}


function pararAutoRefresh(){

    if(refreshSistema){

        clearInterval(

            refreshSistema

        );

    }

}

  

}
