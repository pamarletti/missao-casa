"use client";

import { useRef, useState } from "react";
import { editarTarefa, definirValorBase, marcarDesnecessaria } from "@/app/app/[profileId]/actions";
import { iconeTarefa } from "@/lib/iconeTarefa";
import { valorMensalPorCrianca } from "@/lib/valorBase";
import ListaAgrupada from "@/components/ListaAgrupada";
import { tipoDa } from "@/lib/dimensoes";
import SecaoExpansivel, { useSecoesExpansiveis } from "@/components/SecaoExpansivel";
import { BotaoAcao, BotaoDireto } from "@/components/Carregando";
import { reais, paraCampo } from "@/lib/moeda";
import JanelaAviso from "@/components/JanelaAviso";

type Tarefa = {
  id: string;
  name: string;
  categoria: "individual" | "individual_coletiva" | "coletiva";
  subcategoria: string | null;
  frequencia: string;
  ocorrencias_por_dia: number;
  pula_fim_de_semana: boolean;
  valor_unitario: number;
  icone: string | null;
  /** false = "desnecessária": some das listas dos meninos e das Pendências. */
  ativo: boolean;
  tipo: string | null;
  finalidade: string | null;
  comodo: string | null;
  /** Crianças que se revezam nesta tarefa. Nulo/vazio = todas. */
  profile_ids: string[] | null;
};

/** Traduz a tarefa para a opção de frequência que a tela mostra. */
function modoDe(t: Tarefa): string {
  if (t.frequencia === "diaria") return (t.ocorrencias_por_dia || 1) > 1 ? "diaria_varias" : "diaria";
  return t.frequencia;
}

/** Um <select> por classificação: uma opção só em cada, como pediu a
 * Paolla. As opções de Cômodo/Área vêm do próprio catálogo, então a lista
 * acompanha o que a família já usa. */
