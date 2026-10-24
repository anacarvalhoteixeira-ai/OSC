import { podeGerenciarUsuarios } from "../src/utils/permissoes.js";

export function prepararEquipe(usuario, api, avisar) {
  const $ = id => document.getElementById(id);
  const nomes = { ADMIN: "Administrador · Gestão de acessos", RESPONSAVEL_UOSCC: "Responsável da UOSCC · Gestão da rede", RESPONSAVEL_OSC: "Responsável da OSC · Minha organização" };
  $("saudacao-usuario").textContent = `Olá, ${usuario.nome.split(" ")[0]}! Que bom ter você aqui.`;
  $("perfil-atual").textContent = nomes[usuario.papel];
  if (!podeGerenciarUsuarios(usuario)) return;
  $("gestao-equipe").hidden = false;
  $("equipe-descricao").textContent = "Cadastre pessoas, defina seus perfis e mantenha os acessos organizados. Os dados operacionais ficam com os responsáveis.";
  const form = $("form-membro");
  let editando = null;
  let usuarios = [];
  for (const [valor, texto] of [["RESPONSAVEL_UOSCC", "Responsável da UOSCC"], ["RESPONSAVEL_OSC", "Responsável da OSC"], ["ADMIN", "Administrador"]]) {
    $("membro-papel").add(new Option(texto, valor));
  }
  const fechar = () => { form.hidden = true; form.reset(); editando = null; $("abrir-membro").focus(); };
  const atualizarVinculo = () => {
    const osc = $("membro-papel").value === "RESPONSAVEL_OSC";
    $("membro-vinculo").hidden = !osc;
    $("membro-organizacao").required = osc;
    $("membro-organizacao").disabled = !osc;
  };
  $("membro-papel").onchange = atualizarVinculo;
  function abrir(pessoa) {
    form.reset(); editando = pessoa?.id ?? null;
    $("membro-titulo").textContent = pessoa ? "Editar acesso" : "Novo acesso";
    form.elements.senha.required = !pessoa;
    form.elements.senha.placeholder = pessoa ? "Deixe em branco para manter a senha" : "Mínimo de 8 caracteres";
    if (pessoa) {
      form.elements.nome.value = pessoa.nome;
      form.elements.email.value = pessoa.email;
      $("membro-papel").value = pessoa.papel;
      $("membro-organizacao").value = pessoa.organizacaoId ?? "";
      $("membro-ativo").checked = pessoa.ativo;
    }
    for (const campo of [$("membro-papel"), $("membro-organizacao"), $("membro-ativo")]) campo.disabled = pessoa?.id === usuario.id;
    atualizarVinculo();
    form.hidden = false; form.elements.nome.focus();
  }
  $("abrir-membro").onclick = () => abrir();
  $("cancelar-membro").onclick = fechar;
  $("equipe-lista").onclick = e => {
    const botao = e.target.closest("button[data-usuario]");
    if (botao) abrir(usuarios.find(p => p.id === Number(botao.dataset.usuario)));
  };
  async function carregar() {
    $("equipe-feedback").textContent = "Carregando os acessos…";
    try {
      ({ usuarios } = await api("/usuarios/equipe"));
      $("equipe-lista").replaceChildren(...usuarios.map(pessoa => {
        const li = document.createElement("li");
        const dados = document.createElement("div");
        const nome = document.createElement("strong"); nome.textContent = pessoa.nome;
        const email = document.createElement("span"); email.textContent = pessoa.email;
        const perfil = document.createElement("span"); perfil.textContent = `${nomes[pessoa.papel]}${pessoa.organizacao ? ` · ${pessoa.organizacao.nome}` : ""} · ${pessoa.ativo ? "Ativo" : "Inativo"}`;
        dados.append(nome, email, perfil);
        const editar = document.createElement("button"); editar.type = "button"; editar.className = "btn-secundario"; editar.textContent = "Editar acesso"; editar.dataset.usuario = pessoa.id;
        li.append(dados, editar); return li;
      }));
      $("equipe-feedback").textContent = `${usuarios.length} pessoa(s) cadastrada(s)`;
    } catch (erro) { $("equipe-feedback").textContent = erro.message; }
  }
  form.onsubmit = async event => {
    event.preventDefault();
    const botao = form.querySelector('[type="submit"]'); botao.disabled = true;
    const corpo = { nome: form.elements.nome.value, email: form.elements.email.value };
    if (form.elements.senha.value) corpo.senha = form.elements.senha.value;
    if (editando !== usuario.id) {
      corpo.papel = $("membro-papel").value;
      corpo.ativo = $("membro-ativo").checked;
      corpo.organizacaoId = corpo.papel === "RESPONSAVEL_OSC" ? Number($("membro-organizacao").value) : null;
    }
    try {
      const resposta = await api(`/usuarios/equipe${editando ? `/${editando}` : ""}`, { method: editando ? "PATCH" : "POST", corpo });
      fechar(); avisar(resposta.mensagem); await carregar();
    } catch (erro) { $("equipe-feedback").textContent = erro.message; }
    finally { botao.disabled = false; }
  };
  api("/organizacoes?ativa=todas").then(({ organizacoes }) => {
    $("membro-organizacao").add(new Option("Selecione a OSC autorizada", ""));
    for (const osc of organizacoes) {
      const option = new Option(`${osc.nome}${osc.ativa ? "" : " (inativa)"}`, osc.id);
      option.disabled = !osc.ativa;
      $("membro-organizacao").add(option);
    }
  }).catch(erro => { $("equipe-feedback").textContent = erro.message; });
  carregar();
}
