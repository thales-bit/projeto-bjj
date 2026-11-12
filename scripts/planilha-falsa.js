// Planilha do Google de mentira para rodar scripts/planilha-apoios.gs fora do Google.
// Imita só o que o script usa (abas, células, formatos, caixas de seleção, links) e
// também o jeito da planilha de ler o que chega: texto com "=" vira fórmula e
// "004512" vira o número 4512, a não ser que venha com apóstrofo na frente.
// Usada pelo simulador (scripts/simulador-elgin.js) e pelos testes.

const fs = require("fs");
const vm = require("vm");

function criarPlanilha(arquivoGs, segredo) {
  const abas = [];
  let fuso = "America/New_York";

  function ler(v) {
    if (typeof v !== "string") return { v, formula: false };
    if (v.startsWith("'")) return { v: v.slice(1), formula: false };
    if (v.startsWith("=")) return { v, formula: true };
    if (/^-?\d+([.,]\d+)?$/.test(v.trim())) return { v: Number(v.trim().replace(",", ".")), formula: false };
    return { v, formula: false };
  }

  function novaAba(nome) {
    const linhas = [];
    const celula = (l, c) => {
      while (linhas.length < l) linhas.push([]);
      const linha = linhas[l - 1];
      while (linha.length < c) linha.push({ v: "" });
      return linha[c - 1];
    };
    const aba = {
      linhas,
      congeladas: 0,
      larguras: {},
      getName: () => nome,
      setName(n) { nome = n; return aba; },
      getLastRow: () => linhas.length,
      setFrozenRows(n) { aba.congeladas = n; return aba; },
      setColumnWidth(c, w) { aba.larguras[c] = w; return aba; },
      getRange(l0, c0, nl = 1, nc = 1) {
        if (!(l0 >= 1 && c0 >= 1 && nl >= 1 && nc >= 1)) throw new Error(`getRange(${l0}, ${c0}, ${nl}, ${nc}): intervalo inválido`);
        const cada = f => { for (let i = 0; i < nl; i++) for (let j = 0; j < nc; j++) f(celula(l0 + i, c0 + j), i, j); };
        const confere = (m, nome) => {
          if (!Array.isArray(m) || m.length !== nl || m.some(l => !Array.isArray(l) || l.length !== nc)) {
            throw new Error(`${nome}: os dados não têm ${nl} linha(s) por ${nc} coluna(s)`);
          }
        };
        const r = {
          setValues(m) { confere(m, "setValues"); cada((c, i, j) => Object.assign(c, ler(m[i][j]), { link: null })); return r; },
          getValues() { const m = []; for (let i = 0; i < nl; i++) { m.push([]); for (let j = 0; j < nc; j++) m[i].push(celula(l0 + i, c0 + j).v); } return m; },
          setNumberFormat(f) { cada(c => { c.formato = f; }); return r; },
          setFontWeight(p) { cada(c => { c.negrito = p === "bold"; }); return r; },
          setBackground(cor) { cada(c => { c.fundo = cor; }); return r; },
          insertCheckboxes() { cada(c => { c.caixa = true; if (c.v === "" || c.v === undefined) c.v = false; }); return r; },
          setRichTextValues(m) {
            confere(m, "setRichTextValues");
            cada((c, i, j) => Object.assign(c, { v: m[i][j].getText(), link: m[i][j].getLinkUrl(), formula: false }));
            return r;
          },
        };
        return r;
      },
    };
    return aba;
  }

  abas.push(novaAba("Página1"));  // planilha nova do Google em português
  const planilha = {
    getSheetByName: n => abas.find(a => a.getName() === n) || null,
    getSheets: () => abas.slice(),
    insertSheet(n) {
      if (abas.some(a => a.getName() === n)) throw new Error(`Já existe uma aba chamada ${n}`);
      const a = novaAba(n); abas.push(a); return a;
    },
    setSpreadsheetTimeZone(tz) { fuso = tz; },
    getSpreadsheetTimeZone: () => fuso,
  };
  const SpreadsheetApp = {
    getActiveSpreadsheet: () => planilha,
    flush() {},
    newRichTextValue() {
      let texto = "", link = null;
      const b = { setText(t) { texto = t; return b; }, setLinkUrl(u) { link = u; return b; }, build: () => ({ getText: () => texto, getLinkUrl: () => link }) };
      return b;
    },
  };
  const ContentService = {
    MimeType: { JSON: "JSON", TEXT: "TEXT" },
    createTextOutput(t = "") {
      const o = { tipo: "TEXT", setMimeType(m) { o.tipo = m; return o; }, getContent: () => t };
      return o;
    },
  };
  const travas = { pedidas: 0, soltas: 0 };
  const LockService = { getScriptLock: () => ({ waitLock() { travas.pedidas++; }, releaseLock() { travas.soltas++; } }) };

  const contexto = vm.createContext({ SpreadsheetApp, ContentService, LockService, console });
  let codigo = fs.readFileSync(arquivoGs, "utf8");
  if (segredo !== undefined) codigo = codigo.replace(/const SEGREDO = "[^"]*";/, () => `const SEGREDO = ${JSON.stringify(segredo)};`);
  vm.runInContext(codigo, contexto, { filename: arquivoGs });

  const ehData = v => Object.prototype.toString.call(v) === "[object Date]";
  const mostrar = c => {
    if (c.caixa) return c.v ? "☑" : "☐";
    if (ehData(c.v)) {
      const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(c.v).map(x => [x.type, x.value]));
      return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
    }
    if (typeof c.v === "number" && c.formato && c.formato.includes("R$")) return "R$ " + c.v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(c.v);
  };

  return {
    abas,
    travas,
    fuso: () => fuso,
    doPost: e => JSON.parse(contexto.doPost(e).getContent()),
    doGet: () => contexto.doGet().getContent(),
    configurar: () => contexto.configurar(),
    // Conteúdo de uma aba como aparece na tela: linhas de textos, mais as células cruas
    aba(nome) {
      const a = planilha.getSheetByName(nome);
      if (!a) return null;
      return { nome, congeladas: a.congeladas, linhas: a.linhas.map(l => l.map(mostrar)), celulas: a.linhas };
    },
    nomes: () => abas.map(a => a.getName()),
  };
}

module.exports = { criarPlanilha };
