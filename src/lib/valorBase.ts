/** Helpers para calcular o valor mensal (e semanal) das tarefas
 * obrigatórias (individuais + individual-coletivas), usados tanto para
 * projetar o potencial de ganho das crianças quanto para o "valor base"
 * que o responsável pode ajustar no Catálogo editável.
 *
 * `pula_fim_de_semana` marca tarefas diárias que não valem na sexta e no
 * sábado (ex.: "cuidar da roupa da escola" e "arrumar a mochila" — não tem
 * aula nesses dois dias, então não tem o que fazer nem o que descontar).
 * Isso faz elas ocorrerem 5x/semana (20x/mês) em vez de 7x/semana (30x/mês). */

export type TarefaValorBase = {
  valor_unitario: number | string;
  frequencia: string;
  ocorrencias_por_dia?: number | null;
  pula_fim_de_semana?: boolean | null;
};

export function ocorrenciasPorMes(t: TarefaValorBase): number {
  if (t.frequencia === "diaria") return (t.ocorrencias_por_dia || 1) * (t.pula_fim_de_semana ? 20 : 30);
  if (t.frequencia === "semanal") return 4;
  if (t.frequencia === "mensal") return 1;
  return 0;
}

export function ocorrenciasPorSemana(t: TarefaValorBase): number {
  if (t.frequencia === "diaria") return (t.ocorrencias_por_dia || 1) * (t.pula_fim_de_semana ? 5 : 7);
  if (t.frequencia === "semanal") return 1;
  return 0; // mensal não entra na projeção semanal
}

export function valorMensalTotal(tarefas: TarefaValorBase[]): number {
  return tarefas.reduce((acc, t) => acc + Number(t.valor_unitario) * ocorrenciasPorMes(t), 0);
}

export function valorSemanalTotal(tarefas: TarefaValorBase[]): number {
  return tarefas.reduce((acc, t) => acc + Number(t.valor_unitario) * ocorrenciasPorSemana(t), 0);
}

/** Escala o valor de um conjunto de tarefas para que a soma mensal bata
 * EXATAMENTE com um alvo, mantendo todos os valores unitários em centavos
 * redondos.
 *
 * Por que isso não é só "multiplicar cada valor pelo fator e arredondar":
 * o valor unitário arredondado não vale uma vez por mês, vale
 * `ocorrenciasPorMes` vezes. Meio centavo de arredondamento numa tarefa que
 * acontece 90x/mês (3x/dia) vira 45 centavos no total do mês; somando o
 * desvio de ~22 tarefas obrigatórias, pedir R$90,00 fechava em R$89,50.
 *
 * A correção é distribuir o resíduo depois de arredondar: enquanto sobrar
 * (ou faltar) dinheiro para o alvo, ajusta 1 centavo por vez no valor
 * unitário, começando pelas tarefas de maior frequência (que "andam" mais
 * rápido em direção ao alvo). No fim, se ainda faltar menos que a menor
 * frequência do catálogo, procura um par de tarefas cuja combinação fecha a
 * diferença (ex.: +1 centavo numa tarefa de 30x/mês e -7 centavos numa de
 * 4x/mês dá exatamente +2 centavos no mês).
 *
 * Só é impossível fechar exato quando o alvo tem paridade incompatível com
 * as frequências do catálogo (todas as ocorrências são pares, então um alvo
 * de centavo ímpar como R$89,99 não existe em valores de centavo redondo);
 * nesse caso sobra no máximo 1 centavo, e quem chama deve gravar o total
 * realmente alcançado — nunca o pedido — para os dois números nunca
 * divergirem na tela. */
