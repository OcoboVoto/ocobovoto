export function serializeAsamblea(asamblea: any) {
    return {
      ...asamblea,
      quorumRequerido: Number(asamblea.quorumRequerido),
      quorumInicial: Number(asamblea.quorumInicial),
      quorumFinal: asamblea.quorumFinal ? Number(asamblea.quorumFinal) : null,
      conjunto: asamblea.conjunto ? {
        ...asamblea.conjunto,
        coeficienteTotal: Number(asamblea.conjunto.coeficienteTotal)
      } : undefined
    }
  }