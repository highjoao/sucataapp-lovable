# Integração WhatsApp - SucataApp

## 🎯 O que foi implementado

A Fase 4 incluiu:

### 1. Reconhecimento de Voz (Frontend)
- ✅ Componente de gravação usando Web Speech API
- ✅ Suporte para comandos em português brasileiro
- ✅ Transcrição em tempo real
- ✅ Suporte aos navegadores: Chrome, Edge e Safari

### 2. Processamento de Linguagem Natural (PLN)
- ✅ Extração automática de entidades usando Regex:
  - **Ação**: "comprei" → BUY, "vendi" → SELL
  - **Quantidade**: "5 quilos", "10kg", "2.5 toneladas"
  - **Material**: Identifica materiais cadastrados no sistema
  - **Preço**: "por 50 reais", "a 35.50"
- ✅ Score de confiança (0-100%) da extração
- ✅ Feedback em tempo real dos dados extraídos

### 3. Integração WhatsApp (Backend)
- ✅ Edge Function: `whatsapp-webhook`
- ✅ Endpoint seguro com autenticação via x-api-key
- ✅ PLN idêntico ao frontend para consistência
- ✅ Vinculação usuário-telefone via tabela profiles
- ✅ Criação automática de transações via WhatsApp

## 📱 Como Usar - Reconhecimento de Voz

1. Acesse a página **Transações** (menu lateral)
2. Clique em **"Nova Transação"**
3. No diálogo, você verá o card **"Comando de Voz"**
4. Clique em **"Gravar Comando"** e fale:

### Exemplos de comandos:
```
"Comprei 5 quilos de cobre por 50 reais"
"Vendi 10kg de alumínio por 35 reais"
"Compra de 2.5 toneladas de ferro a 100 reais"
```

5. O sistema irá:
   - Transcrever sua fala
   - Extrair automaticamente: tipo, quantidade, material e preço
   - Pré-preencher o formulário
   - Mostrar um score de confiança e feedback
   
6. Revise os dados e clique em **"Salvar Transação"**

## 🔧 Como Configurar - Integração WhatsApp

### Pré-requisitos

1. **Conta WhatsApp Business API**
   - Crie uma conta em: https://business.whatsapp.com/
   - Ou use provedores como Twilio, MessageBird, etc.

2. **Webhook Intermediário** (necessário)
   - O WhatsApp não envia mensagens diretamente para seu endpoint
   - Você precisa de um serviço intermediário que:
     - Recebe webhooks do WhatsApp
     - Processa a mensagem
     - Encaminha para o endpoint do SucataApp

### Passo 1: Configure seu número no perfil

1. Acesse o perfil do usuário no app
2. Adicione o campo `phone` no formato: `+5511999999999`
3. Este número será usado para vincular mensagens WhatsApp ao usuário

### Passo 2: URL do Webhook

O endpoint do webhook é:
```
https://ivvcfgyzoedxkkiwbsnv.supabase.co/functions/v1/whatsapp-webhook
```

### Passo 3: Autenticação

Toda requisição DEVE incluir o header:
```
x-api-key: [seu_WHATSAPP_API_KEY]
```

O `WHATSAPP_API_KEY` foi configurado nos secrets do projeto.

### Passo 4: Formato da Requisição

O webhook espera um POST com:

```json
{
  "from": "+5511999999999",
  "text": "Comprei 20kg de cobre por 35"
}
```

**Campos:**
- `from`: Número do WhatsApp do usuário (deve estar cadastrado no perfil)
- `text`: Texto da mensagem recebida

### Passo 5: Resposta do Webhook

**Sucesso (200):**
```json
{
  "success": true,
  "message": "Compra registrada com sucesso!",
  "transaction": { ... },
  "extracted": {
    "type": "BUY",
    "quantity": 20,
    "materialName": "cobre",
    "pricePerUnit": 35
  }
}
```

**Erro - Usuário não encontrado (404):**
```json
{
  "error": "Usuário não encontrado. Cadastre seu telefone no perfil do app."
}
```

**Erro - Comando não compreendido (400):**
```json
{
  "error": "Não consegui entender o comando. Use o formato: 'Comprei/Vendi X quilos/kg de MATERIAL por Y reais'",
  "extracted": { ... }
}
```

