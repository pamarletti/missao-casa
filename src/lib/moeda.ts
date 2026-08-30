/** Dinheiro em português: vírgula nos centavos, ponto nos milhares.
 *
 * Escrito na mão, sem `Intl`/`toLocaleString`, de propósito. O número é
 * formatado no servidor e conferido de novo no navegador quando a página
 * hidrata; se as duas pontas tiverem tabelas de idioma diferentes (acontece
 * conforme a build do Node), o React acusa divergência e reclama no
 * console. Uma conta simples dá sempre o mesmo resultado nos dois lados. */
export function reais(valor: number | string): string {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "0,00";

  const negativo = n < 0;
  const [inteiro, centavos] = Math.abs(n).toFixed(2).split(".");
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (negativo ? "-" : "") + comMilhar + "," + centavos;
}

/** O mesmo número, mas para preencher um campo de formulário: sem o ponto
 * de milhar, que só atrapalharia na hora de digitar por cima. */
export function paraCampo(valor: number | string): string {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "0,00";
  return n.toFixed(2).replace(".", ",");
}

/** Lê o que a pessoa digitou num campo de valor, aceitando os dois jeitos.
 *
 * Com vírgula, ela está escrevendo em português e os pontos são separadores
 * de milhar: "1.200,50" → 1200.5. Sem vírgula, o ponto é o decimal:
 * "1200.50" → 1200.5. Um `replace(",", ".")` sozinho não daria conta do
 * primeiro caso, e é o que os formulários usavam antes. */
export function paraNumero(bruto: unknown): number {
  const texto = String(bruto ?? "").trim();
  if (!texto) return NaN;
  const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  return Number(normalizado);
}
