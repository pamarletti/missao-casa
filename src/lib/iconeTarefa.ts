// Ícone (em vez de foto de verdade — mais leve e não depende de upload de
// imagem) que representa cada tarefa. Se a família cadastrou um ícone
// próprio na aba "Catálogo editável", ele tem prioridade; senão, escolhemos
// por palavras-chave no nome.
//
// A ORDEM IMPORTA: a primeira palavra que aparecer no nome vence. Por isso
// a lista vai do mais específico para o mais amplo — frases inteiras
// primeiro, depois objetos, e só no fim os cômodos. Sem isso, "varrer o
// chão do quarto" pegaria o ícone de "quarto" (🛏️) em vez do de varrer.
const ICONES_POR_PALAVRA: [string, string][] = [
  // ── Frases inteiras: têm de vir antes de tudo
  ["varrer", "🧹"],
  ["passar pano no chão", "🧹"],
  ["lixeira", "🗑️"],
  ["papel higiênico", "🧻"],
  ["guarda-roupa", "🗄️"],
  // ...mas estas quatro dizem MAIS que "armário", então vêm antes dele
  ["guardar as compras", "🛒"],
  ["ferramenta", "🧰"],
  ["remédio", "💊"],
  ["rack", "📺"],
  ["armário", "🗄️"],
  ["estante", "📚"],
  ["caixa de areia", "🐈"],
  ["passear com o cachorro", "🐕"],
  ["alimentar", "🥣"],
  ["trocar a água", "💧"],
  ["escovar o pet", "🪥"],

  // ── Refeições
  ["café da manhã", "☕"],
  ["almoço", "🍲"],
  ["jantar", "🍛"],
  ["lanche", "🥪"],
  ["pôr a mesa", "🍽️"],
  ["tirar a mesa", "🧺"],
  ["cardápio", "📝"],
  ["validade dos alimentos", "📅"],
  ["lista de compras", "🛒"],
  ["compras", "🛒"],
  ["mercado", "🛒"],
  ["feira", "🛒"],
  ["despensa", "🥫"],

  // ── Cozinha
  ["lavar a louça", "🧼"],
  ["enxugar a louça", "🌬️"],
  ["guardar a louça", "🍽️"],
  ["louça", "🍽️"],
  ["panela", "🍳"],
  ["utensílio", "🍴"],
  ["fogão", "🔥"],
  ["micro-ondas", "🍿"],
  ["geladeira", "🧊"],
  ["bancada", "🧽"],
  ["panos de prato", "🧼"],
  ["panos de chão", "🪣"],
  ["prato", "🍽️"],

  // ── Banheiro
  ["vaso sanitário", "🚽"],
  ["box", "🚿"],
  ["chuveiro", "🚿"],
  ["sabonete", "🧴"],
  ["shampoo", "🧴"],
  ["pia", "🚰"],
  ["banheiro", "🚽"],

  // ── Roupas e cama
  ["roupa de cama", "🛏️"],
  ["roupa da escola", "🎽"],
  ["roupa suja", "🧺"],
  ["roupas para lavar", "🧺"],
  ["lavar roupas", "🫧"],
  ["secar roupas", "☀️"],
  ["dobrar roupas", "👕"],
  ["toalha", "🛁"],
  ["doação", "🎁"],
  ["roupa", "👕"],
  ["cama", "🛏️"],

  // ── Quarto e objetos pessoais
  ["mochila", "🎒"],
  ["sapato", "👟"],
  ["tênis", "👟"],
  ["skate", "🛹"],
  ["brinquedo", "🧸"],
  ["rack", "📺"],
  ["objetos pessoais", "🎽"],

  // ── Sala e casa
  ["sofá", "🛋️"],
  ["almofada", "🛋️"],
  ["pó dos móveis", "🪶"],
  ["espelho", "🪞"],
  ["janela", "🪟"],
  ["interruptor", "💡"],
  ["maçaneta", "🚪"],
  ["mesa", "🪑"],

  // ── Lixo
  ["lixo", "🗑️"],
  ["reciclagem", "♻️"],

  // ── Plantas e área externa
  ["regar", "💧"],
  ["podar", "✂️"],
  ["planta", "🪴"],
  ["quintal", "🌳"],
  ["garagem", "🚗"],
  ["varanda", "🌿"],
  ["área externa", "📦"],

  // ── Pets
  ["cachorro", "🐕"],
  ["pet", "🐾"],

  // ── Área de serviço, remédios, ferramentas
  ["ferramenta", "🧰"],
  ["remédio", "💊"],
  ["primeiros socorros", "🩹"],
  ["itens de limpeza", "🧴"],
  ["área de serviço", "🧺"],
  ["limpeza", "🧴"],

  // ── Cômodos: só quando nada mais específico casou
  ["quarto", "🛏️"],
  ["sala", "🛋️"],

  // ── Verbos genéricos, último recurso
  ["abrir a janela", "🌬️"],
  ["arejar", "🌬️"],
  ["organizar", "📦"],
  ["objeto", "📦"],
  ["limpar", "🧽"],
  ["lavar", "🫧"],
  ["guardar", "📦"],
];

export function iconeTarefa(t: { name: string; categoria: string; icone?: string | null }): string {
  if (t.icone) return t.icone;
  const chave = t.name.toLowerCase();
  for (const [palavra, icone] of ICONES_POR_PALAVRA) {
    if (chave.includes(palavra)) return icone;
  }
  if (t.categoria === "coletiva") return "🤝";
  if (t.categoria === "individual_coletiva") return "🛏️";
  return "✅";
}
