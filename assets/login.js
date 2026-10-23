const form = document.querySelector("form");
const botao = document.getElementById("login");
const URL_PAINEL = "/inicio/index.html";

function mostrarErro(mensagem) {
  let aviso = document.getElementById("erro-form");
  if (!aviso) {
    aviso = document.createElement("p");
    aviso.id = "erro-form";
    aviso.setAttribute("role", "alert");
    aviso.style.cssText = "color:#b42318;background:#fef3f2;border:1px solid #fecdca;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px";
    form.prepend(aviso);
  }
  aviso.textContent = mensagem;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("erro-form")?.remove();
  botao.disabled = true;
  botao.textContent = "Entrando...";
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email.value, senha: form.senha.value }),
    });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(dados.erro || "Não foi possível entrar.");

    for (const s of [localStorage, sessionStorage]) { s.removeItem("uoscc_token"); s.removeItem("uoscc_usuario"); }
    const destino = form.lembrar.checked ? localStorage : sessionStorage;
    destino.setItem("uoscc_token", dados.token);
    destino.setItem("uoscc_usuario", JSON.stringify(dados.usuario));
    location.replace(URL_PAINEL);
  } catch (erro) {
    mostrarErro(erro.message);
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});
