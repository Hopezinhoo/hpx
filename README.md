# HPX Presenca

Site privado para acompanhar quem executou o painel HPX. O banco guarda IDs, nomes, primeira conexao e ultima atividade. A lista requer a conta ChatGPT do proprietario configurada em HPX_OWNER_EMAIL.

## Estado da primeira publicacao

- Audiencia do Site: somente o proprietario.
- HPX_INGEST_ENABLED=false: entrada dos jogadores desativada.
- O coletor esta implementado e testado localmente. A hospedagem privada exige login inclusive nas requisicoes do loader; por isso o loadstring distribuido ainda nao consegue se conectar.
- Para conectar os jogadores sem permitir consulta da lista, e necessario autorizar o acesso externo apenas ao fluxo de registro/heartbeat. A aplicacao ja protege a pagina e a rota administrativa separadamente. A alteracao da audiencia do Site ainda depende de autorizacao explicita do proprietario.
- NUNCA coloque tokens de administracao, de acesso privado do Sites, cookies Roblox ou senhas no loader.

## Integracao com o painel (apos ativar o recebimento)

Carregue public/presence.lua no inicio do loader, antes de construir a interface:

```lua
local hpxPresence = loadstring(game:HttpGet("https://hpx-presenca-6c91.pointyoak1.chatgpt.site/presence.lua"))()
-- codigo atual do painel vem aqui
```

O coletor identifica mainFrame e encerra a sessao ao destruir esse objeto. Tambem e possivel chamar hpxPresence.BindGui(seuScreenGui) ou hpxPresence.Stop() no fechamento definitivo. Minimizar ou esconder a interface nao encerra a presenca.

Como o loader original nao foi fornecido, a linha acima ainda deve ser inserida nele. O arquivo presence.lua na raiz da workspace e igual a copia hospedada em public/presence.lua. chat.lua nao foi alterado; esta etapa implementa apenas presenca.

O cliente requer request, http_request ou uma funcao HTTP compativel do ambiente de execucao. Isso nao funciona diretamente em um LocalScript padrao do Studio. Nesse caso e preciso uma ponte de servidor em um jogo que voce controla.

## Comportamento

- O painel usa paleta azul-escura da primeira versao, com fundo #0a0d15, paineis #111621 e detalhes azuis, sem barra lateral ou blocos de estatisticas. IDs, perfil e horario completo ficam no menu do jogador; a configuracao fica no botao do topo.
- A musica usa audio nativo, sem iframe ou video, com um unico icone de nota musical no topo para pausar e retomar. A fila embaralha tres versoes de anime publicadas no Audius pelo criador shirobeats, sem repeticao imediata: Kaikai Kitan (remix), Ai No Supreme (remix) e No Game No Life. Sao versoes de criadores, e nao as gravacoes oficiais originais do antigo player do YouTube.
- O audio usa a rota oficial /v1/tracks/:id/stream do Audius, com acesso publico de streaming verificado, sem copiar arquivos nem fixar URLs temporarias do CDN. Creditos, links e Audius Open Music License ficam nos detalhes da configuracao. Nao sao usadas faixas bloqueadas ou pagas.
- O painel inicia com a reproducao automatica solicitada, usando autoplay nativo, play() imediato e nova tentativa quando o audio esta pronto, em volume de 18%. A ultima faixa selecionada fica no localStorage; ao abrir ou atualizar a pagina, a primeira faixa e diferente da anterior, mesmo se a fonte aleatoria repetir o resultado. Se o armazenamento estiver bloqueado, a musica continua funcionando sem a memoria entre recargas.
- Se o navegador bloquear o som, a primeira interacao permitida tenta libera-lo, sem exigir um botao de play separado. Nao ha garantia de autoplay com som sem gesto ou permissao do navegador. Pausar manualmente cancela as tentativas e o autoplay nativo; cliques posteriores nao retomam a musica. A aba oculta pausa o audio e retorna apenas se a reproducao ainda era desejada. Falhas pulam para a proxima faixa, com no maximo tres tentativas consecutivas.
- O fundo azul-escuro tem estrelas com brilho suave e meteoros em azul e branco. Os efeitos respeitam a preferencia por movimento reduzido.
- Os cartoes sao compactos, com tres colunas no computador. Sol, lua, estrelas e pequenos detalhes usam animacoes suaves, desativadas para quem prefere movimento reduzido.
- A antiga trilha original permanece no repositorio como recurso local, mas nao e carregada pelo painel com o streaming do Audius.