**Erro - Material não cadastrado (404):**
```json
{
  "error": "Material 'cobre' não encontrado. Cadastre-o no app primeiro."
}
```

**Erro - API Key inválida (401):**
```json
{
  "error": "Unauthorized"
}
```

## 🔐 Segurança

### Proteção do Webhook

- ✅ **JWT Desabilitado**: O webhook é público mas...
- ✅ **API Key Obrigatória**: Toda requisição precisa do x-api-key
- ✅ **Validação de Usuário**: Apenas usuários cadastrados podem criar transações
- ✅ **Validação de Material**: Apenas materiais cadastrados são aceitos
- ✅ **Service Role**: O Edge Function usa service role key para bypass RLS com segurança

### Recomendações Adicionais

1. **Rotação de API Key**: Troque periodicamente o WHATSAPP_API_KEY
2. **Rate Limiting**: Considere adicionar rate limiting no webhook intermediário
3. **Logs**: O Edge Function já loga todas as requisições para auditoria
4. **IP Whitelist**: Se possível, restrinja IPs que podem acessar o webhook

## 🧪 Testando a Integração

### Teste via cURL

```bash
curl -X POST https://ivvcfgyzoedxkkiwbsnv.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_API_KEY_AQUI" \
  -d '{
    "from": "+5511999999999",
    "text": "Comprei 5 quilos de cobre por 50 reais"
  }'
```

### Teste via Postman

1. Método: POST
2. URL: `https://ivvcfgyzoedxkkiwbsnv.supabase.co/functions/v1/whatsapp-webhook`
3. Headers:
   - `Content-Type: application/json`
   - `x-api-key: SEU_API_KEY_AQUI`
4. Body (raw JSON):
```json
{
  "from": "+5511999999999",
  "text": "Vendi 10kg de alumínio por 35 reais"
}
```

## 📊 Arquitetura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   WhatsApp  │────▶│  Webhook Bridge  │────▶│  SucataApp      │
│   Business  │     │  (Twilio, etc.)  │     │  Edge Function  │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │                          │
                           │                          ▼
                           │                   ┌──────────────┐
                           │                   │  PLN Engine  │
                           │                   │  (Regex)     │
                           │                   └──────────────┘
                           │                          │
                           │                          ▼
                           │                   ┌──────────────┐
                           └──────────────────▶│   Supabase   │
                                               │   Database   │
                                               └──────────────┘
```

## 🎓 Próximos Passos

1. **Configurar WhatsApp Business API**
2. **Adicionar telefone no perfil do usuário**
3. **Configurar webhook intermediário**
4. **Testar com cURL/Postman primeiro**
5. **Testar com mensagens reais do WhatsApp**
6. **Monitorar logs do Edge Function**

## 🐛 Troubleshooting

### "Unauthorized"
- Verifique se o x-api-key está correto
- Confirme que o secret WHATSAPP_API_KEY foi configurado

### "Usuário não encontrado"
- Confirme que o telefone está cadastrado no perfil
- Use o formato internacional: +5511999999999

### "Material não encontrado"
- Cadastre o material primeiro no app
- Certifique-se de usar o nome exato do material

### "Não consegui entender o comando"
- Use um dos formatos sugeridos
- Inclua: ação + quantidade + material + preço
- Exemplo: "Comprei 5 kg de cobre por 50 reais"

## 📝 Logs

Para ver logs do Edge Function:
1. Acesse o Lovable Cloud
2. Vá em Cloud → Edge Functions
3. Selecione "whatsapp-webhook"
4. Veja os logs em tempo real

## ✅ Checklist de Homologação

- [ ] Reconhecimento de voz funcionando no navegador
- [ ] PLN extraindo corretamente todas as entidades
- [ ] Formulário sendo pré-preenchido automaticamente
- [ ] Score de confiança sendo exibido
- [ ] Telefone cadastrado no perfil
- [ ] Webhook respondendo a testes cURL
- [ ] Material sendo encontrado corretamente
- [ ] Transação sendo criada no banco
- [ ] Estoque sendo atualizado automaticamente
- [ ] Logs do Edge Function acessíveis

---

**Desenvolvido com ❤️ para o SucataApp - Fase 4**