function CampoCategoria({
  nome,
  rotulo,
  valor,
  opcoes,
  onChange,
}: {
  nome: string;
  rotulo: string;
  valor: string;
  opcoes: { value: string; label: string }[];
  /** Quando passado, o campo vira controlado — usado pela Finalidade, que
   * precisa mostrar/esconder a lista de crianças na hora. */
  onChange?: (v: string) => void;
}) {
  return (
    <label className="text-xs text-slate-400">
      {rotulo}
      <select
        {...(nome ? { name: nome } : {})}
        {...(onChange ? { value: valor, onChange: (e) => onChange(e.target.value) } : { defaultValue: valor })}
        className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl px-2 py-1.5 text-sm text-slate-100"
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** O parágrafo que aparece nos avisos de ligar/desligar uma tarefa, quando
 * ela é obrigatória — em bônus não faz sentido, porque bônus não entra na
 * soma das obrigatórias. */
function EfeitoNoValorBase({ sai }: { sai: boolean }) {
  return (
    <p className="text-sm text-slate-300">
      Como ela é obrigatória, o valor dela {sai ? "sai da" : "volta para a"} soma das tarefas obrigatórias, então o
      valor base usado no cálculo vai {sai ? "baixar" : "subir"}. Para voltar ao valor base de antes, use
      &ldquo;Mudar valor base&rdquo; — mas atenção: isso recalcula automaticamente o valor de todas as tarefas
      obrigatórias.
    </p>
  );
}

function ItemEditavel({
  t,
  comodos,
  criancas,
}: {
  t: Tarefa;
  comodos: string[];
  criancas: { id: string; name: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [finalidade, setFinalidade] = useState(t.finalidade ?? "Para mim");
  // "diaria_varias" não é um valor do banco: é só a opção da tela que faz
  // aparecer o campo de quantas vezes. No banco continua frequencia
  // "diaria" + ocorrencias_por_dia.
  const [modoFrequencia, setModoFrequencia] = useState(modoDe(t));
  // Aviso do campo de valor: aparece na primeira vez que a pessoa encosta
  // nele, e só uma vez por edição — repetir a cada clique viraria estorvo.
  const [avisandoValor, setAvisandoValor] = useState(false);
  const [jaAvisou, setJaAvisou] = useState(false);
  // Pra devolver o cursor ao campo depois do "Entendi" — senão a pessoa
  // clica no valor, lê o aviso, fecha e descobre que precisa clicar de novo.
  const campoValorRef = useRef<HTMLInputElement>(null);
  // Trocar obrigatória <-> bônus mexe em muita coisa de uma vez (listas das
  // crianças, cobrança, valor base), então o campo avisa na hora da troca.
  const [tipo, setTipo] = useState(tipoDa(t));
  const virouBonus = tipo === "Facultativa" && tipoDa(t) === "Obrigatória";
  const [avisandoTipo, setAvisandoTipo] = useState(false);
  const [avisandoDesnecessaria, setAvisandoDesnecessaria] = useState(false);
  // Mexer no valor de uma tarefa de bônus não afeta o total das
  // obrigatórias, então ali o aviso seria falso.
  const ehObrigatoria = t.categoria === "individual" || t.categoria === "individual_coletiva";

  if (!editando) {
    return (
      <li className="card p-3 flex flex-col items-center text-center gap-1">
        <span className="text-2xl">{iconeTarefa(t)}</span>
        <p className="font-medium text-sm leading-tight">{t.name}</p>
        <p className="text-xs text-slate-400">R$ {reais(Number(t.valor_unitario))}</p>
        <button
          type="button"
          className="text-xs text-slate-500 underline mt-1"
          onClick={() => {
            setFinalidade(t.finalidade ?? "Para mim");
            setModoFrequencia(modoDe(t));
            setTipo(tipoDa(t));
            setJaAvisou(false);
            setEditando(true);
          }}
        >
          editar
        </button>
      </li>
    );
  }

  return (
    <li className="card p-3">
      <form
        action={async (formData) => {
          await editarTarefa(formData);
          setEditando(false);
        }}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="taskId" value={t.id} />
        <input name="name" defaultValue={t.name} className="text-sm" placeholder="Nome" required />
        <input
          ref={campoValorRef}
          name="valor_unitario"
          defaultValue={paraCampo(t.valor_unitario)}
          className="text-sm"
          placeholder="Valor"
          inputMode="decimal"
          required
          onFocus={() => {
            if (ehObrigatoria && !jaAvisou) {
              setJaAvisou(true);
              setAvisandoValor(true);
            }
          }}
        />

        {avisandoValor && (
          <JanelaAviso
            titulo="Isso muda o valor base"
            onFechar={() => {
              setAvisandoValor(false);
              campoValorRef.current?.focus();
            }}
          >
            <p className="text-sm text-slate-300">
              Mudar o valor desta tarefa muda a soma total das tarefas obrigatórias — o valor usado como base do
              cálculo, que é quanto cada criança pode ganhar por mês fazendo tudo.
            </p>
            <p className="text-sm text-slate-300">
              Se essa soma se afastar do valor base que você registrou, um aviso aparece no card do topo desta
              aba. Para voltar ao valor de antes, use &ldquo;Mudar valor base&rdquo; — mas atenção: isso recalcula
              automaticamente o valor de todas as tarefas obrigatórias, inclusive esta.
            </p>
          </JanelaAviso>
        )}
        <input
          name="icone"
          defaultValue={t.icone ?? ""}
          className="text-sm"
          placeholder="Ícone (emoji)"
          maxLength={4}
        />

        <div className="border-t border-slate-700/60 pt-2 space-y-2">
          <CampoCategoria
            nome="tipo"
            rotulo="Tipo"
            valor={tipo}
            onChange={(v) => {
              setTipo(v);
              // Só avisa na troca de verdade: voltar pro tipo original é
              // desfazer, não precisa de aviso nenhum.
              if (v !== tipoDa(t)) setAvisandoTipo(true);
            }}
            opcoes={[
              { value: "Obrigatória", label: "Obrigatória" },
              { value: "Facultativa", label: "Bônus" },
            ]}
          />

          {avisandoTipo && (
            <JanelaAviso
              titulo={virouBonus ? "De obrigatória para bônus" : "De bônus para obrigatória"}
              onFechar={() => setAvisandoTipo(false)}
            >
              {virouBonus ? (
                <>
                  <p className="text-sm text-slate-300">
                    A tarefa sai das listas de obrigatórias das crianças e passa a aparecer só em Bônus, onde é
                    feita por quem quiser — e cada vez precisa da sua autorização.
                  </p>
                  <p className="text-sm text-slate-300">
                    Ela também deixa de ser cobrada: não entra mais em atrasadas, não conta no &ldquo;valor em
                    risco&rdquo; e não pode virar desconto.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300">
                    A tarefa passa a aparecer nas listas de obrigatórias das crianças, com prazo — e deixa de
                    precisar da sua autorização a cada vez.
                  </p>
                  <p className="text-sm text-slate-300">
                    Ela também passa a ser cobrada: se o prazo terminar sem desfecho, entra em atrasadas e pode
                    virar desconto no saldo.
                  </p>
                </>
              )}
              <p className="text-sm text-slate-300">
                E o valor dela {virouBonus ? "sai da" : "entra na"} soma das tarefas obrigatórias, então o valor
                base usado no cálculo vai {virouBonus ? "baixar" : "subir"}. Para voltar ao valor base de antes,
                use &ldquo;Mudar valor base&rdquo; depois de salvar — mas atenção: isso recalcula automaticamente
                o valor de todas as tarefas obrigatórias.
              </p>
            </JanelaAviso>
          )}
          <CampoCategoria
            nome=""
            rotulo="Frequência"
            valor={modoFrequencia}
            onChange={setModoFrequencia}
            opcoes={[
              { value: "diaria", label: "Diária" },
              { value: "diaria_varias", label: "Diária, mais de uma vez por dia" },
              { value: "semanal", label: "Semanal" },
              { value: "mensal", label: "Mensal" },
            ]}
          />
          <input type="hidden" name="frequencia" value={modoFrequencia === "diaria_varias" ? "diaria" : modoFrequencia} />

          {modoFrequencia === "diaria_varias" ? (
            <CampoCategoria
              nome="ocorrencias_por_dia"
              rotulo="Quantas vezes por dia"
              valor={String(Math.max(2, t.ocorrencias_por_dia || 2))}
              opcoes={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}× por dia` }))}
            />
          ) : (
            <input type="hidden" name="ocorrencias_por_dia" value="1" />
          )}
          <CampoCategoria
            nome="finalidade"
            rotulo="Finalidade"
            valor={finalidade}
            onChange={setFinalidade}
            opcoes={[
              { value: "Para mim", label: "Para mim" },
              { value: "Compartilhadas", label: "Compartilhadas" },
              { value: "Para a família", label: "Para a família" },
            ]}
          />

          {finalidade === "Compartilhadas" && (
            <fieldset className="rounded-xl border border-slate-600 p-2">
              <legend className="text-xs text-slate-400 px-1">Quem se reveza nesta tarefa</legend>
              <div className="space-y-1">
                {criancas.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="profile_ids"
                      value={c.id}
                      defaultChecked={!t.profile_ids || t.profile_ids.length === 0 || t.profile_ids.includes(c.id)}
                      className="w-auto"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quem ficar de fora não vê a tarefa nem é cobrado por ela.
              </p>
            </fieldset>
          )}
          <CampoCategoria
            nome="comodo"
            rotulo="Cômodo/Área"
            valor={t.comodo ?? comodos[0] ?? ""}
            opcoes={comodos.map((x) => ({ value: x, label: x }))}
          />
        </div>

        <div className="flex gap-2">
          <BotaoAcao className="btn-primary text-xs flex-1" carregando="salvando…">
            Salvar
          </BotaoAcao>
          <button type="button" className="text-xs text-slate-500 underline" onClick={() => setEditando(false)}>
            cancelar
          </button>
        </div>
      </form>

      <div className="mt-2 border-t border-slate-700/60 pt-2">
        <button
          type="button"
          className="text-xs text-slate-400 underline"
          title="Tira a tarefa das listas, sem apagar o histórico. Dá pra voltar depois."
          onClick={() => setAvisandoDesnecessaria(true)}
        >
          tornar desnecessária
        </button>
      </div>

      {avisandoDesnecessaria && (
        <JanelaAviso
          titulo="Tornar desnecessária"
          onFechar={() => setAvisandoDesnecessaria(false)}
          acao={async () => {
            await marcarDesnecessaria(t.id, true);
            setAvisandoDesnecessaria(false);
          }}
        >
          <p className="text-sm text-slate-300">
            A tarefa sai das listas das crianças e da sua aba de Pendências. Nada é apagado: o que já foi feito
            com ela continua no histórico e no saldo, e dá pra voltar a usar quando quiser, no bloco
            &ldquo;Desnecessárias&rdquo; aqui embaixo.
          </p>
          {ehObrigatoria && <EfeitoNoValorBase sai />}
        </JanelaAviso>
      )}
    </li>
  );
}

/** Tarefa desligada: fica só aqui embaixo, fora das listas dos meninos, com
 * um botão pra voltar a valer. Nada é apagado — o que já foi feito com ela
 * continua no histórico e no saldo. */
function ItemDesnecessario({ t }: { t: Tarefa }) {
  const [avisando, setAvisando] = useState(false);
  const ehObrigatoria = t.categoria === "individual" || t.categoria === "individual_coletiva";

  return (
    <li className="card p-3 flex flex-col items-center text-center gap-1 opacity-60">
      <span className="text-2xl grayscale">{iconeTarefa(t)}</span>
      <p className="font-medium text-sm leading-tight">{t.name}</p>
      <p className="text-xs text-slate-400">R$ {reais(Number(t.valor_unitario))}</p>
      <button
        type="button"
        className="text-xs text-casa-accent underline mt-1"
        title="Voltar a usar esta tarefa"
        onClick={() => setAvisando(true)}
      >
        voltar a usar
      </button>

      {avisando && (
        <JanelaAviso
          titulo="Voltar a usar"
          onFechar={() => setAvisando(false)}
          acao={async () => {
            await marcarDesnecessaria(t.id, false);
            setAvisando(false);
          }}
        >
          <p className="text-sm text-slate-300">
            A tarefa volta para as listas das crianças e para a sua aba de Pendências, valendo de novo a partir
            de agora.
          </p>
          {ehObrigatoria && <EfeitoNoValorBase sai={false} />}
        </JanelaAviso>
      )}
    </li>
  );
}

/** Card no topo do catálogo editável: mostra quanto as tarefas obrigatórias
 * (individuais + do quarto) somam por mês hoje, e deixa o responsável
 * definir um novo valor base — os valores de cada tarefa são recalculados
 * proporcionalmente para que a soma bata com o novo total. Editar uma
 * tarefa individualmente (abaixo) também atualiza esse total sozinho. */
function ValorBaseCard({
  familyId,
  catalog,
  valorBaseAtual,
  numCriancas,
}: {
  familyId: string;
  catalog: Tarefa[];
  valorBaseAtual: number;
  numCriancas: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [explicando, setExplicando] = useState(false);
  const obrigatorias = catalog.filter((t) => t.categoria === "individual" || t.categoria === "individual_coletiva");

  // Teto de UMA criança, e não a soma bruta de todas as tarefas: nas
  // compartilhadas os meninos se revezam, então cada um pega só a fração
  // que cabe a ele. É exatamente a conta que definirValorBase persegue —
  // e é o mesmo número que aparece pro menino como "dá pra chegar a" no
  // painel dele. Enquanto essa tela usava a soma bruta, o card mostrava
  // sempre alguns reais a mais do que o alvo pedido e acusava uma
  // divergência que não existia.
  const totalAtual = valorMensalPorCrianca(obrigatorias, numCriancas);
  const registrado = Number(valorBaseAtual);
  const distancia = totalAtual - registrado;
  // Alguns centavos são o arredondamento de sempre (ver o texto do "i").
  // Acima disso, alguém mexeu no valor de uma tarefa, ou ligou/desligou uma
  // obrigatória — e aí não é arredondamento, é a família fora do alvo.
  const saiuDoAlvo = Math.abs(distancia) > 0.1;
  const diferente = Math.abs(distancia) > 0.005;

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-slate-400 text-sm">Valor aproximado para cálculo das tarefas obrigatórias:</p>
          <p className="text-2xl font-bold text-casa-accent flex items-center gap-2">
            R$ {reais(totalAtual)}
            <button
              type="button"
              onClick={() => setExplicando((v) => !v)}
              aria-expanded={explicando}
              aria-label="Por que esse valor é aproximado?"
              title="Por que esse valor é aproximado?"
              className="h-5 w-5 shrink-0 rounded-full border border-slate-500 text-xs font-serif italic text-slate-400 hover:border-slate-300 hover:text-slate-200 transition"
            >
              i
            </button>
          </p>
          {saiuDoAlvo ? (
            <p className="text-xs text-amber-400 mt-1">
              Você saiu do seu alvo de R$ {reais(registrado)} — está R$ {reais(Math.abs(distancia))}{" "}
              {distancia > 0 ? "acima" : "abaixo"}, porque você alterou diretamente o valor de alguma(s)
              tarefa(s). Se quiser voltar ao valor base original, mude manualmente. Aviso: se fizer isso, o valor
              das tarefas será automaticamente recalculado.
            </p>
          ) : (
            diferente && (
              <p className="text-xs text-slate-500 mt-1">
                (valor base registrado: R$ {reais(registrado)})
              </p>
            )
          )}
        </div>
        <button type="button" className="btn-secondary text-sm shrink-0" onClick={() => setAberto((v) => !v)}>
          {aberto ? "cancelar" : "Mudar valor base"}
        </button>
      </div>

      {explicando && (
        <div className="mt-3 border-t border-slate-700 pt-3 text-xs text-slate-400 space-y-2">
          <p>
            O valor registrado é exatamente o que você pediu. O valor grande, acima, é o que as tarefas
            obrigatórias realmente somam por mês — e quase sempre os dois ficam a alguns centavos de distância.
          </p>
          <p>
            Isso acontece porque cada tarefa precisa ter um preço redondo em centavos, para que fique mais fácil
            que a criança entenda melhor o valor. Ao dividir o total entre as tarefas, cada uma é arredondada para
            o centavo mais próximo. A soma desses valores arredondados raramente cai no número exato pedido.
          </p>
          <p>
            A diferença é sempre de centavos, e nunca some do bolso de ninguém — o que os meninos recebem é a
            soma real, o valor grande.
          </p>
          <p>
            O valor registrado só muda quando você define um novo, aqui em &ldquo;Mudar valor base&rdquo;. Se
            você editar o preço de uma tarefa, ou tornar uma obrigatória desnecessária, a soma real se afasta do
            alvo e aparece um aviso — assim dá pra perceber na hora que a família saiu do combinado, em vez de o
            alvo escorregar junto sem ninguém notar.
          </p>
        </div>
      )}

      {aberto && (
        <form
          action={async (formData) => {
            await definirValorBase(formData);
            setAberto(false);
          }}
          className="mt-3 space-y-2 border-t border-slate-700 pt-3"
        >
          <input type="hidden" name="familyId" value={familyId} />
          <p className="text-xs text-slate-400">
            Ao mudar esse valor, cada tarefa obrigatória é recalculada proporcionalmente para que a soma de todas
            passe a bater com o novo total.
          </p>
          <input
            name="valorBase"
            defaultValue={paraCampo(totalAtual)}
            inputMode="decimal"
            placeholder="Novo valor base (R$)"
            required
          />
          <BotaoAcao className="btn-primary text-sm w-full" carregando="recalculando…">
            Recalcular tarefas obrigatórias
          </BotaoAcao>
        </form>
      )}
    </div>
  );
}

/** Catálogo editável — todas as tarefas por tipo, com nome, ícone e valor
 * ajustáveis a qualquer momento. A mudança vale a partir da edição: não
 * altera valores de tarefas já registradas antes dela. */
export default function CatalogoEditavelTab({
  catalog,
  criancas,
  familyId,
  valorBaseAtual,
}: {
  catalog: Tarefa[];
  criancas: { id: string; name: string }[];
  familyId: string;
  valorBaseAtual: number;
}) {
  // As desligadas ficam num bloco próprio no fim da página; a busca e o
  // filtro por categoria valem para os dois grupos.
  const ativas = catalog.filter((t) => t.ativo);
  const desnecessarias = catalog.filter((t) => !t.ativo);

  // Opções de Cômodo/Área saem do próprio catálogo, então a lista acompanha
  // o que a família já usa, sem precisar cadastrar nada à parte.
  const comodos = Array.from(new Set(catalog.map((t) => t.comodo).filter((x): x is string => !!x))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const { abertas, alternar } = useSecoesExpansiveis();

  return (
    <div>
      <ValorBaseCard
        familyId={familyId}
        catalog={ativas}
        valorBaseAtual={valorBaseAtual}
        numCriancas={criancas.length > 0 ? criancas.length : 1}
      />

      <ListaAgrupada
        tarefas={ativas}
        chaveAba="catalogo-editavel"
        renderItem={(t) => (
          <ItemEditavel
            key={t.id}
            t={t}
            comodos={comodos}
            criancas={criancas}
          />
        )}
      />

      <SecaoExpansivel
        titulo="Desnecessárias"
        contagem={desnecessarias.length}
        aberta={abertas.has("Desnecessárias")}
        onAlternar={() => alternar("Desnecessárias")}
      >
        <p className="text-sm text-slate-400 mb-3">
          Tarefas desligadas por enquanto: não aparecem para os meninos nem na fila de Pendências, e não contam no
          valor base do mês. Nada foi apagado — o que já foi feito continua no histórico, e é só clicar em &ldquo;voltar
          a usar&rdquo; para ligar de novo.
        </p>
        {desnecessarias.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma por enquanto. Para desligar uma tarefa, clique em &ldquo;editar&rdquo; nela e depois em &ldquo;tornar
            desnecessária&rdquo;.
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {desnecessarias.map((t) => (
              <ItemDesnecessario key={t.id} t={t} />
            ))}
          </ul>
        )}
      </SecaoExpansivel>

    </div>
  );
}
