export const podeConsultarDemanda = (usuario, demanda) =>
  ["ADMIN", "RESPONSAVEL_UOSCC"].includes(usuario?.papel) ||
  (usuario?.papel === "RESPONSAVEL_OSC" && usuario.organizacaoId != null && usuario.organizacaoId === demanda.organizacaoId);

export const podeEditarDemanda = (usuario, demanda) =>
  usuario?.papel === "RESPONSAVEL_OSC" && usuario.organizacaoId != null &&
  usuario.organizacaoId === demanda.organizacaoId && demanda.status === "ABERTA";

export const podeAtenderDemanda = usuario => usuario?.papel === "RESPONSAVEL_UOSCC";
