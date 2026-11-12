// Função do Vercel que fala com a API POS Comandas da Elgin (Smart POS ao lado do totem).
// O token da Elgin fica só aqui, nas variáveis de ambiente do Vercel; a página nunca o vê.
//
//   POST   /api/pagamento          {forma, valor, codigo, descricao} → cria a cobrança na maquininha
//   GET    /api/pagamento?id=...   → consulta a cobrança
//   DELETE /api/pagamento?id=...   → cancela enquanto ninguém pagou
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   ELGIN_POS_TOKEN         token Bearer que a Elgin envia (obrigatória)
//   ELGIN_POS_DESTINO       identificador da maquininha que recebe a cobrança
//   ELGIN_POS_URL           endereço da API; sem ela, usa o de homologação
//   ELGIN_POS_TIPO_DESTINO  tipo do destino (padrão 0, como no exemplo da Elgin)
//   TOTEM_CHAVE             se definida, o totem precisa abrir o site com &chave=<mesmo valor>
//                           (o registro de apoios, em api/apoio.js, exige essa chave)
//   VALOR_MAXIMO            opcional: maior cobrança aceita, em reais (padrão 5000)
//
// Documentação: wiki ElginDeveloperCommunity/TEF-Elgin, página "DOCUMENTAÇÃO ‐ POS COMANDAS".

const { elgin, APROVADO } = require("./_elgin.js");

// Modalidade da Elgin: 1 débito, 2 crédito, 3 Pix
const MODALIDADE = { debito: 1, credito: 2, pix: 3 };

// Status da Elgin: 0 criada, 1 em processamento, 2 pendente, 3 confirmada, 4 desfeita,
// 5 concluída, 6 falhou, 7 abortada, 8 cancelada, 10 expirada, 11 negada (3 e 5 = pago)
const NAO_APROVADO = {
  4: "O pagamento foi desfeito. Nada foi cobrado.",
  6: "O pagamento falhou. Nada foi cobrado.",
  7: "Pagamento cancelado. Nada foi cobrado.",
  8: "Pagamento cancelado. Nada foi cobrado.",
  10: "O tempo para pagar acabou. Nada foi cobrado.",
  11: "A maquininha recusou o pagamento. Nada foi cobrado.",
};

function resumo(p) {
  const status = Number(p && p.status);
  const ok = APROVADO.has(status);
  return {
    id: p && p.id,
    status,
    final: ok || status in NAO_APROVADO,
    ok,
    mensagem: ok ? "Pagamento aprovado." : NAO_APROVADO[status] || (p && (p.mensagemOperador || p.mensagem)) || "",
    nsu: (p && p.nsu) || null,
    autorizacao: (p && p.codigoAutorizacao) || null,
    bandeira: (p && p.bandeira) || null,
    intervaloS: (p && p.intervaloEntreBuscas) || 3,
  };
}

function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const falha = (http, mensagem, final = true) => res.status(http).json({ ok: false, final, mensagem });

  if (!process.env.ELGIN_POS_TOKEN) return falha(503, "A maquininha ainda não foi configurada.");
  const chave = process.env.TOTEM_CHAVE;
  if (chave && req.headers["x-totem-chave"] !== chave) return falha(401, "Este totem não está autorizado a cobrar.");

  try {
    if (req.method === "POST") {
      const b = lerCorpo(req);
      const modalidade = MODALIDADE[b.forma];
      const valor = Math.round(Number(b.valor) * 100);
      const maximo = Number(process.env.VALOR_MAXIMO || 5000) * 100;
      if (!modalidade) return falha(400, "Forma de pagamento inválida.");
      if (!Number.isFinite(valor) || valor < 100 || valor > maximo) return falha(400, "Valor fora do permitido.");
      const codigo = String(b.codigo || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 30) || `BF${Date.now()}`;
      const pagamento = {
        identificadorOrigem: codigo,
        valor,                                   // em centavos
        dataTransacao: new Date().toISOString(),
        moeda: 0,
        descricao: String(b.descricao || "Battlefield Jiu-Jitsu").slice(0, 40),
        modalidadeTransacao: modalidade,
        parcelas: 0,                             // à vista, como no exemplo da Elgin
        tipoFinanciamento: 0,
        codigoDoPedido: codigo,
        prioridade: 0,
        destino: process.env.ELGIN_POS_DESTINO || "",
        tipoDestino: Number(process.env.ELGIN_POS_TIPO_DESTINO || 0),
      };
      const p = await elgin("/Pagamento", { method: "POST", body: JSON.stringify(pagamento) });
      return res.status(200).json(resumo(p));
    }

    const id = String((req.query && req.query.id) || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return falha(400, "Cobrança não encontrada.");

    if (req.method === "GET") {
      return res.status(200).json(resumo(await elgin(`/Pagamento?id=${id}`)));
    }

    if (req.method === "DELETE") {
      let p;
      try {
        p = await elgin(`/Pagamento/cancelar?id=${id}`, { method: "PUT" });
      } catch (e) {
        // A documentação da Elgin mostra PUT e, no exemplo, GET
        if (e.http !== 405) throw e;
        p = await elgin(`/Pagamento/cancelar?id=${id}`);
      }
      return res.status(200).json(resumo(p));
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return falha(405, "Método não permitido.");
  } catch (e) {
    console.error("POS Comandas:", e.http || "", e.message);
    // Na consulta, uma falha passageira não encerra a cobrança: o totem tenta de novo
    return falha(502, "A maquininha não respondeu.", req.method === "POST");
  }
};
