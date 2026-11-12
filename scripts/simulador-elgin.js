// Simulador da Elgin para testar o pagamento sem maquininha.
//
//   node scripts/simulador-elgin.js
//
// Sobe três servidores locais:
//   http://127.0.0.1:8080  o site, com as funções api/pagamento.js e api/apoio.js como no Vercel
//   http://localhost:2001  imita o app Elgin TEF HUB (TEF Web, pinpad no totem)
//   http://127.0.0.1:4010  imita a API POS Comandas (Smart POS ao lado do totem)
//
// Abra no navegador:
//   http://127.0.0.1:8080/?totem=1&pagamento=tefweb&chave=chave-teste
//   http://127.0.0.1:8080/?totem=1&pagamento=pos&chave=chave-teste
//   http://127.0.0.1:8080/_planilha   o que o registro de apoios gravou (planilha de mentira
//                                     rodando o scripts/planilha-apoios.gs de verdade)
//
// Para escolher o que a "maquininha" responde na próxima cobrança:
//   http://127.0.0.1:8080/_cenario?tef=aprova|recusa|ocupado|fora
//   http://127.0.0.1:8080/_cenario?pos=aprova|recusa|espera
// As respostas imitam o formato lido no app Elgin TEF HUB Android 2.07 e a
// documentação POS Comandas (status 0 criada → 1 em processamento → 5 concluída ou 11 negada).

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.join(__dirname, "..");
process.env.ELGIN_POS_URL = process.env.ELGIN_POS_URL || "http://127.0.0.1:4010/api/v1";
process.env.ELGIN_POS_TOKEN = process.env.ELGIN_POS_TOKEN || "token-teste";
process.env.ELGIN_POS_DESTINO = process.env.ELGIN_POS_DESTINO || "846a6b5f68dcc478";
process.env.TOTEM_CHAVE = process.env.TOTEM_CHAVE || "chave-teste";
process.env.PLANILHA_URL = process.env.PLANILHA_URL || "http://127.0.0.1:8080/_planilha";
process.env.PLANILHA_SEGREDO = process.env.PLANILHA_SEGREDO || "segredo-de-teste-123";
const funcoes = {
  "/api/pagamento": require(path.join(RAIZ, "api/pagamento.js")),
  "/api/apoio": require(path.join(RAIZ, "api/apoio.js")),
};
const { criarPlanilha } = require(path.join(__dirname, "planilha-falsa.js"));
const planilha = criarPlanilha(path.join(__dirname, "planilha-apoios.gs"), process.env.PLANILHA_SEGREDO);
const respostasPlanilha = new Map();

const cenario = { tef: "aprova", pos: "aprova" };
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const lerCorpo = req => new Promise(fim => { let b = ""; req.on("data", c => (b += c)); req.on("end", () => fim(b)); });
const responder = (res, http, obj) => { res.statusCode = http; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };

// ---------- site + função do Vercel ----------
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://local");
  if (u.pathname === "/_cenario") {
    for (const k of ["tef", "pos"]) if (u.searchParams.get(k)) cenario[k] = u.searchParams.get(k);
    return responder(res, 200, cenario);
  }
  if (funcoes[u.pathname]) {
    const corpo = await lerCorpo(req);
    req.query = Object.fromEntries(u.searchParams);
    try { req.body = corpo ? JSON.parse(corpo) : undefined; } catch (e) { req.body = corpo; }
    res.status = c => { res.statusCode = c; return res; };
    res.json = o => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
    return funcoes[u.pathname](req, res);
  }
  // Planilha: como o Apps Script, o POST responde com um redirecionamento para a resposta
  if (u.pathname === "/_planilha" && req.method === "POST") {
    const id = String(respostasPlanilha.size + 1);
    respostasPlanilha.set(id, planilha.doPost({ postData: { contents: await lerCorpo(req), type: req.headers["content-type"] } }));
    console.log("Planilha:", respostasPlanilha.get(id));
    res.statusCode = 302; res.setHeader("Location", `/_planilha/resposta?id=${id}`);
    return res.end();
  }
  if (u.pathname === "/_planilha/resposta") return responder(res, 200, respostasPlanilha.get(u.searchParams.get("id")) || {});
  if (u.pathname === "/_planilha.json") return responder(res, 200, Object.fromEntries(planilha.nomes().map(n => [n, planilha.aba(n).linhas])));
  if (u.pathname === "/_planilha") {
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const tabelas = planilha.nomes().map(n => {
      const a = planilha.aba(n);
      const linhas = a.linhas.map((l, i) => `<tr>${l.map((t, j) => {
        const c = a.celulas[i][j], tag = i === 0 ? "th" : "td";
        const conteudo = c.link ? `<a href="${esc(c.link)}">${esc(t)}</a>` : esc(t);
        return `<${tag}${c.fundo && i ? ` style="background:${esc(c.fundo)}"` : ""}>${conteudo}</${tag}>`;
      }).join("")}</tr>`).join("");
      return `<h2>${esc(n)}</h2><table>${linhas || "<tr><td>(vazia)</td></tr>"}</table>`;
    }).join("");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(`<!doctype html><meta charset="utf-8"><title>Planilha de apoios (simulador)</title><style>body{font:14px system-ui;margin:16px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;white-space:pre-wrap;vertical-align:top}th{background:#e5e7eb}</style><h1>Planilha de apoios (simulador)</h1>${tabelas}`);
  }
  const arquivo = path.join(RAIZ, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname));
  if (!arquivo.startsWith(RAIZ) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader("Content-Type", TIPOS[path.extname(arquivo)] || "application/octet-stream");
  fs.createReadStream(arquivo).pipe(res);
}).listen(8080, "127.0.0.1");

