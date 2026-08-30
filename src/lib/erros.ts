/** Traduz as mensagens de erro do Supabase Auth para português.
 *
 * O Supabase responde sempre em inglês ("Invalid login credentials", "Email
 * not confirmed"), e essas frases chegavam cruas na tela de login. Numa
 * plataforma usada pela família inteira — inclusive por quem não lê inglês
 * — isso é uma parede: a pessoa não descobre se errou a senha, se o e-mail
 * ainda não foi confirmado, ou se o problema é outro.
 *
 * A comparação é por trecho, não por frase inteira, porque a mesma causa
 * volta com texto ligeiramente diferente conforme a versão do Supabase. */

const TRADUCOES: { padrao: RegExp; texto: string }[] = [
  {
    padrao: /invalid login credentials|invalid credentials/i,
    texto: "Login e/ou senha inválidos.",
  },
  {
    padrao: /email not confirmed|not confirmed/i,
    texto: "E-mail pendente de confirmação. Procure a mensagem que enviamos e clique no link dela.",
  },
  {
    padrao: /already registered|already exists|user already/i,
    texto: 'Esse e-mail já tem uma conta cadastrada. Tenta entrar, ou usa "Esqueci minha senha" se não lembrar a senha.',
  },
  {
    padrao: /invalid format|unable to validate email/i,
    texto: "E-mail em formato inválido.",
  },
  {
    padrao: /password should be at least|password is too short/i,
    texto: "A senha precisa ter pelo menos 6 caracteres.",
  },
  {
    padrao: /new password should be different/i,
    texto: "A nova senha precisa ser diferente da senha atual.",
  },
  {
    padrao: /token has expired|link is invalid|expired/i,
    texto: 'O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".',
  },
  {
    padrao: /rate limit|only request this after|too many requests/i,
    texto: "Muitas tentativas seguidas. Espere alguns instantes e tente de novo.",
  },
  {
    padrao: /network|fetch failed|timeout/i,
    texto: "Não deu para falar com o servidor agora. Confira a internet e tente de novo.",
  },
];

/** A mensagem em português. Erro que não está na lista vira uma frase
 * genérica em vez de aparecer em inglês — e o texto original vai para o log
 * do servidor, pra dar pra descobrir depois o que aconteceu de fato. */
export function mensagemDeErro(original: string): string {
  for (const { padrao, texto } of TRADUCOES) {
    if (padrao.test(original)) return texto;
  }
  console.error("Erro do Supabase sem tradução:", original);
  return "Não deu para concluir agora. Tente de novo em instantes.";
}
