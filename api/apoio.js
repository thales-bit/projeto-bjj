// Função do Vercel que grava cada apoio pago na planilha do Google da equipe:
// quem apoiou, o quê, para qual atleta, quanto e como pagou.
//
//   POST /api/apoio   registro que o totem monta logo depois do pagamento aprovado
//
// O totem guarda o registro no aparelho até esta função responder que gravou;
// se a internet cair, ele reenvia depois. A planilha nunca grava o mesmo código
// de apoio duas vezes, então reenviar não duplica linhas.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   PLANILHA_URL      endereço do App da Web do Apps Script (termina em /exec)
//   PLANILHA_SEGREDO  o mesmo texto da linha SEGREDO do script
//   TOTEM_CHAVE       obrigatória aqui: o totem abre o site com &chave=<mesmo valor>
//   ELGIN_POS_TOKEN   no POS Comandas, serve também para conferir na Elgin se a cobrança foi paga
//
// O script da planilha está em scripts/planilha-apoios.gs.

const { elgin, APROVADO } = require("./_elgin.js");

const FORMAS = { credito: "Crédito", debito: "Débito", pix: "Pix" };
const ABA = { tefweb: "Apoios", pos: "Apoios", teste: "Testes" };

const limpo = (v, max) => String(v === null || v === undefined ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
const reais = v => Math.round((Number(v) || 0) * 100) / 100;

function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}") || {}; } catch (e) { return {}; }
}

// "(47) 99999-9999" e o link do WhatsApp, quando é celular ou fixo brasileiro com DDD
function whatsapp(fone) {
  let d = String(fone || "").replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(d)) d = d.slice(2);
  else if (/^0\d{10,11}$/.test(d)) d = d.slice(1);
  if (!/^[1-9]{2}\d{8,9}$/.test(d)) return { texto: limpo(fone, 30), link: "" };
  return { texto: `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}`, link: `https://wa.me/55${d}` };
}

// POS Comandas: confere na Elgin se a cobrança deste apoio foi paga e de quanto
async function conferirPos(posId, codigo, total) {
  if (!process.env.ELGIN_POS_TOKEN || !/^[0-9a-f-]{36}$/i.test(posId)) return null;
  try {
    const p = await elgin(`/Pagamento?id=${posId}`);
    if (!p || !APROVADO.has(Number(p.status))) return null;
    if (p.valor !== undefined && p.valor !== null && Number(p.valor) !== Math.round(total * 100)) return null;
    if (p.identificadorOrigem && !String(p.identificadorOrigem).startsWith(codigo)) return null;
    return { nsu: p.nsu, autorizacao: p.codigoAutorizacao };
  } catch (e) {
    console.error("Conferência na Elgin:", e.http || "", e.message);
    return null;
  }
}

async function gravarNaPlanilha(aba, apoio) {
  // O Apps Script responde com um redirecionamento; o fetch segue sozinho
  const r = await fetch(process.env.PLANILHA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segredo: process.env.PLANILHA_SEGREDO, aba, apoio }),
    signal: AbortSignal.timeout(25000),
  });
  const texto = await r.text();
  let corpo = null;
  try { corpo = JSON.parse(texto); } catch (e) { /* página de erro do Google */ }
  if (!corpo || corpo.ok !== true) throw new Error((corpo && corpo.erro) || `resposta ${r.status}: ${texto.slice(0, 120)}`);
  return corpo;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const falha = (http, mensagem) => res.status(http).json({ ok: false, mensagem });

  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return falha(405, "Método não permitido."); }
  // Respostas 401 e 503 deixam o registro guardado no totem até a configuração ficar certa
  const chave = process.env.TOTEM_CHAVE;
  if (!chave) return falha(503, "O registro ainda não foi configurado: falta TOTEM_CHAVE.");
  if (req.headers["x-totem-chave"] !== chave) return falha(401, "Este totem não está autorizado.");
  if (!process.env.PLANILHA_URL || !process.env.PLANILHA_SEGREDO) return falha(503, "O registro ainda não foi configurado: falta a planilha.");

  // Só um registro quebrado volta 400; o totem descarta esse e segue com os outros
  const b = lerCorpo(req);
  const codigo = String(b.codigo || "");
  if (!/^BF[0-9A-Z]{4,12}$/.test(codigo)) return falha(400, "Código do apoio inválido.");
  if (!Object.prototype.hasOwnProperty.call(ABA, b.modo)) return falha(400, "Modo de pagamento inválido.");
  if (!Array.isArray(b.itens) || !b.itens.length || b.itens.length > 50) return falha(400, "Itens inválidos.");

  const itens = b.itens.map(x => {
    const it = x && typeof x === "object" ? x : {};
    const mensal = it.tipo === "mensal";
    const qtd = mensal ? 1 : Math.max(1, Math.round(Number(it.qtd) || 1));
    const valor = reais(it.valor);
    return {
      para: limpo(it.para, 80) || "—",
      item: limpo(it.item, 80) || "—",
      tipo: mensal ? "Mensal (1º mês)" : "Único",  // a maquininha cobra só a 1ª mensalidade
      qtd, valor, subtotal: reais(valor * qtd),
    };
  });
  const total = reais(b.total);
  const somaConfere = Math.abs(itens.reduce((s, it) => s + it.subtotal, 0) - total) < 0.01;

  let nsu = limpo(b.nsu, 40), autorizacao = limpo(b.autorizacao, 40), situacao;
  if (b.modo === "teste") situacao = "Teste (nada foi cobrado)";
  else if (!somaConfere) situacao = "Conferir na Elgin";
  else if (b.modo === "pos") {
    const conferido = await conferirPos(String(b.posId || ""), codigo, total);
    situacao = conferido ? "Pago" : "Conferir na Elgin";
    if (conferido) { nsu = limpo(conferido.nsu, 40) || nsu; autorizacao = limpo(conferido.autorizacao, 40) || autorizacao; }
  } else situacao = "Pago";  // TEF Web: a aprovação veio do pinpad ligado ao próprio totem

  // Hora do totem; se o relógio dele estiver adiantado, vale a hora do servidor
  const t = Date.parse(b.quando);
  const quando = new Date(Number.isNaN(t) || t > Date.now() + 10 * 60 * 1000 ? Date.now() : t).toISOString();
  const anon = Boolean(b.anon);
  const fone = whatsapp(b.fone);
  const apoio = {
    codigo, quando,
    nome: anon ? "Anônimo" : limpo(b.nome, 60) || "Sem nome",
    whatsapp: fone.texto, whatsappLink: fone.link,
    nomeNaLista: !anon && b.publico ? "Sim" : "Não",
    mensagem: String(b.msg || "").replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").trim().slice(0, 500),
    forma: FORMAS[b.forma] || "—",
    nsu, autorizacao, situacao, itens,
  };

  try {
    const r = await gravarNaPlanilha(ABA[b.modo], apoio);
    return res.status(200).json({ ok: true, repetido: Boolean(r.repetido) });
  } catch (e) {
    console.error("Planilha de apoios:", e.message);
    return falha(502, "A planilha não respondeu. O totem tenta de novo mais tarde.");
  }
};
