# Etapa 08 — Caixa de entrada com mensagens da Meta (Instagram)

## Objetivo

Uma mensagem enviada ao Instagram da empresa chega ao ZUARTS e aparece na Caixa de Entrada.

```text
Instagram → Meta Webhook → POST /api/webhooks/meta → Channel → Conversation → Message → GET /api/inbox/* → Caixa de Entrada
```

Esta etapa não envia mensagens. Não usa IA. Não cria leads.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `api/meta/config.ts` | Constantes do webhook e leitura das variáveis de ambiente |
| `api/meta/verify.ts` | Verificação `hub.challenge` e assinatura `X-Hub-Signature-256` |
| `api/meta/parser.ts` | Roteia o payload pelo campo `object` |
| `api/meta/instagram.ts` | Adapter do Instagram. Converte o payload em `MetaMessageEvent` |
| `api/meta/event.ts` | Tipo de domínio comum a todos os adapters |
| `api/meta/store.ts` | Localiza o canal, cria a conversa e grava a mensagem |
| `api/meta/webhook.ts` | Handler HTTP do webhook |
| `api/inbox/router.ts` | API de leitura da Caixa de Entrada |
| `scripts/register-channel.ts` | Associa uma conta do Instagram a uma empresa |
| `web/inbox.js` | Tela da Caixa de Entrada |
| `scripts/verify-inbox-ui.mjs` | Verificação da tela no Chrome |

Messenger e WhatsApp não têm adapter. O enum `ChannelType` já prevê os dois tipos. Um payload com `object` diferente de `instagram` recebe 200 e é ignorado.

## Modelos

- `Channel`: uma conta conectada. `type` + `externalId` é único no sistema inteiro.
- `Conversation`: uma conversa entre o canal e uma pessoa. `channelId` + `externalConversationId` é único.
- `Message`: uma mensagem. `companyId` + `channelId` + `externalMessageId` é único.

`Conversation` e `Message` referenciam o canal por `(channelId, companyId)`. O banco recusa uma conversa cujo `companyId` difere do `companyId` do canal.

## Como o webhook encontra a empresa

O webhook não tem sessão de usuário. A empresa vem do canal.

1. O payload do Instagram traz `entry[].id`: o ID da conta profissional do Instagram.
2. Cada mensagem traz `sender.id` e `recipient.id`.
3. Mensagem do cliente: a conta da empresa é `recipient.id`. O cliente é `sender.id`.
4. Mensagem eco (`is_echo: true`, enviada pela empresa): a conta da empresa é `sender.id`. O cliente é `recipient.id`.
5. O sistema procura um `Channel` ativo com `type = INSTAGRAM` e `externalId` igual à conta da empresa. Depois tenta `entry[].id`.
6. O `companyId` do canal encontrado é o `companyId` da conversa e da mensagem.
7. Sem canal registrado, a mensagem não é gravada. O log mostra `Canal não registrado: INSTAGRAM externalId=<id>`.

Uma conta do Instagram pertence a uma única empresa. O script de registro recusa uma conta que já pertence a outra empresa.

## Estratégia de contato

1. **Identificador do canal.** A conversa guarda o ID do cliente no Instagram (`externalConversationId`, o IGSID). Uma nova mensagem da mesma pessoa usa a mesma conversa.
2. **Telefone.** O Instagram não envia telefone no webhook. Esta regra fica para o WhatsApp.
3. **Contato do CRM.** `Conversation.contactId` existe e fica vazio nesta etapa.

O webhook do Instagram não traz nome, e-mail nem telefone. Criar um `Contact` só com o IGSID geraria um contato sem nome. Esse contato também consumiria o limite de clientes do plano. Por isso, esta etapa não cria `Contact`. A tela mostra "Contato do Instagram ···1234".

A próxima etapa busca o nome e o usuário pela API do Instagram (`GET /<IGSID>?fields=name,username`). Essa chamada precisa do token da conta.

## Idempotência

A Meta reenvia um evento sem resposta 200 por até 36 horas.

- `Message` tem a chave única `companyId + channelId + externalMessageId` (`message.mid`).
- A gravação usa `createMany` com `skipDuplicates`. Um reenvio não cria linha nova e não altera `lastMessageAt`.
- `lastMessageAt` só avança. Um evento antigo que chega depois não volta o horário da conversa.

## Segurança

