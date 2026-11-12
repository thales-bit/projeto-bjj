# Battlefield Jiu-Jitsu · Totem de patrocínio

Plataforma de patrocínio dos atletas juvenis do Battlefield Jiu-Jitsu (Balneário Camboriú, SC), no modelo de lista de presentes de casamento: os atletas já treinam e competem, e o apoiador escolhe um item do custo de competir (inscrição, filiação, viagem, quimono...) ou um valor mensal para um atleta ou para a equipe. O valor é repassado à equipe.

## Estado atual

`index.html` é um esboço navegável, em arquivo único, com dados de exemplo. O fluxo é linear, pensado para o totem:

1. **Início:** entrada ("Eles já lutam. Ajude a chegar mais longe."), bloco sobre a equipe, os sonhos dos atletas e o custo de competir, com as garantias de transparência, "como funciona" em 3 passos com setas e um único botão "Ajudar a realizar um sonho".
2. **Como você quer apoiar?** Pontual (itens, pago uma vez) ou mensal (padrinho/madrinha com valor fixo).
3. **Quem você quer apoiar?** Um atleta ou a equipe inteira.
4. **Atletas / Perfil do atleta / Equipe:** história, conquistas, meta do mês e o catálogo já aberto no modo escolhido, com a opção de trocar.
5. **Sua escolha:** resumo, apoio com nome ou anônimo, WhatsApp e mensagem opcionais.
6. **Pagamento:** crédito, débito ou Pix; a tela pede para seguir na maquininha e espera o resultado. Aprovado vai sozinho para o obrigado; recusado permite tentar de novo ou desistir.
7. **Obrigado:** confirmação e retorno automático ao início.

Um indicador de etapas no topo mostra em que passo a pessoa está. O rodapé é fixo no pé da tela em todas as páginas: mostra a marca e, quando há itens escolhidos, o total e o botão "Finalizar".

## Pagamento na maquininha (Elgin)

A integração com a Elgin está pronta para os dois tipos de maquininha. O modo vem do endereço do totem:

| Endereço do totem | Maquininha | Como cobra |
| --- | --- | --- |
| `/?totem=1` | nenhuma (modo de teste) | aprova sozinho em 8 s; botões para simular aprovado ou recusado |
| `/?totem=1&pagamento=tefweb` | pinpad ligado ao totem | o app Elgin TEF HUB no próprio totem atende em `http://localhost:2001/tef/v1` e mostra as telas da Elgin por cima do site |
| `/?totem=1&pagamento=pos&chave=...` | Smart POS ao lado do totem | a função `api/pagamento.js` (Vercel) manda a cobrança para a API POS Comandas e o site acompanha o status |

Sem `?pagamento=`, vale `PAGAMENTO.modoPadrao` no bloco "PAGAMENTO NA MAQUININHA" do script (hoje `"teste"`). A maquininha cobra hoje os itens únicos mais a 1ª mensalidade, se houver; as mensalidades seguintes ainda precisam de uma solução de cobrança recorrente, porque a Elgin não faz cobrança mensal.

O "Obrigado" mostra o **código do apoio** (ex.: `BF0O1GP9E`), o mesmo que vai para a Elgin como identificador da cobrança, para conferir no portal de transações.

### Pinpad no totem (TEF Web)

Contrato conferido na documentação Elgin TEF Web e no app Elgin TEF HUB Android 2.07:

- `GET /tef/v1` responde `{"status":"running"}` quando o serviço está no ar. No Android, se não estiver, o site abre `intent://connect/start` para subir o serviço (ao abrir o site e antes de cada cobrança).
- `POST /venda/credito` `{valor:"120.00", parcelas:"1", financiamento:"1"}` (à vista), `POST /venda/debito` `{valor}` e `POST /pix` `{valor}`. A chamada só volta quando a transação termina.
- Respostas: 200 quando a tela da Elgin fecha normalmente, 500 quando a transação é cancelada ou dá erro, 409 se havia outra operação em curso e 403 sem a permissão "Sobrepor a outros apps".
- O resultado vem em `dados.resultado.tef` (`nsuTransacao`, `codigoAutorizacao`, `mensagemResultado`, ...). No Android o campo `codigo` vem sempre 0, então o site considera aprovado quando há NSU ou autorização e a mensagem não fala em recusa, cancelamento ou erro.
- O app aceita chamadas de qualquer site (CORS `anyHost`, métodos GET e POST, cabeçalho `Content-Type`).
- Para desistir, a pessoa aperta o botão vermelho do pinpad; a tela não tem botão de cancelar nesse modo.

