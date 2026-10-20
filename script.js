const STORAGE_KEY = 'uoscc-dados-v1';
const secoes = ['inicio', 'oscs', 'projetos', 'demandas', 'relatorios'];
const estado = carregar();
let itemRelatorio = null;

function carregar() {
    try {
        const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (salvo && Array.isArray(salvo.oscs)) return salvo;
    } catch (erro) { console.warn('Não foi possível ler os dados locais.', erro); }
    return { oscs: [], projetos: [], demandas: [] };
}
function persistir() { localStorage.setItem(STORAGE_KEY, JSON.stringify(estado)); }
function porId(tipo, id) { return estado[tipo].find(x => String(x.id) === String(id)); }
function escapeHtml(valor = '') {
    return String(valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function texto(id, valor) { const el = document.getElementById(id); if (el) el.textContent = valor ?? ''; }
function navegar(secao, atualizarHash = true) {
    let pagina = secao;
    if (!document.getElementById(`pagina-${pagina}`)) pagina = 'inicio';
    document.querySelectorAll('[data-pagina]').forEach(el => el.classList.toggle('hidden', el.id !== `pagina-${pagina}`));
    const base = secoes.includes(pagina) ? pagina : pagina.replace(/^(cadastro-|ficha-)/, '');
    const principal = base === 'osc' ? 'oscs' : base === 'projeto' ? 'projetos' : base === 'demanda' ? 'demandas' : base;
    document.querySelectorAll('[data-menu]').forEach(link => {
        const ativo = link.dataset.menu === principal;
        link.classList.toggle('bg-orange-400', ativo);
        link.classList.toggle('text-slate-950', ativo);
        link.classList.toggle('font-semibold', ativo);
        link.classList.toggle('text-blue-100', !ativo);
    });
    if (atualizarHash && secoes.includes(pagina)) history.replaceState(null, '', `#${pagina}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function dataHoje() {
    const agora = new Date();
    texto('data-hoje', new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(agora));
    texto('dia-semana', new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(agora));
}
function alternarTema() {
    const escuro = document.documentElement.classList.toggle('dark');
    localStorage.setItem('uoscc-tema', escuro ? 'escuro' : 'claro');
    texto('icone-tema', escuro ? '☀️' : '🌙');
    texto('texto-tema', escuro ? 'Modo claro' : 'Modo escuro');
}
function configurarTema() {
    const escuro = localStorage.getItem('uoscc-tema') === 'escuro';
    document.documentElement.classList.toggle('dark', escuro);
    texto('icone-tema', escuro ? '☀️' : '🌙');
    texto('texto-tema', escuro ? 'Modo claro' : 'Modo escuro');
    document.getElementById('botao-tema')?.addEventListener('click', alternarTema);
}
function nomeOsc(id) { return porId('oscs', id)?.nome || 'OSC removida'; }
function desenharListas() {
    desenharOscs(); desenharProjetos(); desenharDemandas(); atualizarIndicadores(); preencherSelects();
}
function desenharOscs() {
    const busca = (document.getElementById('busca-oscs')?.value || '').toLocaleLowerCase('pt-BR');
    const cat = document.getElementById('filtro-categoria')?.value || '';
    const itens = estado.oscs.filter(o => (!busca || `${o.nome} ${o.cnpj} ${o.bairro}`.toLocaleLowerCase('pt-BR').includes(busca)) && (!cat || o.categoria === cat));
    const ul = document.getElementById('itens-oscs'); if (!ul) return;
    ul.innerHTML = itens.map(o => `<li data-id="${escapeHtml(o.id)}" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div><h3 class="font-bold">${escapeHtml(o.nome)}</h3><p class="text-sm text-slate-500">${escapeHtml(o.categoria)} · ${escapeHtml(o.bairro || 'Bairro não informado')} · ${escapeHtml(o.cnpj || 'CNPJ não informado')}</p></div><div class="flex gap-2"><button class="btn-secundario" data-action="ver-osc" data-id="${escapeHtml(o.id)}">Ver ficha</button><button class="btn-secundario" data-action="editar-osc" data-id="${escapeHtml(o.id)}">Editar</button><button class="btn-secundario" data-action="excluir-osc" data-id="${escapeHtml(o.id)}">Excluir</button></div></li>`).join('');
    document.getElementById('sem-oscs')?.classList.toggle('hidden', itens.length > 0);
}
function desenharProjetos() {
    const busca = (document.getElementById('busca-projetos')?.value || '').toLocaleLowerCase('pt-BR');
    const status = document.getElementById('filtro-status')?.value || '';
    const itens = estado.projetos.filter(p => (!busca || `${p.titulo} ${nomeOsc(p.osc_id)}`.toLocaleLowerCase('pt-BR').includes(busca)) && (!status || p.status === status));
    const ul = document.getElementById('itens-projetos'); if (!ul) return;
    ul.innerHTML = itens.map(p => `<li class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div><h3 class="font-bold">${escapeHtml(p.titulo)}</h3><p class="text-sm text-slate-500">${escapeHtml(nomeOsc(p.osc_id))} · ${escapeHtml(p.status || '')} · ${escapeHtml(p.pessoas || 0)} pessoas</p></div><div class="flex gap-2"><button class="btn-secundario" data-action="editar-projeto" data-id="${escapeHtml(p.id)}">Editar</button><button class="btn-secundario" data-action="excluir-projeto" data-id="${escapeHtml(p.id)}">Excluir</button></div></li>`).join('');
    document.getElementById('sem-projetos')?.classList.toggle('hidden', itens.length > 0);
}
function desenharDemandas() {
    const busca = (document.getElementById('busca-demandas')?.value || '').toLocaleLowerCase('pt-BR');
    const status = document.getElementById('filtro-status-demanda')?.value || '';
    const itens = estado.demandas.filter(d => d.status !== 'Concluído' && (!busca || `${d.titulo} ${nomeOsc(d.osc_id)}`.toLocaleLowerCase('pt-BR').includes(busca)) && (!status || d.status === status));
    const ul = document.getElementById('itens-demandas'); if (!ul) return;
    ul.innerHTML = itens.map(d => `<li class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div><h3 class="font-bold">${escapeHtml(d.titulo)}</h3><p class="text-sm text-slate-500">${escapeHtml(nomeOsc(d.osc_id))} · ${escapeHtml(d.categoria || '')} · ${escapeHtml(d.status || '')} · prazo ${escapeHtml(d.prazo || 'não definido')}</p></div><div class="flex gap-2"><button class="btn-secundario" data-action="editar-demanda" data-id="${escapeHtml(d.id)}">Editar</button><button class="btn-secundario" data-action="excluir-demanda" data-id="${escapeHtml(d.id)}">Excluir</button></div></li>`).join('');
    document.getElementById('sem-demandas')?.classList.toggle('hidden', itens.length > 0);
}
function atualizarIndicadores() {
    texto('total-oscs', estado.oscs.length);
    texto('total-demandas', estado.demandas.filter(d => d.status !== 'Concluído').length);
    texto('numeracao-pessoas', estado.projetos.reduce((s, p) => s + (Number(p.pessoas) || 0), 0));
    const lembretes = document.getElementById('lista-lembretes');
    if (lembretes) {
        const abertas = estado.demandas.filter(d => d.status !== 'Concluído').slice(0, 4);
        lembretes.innerHTML = abertas.length ? abertas.map(d => `<p class="mb-2 text-sm">${escapeHtml(d.titulo)} <span class="text-slate-500">· ${escapeHtml(d.status)} · ${escapeHtml(d.prazo || '')}</span></p>`).join('') : '<p class="text-sm text-slate-500">Nenhuma demanda em aberto.</p>';
    }
}
function preencherSelects() {
    for (const id of ['proj-osc', 'dem-osc']) {
        const select = document.getElementById(id); if (!select) continue;
        const atual = select.value;
        select.innerHTML = '<option value="">Selecione uma OSC</option>' + estado.oscs.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.nome)}</option>`).join('');
        if (estado.oscs.some(o => String(o.id) === atual)) select.value = atual;
    }
    document.getElementById('aviso-sem-oscs')?.classList.toggle('hidden', estado.oscs.length > 0);
    document.getElementById('aviso-sem-oscs-demanda')?.classList.toggle('hidden', estado.oscs.length > 0);
    atualizarOpcoesRelatorio();
}
function abrirFormulario(tipo, item = null) {
    const singular = tipo === 'oscs' ? 'osc' : tipo === 'projetos' ? 'projeto' : 'demanda';
    const form = document.getElementById(`form-${singular}`); if (!form) return;
    form.reset();
    const prefixo = { osc: 'osc', projeto: 'proj', demanda: 'dem' }[singular];
    document.getElementById(`${prefixo}-id`).value = item?.id || '';
    if (item) for (const [chave, valor] of Object.entries(item)) {
        const campo = form.elements.namedItem(chave); if (campo) campo.value = valor ?? '';
    }
    texto(`titulo-form-${singular}`, item ? `Editar ${singular === 'osc' ? 'OSC' : singular}` : `Cadastrar ${singular === 'osc' ? 'OSC' : singular}`);
    if (singular === 'demanda') atualizarConclusao();
    navegar(`cadastro-${singular}`);
}
function salvarFormulario(form) {
    const singular = form.dataset.entidade;
    const tipo = singular === 'osc' ? 'oscs' : `${singular}s`;
    const dados = Object.fromEntries(new FormData(form).entries());
    const id = dados.id || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    dados.id = id;
    if (singular === 'projeto') { dados.pessoas = Number(dados.pessoas) || 0; dados.orcamento = Number(dados.orcamento) || 0; }
    const index = estado[tipo].findIndex(x => String(x.id) === String(id));
    if (index >= 0) estado[tipo][index] = dados; else estado[tipo].push(dados);
    persistir(); desenharListas(); navegar(tipo);
}
function excluir(tipo, id) {
    const item = porId(tipo, id); if (!item || !confirm(`Excluir "${item.nome || item.titulo}"?`)) return;
    estado[tipo] = estado[tipo].filter(x => String(x.id) !== String(id));
    persistir(); desenharListas();
}
function mostrarFicha(id) {
    const o = porId('oscs', id); if (!o) return;
    texto('ficha-osc-nome', o.nome); texto('ficha-osc-categoria', o.categoria);
    const dados = document.getElementById('ficha-osc-dados');
    if (dados) dados.innerHTML = [['CNPJ', o.cnpj], ['Endereço', o.endereco], ['Bairro', o.bairro], ['Responsável', o.responsavel], ['Contato', o.contato], ['E-mail', o.email], ['Descrição', o.descricao]].filter(x => x[1]).map(x => `<p><strong>${escapeHtml(x[0])}:</strong> ${escapeHtml(x[1])}</p>`).join('');
    texto('ficha-osc-pessoas', estado.projetos.filter(p => String(p.osc_id) === String(id)).reduce((s, p) => s + (Number(p.pessoas) || 0), 0));
    const projetos = estado.projetos.filter(p => String(p.osc_id) === String(id));
    const demandas = estado.demandas.filter(d => String(d.osc_id) === String(id));
    document.getElementById('ficha-osc-projetos').innerHTML = projetos.map(p => `<li>${escapeHtml(p.titulo)} · ${escapeHtml(p.status)}</li>`).join('');
    document.getElementById('ficha-osc-sem-projetos')?.classList.toggle('hidden', projetos.length > 0);
    document.getElementById('ficha-osc-demandas').innerHTML = demandas.map(d => `<li>${escapeHtml(d.titulo)} · ${escapeHtml(d.status)}</li>`).join('');
    document.getElementById('ficha-osc-sem-demandas')?.classList.toggle('hidden', demandas.length > 0);
    document.getElementById('botao-editar-osc-ficha').dataset.id = id;
    navegar('ficha-osc');
}
function atualizarConclusao() {
    const concluida = document.getElementById('dem-status')?.value === 'Concluído';
    document.getElementById('bloco-dem-conclusao')?.classList.toggle('hidden', !concluida);
    const campo = document.getElementById('dem-conclusao'); if (campo) campo.required = Boolean(concluida);
}
function atualizarOpcoesRelatorio() {
    const tipo = document.getElementById('rel-tipo')?.value || 'osc';
    const lista = tipo === 'osc' ? estado.oscs : estado.projetos;
    const select = document.getElementById('rel-item'); if (!select) return;
    const anterior = select.value;
    select.innerHTML = lista.map(x => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.nome || x.titulo)}</option>`).join('');
    if (lista.some(x => String(x.id) === anterior)) select.value = anterior;
    const campos = document.getElementById('rel-campos');
    if (campos) campos.innerHTML = (tipo === 'osc' ? ['cnpj', 'categoria', 'endereco', 'bairro', 'responsavel', 'contato', 'email', 'descricao'] : ['osc', 'status', 'responsavel', 'contato', 'email', 'inicio', 'fim', 'pessoas', 'orcamento', 'descricao', 'objetivo', 'resultados']).map(c => `<label class="flex items-center gap-2"><input type="checkbox" value="${c}" checked> ${c}</label>`).join('');
}
function gerarRelatorio(anual = false) {
    let titulo, linhas;
    if (anual) {
        const ano = Number(document.getElementById('rel-ano').value) || new Date().getFullYear();
        titulo = `Relatório anual ${ano}`;
        linhas = estado.demandas.filter(d => d.status === 'Concluído' && String(d.data_conclusao || d.prazo || '').startsWith(String(ano))).map(d => ({ Demanda: d.titulo, OSC: nomeOsc(d.osc_id), Categoria: d.categoria, Conclusão: d.data_conclusao || '', Resultado: d.resultado || '' }));
    } else {
        const tipo = document.getElementById('rel-tipo').value;
        const lista = tipo === 'osc' ? estado.oscs : estado.projetos;
        const item = porId(tipo === 'osc' ? 'oscs' : 'projetos', document.getElementById('rel-item').value);
        if (!item) { alert('Cadastre ou selecione um item para gerar o relatório.'); return; }
        const selecionados = [...document.querySelectorAll('#rel-campos input:checked')].map(x => x.value);
        const origem = tipo === 'osc' ? item : { ...item, osc: nomeOsc(item.osc_id) };
        linhas = [Object.fromEntries(selecionados.map(c => [c, origem[c] || '']))];
        titulo = `${tipo === 'osc' ? 'OSC' : 'Projeto'}: ${item.nome || item.titulo}`;
    }
    itemRelatorio = { titulo, linhas };
    document.getElementById('conteudo-relatorio').innerHTML = `<h3 class="mb-4 text-xl font-bold">${escapeHtml(titulo)}</h3>${linhas.length ? `<div class="overflow-x-auto"><table class="w-full border-collapse text-left text-sm"><tbody>${linhas.map(l => Object.entries(l).map(([k, v]) => `<tr class="border-b border-slate-200"><th class="p-2">${escapeHtml(k)}</th><td class="p-2">${escapeHtml(v)}</td></tr>`).join('')).join('')}</tbody></table></div>` : '<p>Nenhum registro encontrado para este ano.</p>'}`;
    document.getElementById('area-relatorio')?.classList.remove('hidden');
}
function baixarCsv() {
    if (!itemRelatorio) return;
    const linhas = [Object.keys(itemRelatorio.linhas[0] || { Relatório: '' }), ...itemRelatorio.linhas.map(Object.values)];
    const csv = linhas.map(l => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); link.download = `${itemRelatorio.titulo.replace(/[^\p{L}\p{N}-]+/gu, '_')}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
document.addEventListener('click', event => {
    const link = event.target.closest('[data-menu]');
    if (link) { event.preventDefault(); navegar(link.dataset.menu); return; }
    const atalho = event.target.closest('[data-secao]'); if (atalho) { navegar(atalho.dataset.secao); return; }
    const action = event.target.closest('[data-action]'); if (!action) return;
    const { action: acao, id } = action.dataset;
    if (acao === 'abrir-formulario-osc') abrirFormulario('oscs');
    if (acao === 'abrir-formulario-projeto') abrirFormulario('projetos');
    if (acao === 'abrir-formulario-demanda') abrirFormulario('demandas');
    if (acao === 'ver-osc') mostrarFicha(id);
    if (acao === 'editar-osc') abrirFormulario('oscs', porId('oscs', id));
    if (acao === 'editar-projeto') abrirFormulario('projetos', porId('projetos', id));
    if (acao === 'editar-demanda') abrirFormulario('demandas', porId('demandas', id));
    if (acao === 'excluir-osc') excluir('oscs', id);
    if (acao === 'excluir-projeto') excluir('projetos', id);
    if (acao === 'excluir-demanda') excluir('demandas', id);
});
document.addEventListener('submit', event => {
    const form = event.target;
    if (form.matches('[data-entidade]')) { event.preventDefault(); salvarFormulario(form); }
    else if (form.matches('#form-pesquisa-oscs, #form-pesquisa-projetos, #form-pesquisa-demandas')) event.preventDefault();
});
for (const id of ['busca-oscs', 'filtro-categoria']) document.getElementById(id)?.addEventListener('input', desenharOscs);
for (const id of ['busca-projetos', 'filtro-status']) document.getElementById(id)?.addEventListener('input', desenharProjetos);
for (const id of ['busca-demandas', 'filtro-status-demanda']) document.getElementById(id)?.addEventListener('input', desenharDemandas);
document.getElementById('dem-status')?.addEventListener('change', atualizarConclusao);
document.getElementById('rel-tipo')?.addEventListener('change', atualizarOpcoesRelatorio);
document.getElementById('btn-gerar-individual')?.addEventListener('click', () => gerarRelatorio(false));
document.getElementById('btn-gerar-anual')?.addEventListener('click', () => gerarRelatorio(true));
document.getElementById('btn-imprimir')?.addEventListener('click', () => window.print());
document.getElementById('btn-csv')?.addEventListener('click', baixarCsv);
document.getElementById('botao-editar-osc-ficha')?.addEventListener('click', e => abrirFormulario('oscs', porId('oscs', e.currentTarget.dataset.id)));
window.addEventListener('hashchange', () => navegar(location.hash.slice(1) || 'inicio', false));
dataHoje(); configurarTema(); desenharListas();
navegar(location.hash.slice(1) || 'inicio', false);

