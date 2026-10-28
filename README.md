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

## Pagamento na maquininha

O pagamento roda em **modo de teste** até a maquininha da Elgin ser ligada: a tela aprova sozinha em 8 segundos e tem botões para simular aprovado ou recusado. A maquininha cobra hoje os itens únicos mais a 1ª mensalidade, se houver. As mensalidades seguintes ainda precisam de uma solução de cobrança recorrente, porque o TEF da Elgin não faz cobrança mensal.

Para ligar a maquininha, mude `PAGAMENTO.modo` no bloco "PAGAMENTO NA MAQUININHA" do script:

- `"tefweb"`: o app Elgin TEF HUB instalado no próprio totem (Android ou Windows) atende em `http://localhost:2001/tef/v1` e conduz o pinpad. A função `cobrarTefWeb` já chama `/venda/credito`, `/venda/debito` e `/pix`; falta validar na homologação com a Elgin.
- Smart POS ao lado do totem (POS Comandas, API da Elgin na internet): precisa de uma função no Vercel para guardar o token da Elgin, que não pode ficar na página.

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
