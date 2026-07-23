/**
 * api.js
 * Camada de comunicação com a API Apps Script
 */

const API_URL = "COLE_AQUI_A_URL_DO_SEU_WEBAPP";

const Api = (() => {

  const cache = {};

  async function request(action, method="GET", data=null){

    try{

      let response;

      if(method==="GET"){

        response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);

      }else{

        response = await fetch(API_URL,{
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            action,
            ...data
          })
        });

      }

      if(!response.ok){
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();

    }catch(err){
      console.error(err);
      throw err;
    }

  }

  function clearCache(){
    Object.keys(cache).forEach(k=>delete cache[k]);
  }

  async function getReservas(force=false){
    if(!force && cache.reservas) return cache.reservas;
    const r = await request("reservas");
    cache.reservas = r;
    return r;
  }

  async function getUsuarios(force=false){
    if(!force && cache.usuarios) return cache.usuarios;
    const r = await request("usuarios");
    cache.usuarios = r;
    return r;
  }

  async function getConfiguracao(force=false){
    if(!force && cache.config) return cache.config;
    const r = await request("config");
    cache.config = r;
    return r;
  }

  async function getDashboard(force=false){
    if(!force && cache.dashboard) return cache.dashboard;
    const r = await request("dashboard");
    cache.dashboard = r;
    return r;
  }

  async function novaReserva(dados){
    const r = await request("novaReserva","POST",dados);
    clearCache();
    return r;
  }

  async function cancelarReserva(id){
    const r = await request("cancelarReserva","POST",{id});
    clearCache();
    return r;
  }

  async function salvarUsuario(dados){
    const r = await request("salvarUsuario","POST",dados);
    clearCache();
    return r;
  }

  return {
    getReservas,
    getUsuarios,
    getConfiguracao,
    getDashboard,
    novaReserva,
    cancelarReserva,
    salvarUsuario,
    clearCache
  };

})();
