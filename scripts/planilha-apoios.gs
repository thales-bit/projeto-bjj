/**
 * Registro de apoios do Battlefield Jiu-Jitsu
 *
 * Recebe cada apoio pago no totem (pela função api/apoio.js do site) e
 * escreve uma linha por item na aba "Apoios": quem apoiou, o quê, para qual
 * atleta, quanto e como pagou. Os pagamentos do modo de teste vão para a aba
 * "Testes". O mesmo código de apoio nunca entra duas vezes.
 *
 * Como instalar (passo a passo completo no README do projeto):
 *   1. Na planilha do Google da equipe: Extensões → Apps Script.
 *   2. Apague o que estiver no editor, cole este arquivo inteiro e troque o SEGREDO abaixo.
 *   3. Salve, escolha a função "configurar" no alto e clique em Executar
 *      (o Google pede autorização uma vez; use a conta da equipe).
 *   4. Implantar → Nova implantação → tipo App da Web.
 *      Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 *   5. Copie o endereço que termina em /exec e coloque no Vercel em PLANILHA_URL.
 *      O mesmo SEGREDO vai em PLANILHA_SEGREDO.
 *
 * Quando trocar este código depois: Implantar → Gerenciar implantações → lápis →
 * Versão: Nova versão → Implantar. O endereço /exec continua o mesmo.
 *
 * Não mude a ordem das colunas. Colunas novas podem ser criadas depois da última.
 */

const SEGREDO = "COLE-AQUI-O-SEGREDO";  // o mesmo texto de PLANILHA_SEGREDO no Vercel (16 caracteres ou mais)

const ABAS = ["Apoios", "Testes"];
const COLUNAS = [
  "Data", "Código", "Nome", "WhatsApp", "Nome na lista", "Mensagem",
  "Para", "Item", "Tipo", "Qtd", "Valor", "Subtotal",
  "Forma", "NSU", "Autorização", "Situação", "Foto enviada",
];

function doPost(e) {
  let pedido;
  try { pedido = JSON.parse(e.postData.contents); } catch (err) { return responder_({ ok: false, erro: "corpo inválido" }); }
  if (!segredoPronto_() || !pedido || pedido.segredo !== SEGREDO) return responder_({ ok: false, erro: "segredo não confere" });
  const apoio = pedido.apoio;
  if (!apoio || !apoio.codigo || !Array.isArray(apoio.itens) || !apoio.itens.length) {
    return responder_({ ok: false, erro: "apoio inválido" });
  }
  const aba = ABAS.indexOf(pedido.aba) >= 0 ? pedido.aba : "Apoios";

  // Um apoio de cada vez: dois totens gravando juntos não misturam linhas nem duplicam código
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const folha = prepararAba_(aba);
    const ultima = folha.getLastRow();
    if (ultima > 1) {
      const codigos = folha.getRange(2, coluna_("Código"), ultima - 1, 1).getValues();
      if (codigos.some(function (l) { return String(l[0]) === String(apoio.codigo); })) {
        return responder_({ ok: true, repetido: true });
      }
    }
    escrever_(folha, apoio);
    return responder_({ ok: true, linhas: apoio.itens.length });
  } finally {
    SpreadsheetApp.flush();
    trava.releaseLock();
  }
}

// Abrir o endereço /exec no navegador mostra se o registro está no ar
function doGet() {
  return ContentService.createTextOutput(segredoPronto_()
    ? "Registro de apoios do Battlefield: no ar."
    : "Registro de apoios do Battlefield: troque o SEGREDO no código (16 caracteres ou mais) e implante de novo.");
}

// Rode uma vez pelo editor: cria as abas com os títulos e pede a autorização do Google
function configurar() {
  ABAS.forEach(function (nome) { prepararAba_(nome); });
}

function escrever_(folha, a) {
  const quando = new Date(a.quando);
  const data = isNaN(quando.getTime()) ? new Date() : quando;
  const linhas = a.itens.map(function (it) {
    return [
      data, texto_(a.codigo), texto_(a.nome), texto_(a.whatsapp), texto_(a.nomeNaLista), texto_(a.mensagem),
      texto_(it.para), texto_(it.item), texto_(it.tipo), numero_(it.qtd), numero_(it.valor), numero_(it.subtotal),
      texto_(a.forma), texto_(a.nsu), texto_(a.autorizacao), texto_(a.situacao), false,
    ];
  });
  const inicio = folha.getLastRow() + 1, n = linhas.length;
  folha.getRange(inicio, 1, n, COLUNAS.length).setValues(linhas);
  folha.getRange(inicio, coluna_("Data"), n, 1).setNumberFormat("dd/mm/yyyy hh:mm");
  folha.getRange(inicio, coluna_("Valor"), n, 2).setNumberFormat('"R$ "#,##0.00');
  folha.getRange(inicio, coluna_("Foto enviada"), n, 1).insertCheckboxes();
  // WhatsApp clicável: abre a conversa para mandar a foto do item
  if (/^https:\/\/wa\.me\/\d{12,13}$/.test(a.whatsappLink || "")) {
    const link = SpreadsheetApp.newRichTextValue().setText(String(a.whatsapp)).setLinkUrl(a.whatsappLink).build();
    folha.getRange(inicio, coluna_("WhatsApp"), n, 1).setRichTextValues(linhas.map(function () { return [link]; }));
  }
  if (a.situacao !== "Pago" && folha.getName() === "Apoios") {
    folha.getRange(inicio, coluna_("Situação"), n, 1).setBackground("#fde68a");
  }
}

function prepararAba_(nome) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) throw new Error("Crie o script dentro da planilha (Extensões → Apps Script), e não em script.google.com.");
  let folha = planilha.getSheetByName(nome);
  if (!folha) {
    // Planilha nova: usa a primeira aba vazia em vez de deixar uma "Página1" sobrando
    const abas = planilha.getSheets();
    const vazia = abas.length === 1 && abas[0].getLastRow() === 0 && ABAS.indexOf(abas[0].getName()) < 0;
    folha = vazia ? abas[0].setName(nome) : planilha.insertSheet(nome);
  }
  if (folha.getLastRow() === 0) {
    folha.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight("bold").setBackground("#e5e7eb");
    folha.setFrozenRows(1);
    folha.setColumnWidth(coluna_("Mensagem"), 280);
    planilha.setSpreadsheetTimeZone("America/Sao_Paulo");
  }
  return folha;
}

function coluna_(nome) { return COLUNAS.indexOf(nome) + 1; }

// Começo com = + - @ viraria fórmula, e número, data ou telefone a planilha
// converteria (o NSU 004512 virava 4512). O apóstrofo guarda como texto e não aparece.
function texto_(v) {
  const s = String(v === null || v === undefined ? "" : v).slice(0, 500);
  return /^[=+\-@']/.test(s) || (/^[\d\s.,:\/()%-]+$/.test(s) && /\d/.test(s)) ? "'" + s : s;
}

function numero_(v) { const n = Number(v); return isFinite(n) ? n : 0; }

function segredoPronto_() { return SEGREDO !== "COLE-AQUI-O-SEGREDO" && SEGREDO.length >= 16; }

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