No totem: instalar e ativar o Elgin TEF HUB, liberar para ele a permissão **"Sobrepor a outros apps"** e, no Chrome 142 ou mais novo, liberar o acesso do site aos apps do aparelho na primeira cobrança (ou de antemão, pela política `LocalNetworkAccessAllowedForUrls` no gerenciador de dispositivos, com o endereço do site).

### Smart POS ao lado do totem (POS Comandas)

A página nunca vê o token da Elgin: ele fica nas variáveis de ambiente do Vercel (Settings → Environment Variables), lidas por `api/pagamento.js`:

| Variável | O que é |
| --- | --- |
| `ELGIN_POS_TOKEN` | token Bearer que a Elgin envia (obrigatória) |
| `ELGIN_POS_DESTINO` | identificador da maquininha que recebe a cobrança |
| `ELGIN_POS_URL` | endereço da API; sem ela, usa o de homologação. Em produção, o endereço que a Elgin passar (a documentação cita `https://api-captter.tefelgin2.com.br/`) |
| `ELGIN_POS_TIPO_DESTINO` | tipo do destino; padrão `0`, como no exemplo da Elgin |
| `TOTEM_CHAVE` | opcional, recomendada: o totem só cobra se abrir o site com `&chave=` igual a ela |
| `VALOR_MAXIMO` | opcional: maior cobrança aceita, em reais (padrão 5000) |

O site cria a cobrança (débito = modalidade 1, crédito = 2, Pix = 3, valor em centavos), consulta o status no intervalo que a Elgin devolve (`intervaloEntreBuscas`) e trata 3 e 5 como aprovado e 4, 6, 7, 8, 10 e 11 como não aprovado. Se ninguém pagar em 3 minutos, ou se a pessoa tocar em "Cancelar pagamento", a cobrança é cancelada na Elgin; antes de dar como cancelada, o site confere se o pagamento não entrou bem nessa hora.

### Testar sem maquininha

`node scripts/simulador-elgin.js` sobe o site com a função, um TEF Web falso na porta 2001 e uma API POS Comandas falsa. Abra `http://127.0.0.1:8080/?totem=1&pagamento=tefweb` ou `http://127.0.0.1:8080/?totem=1&pagamento=pos&chave=chave-teste`. Para escolher a próxima resposta: `http://127.0.0.1:8080/_cenario?tef=recusa` (aprova, recusa, ocupado, fora) ou `?pos=recusa` (aprova, recusa, espera).

### Homologação com a Elgin

O que pedir à Elgin:

- **Pinpad (TEF Web):** o número de terminal de homologação e a liberação do ambiente de teste pelo suporte integração. A ativação de teste usa o CNPJ 52.556.578/0008-07; na produção, o CNPJ da equipe e o pedido TEF com a credenciadora (cartão) e o banco (Pix) da equipe.
- **Smart POS (POS Comandas):** o token de 4 dígitos para ativar o app Smart TEF na maquininha, o token Bearer da API, o identificador da maquininha (`destino`), a lista de maquininhas homologadas e o endereço de produção.

O que conferir nos testes (em ordem):

1. Uma venda de cada tipo (crédito, débito, Pix) aprovada e uma recusada, conferindo se o site leu certo o resultado. No TEF Web, o console do navegador registra a resposta da Elgin (`TEF Web ...`).
2. No portal de transações da Elgin, se as vendas aparecem **confirmadas** e não pendentes. O TEF Web não tem rota de confirmação e o app Android devolve `requer_confirmacao: "1"`; venda pendente pode ser desfeita pela credenciadora em cerca de 72 horas.
3. Se a Elgin exige comprovante impresso no pinpad (define se o totem precisa de impressora).
4. No POS Comandas: se a cobrança precisa de `complemento`, se `parcelas: 0` vale para crédito à vista e se o cancelamento é `PUT` ou `GET` (a função tenta os dois).
5. O roteiro de homologação da Elgin: formulário no Microsoft Forms (TEF) ou roteiro e vídeo de uma venda e um cancelamento (POS Comandas).

Depois de homologado: trocar `PAGAMENTO.modoPadrao` para o modo escolhido (ou só usar `?pagamento=` no endereço do totem) e, no POS Comandas, apontar `ELGIN_POS_URL` para a produção.

## Modo totem

A página foi pensada para rodar num totem de autoatendimento, em tela de toque, num lugar físico:

