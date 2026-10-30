export function criarModuloBeneficiarios({ usuario, api, avisar, fmtData }) {
  const $ = id => document.getElementById(id);
  const osc = usuario?.papel === "RESPONSAVEL_OSC";
  const permitido = osc || usuario?.papel === "RESPONSAVEL_UOSCC";
  let pagina = 1, paginas = 0, consulta = 0, editando = null, pessoas = [], oscsCarregadas = false;
  const form = () => $("form-pessoa-atendida");
  const fechar = () => { form().hidden = true; form().reset(); editando = null; $("nova-pessoa-atendida").focus(); };
  function abrir(pessoa) {
    form().reset(); editando = pessoa?.id ?? null;
    form().elements.tipo.value = pessoa?.tipo ?? "ALUNO";
    for (const campo of ["nome", "tipo", "telefone", "responsavel"]) {
      if (pessoa) form().elements[campo].value = pessoa[campo] ?? "";
    }
    form().elements.dataNascimento.value = pessoa?.dataNascimento?.slice(0, 10) ?? "";
    form().elements.ativo.checked = pessoa?.ativo ?? true;
    $("titulo-form-beneficiario").textContent = pessoa ? "Editar pessoa atendida" : "Cadastrar beneficiado";
    $("feedback-form-beneficiario").textContent = "";
    form().hidden = false; form().elements.nome.focus();
  }
  async function carregar() {
    if (!permitido) return;
    const numero = ++consulta;
    const filtros = Object.fromEntries(new FormData($("filtros-beneficiarios")));
    if (osc) delete filtros.organizacaoId;
    filtros.pagina = pagina;
    $("feedback-beneficiarios").textContent = "Carregando pessoas atendidas…";
    $("lista-beneficiarios").replaceChildren();
    $("lista-beneficiarios").setAttribute("aria-busy", "true");
    $("beneficiarios-anterior").disabled = $("beneficiarios-proxima").disabled = true;
    try {
      if (!osc && !oscsCarregadas) {
        const { organizacoes } = await api("/organizacoes?ativa=todas");
        if (numero !== consulta) return;
        $("filtros-beneficiarios").elements.organizacaoId.replaceChildren(new Option("Todas as OSCs", ""), ...organizacoes.map(o => new Option(`${o.nome}${o.ativa ? "" : " (inativa)"}`, o.id)));
        $("filtros-beneficiarios").elements.organizacaoId.value = filtros.organizacaoId;
        oscsCarregadas = true;
      }
      const dados = await api(`/pessoas-atendidas?${new URLSearchParams(filtros)}`);
      if (numero !== consulta) return;
      pessoas = dados.pessoas; paginas = dados.paginas;
      if (pagina > paginas && pagina > 1) { pagina = Math.max(1, paginas); return carregar(); }
      for (const pessoa of pessoas) {
        const li = document.createElement("li");
        li.className = "flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800";
        const dadosPessoa = document.createElement("div"); dadosPessoa.className = "min-w-0 break-words";
        const nome = document.createElement("h3"); nome.className = "font-semibold"; nome.textContent = pessoa.nome; dadosPessoa.append(nome);
        for (const texto of [
          `${pessoa.tipo === "ALUNO" ? "Aluno(a)" : "Beneficiado(a)"} · ${pessoa.ativo ? "Ativo" : "Inativo"}`,
          ...(!osc ? [`OSC: ${pessoa.organizacao.nome}${pessoa.organizacao.ativa ? "" : " (inativa)"}`] : []),
          `Nascimento: ${fmtData(pessoa.dataNascimento)}`,
          `Telefone: ${pessoa.telefone || "Não informado"}`,
          `Responsável: ${pessoa.responsavel || "Não informado"}`,
        ]) { const p = document.createElement("p"); p.className = "mt-1 text-sm"; p.textContent = texto; dadosPessoa.append(p); }
        li.append(dadosPessoa);
        if (osc) {
          const botoes = document.createElement("div"); botoes.className = "flex flex-wrap gap-2";
          for (const [acao, titulo] of [["editar", "Editar"], ["situacao", pessoa.ativo ? "Desativar" : "Reativar"]]) {
            const b = document.createElement("button"); b.type = "button"; b.className = "btn-secundario"; b.dataset.pessoa = pessoa.id; b.dataset.acao = acao; b.textContent = titulo; botoes.append(b);
          }
          li.append(botoes);
        }
        $("lista-beneficiarios").append(li);
      }
      $("feedback-beneficiarios").textContent = dados.total ? `${dados.total} pessoa(s) encontrada(s).` : "Nenhuma pessoa encontrada. Altere os filtros ou cadastre um beneficiado.";
      $("beneficiarios-pagina").textContent = `Página ${pagina} de ${Math.max(1, paginas)}`;
      $("beneficiarios-anterior").disabled = pagina <= 1;
      $("beneficiarios-proxima").disabled = pagina >= paginas;
    } catch (erro) { if (numero === consulta) $("feedback-beneficiarios").textContent = erro.message; }
    finally { if (numero === consulta) $("lista-beneficiarios").setAttribute("aria-busy", "false"); }
  }
  function iniciar() {
    document.querySelector('[data-menu="beneficiarios"]').hidden = !permitido;
    if (!permitido) return;
    $("nova-pessoa-atendida").hidden = !osc;
    $("filtro-beneficiario-osc").hidden = osc;
    form().elements.dataNascimento.max = new Date().toISOString().slice(0, 10);
    $("nova-pessoa-atendida").onclick = () => abrir();
    $("cancelar-beneficiario").onclick = fechar;
    $("filtros-beneficiarios").onsubmit = e => { e.preventDefault(); pagina = 1; carregar(); };
    $("beneficiarios-anterior").onclick = () => { if (pagina > 1) { pagina--; carregar(); } };
    $("beneficiarios-proxima").onclick = () => { if (pagina < paginas) { pagina++; carregar(); } };
    $("lista-beneficiarios").onclick = async e => {
      const botao = e.target.closest("button[data-pessoa]");
      if (!botao || !osc) return;
      const pessoa = pessoas.find(p => p.id === Number(botao.dataset.pessoa));
      if (!pessoa) return;
      if (botao.dataset.acao === "editar") return abrir(pessoa);
      if (!confirm(`${pessoa.ativo ? "Desativar" : "Reativar"} o cadastro de ${pessoa.nome}?`)) return;
      botao.disabled = true;
      try { await api(`/pessoas-atendidas/${pessoa.id}`, { method: "PATCH", corpo: { ativo: !pessoa.ativo } }); avisar("Situação atualizada."); await carregar(); }
      catch (erro) { avisar(erro.message, true); }
      finally { botao.disabled = false; }
    };
    form().onsubmit = async e => {
      e.preventDefault();
      const botao = form().querySelector('[type="submit"]'); botao.disabled = true;
      const corpo = Object.fromEntries(new FormData(form()));
      corpo.ativo = form().elements.ativo.checked;
      for (const campo of ["dataNascimento", "telefone", "responsavel"]) corpo[campo] = corpo[campo] || null;
      $("feedback-form-beneficiario").textContent = "Salvando…";
      try {
        await api(`/pessoas-atendidas${editando ? `/${editando}` : ""}`, { method: editando ? "PATCH" : "POST", corpo });
        fechar(); avisar("Cadastro salvo."); await carregar();
      } catch (erro) { $("feedback-form-beneficiario").textContent = erro.message; }
      finally { botao.disabled = false; }
    };
  }
  return { iniciar, carregar };
}
