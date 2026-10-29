import { podeEditarDemanda, podeAtenderDemanda } from "../src/utils/demanda.js";

export function criarModuloDemandas({ usuario, api, ir, avisar, esc, fmtData, paraInput, qs, STATUS_DEMANDA, CATEGORIAS_DEMANDA }) {
  const $ = id => document.getElementById(id);
  const osc = usuario?.papel === "RESPONSAVEL_OSC";
  let atual = null, editando = null, consulta = 0, detalheConsulta = 0, edicaoConsulta = 0, filtrosCarregados = false;
  const dataHora = valor => new Date(valor).toLocaleString("pt-BR");
  const badge = status => `<span class="demanda-status demanda-status-${esc(status.toLowerCase())}">${esc(STATUS_DEMANDA[status])}</span>`;
  const texto = v => esc(v || "—");
  const preencher = (id, opcoes, vazio) => {
    $(id).replaceChildren(...(vazio ? [new Option(vazio, "")] : []), ...Object.entries(opcoes).map(([v, r]) => new Option(r, v)));
  };

  async function carregar() {
    const numero = ++consulta;
    const form = $("form-pesquisa-demandas");
    const filtros = Object.fromEntries(new FormData(form));
    if (osc) delete filtros.organizacaoId;
    const extras = ["categoria", "organizacaoId", "de", "ate"].filter(chave => filtros[chave]).length;
    $("total-filtros-extras").textContent = extras ? ` (${extras})` : "";
    $("limpar-filtros-demandas").hidden = !Object.values(filtros).some(Boolean);
    $("itens-demandas").replaceChildren();
    $("itens-demandas").setAttribute("aria-busy", "true");
    $("sem-demandas").hidden = true; $("repetir-demandas").hidden = true;
    $("demandas-feedback").textContent = "Carregando demandas…";
    try {
      if (!osc && !filtrosCarregados) {
        const { organizacoes } = await api("/organizacoes?ativa=todas");
        if (numero !== consulta) return;
        $("filtro-osc-demanda").replaceChildren(new Option("Todas as OSCs", ""), ...organizacoes.map(o => new Option(`${o.nome}${o.ativa ? "" : " (inativa)"}`, o.id)));
        filtrosCarregados = true;
      }
      const { demandas } = await api(`/demandas${qs(filtros)}`);
      if (numero !== consulta) return;
      $("itens-demandas").innerHTML = demandas.map(d => `<li data-id="${d.id}" class="demanda-item rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div class="min-w-0"><div class="mb-2 flex flex-wrap items-center gap-3"><h3 class="font-semibold">${esc(d.titulo)}</h3>${badge(d.status)}</div><p class="text-sm text-slate-500 dark:text-slate-300">${osc ? "" : `${texto(d.organizacao?.nome ?? "Rede (registro anterior)")} · `}${esc(CATEGORIAS_DEMANDA[d.categoria])} · Criada em ${fmtData(d.criadoEm)}</p></div><div class="flex flex-wrap gap-2"><button type="button" data-demanda-acao="ver" class="btn-secundario">${podeAtenderDemanda(usuario) ? "Analisar / responder" : "Ver detalhes"}</button>${podeEditarDemanda(usuario, d) ? '<button type="button" data-demanda-acao="editar" class="btn-secundario">Editar</button>' : ""}</div></li>`).join("");
      $("sem-demandas").hidden = demandas.length > 0;
      $("demandas-feedback").textContent = `${demandas.length} demanda(s) encontrada(s).`;
    } catch (erro) {
      if (numero !== consulta) return;
      $("demandas-feedback").textContent = erro.message;
      $("repetir-demandas").hidden = false;
    } finally {
      if (numero === consulta) $("itens-demandas").setAttribute("aria-busy", "false");
    }
  }

  function renderDetalhes(d) {
    $("titulo-detalhe-demanda").textContent = d.titulo;
    $("ficha-demanda-status").innerHTML = `${badge(d.status)}<span class="text-sm">${esc(CATEGORIAS_DEMANDA[d.categoria])}</span>`;
    $("detalhe-demanda-resumo").innerHTML = `<dl class="grid gap-3 text-sm sm:grid-cols-2">${[...(!osc ? [["OSC", d.organizacao?.nome ?? "Rede (registro anterior)"]] : []), ["Solicitante", d.solicitante?.nome], ["Criada em", dataHora(d.criadoEm)], ["Prazo desejado", d.prazo ? fmtData(d.prazo) : "Não informado"], ["Responsável pelo atendimento", d.responsavel?.nome], ["Concluída em", d.dataConclusao ? dataHora(d.dataConclusao) : "—"]].map(([k,v]) => `<div><dt class="text-slate-500 dark:text-slate-300">${esc(k)}</dt><dd>${texto(v)}</dd></div>`).join("")}</dl><div><h3 class="mb-2 text-sm font-semibold">Descrição da necessidade</h3><p class="demanda-texto text-sm">${esc(d.descricao)}</p></div>${d.resultado && !d.historico.some(h => h.resposta === d.resultado) ? `<div><h3 class="mb-2 text-sm font-semibold">Resposta registrada anteriormente</h3><p class="demanda-texto text-sm">${esc(d.resultado)}</p></div>` : ""}`;
    const resumo = $("detalhe-demanda-resumo");
    const descricao = resumo.querySelector(":scope > div");
    if (descricao) {
      descricao.classList.add("demanda-descricao-principal");
      resumo.append(descricao);
    }
    $("historico-demanda").innerHTML = d.historico.map(h => `<li><div class="flex flex-wrap justify-between gap-2 text-sm"><strong>${esc(h.usuario.nome)}</strong><time datetime="${esc(h.criadoEm)}" class="text-slate-500 dark:text-slate-300">${esc(dataHora(h.criadoEm))}</time></div><p class="my-2 text-sm">${h.tipo === "CRIACAO" ? "Demanda criada" : h.tipo === "EDICAO" ? "Dados da demanda atualizados" : "Atendimento registrado"} · ${h.statusAnterior && h.statusAnterior !== h.statusNovo ? `${esc(STATUS_DEMANDA[h.statusAnterior])} → ` : ""}${esc(STATUS_DEMANDA[h.statusNovo])}</p>${h.resposta ? `<h4 class="text-sm font-semibold">Resposta</h4><p class="demanda-texto mb-2 text-sm">${esc(h.resposta)}</p>` : ""}${h.observacao ? `<h4 class="text-sm font-semibold">Observação</h4><p class="demanda-texto text-sm">${esc(h.observacao)}</p>` : ""}${podeAtenderDemanda(usuario) && h.tipo === "ATENDIMENTO" && h.usuario.id === usuario.id ? `<button type="button" data-excluir-atendimento="${h.id}" class="excluir-registro-atendimento">Excluir registro</button>` : ""}</li>`).join("");
    $("sem-historico-demanda").hidden = d.historico.length > 0;
    $("editar-demanda-detalhe").hidden = !podeEditarDemanda(usuario, d);
    $("form-atendimento-demanda").hidden = !podeAtenderDemanda(usuario);
    $("form-atendimento-demanda").reset(); $("dem-status").value = d.status;
    $("atendimento-demanda-feedback").textContent = "";
  }

  async function detalhes(id) {
    ++edicaoConsulta;
    const numero = ++detalheConsulta;
    atual = null;
    ir("detalhe-demanda");
    $("detalhe-demanda-conteudo").hidden = true;
    $("detalhe-demanda-feedback").textContent = "Carregando a solicitação e seu histórico…";
    $("recarregar-detalhe-demanda").hidden = true;
    $("recarregar-detalhe-demanda").onclick = () => detalhes(id);
    try {
      const { demanda } = await api(`/demandas/${id}`);
      if (numero !== detalheConsulta) return;
      atual = demanda; renderDetalhes(demanda);
      $("detalhe-demanda-conteudo").hidden = false;
      $("detalhe-demanda-feedback").textContent = "";
    } catch (erro) {
      if (numero !== detalheConsulta) return;
      $("detalhe-demanda-feedback").textContent = erro.message;
      $("recarregar-detalhe-demanda").hidden = false;
    }
  }

  async function formulario(id) {
    if (!osc) return;
    const numero = ++edicaoConsulta;
    ++detalheConsulta;
    const form = $("form-demanda");
    form.reset(); editando = null;
    $("form-demanda-feedback").textContent = id ? "Carregando demanda…" : "";
    $("recarregar-edicao-demanda").hidden = true;
    $("dem-id").value = id ?? "";
    $("titulo-form-demanda").textContent = id ? "Editar demanda" : "Nova demanda";
    $("botao-salvar-demanda").textContent = id ? "Salvar alterações" : "Enviar demanda";
    $("botao-salvar-demanda").disabled = !!id;
    $("dem-categoria").value = "OUTROS";
    ir("cadastro-demanda");
    if (!id) return;
    try {
      const { demanda } = await api(`/demandas/${id}`);
      if (numero !== edicaoConsulta) return;
      if (!podeEditarDemanda(usuario, demanda)) return detalhes(id);
      editando = demanda;
      for (const campo of ["titulo", "descricao", "categoria"]) form.elements[campo].value = demanda[campo];
      form.elements.prazo.value = paraInput(demanda.prazo);
      $("form-demanda-feedback").textContent = "";
      $("botao-salvar-demanda").disabled = false;
    } catch (erro) {
      if (numero !== edicaoConsulta) return;
      $("form-demanda-feedback").textContent = erro.message;
      $("recarregar-edicao-demanda").hidden = false;
      $("recarregar-edicao-demanda").onclick = () => detalhes(id);
    }
  }

  async function salvar(evento) {
    evento.preventDefault(); if (!osc) return;
    const form = evento.currentTarget, id = $("dem-id").value;
    const botao = $("botao-salvar-demanda");
    if (id && !editando) return;
    botao.disabled = true;
    $("form-demanda-feedback").textContent = "Salvando sua demanda…";
    try {
      const corpo = { titulo: form.elements.titulo.value.trim(), descricao: form.elements.descricao.value.trim(), categoria: form.elements.categoria.value, prazo: form.elements.prazo.value || null, ...(id ? { versao: editando.versao } : {}) };
      const { demanda } = await api(id ? `/demandas/${id}` : "/demandas", { method: id ? "PUT" : "POST", corpo });
      avisar(id ? "Demanda atualizada." : "Demanda enviada. Acompanhe o atendimento por aqui.");
      await detalhes(demanda.id);
    } catch (erro) {
      $("form-demanda-feedback").textContent = erro.message;
      if (id) { $("recarregar-edicao-demanda").hidden = false; $("recarregar-edicao-demanda").onclick = () => detalhes(id); }
    } finally { botao.disabled = false; }
  }

  async function atender(evento) {
    evento.preventDefault(); if (!podeAtenderDemanda(usuario) || !atual) return;
    const demanda = atual, form = evento.currentTarget, botao = form.querySelector('[type="submit"]');
    const corpo = { versao: demanda.versao };
    if (form.elements.status.value !== demanda.status) corpo.status = form.elements.status.value;
    for (const campo of ["resposta", "observacao"]) if (form.elements[campo].value.trim()) corpo[campo] = form.elements[campo].value.trim();
    if (Object.keys(corpo).length === 1) { $("atendimento-demanda-feedback").textContent = "Escolha um novo status ou escreva uma resposta ou observação."; return; }
    botao.disabled = true; $("atendimento-demanda-feedback").textContent = "Registrando atendimento…";
    try {
      const { demanda: nova } = await api(`/demandas/${demanda.id}`, { method: "PATCH", corpo });
      if (atual?.id !== demanda.id) return;
      atual = nova; renderDetalhes(nova); avisar("Atendimento registrado no histórico.");
      $("recarregar-detalhe-demanda").hidden = true;
    } catch (erro) {
      $("atendimento-demanda-feedback").textContent = erro.message;
      $("recarregar-detalhe-demanda").hidden = false;
    } finally { botao.disabled = false; }
  }

  function iniciar() {
    preencher("filtro-status-demanda", STATUS_DEMANDA, "Todos os status");
    preencher("filtro-categoria-demanda", CATEGORIAS_DEMANDA, "Todas as categorias");
    preencher("dem-categoria", CATEGORIAS_DEMANDA); preencher("dem-status", STATUS_DEMANDA);
    $("botao-nova-demanda").hidden = !osc; $("filtro-osc-demanda-bloco").hidden = osc;
    $("titulo-demandas").textContent = osc ? "Demandas da minha OSC" : "Demandas da rede";
    $("historico-demanda").onclick = async event => {
      const botao = event.target.closest("[data-excluir-atendimento]");
      if (!botao || !atual) return;
      if (!confirm("Excluir este registro de atendimento? O status atual da demanda será mantido.")) return;
      botao.disabled = true;
      try {
        const { demanda } = await api(`/demandas/${atual.id}/atendimentos/${botao.dataset.excluirAtendimento}`, { method: "DELETE", corpo: { versao: atual.versao } });
        atual = demanda;
        renderDetalhes(demanda);
        avisar("Registro excluído.");
      } catch (erro) { avisar(erro.message, true); botao.disabled = false; }
    };
    $("repetir-demandas").onclick = carregar;
    $("limpar-filtros-demandas").onclick = () => { $("form-pesquisa-demandas").reset(); $("mais-filtros-demandas").open = false; carregar(); };
    $("editar-demanda-detalhe").onclick = () => atual && formulario(atual.id);
    $("itens-demandas").onclick = e => {
      const botao = e.target.closest("[data-demanda-acao]");
      if (!botao) return;
      const id = Number(botao.closest("li[data-id]").dataset.id);
      if (botao.dataset.demandaAcao === "editar") formulario(id); else detalhes(id);
    };
    $("form-atendimento-demanda").onsubmit = atender;
  }
  return { carregar, formulario, salvar, iniciar };
}
