export const PAPEIS = ["ADMIN", "RESPONSAVEL_UOSCC", "RESPONSAVEL_OSC"];
export const podeGerenciarUsuarios = usuario => usuario?.papel === "ADMIN";
export const podeEditarOsc = (usuario, id) => usuario?.papel === "RESPONSAVEL_UOSCC" || (usuario?.papel === "RESPONSAVEL_OSC" && usuario.organizacaoId != null && usuario.organizacaoId === id);
export const podeConsultarProjeto = (usuario, projeto) => ["ADMIN", "RESPONSAVEL_UOSCC"].includes(usuario?.papel) || (usuario?.papel === "RESPONSAVEL_OSC" && usuario.organizacaoId != null && (projeto.tipo === "GERAL" || projeto.organizacaoId === usuario.organizacaoId));
export const podeEditarProjeto = (usuario, projeto) => projeto.tipo === "GERAL"
  ? usuario?.papel === "RESPONSAVEL_UOSCC"
  : usuario?.papel === "RESPONSAVEL_OSC" && usuario.organizacaoId != null && usuario.organizacaoId === projeto.organizacaoId;
export const podeExcluirProjeto = (usuario, projeto) => usuario?.papel === "RESPONSAVEL_UOSCC" && projeto.tipo === "GERAL";
