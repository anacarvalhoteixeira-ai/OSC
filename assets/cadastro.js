const form = document.getElementById("form-cadastro");
const botao = document.getElementById("btn-enviar");

const textoOriginalBotao = botao?.innerHTML ?? "Enviar solicitação";

const btnA = document.getElementById("btn-cenario-a");
const btnB = document.getElementById("btn-cenario-b");
const blocoA = document.getElementById("bloco-cenario-a");
const blocoB = document.getElementById("bloco-cenario-b");
const campoTipo = document.getElementById("tipo");
const campoOrgId = document.getElementById("organizacaoId");

const buscaOscInput = document.getElementById("busca-osc");
const listaResultados = document.getElementById("lista-resultados-osc");
const boxSelecionada = document.getElementById("osc-selecionada-box");
const nomeSelecionada = document.getElementById("osc-selecionada-nome");
const detalheSelecionada = document.getElementById("osc-selecionada-detalhe");

// Verifica se os elementos essenciais existem no HTML.
if (!form || !botao || !campoTipo) {
  console.error(
    "Cadastro: não foi possível encontrar os elementos essenciais do formulário."
  );
} else {
  // Alternar para o cenário A: vínculo com uma OSC existente.
  btnA?.addEventListener("click", () => {
    btnA.classList.add("ativo");
    btnA.setAttribute("aria-pressed", "true");
    btnB?.setAttribute("aria-pressed", "false");
    document.getElementById("nomeOsc").required = false;
    btnB?.classList.remove("ativo");

    if (blocoA) blocoA.style.display = "block";
    if (blocoB) blocoB.style.display = "none";

    campoTipo.value = "VINCULO_OSC";
  });

  // Alternar para o cenário B: cadastrar uma nova OSC.
  btnB?.addEventListener("click", () => {
    btnB.classList.add("ativo");
    btnB.setAttribute("aria-pressed", "true");
    btnA?.setAttribute("aria-pressed", "false");
    document.getElementById("nomeOsc").required = true;
    btnA?.classList.remove("ativo");

    if (blocoB) blocoB.style.display = "block";
    if (blocoA) blocoA.style.display = "none";

    campoTipo.value = "NOVA_OSC";

    if (campoOrgId) campoOrgId.value = "";
    if (boxSelecionada) boxSelecionada.style.display = "none";

    if (listaResultados) listaResultados.innerHTML = "";
  });

  // Exibe mensagens de sucesso ou erro.
  function mostrarAviso(mensagem, sucesso = false) {
    let aviso = document.getElementById("aviso-form");

    if (!aviso) {
      aviso = document.createElement("p");
      aviso.id = "aviso-form";
      aviso.setAttribute("role", "alert");
      aviso.setAttribute("aria-live", "polite");
      form.prepend(aviso);
    }

    aviso.style.cssText = sucesso
      ? "color:#05603a;background:#ecfdf3;border:1px solid #abefc6;border-radius:8px;padding:12px;font-size:13px;margin-bottom:16px;line-height:1.4;"
      : "color:#b42318;background:#fef3f2;border:1px solid #fecdca;border-radius:8px;padding:12px;font-size:13px;margin-bottom:16px;line-height:1.4;";

    aviso.textContent = mensagem || "Não foi possível concluir a solicitação.";
    aviso.tabIndex = -1;
    aviso.focus();
  }

  // Converte a resposta da API para JSON com tratamento de erro.
  async function lerResposta(resposta) {
    const texto = await resposta.text();

    if (!texto) return {};

    try {
      return JSON.parse(texto);
    } catch {
      return { erro: texto };
    }
  }

  // Busca OSCs cadastradas com um pequeno atraso.
  let debounceTimer;
  let pesquisaAtual = 0;

  buscaOscInput?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const pesquisa = ++pesquisaAtual;

    const termo = buscaOscInput.value.trim();

    if (termo.length < 2) {
      if (listaResultados) listaResultados.innerHTML = "";
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const resposta = await fetch(
          `/api/auth/pesquisa-osc?busca=${encodeURIComponent(termo)}`
        );

        const dados = await lerResposta(resposta);
        if (pesquisa !== pesquisaAtual || campoTipo.value !== "VINCULO_OSC") return;

        if (!resposta.ok) {
          throw new Error(
            dados.erro ||
              dados.mensagem ||
              `Erro ao buscar OSCs (${resposta.status}).`
          );
        }

        const organizacoes = Array.isArray(dados.organizacoes)
          ? dados.organizacoes
          : [];

        if (!listaResultados) return;

        listaResultados.innerHTML = "";

        if (organizacoes.length === 0) {
          listaResultados.textContent =
            'Nenhuma organização encontrada. Considere usar a opção "Nova OSC".';
          return;
        }

        organizacoes.forEach((organizacao) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "resultado-item";

          // Usa textContent para evitar inserir dados da API como HTML.
          const nome = document.createElement("strong");
          nome.textContent = organizacao.nome || "OSC sem nome";

          const cnpj = document.createElement("span");
          cnpj.className = "badge-tipo";
          cnpj.textContent = organizacao.cnpj || "Sem CNPJ";

          const quebra = document.createElement("br");

          const detalhe = document.createElement("small");
          detalhe.style.color = "#68758a";
          detalhe.textContent =
            `Bairro: ${organizacao.bairro || "Não informado"} | ` +
            `Resp.: ${organizacao.responsavel || "—"}`;

          item.append(nome, document.createTextNode(" "), cnpj, quebra, detalhe);

          item.addEventListener("click", () => {
            if (campoOrgId) {
              campoOrgId.value = organizacao.id;
            }

            if (nomeSelecionada) {
              nomeSelecionada.textContent = organizacao.nome || "";
            }

            if (detalheSelecionada) {
              detalheSelecionada.textContent =
                `CNPJ: ${organizacao.cnpj || "Não cadastrado"} — ` +
                `${organizacao.endereco || ""}`;
            }

            if (boxSelecionada) {
              boxSelecionada.style.display = "block";
            }

            listaResultados.innerHTML = "";
            buscaOscInput.value = "";
          });

          listaResultados.appendChild(item);
        });
      } catch (erro) {
        if (pesquisa !== pesquisaAtual || campoTipo.value !== "VINCULO_OSC") return;
        console.error("Erro ao pesquisar OSC:", erro);

        if (listaResultados) {
          listaResultados.textContent =
            erro.message || "Erro ao buscar organizações.";
        }
      }
    }, 300);
  });

  // Envia a solicitação de cadastro.
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    document.getElementById("aviso-form")?.remove();

    const senha = form.elements.namedItem("senha");
    const confirmarSenha = form.elements.namedItem("confirmar_senha");

    if (!senha || !confirmarSenha) {
      mostrarAviso("Não foi possível localizar os campos de senha do formulário.");
      return;
    }

    if (senha.value !== confirmarSenha.value) {
      mostrarAviso("As senhas informadas não conferem.");
      confirmarSenha.focus();
      return;
    }

    if (
      campoTipo.value === "VINCULO_OSC" &&
      (!campoOrgId || !campoOrgId.value)
    ) {
      mostrarAviso(
        "Busque e selecione a organização com a qual deseja solicitar vínculo."
      );
      return;
    }

    const valor = (nome) => {
      const campo = form.elements.namedItem(nome);
      return campo && typeof campo.value === "string"
        ? campo.value.trim()
        : "";
    };

    // Mantém os nomes dos campos utilizados no código original.
    const corpo = {
      tipo: campoTipo.value,
      nome: valor("nome"),
      email: valor("email"),
      telefone: valor("telefone"),
      senha: senha.value,
      confirmar_senha: confirmarSenha.value,
      organizacaoId:
        campoOrgId?.value ? Number(campoOrgId.value) : null,
      nomeOsc: valor("nomeOsc") || null,
      cnpj: valor("cnpj") || null,
      categoria: valor("categoria") || null,
      endereco: valor("endereco") || null,
    };

    if (
      campoTipo.value === "VINCULO_OSC" &&
      !Number.isInteger(corpo.organizacaoId)
    ) {
      mostrarAviso("Selecione uma organização válida.");
      return;
    }

    botao.disabled = true;
    botao.textContent = "Processando solicitação...";

    try {
      const resposta = await fetch("/api/auth/solicitar-acesso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(corpo),
      });

      const dados = await lerResposta(resposta);

      if (!resposta.ok) {
        console.error("Erro ao solicitar acesso:", {
          status: resposta.status,
          resposta: dados,
        });

        const detalhes = Array.isArray(dados.detalhes)
          ? dados.detalhes
              .map((item) => item.message)
              .filter(Boolean)
              .join(" ")
          : "";

        const mensagem =
          dados.erro ||
          dados.mensagem ||
          detalhes ||
          `Não foi possível concluir a solicitação (HTTP ${resposta.status}).`;

        throw new Error(
          detalhes && !mensagem.includes(detalhes)
            ? `${mensagem} ${detalhes}`
            : mensagem
        );
      }

      form.reset();

      if (campoOrgId) campoOrgId.value = "";
      if (boxSelecionada) boxSelecionada.style.display = "none";
      if (listaResultados) listaResultados.innerHTML = "";

      // Restaura o cenário inicial.
      campoTipo.value = "VINCULO_OSC";
      btnA?.click();

      if (blocoA) blocoA.style.display = "block";
      if (blocoB) blocoB.style.display = "none";

      mostrarAviso(
        dados.mensagem || "Solicitação enviada com sucesso!",
        true
      );
    } catch (erro) {
      console.error("Falha no envio da solicitação:", erro);

      mostrarAviso(
        erro.message || "Não foi possível concluir a solicitação."
      );
    } finally {
      botao.disabled = false;
      botao.innerHTML = textoOriginalBotao;
    }
  });
}