- Nada fica gravado entre uma pessoa e outra. "Sua escolha" é só a seleção atual, não um histórico.
- Depois de 60 segundos sem toque aparece a pergunta "Ainda está aí?" e, 20 segundos depois, tudo é limpo e a tela volta ao início.
- A tela de obrigado volta ao início sozinha em 20 segundos.
- Só o primeiro nome é obrigatório no fechamento. WhatsApp e mensagem são opcionais.
- Botões e alvos de toque têm no mínimo 44px.

Os tempos ficam nas constantes `INATIVIDADE_AVISO_S`, `INATIVIDADE_LIMITE_S` e `OBRIGADO_S` no início do bloco "MODO TOTEM" do script.

### Travas do totem

No totem, abra o site com `?totem=1` no endereço (ex.: `https://SEU-SITE.vercel.app/?totem=1`) ou instale como app pelo navegador, que já abre nesse modo, em tela cheia e na vertical (`manifest.webmanifest`). Nesse modo o site:

- bloqueia menu de toque longo, seleção de texto, arrastar imagens e zoom;
- não deixa nenhum link levar para fora do site;
- faz o "voltar" do aparelho andar só dentro do site, voltando ao início quando acaba o histórico;
- não sai da tela de pagamento enquanto a maquininha está cobrando;
- mantém a tela acesa e, num navegador comum, entra em tela cheia no primeiro toque.

Sem `?totem=1`, quem abre o link no celular navega normalmente. A trava principal continua sendo a do aparelho: modo quiosque do Android ou do Windows, sem barra, sem botões do sistema e sem outros apps.

## Identidade visual

Replica as artes do Battlefield no Instagram (referência: post "Nova grade de horário"):

- Sempre escuro, com fotos de luta em preto e branco no fundo e brilho verde nas bordas.
- Títulos em Saira Condensed 900, em duas linhas: a primeira branca com textura gasta, a segunda em verde neon com brilho.
- Subtítulos espaçados entre linhas verdes, molduras e painéis com cantos chanfrados em 45°.
- Caixa verde com texto preto para a ação principal, como o "07:00 ÀS 08:00" da arte.
- Pincelada verde com letra de pincel (Permanent Marker) para os destaques, como o "VAGAS ABERTAS".
- Faixas de neon diagonais nos cantos de baixo.
- Verdes medidos na arte: `#66F61E` nos títulos e `#7EF63C` nas caixas e no pincel.

O logo em `img/logo-battlefield.png` foi recortado da própria arte (resolução limitada). Quando houver o arquivo original em alta, basta substituir esse PNG.

As versões em preto e branco das fotos (`img/fundo/` para a capa e os blocos da equipe, `img/faixa/` para a faixa que rola) são geradas a partir de `fotos/` por `python3 scripts/gerar_fundos.py`. Rode de novo sempre que trocar fotos.

## Como ver

Abra `index.html` no navegador. Não precisa de servidor.

## Publicar na Vercel

O projeto é estático, sem build. Na Vercel: **Add New → Project → Import** este repositório, preset **Other**, sem comando de build e sem pasta de saída. Cada push na branch de produção (Settings → Git → Production Branch) publica de novo automaticamente. O `vercel.json` só desliga o cache do HTML para as atualizações aparecerem na hora.

## Movimento

Transição entre telas, slideshow dos atletas na capa (troca a cada 5 s), faixa de fotos rolando sem parar, blocos que entram ao rolar, números da capa contando, brilho pulsando no botão principal, zoom lento nas fotos grandes e na galeria. Tudo é desligado automaticamente para quem tem "reduzir movimento" ativado no aparelho.

## Atletas e fotos

Os nove atletas em `ATLETAS` (no início do script) foram sintetizados dos portfólios da pasta "0. Projeto social - Jiu jitsu" do Drive. As fotos ficam em `fotos/<atleta>/01.jpg` a `05.jpg` (no máximo 5 por atleta), já reduzidas para 1400 px. Elas aparecem inteiras, sem corte, sobre um fundo desfocado da própria foto. O campo `fotos` diz quantas existem e `capa` qual delas é a principal.

Para trocar ou acrescentar fotos: coloque o JPEG em `fotos/<atleta>/NN.jpg` e ajuste `fotos`/`capa`. Os utilitários em `scripts/` decodificam arquivos vindos do Drive (`salvar_foto.py`) e extraem fotos de portfólios em PDF (`extrair_pdf.py`).

## Onde trocar os dados

No início do `<script>` em `index.html`, os blocos `EQUIPE`, `ATLETAS`, `ITENS_ATLETA`, `ITENS_EQUIPE` e `PLANOS` concentram todos os textos, valores e metas. As fotos hoje são espaços reservados com a inicial do nome.
