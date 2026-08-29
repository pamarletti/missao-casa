// Ícone (em vez de foto de verdade — mais leve e não depende de upload de
// imagem) que representa cada tarefa. Se a família cadastrou um ícone
// próprio na aba "Catálogo editável", ele tem prioridade; senão, escolhemos
// por palavras-chave no nome. A ordem das palavras-chave importa: frases
// mais específicas vêm antes das genéricas.
const ICONES_POR_PALAVRA: [string, string][] = [
  ["roupa de cama", "🛏️"],
  ["cama", "🛏️"],
  ["mochila", "🎒"],
  ["sapato", "👟"],
  ["toalha", "🧺"],
  ["louça", "🍽️"],
  ["prato", "🍽️"],
  ["panela", "🍳"],
  ["utensílio", "🍳"],
  ["lixeira", "🗑️"],
  ["lixo", "🗑️"],
  ["reciclagem", "♻️"],
  ["vaso sanitário", "🚽"],
  ["box", "🚿"],
  ["chuveiro", "🚿"],
  ["banheiro", "🚽"],
  ["pia", "🚰"],
  ["geladeira", "🧊"],
  ["fogão", "🍳"],
  ["micro-ondas", "🍳"],
  ["espelho", "🪞"],
  ["janela", "🪟"],
  ["interruptor", "💡"],
  ["maçaneta", "🚪"],
  ["pó dos móveis", "🧹"],
  ["chão", "🧹"],
  ["varrer", "🧹"],
  ["mesa", "🍽️"],
  ["café da manhã", "🍳"],
  ["almoço", "🍲"],
  ["jantar", "🍛"],
  ["lanche", "🥪"],
  ["cardápio", "📋"],
  ["compras", "🛒"],
  ["mercado", "🛒"],
  ["feira", "🛒"],
  ["despensa", "🗄️"],
  ["armário", "🗄️"],
  ["planta", "🪴"],
  ["regar", "🪴"],
  ["podar", "🪴"],
  ["skate", "🛹"],
  ["arejar", "🌬️"],
  ["quarto", "🛏️"],
  ["brinquedo", "🧸"],
  ["estante", "📚"],
  ["rack", "📺"],
  ["remédio", "💊"],
  ["primeiros socorros", "💊"],
  ["ferramenta", "🧰"],
  ["sala", "🛋️"],
  ["área de serviço", "🧺"],
  ["sabonete", "🧴"],
  ["shampoo", "🧴"],
  ["papel higiênico", "🧻"],
  ["roupa", "👕"],
  ["objeto", "📦"],
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