// ---------- TEF Web (app Elgin TEF HUB) ----------
http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");  // o app da Elgin aceita qualquer origem (anyHost)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }
  if (req.method === "GET" && req.url === "/tef/v1") {
    if (cenario.tef === "fora") return responder(res, 503, {});
    return responder(res, 200, { service: "ETH Connect", status: "running", version: "1.0.0" });
  }
  const pedido = JSON.parse((await lerCorpo(req)) || "{}");
  console.log("TEF Web", req.url, pedido);
  await new Promise(fim => setTimeout(fim, 2500));  // tempo de a pessoa usar o pinpad
  if (cenario.tef === "ocupado") return responder(res, 409, { retorno: 0, mensagem: "Serviço ocupado. Aguarde a conclusão da operação anterior." });
  const aprovado = cenario.tef === "aprova";
  const tef = aprovado
    ? { nsuTransacao: "004512", codigoAutorizacao: "123456", mensagemResultado: "TRANSACAO APROVADA", nomeBandeira: "MASTERCARD" }
    : { nsuTransacao: "", codigoAutorizacao: "", mensagemResultado: "TRANSACAO NEGADA" };
  tef.valorTotal = String(Math.round(Number(pedido.valor) * 100));
  responder(res, aprovado ? 200 : 500, { retorno: 0, dados: { funcao: req.url.split("/").pop(), resultado: { codigo: 0, mensagem: tef.mensagemResultado, requer_confirmacao: "1", tef } } });
}).listen(2001);

// ---------- API POS Comandas ----------
const cobrancas = {};
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://local");
  if (req.headers.authorization !== `Bearer ${process.env.ELGIN_POS_TOKEN}`) return responder(res, 401, { statusCode: 401, message: "Token inválido" });
  if (req.method === "POST" && u.pathname === "/api/v1/Pagamento") {
    const b = JSON.parse(await lerCorpo(req));
    const p = { ...b, id: crypto.randomUUID(), intervaloEntreBuscas: 3, maximoIteracoes: 240, requerConfirmacao: false, status: 0, mensagemOperador: "PAGAMENTO CRIADO", consultas: 0, cenario: cenario.pos };
    console.log("POS Comandas: cobrança criada", b);
    cobrancas[p.id] = p;
    return responder(res, 200, p);
  }
  const p = cobrancas[u.searchParams.get("id")];
  if (!p) return responder(res, 404, { statusCode: 404, message: "Pagamento não encontrado" });
  if (req.method === "GET" && u.pathname === "/api/v1/Pagamento") {
    p.consultas++;
    if (p.status < 3 && p.consultas >= 3 && p.cenario !== "espera") {
      Object.assign(p, p.cenario === "aprova"
        ? { status: 5, nsu: "031014020612", codigoAutorizacao: "A1B2C3", bandeira: "VISA", mensagemOperador: "TRANSACAO APROVADA" }
        : { status: 11, mensagemOperador: "TRANSACAO NEGADA" });
    } else if (p.status === 0) p.status = 1;
    return responder(res, 200, p);
  }
  if (req.method === "PUT" && u.pathname === "/api/v1/Pagamento/cancelar") {
    if (p.status < 3) Object.assign(p, { status: 7, mensagemOperador: "TRANSACAO ABORTADA" });
    console.log("POS Comandas: cobrança cancelada", p.id);
    return responder(res, 200, p);
  }
  responder(res, 405, { statusCode: 405, message: "Método não permitido" });
}).listen(4010, "127.0.0.1");

console.log(`Simulador da Elgin no ar.
  Pinpad no totem (TEF Web):  http://127.0.0.1:8080/?totem=1&pagamento=tefweb&chave=chave-teste
  Smart POS (POS Comandas):   http://127.0.0.1:8080/?totem=1&pagamento=pos&chave=chave-teste
  Planilha de apoios:         http://127.0.0.1:8080/_planilha
  Próxima resposta:           http://127.0.0.1:8080/_cenario?tef=recusa  (aprova|recusa|ocupado|fora)
                              http://127.0.0.1:8080/_cenario?pos=recusa  (aprova|recusa|espera)`);