- `GET` compara `hub.verify_token` com `META_VERIFY_TOKEN` em tempo constante.
- `POST` calcula o HMAC-SHA256 do corpo bruto e compara com `X-Hub-Signature-256`. Assinatura inválida recebe 401 e nada é gravado.
- `META_APP_SECRET` é o App Secret do app. `INSTAGRAM_APP_SECRET` é opcional e aceito como segundo segredo. O produto "API com login do Instagram" tem um App Secret próprio.
- Corpo acima de 1 MiB recebe 413.
- Sem `META_VERIFY_TOKEN` ou `META_APP_SECRET`, o webhook responde 503. O restante do sistema funciona.
- Os logs não mostram texto de mensagem, token nem payload. Os logs mostram o ID da conta da empresa, para permitir o registro do canal.
- As rotas `/api/inbox/*` exigem sessão e filtram por `companyId` da empresa do usuário.

### Tokens por empresa

Receber mensagens não precisa de token. Esta etapa não guarda token.

Responder mensagens precisa do token de cada conta. A etapa de resposta guarda esse token por `Channel`, criptografado com uma chave de ambiente. Um token global no `.env` não serve para um sistema multiempresa.

## Respostas do webhook

| Situação | Status |
| --- | --- |
| Verificação correta | 200 com o `hub.challenge` |
| Token de verificação errado | 403 |
| Webhook sem configuração | 503 |
| Assinatura inválida ou ausente | 401 |
| JSON inválido ou sem `object`/`entry` | 400 |
| Evento válido, desconhecido, duplicado ou de canal não registrado | 200 |
| Erro de banco | 500 (a Meta reenvia; a idempotência evita duplicação) |

## Configuração na Meta (app IACERES)

1. Gere um token de verificação: `openssl rand -hex 24`.
2. No `.env`, defina `META_VERIFY_TOKEN` e `META_APP_SECRET`. Reinicie o servidor.
3. Exponha o servidor local em HTTPS público. Exemplo: `cloudflared tunnel --url http://localhost:3001` ou `ngrok http 3001`.
4. No painel: Instagram → Configuração da API com login do Instagram → Configurar webhooks.
   - URL de callback: `https://<seu-host>/api/webhooks/meta`
   - Token de verificação: o valor de `META_VERIFY_TOKEN`
   - Clique em "Verificar e salvar". O log mostra `[Meta Webhook] Verificação aceita`.
5. Assine o campo `messages`.
6. Gere o token da conta do Instagram no painel. Ative a conta no webhook:
   `curl -X POST "https://graph.instagram.com/me/subscribed_apps?subscribed_fields=messages&access_token=<TOKEN>"`
   Não salve esse token no repositório.
7. Descubra o ID da conta com o mesmo token:
   `curl "https://graph.instagram.com/me?fields=user_id,username&access_token=<TOKEN>"`
   Segundo a Meta, `user_id` é o valor de `entry[].id` nos webhooks. Não use o campo `id`: ele é um ID do app.
   Sem token, envie uma mensagem de outra conta. O log mostra `Canal não registrado: INSTAGRAM externalId=<id>`.
8. Registre o canal. `npm run channel:register -- --list` não mostra empresas. O slug da empresa está na tabela `Company`:
   `npm run channel:register -- --company <slug-da-empresa> --external-id <id> --name "Instagram @conta"`
9. Envie outra mensagem. Abra **Caixa de Entrada** no menu e clique em **Atualizar**.

`npm run channel:register -- --list` mostra os canais registrados. `--disable` desativa um canal.

Permissões: `instagram_business_basic` e `instagram_business_manage_messages`. Segundo a Meta, uma conta que você possui ou administra usa acesso padrão (Standard Access). Contas de terceiros exigem acesso avançado (Advanced Access) e revisão do app.

A página de webhooks da Meta diz que o app precisa estar em modo **Live** para receber notificações. A página de mensagens diz que um testador precisa de papel no app e na conta profissional. A entrega em modo de desenvolvimento não foi verificada.

## Teste local sem a Meta

Verificação:

```text
curl "http://localhost:3001/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=123"
```

Evento assinado. Troque `<ID_DA_CONTA>` por um canal registrado. O comando lê `META_APP_SECRET` do terminal, não do `.env`:

```text
node -e "const c=require('crypto');const b=JSON.stringify({object:'instagram',entry:[{id:'<ID_DA_CONTA>',time:Date.now(),messaging:[{sender:{id:'123'},recipient:{id:'<ID_DA_CONTA>'},timestamp:Date.now(),message:{mid:'teste-'+Date.now(),text:'Olá'}}]}]});fetch('http://localhost:3001/api/webhooks/meta',{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+c.createHmac('sha256',process.env.META_APP_SECRET).update(b).digest('hex')},body:b}).then(r=>r.text()).then(console.log)"
```

Testes automatizados: `npm run build` e depois `node --test api/meta/meta-webhook.test.mjs`.

Tela no Chrome, com o servidor em execução e `META_APP_SECRET` no ambiente: `node scripts/verify-inbox-ui.mjs "<caminho do chrome.exe>"`.
