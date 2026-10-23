async function carregarPendentes() {
  const { solicitacoes } = await api("/usuarios/solicitacoes?status=PENDENTE");
  const painel = $("painel-solicitacoes-acesso");
  painel.classList.toggle("hidden", solicitacoes.length === 0);
  $("total-pendentes").textContent = solicitacoes.length;

  $("lista-pendentes").innerHTML = solicitacoes.map((s) => {
    const isVinculo = s.tipo === "VINCULO_OSC";
    const nomeOrg = isVinculo ? (s.organizacao?.nome ?? "OSC existente") : (s.nomeOsc + " (Nova OSC)");
    const docOrg = isVinculo ? (s.organizacao?.cnpj || "Sem CNPJ") : (s.cnpj || "Sem CNPJ");
    const badge = isVinculo
      ? '<span class="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">VÍNCULO</span>'
      : '<span class="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">NOVA OSC</span>';

    return `
      <li data-id="${s.id}" class="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900 dark:bg-slate-900">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            ${badge}
            <span class="font-bold text-slate-900 dark:text-white">${esc(s.nomeUsuario)}</span>
            <span class="text-xs text-slate-500">(${esc(s.emailUsuario)} - Tel: ${esc(s.telefoneUsuario || "—")})</span>
          </div>
          <span class="text-xs text-slate-400">${fmtData(s.criadoEm)}</span>
        </div>
        <p class="text-sm text-slate-700 dark:text-slate-300">
          <strong>Organização:</strong> ${esc(nomeOrg)} — CNPJ: ${esc(docOrg)}
        </p>
        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" data-act="recusar" class="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Recusar</button>
          <button type="button" data-act="aprovar" class="btn-primario px-3 py-1.5 text-xs font-semibold">Aprovar e Ativar</button>
        </div>
      </li>
    `;
  }).join("");
}

export function inicializarInicio() {
  $("lista-pendentes").addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-act]");
    if (!botao) return;
    const id = botao.closest("li").dataset.id;
    const acao = botao.dataset.act;

    if (acao === "aprovar") {
      tentar(async () => {
        if (!confirm("Confirmar a aprovação desta solicitação e liberação de acesso?")) return;
        await api(`/usuarios/solicitacoes/${id}/aprovar`, { method: "PATCH" });
        avisar("Solicitação aprovada e responsável registrado com sucesso!");
        await carregarPendentes();
      });
    } else if (acao === "recusar") {
      const motivo = prompt("Informe o motivo da recusa desta solicitação:");
      if (!motivo || motivo.trim().length < 3) {
        avisar("É obrigatório informar uma justificativa com no mínimo 3 caracteres.", true);
        return;
      }
      tentar(async () => {
        await api(`/usuarios/solicitacoes/${id}/recusar`, {
          method: "PATCH",
          corpo: { motivo: motivo.trim() },
        });
        avisar("Solicitação recusada com registro de histórico.");
        await carregarPendentes();
      });
    }
  });
}