export function escalarParaTotalMensal<T extends TarefaValorBase>(
  tarefas: T[],
  alvoReais: number,
): { tarefa: T; valorUnitario: number }[] {
  const itens = tarefas
    .map((t) => ({ tarefa: t, occ: ocorrenciasPorMes(t), cent: 0, resto: 0 }))
    .filter((i) => i.occ > 0);

  const totalAtual = valorMensalTotal(itens.map((i) => i.tarefa));
  if (itens.length === 0 || totalAtual <= 0) return [];

  const fator = alvoReais / totalAtual;
  for (const i of itens) {
    const exato = Number(i.tarefa.valor_unitario) * fator * 100;
    i.cent = Math.max(1, Math.round(exato));
    i.resto = exato - i.cent; // quanto o arredondamento tirou (+) ou deu (-)
  }

  const alvoCent = Math.round(alvoReais * 100);
  let diff = alvoCent - itens.reduce((acc, i) => acc + i.cent * i.occ, 0);

  // 1) Distribuição do resíduo em passadas, no máximo 1 centavo por tarefa
  // por passada, começando pelas que mais perderam no arredondamento. Fazer
  // por passadas (em vez de esgotar tudo na tarefa mais frequente) mantém as
  // proporções entre as tarefas próximas das originais.
  for (let passada = 0; diff !== 0 && passada < 200; passada++) {
    const antes = diff;
    const ordem = [...itens].sort((a, b) => (diff > 0 ? b.resto - a.resto : a.resto - b.resto));
    for (const i of ordem) {
      if (diff >= i.occ) {
        i.cent += 1;
        i.resto -= 1;
        diff -= i.occ;
      } else if (diff <= -i.occ && i.cent > 1) {
        i.cent -= 1;
        i.resto += 1;
        diff += i.occ;
      }
    }
    if (diff === antes) break;
  }

  // 2) Resto menor que a menor frequência: procura um par de tarefas cuja
  // combinação (+1 centavo numa, -k centavos na outra) fecha a diferença.
  const fecharComPar = (alvoDiff: number): boolean => {
    for (const a of itens) {
      for (const b of itens) {
        if (a === b) continue;
        for (let k = 1; k <= 100; k++) {
          if (a.occ - k * b.occ === alvoDiff && b.cent - k >= 1) {
            a.cent += 1;
            b.cent -= k;
            return true;
          }
          if (k * b.occ - a.occ === alvoDiff && a.cent >= 2) {
            a.cent -= 1;
            b.cent += k;
            return true;
          }
        }
      }
    }
    return false;
  };

  if (diff !== 0) {
    // Tenta zerar; se o alvo for inalcançável por paridade (todas as
    // frequências são pares, então um alvo de centavo ímpar não existe em
    // valores redondos), aceita chegar a 1 centavo de distância.
    for (const tentativa of [diff, diff - 1, diff + 1]) {
      if (tentativa === 0 || Math.abs(diff - tentativa) >= Math.abs(diff)) continue;
      if (fecharComPar(tentativa)) {
        diff -= tentativa;
        break;
      }
    }
  }

  return itens.map((i) => ({ tarefa: i.tarefa, valorUnitario: i.cent / 100 }));
}

/** Entre quantas crianças a tarefa se reveza. 1 = ninguém alterna (é de
 * cada um, ou é bônus de quem quiser). Só as de finalidade
 * "Compartilhadas" entram no rodízio — ver ehAVezDaCrianca em
 * src/lib/dimensoes.ts. */
export function divisorDoRodizio(
  t: { finalidade?: string | null; profile_ids?: string[] | null },
  numCriancas: number
): number {
  if (t.finalidade !== "Compartilhadas") return 1;
  const participantes = t.profile_ids?.length ? t.profile_ids.length : numCriancas;
  return Math.max(1, participantes);
}

/** Quanto UMA criança consegue tirar por mês do conjunto de tarefas.
 *
 * Diferente de valorMensalTotal, que soma como se tudo valesse pra todo
 * mundo: numa tarefa compartilhada que alterna entre dois meninos, cada um
 * só pega metade das vezes, então ela entra pela metade. É esse o número
 * que precisa fechar no valor base — é o teto real de cada um. */
export function valorMensalPorCrianca(
  tarefas: (TarefaValorBase & { finalidade?: string | null; profile_ids?: string[] | null })[],
  numCriancas: number
): number {
  return tarefas.reduce(
    (acc, t) => acc + (Number(t.valor_unitario) * ocorrenciasPorMes(t)) / divisorDoRodizio(t, numCriancas),
    0
  );
}
