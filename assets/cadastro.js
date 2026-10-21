const form = document.querySelector("form");
const botao = form.querySelector("button[type='submit']");
const textoBotao = botao.innerHTML;

function mostrar(mensagem, sucesso = false) {
  let aviso = document.getElementById("aviso-form");
  if (!aviso) {
    aviso = document.createElement("p");
    aviso.id = "aviso-form";
    aviso.setAttribute("role", "alert");
    form.prepend(aviso);
  }
  aviso.style.cssText = sucesso
    ? "color:#05603a;background:#ecfdf3;border:1px solid #abefc6;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px"
    : "color:#b42318;background:#fef3f2;border:1px solid #fecdca;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px";
  aviso.textContent = mensagem;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("aviso-form")?.remove();
  if (form.senha.value !== form.confirmar_senha.value) return mostrar("As senhas não conferem.");

  botao.disabled = true;
  botao.textContent = "Enviando...";
  try {
    const res = await fetch("/api/auth/solicitar-acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome.value,
        email: form.email.value,
        organizacao: form.organizacao.value,
        senha: form.senha.value,
        confirmar_senha: form.confirmar_senha.value,
      }),
    });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detalhes = (dados.detalhes ?? []).map((i) => i.message).join(" ");
      throw new Error([dados.erro, detalhes].filter(Boolean).join(" ") || "Não foi possível enviar a solicitação.");
    }
    form.reset();
    mostrar(dados.mensagem || "Solicitação recebida.", true);
  } catch (erro) {
    mostrar(erro.message);
  } finally {
    botao.disabled = false;
    botao.innerHTML = textoBotao;
  }
});
