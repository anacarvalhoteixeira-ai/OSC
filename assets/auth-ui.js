document.querySelectorAll('input[type="password"]').forEach((input) => {
  const wrapper = document.createElement("div");
  wrapper.className = "campo-senha";
  input.before(wrapper);
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Mostrar";
  button.setAttribute("aria-label", `Mostrar senha: ${input.labels[0]?.textContent || "senha"}`);
  button.setAttribute("aria-controls", input.id);
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Ocultar" : "Mostrar";
    button.setAttribute("aria-label", `${visible ? "Ocultar" : "Mostrar"} senha: ${input.labels[0]?.textContent || "senha"}`);
    button.setAttribute("aria-pressed", String(visible));
  });
  wrapper.append(input, button);
});
