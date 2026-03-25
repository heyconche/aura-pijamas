# Aura Pijamas — Guia de Deploy

## Estrutura do projeto

```
aura-pijamas/
├── index.html        → Loja (página inicial)
├── checkout.html     → Checkout com pagamento
├── admin.html        → Painel administrativo
├── api/
│   └── checkout.js   → Backend Vercel (processa pagamentos)
└── README.md
```

---

## 1. Configurar conta no Pagar.me

1. Acesse **pagar.me** e crie sua conta de lojista
2. Vá em **Dashboard → Configurações → API Keys**
3. Copie:
   - **Chave pública**: `pk_test_XXXXXXXXXXXXXXXX`
   - **Chave secreta**: `sk_test_XXXXXXXXXXXXXXXX`
4. Em `checkout.html`, substitua na linha indicada:
   ```js
   const PAGARME_PUBLIC_KEY = 'pk_test_XXXXXXXXXXXXXXXX';
   ```

---

## 2. Deploy do backend (Vercel — grátis)

O backend processa os pagamentos com segurança usando a chave secreta.

### Passo a passo:

**a) Crie conta em vercel.com**

**b) Suba o projeto no GitHub**
```bash
git init
git add .
git commit -m "Aura Pijamas v1"
git remote add origin https://github.com/SEU_USUARIO/aura-pijamas.git
git push -u origin main
```

**c) Importe no Vercel**
- Acesse vercel.com/new
- Clique "Import Git Repository"
- Selecione o repositório `aura-pijamas`
- Clique "Deploy" (sem alterar nada)

**d) Configure as variáveis de ambiente**
- No Vercel: Settings → Environment Variables
- Adicione:
  ```
  PAGARME_SECRET_KEY = sk_test_XXXXXXXXXXXXXXXX
  PAGARME_PUBLIC_KEY = pk_test_XXXXXXXXXXXXXXXX
  ```
- Clique "Save" e depois "Redeploy"

**e) Atualize a URL do backend no checkout.html**
```js
const API_URL = 'https://SEU-PROJETO.vercel.app/api/checkout';
```
E remova o comentário do bloco fetch (marcado no código).

---

## 3. Deploy do frontend (GitHub Pages — grátis)

**a) Ative o GitHub Pages**
- Vá em: GitHub → seu repositório → Settings → Pages
- Source: **Deploy from a branch → main → / (root)**
- Clique Save
- Em alguns minutos o site estará em: `https://SEU_USUARIO.github.io/aura-pijamas/`

**b) (Opcional) Domínio personalizado da Hostinger**
- No painel da Hostinger: Domínios → Gerenciar → DNS Zone
- Adicione/edite o registro CNAME:
  ```
  Tipo: CNAME
  Nome: www
  Valor: SEU_USUARIO.github.io
  TTL: 3600
  ```
- Para o domínio raiz (sem www), adicione 4 registros A apontando para os IPs do GitHub Pages:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
- No GitHub Pages Settings: digite seu domínio em "Custom domain" (ex: aurapijamas.com.br)
- Marque "Enforce HTTPS"
- Aguarde até 48h para a propagação DNS (geralmente 1–2h)

---

## 4. Ir para produção no Pagar.me

Quando estiver pronto para receber pagamentos reais:
1. No Pagar.me: solicite a ativação da conta (envio de documentos)
2. Após aprovação, pegue as chaves `sk_live_` e `pk_live_`
3. Substitua as chaves de teste pelas de produção no Vercel e no checkout.html
4. Faça um pedido de teste real de R$ 1,00 para validar

---

## Dicas

- **Teste de cartão** (modo sandbox Pagar.me):
  - Número: `4000000000000010`
  - Nome: `JOHN DOE`
  - Validade: qualquer data futura
  - CVV: `123`

- **Webhook** (opcional, para notificações de pagamento):
  - No Pagar.me: Configurações → Webhooks → `https://SEU-PROJETO.vercel.app/api/webhook`
  - Crie um arquivo `api/webhook.js` para receber confirmações de Pix e boleto

- Para suporte: contato@pagar.me ou docs.pagar.me
