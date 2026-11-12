// Acesso à API POS Comandas da Elgin, usado pelas funções api/pagamento.js e api/apoio.js.
// O "_" no nome faz o Vercel não publicar este arquivo como endereço.

const URL_HOMOLOGACAO = "https://hml-elginpay-cap-core-gsfsbndphncyamdz.brazilsouth-01.azurewebsites.net/api/v1";

// Status da Elgin que contam como pago: 3 confirmada, 5 concluída
const APROVADO = new Set([3, 5]);

async function elgin(caminho, opcoes = {}) {
  const base = (process.env.ELGIN_POS_URL || URL_HOMOLOGACAO).replace(/\/+$/, "");
  const r = await fetch(base + caminho, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${process.env.ELGIN_POS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const texto = await r.text();
  let corpo = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch (e) { corpo = { message: texto.slice(0, 300) }; }
  if (!r.ok) {
    const erro = new Error((corpo && (corpo.message || corpo.mensagem)) || `a Elgin respondeu ${r.status}`);
    erro.http = r.status;
    throw erro;
  }
  return corpo;
}

module.exports = { elgin, APROVADO, URL_HOMOLOGACAO };