- A lista usa cartoes responsivos com status, copia do UserId e link do perfil. As imagens dos jogos sao entregues por `/api/roblox/game-image?placeId=...`, no mesmo dominio do painel, com cache de quinze minutos. O servidor consulta apenas a API publica do Roblox e seu CDN. Se uma imagem estiver indisponivel, o nome e o link do jogo continuam visiveis e o navegador tenta novamente.

- A coluna "Jogo no Roblox" mostra o nome e o link do lugar da sessao ativa mais recente. O coletor envia `game.PlaceId` e consulta o nome com `MarketplaceService:GetProductInfoAsync`. Se a consulta falhar, o link ainda aparece com o ID.
- Jogadores com o coletor antigo continuam online, com jogo "Nao informado". Para enviar o jogo, execute novamente o loader atualizado. Jogadores offline nao exibem um jogo como atual.
- O jogo e informado pelo cliente, assim como os nomes; nao representa verificacao independente da atividade Roblox. Em contas com varias sessoes, o jogo exibido e o da sessao com sinal mais recente.

- Cada execucao cria uma sessao independente com token aleatorio de 256 bits, guardado apenas na memoria do cliente. O servidor armazena o hash.
- Um sinal a cada 30 segundos estende a validade por 90 segundos.
- Fechar o jogo, cair a conexao ou interromper o script resulta em offline apos o vencimento. A tela consulta a lista a cada 10 segundos enquanto visivel.
- Fechar o painel de forma controlada tenta encerrar a sessao imediatamente.
- Reexecutar o coletor encerra a instancia anterior. Encerrar uma sessao nao derruba outra do mesmo UserId.
- Registros de usuarios permanecem no historico. Sessoes antigas sao limpas em lotes depois de sete dias. Nenhum historico de mensagens e coletado.
- IDs e nomes sao declarados pelo cliente, portanto NAO sao autenticacao Roblox. Um terceiro pode informar um ID alheio. O site mostra essa limitacao e nao usa esses IDs para conceder privilegios.
- Requisicoes sao limitadas por origem de rede com chaves temporarias derivadas, sem armazenar IP bruto. O corpo JSON tem limite de 1 KiB.

## Rotas

- POST /api/presence/session: registra {userId, username, displayName}; devolve token da propria sessao.
- POST /api/presence/heartbeat: usa Authorization: Bearer <token-da-sessao> e corpo {}.
- POST /api/presence/end: encerra apenas a sessao correspondente; repetir e seguro.
- GET /api/admin/presence: exige identidade ChatGPT e email do proprietario. Nunca devolve tokens ou hashes.

A API de envio nao aceita comando para apagar usuarios, consultar historico nem enviar mensagens de chat.

## Desenvolvimento e verificacao

- npm run dev: preview em loopback com identidade de desenvolvimento do starter.
- npm test: testes com SQLite em memoria, usando as mesmas migracoes e consultas de producao.
- node node_modules/typescript/bin/tsc --noEmit: verificacao TypeScript.
- As migracoes em drizzle/ sao imutaveis depois de aplicadas. Novas alteracoes precisam de nova migracao.
- .dev.vars guarda apenas configuracao local, e fica fora do Git e dos arquivos publicados.

A hospedagem usa Sites, Cloudflare Workers e D1. A configuracao de producao fica nas variaveis de ambiente do Site, nunca no codigo Lua.
