# OfertaPro — App de Achadinhos + Automação de Afiliados (Shopee e Multi-Lojas)

Projeto completo (App Mobile **React Native + Expo** + **Backend na Nuvem Node.js/TypeScript**) estruturado no modelo híbrido de monetização para publicação na **Google Play Store**:

1. **Vitrine de Achadinhos (Público Geral):** gera renda via **comissões de afiliado** (seus links) + **Google AdMob**.
2. **Área do Afiliado PRO (SaaS):** gera renda recorrente via **assinatura mensal/anual** (Google Play Billing / RevenueCat) para outros afiliados que querem automatizar disparos e agendamentos na nuvem.

---

## 1. Pré-requisito: Instalar o Node.js (Windows)

Abra o PowerShell e execute:

```powershell
winget install OpenJS.NodeJS.LTS
```

Depois de instalar, **feche e abra novamente o terminal** e teste com `node -v`.

---

## 2. Rodar o Backend na Nuvem (Localmente)

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

O servidor iniciará em `http://localhost:3333` com o **Agendador na Nuvem** rodando automaticamente a cada 1 minuto.

> **Modo Demo Embutido:** Mesmo sem preencher as chaves no `.env`, a vitrine e a busca funcionam imediatamente com produtos de demonstração para você testar todas as telas.

---

## 3. Rodar o App Mobile (Expo)

Em outro terminal:

```powershell
cd mobile
npm install
npm start
```

- Escaneie o QR Code com o app **Expo Go** no seu celular Android (lembre de colocar o IP da sua rede na aba **Canais -> Servidor na Nuvem**, ex: `http://192.168.0.15:3333`).
- Ou pressione `a` para abrir no Emulador Android (`http://10.0.2.2:3333` já vem configurado por padrão).

---

## 4. Como Conectar a API Oficial da Shopee

1. Acesse o [Portal de Afiliados da Shopee Brasil](https://affiliate.shopee.com.br).
2. Vá em **API Aberta (Open API)** e gere seu `AppID` e `Secret`.
3. Coloque **suas** chaves no arquivo `backend/.env` para monetizar a **Vitrine Pública**.
4. Cada afiliado que usar a **Área do Afiliado** pode cadastrar as próprias chaves na aba **Canais & APIs** do aplicativo.

---

## 5. Como Subir na Google Play Store (Checklist de Aprovação)

### A. Hospedar o Backend na Nuvem (para o Agendador 24h funcionar)
- Suba a pasta `backend/` no **Render**, **Railway** ou **VPS** (custo inicial gratuito ou ~US\$ 5/mês).
- Atualize a URL padrão em `mobile/src/services/api.ts` para o domínio HTTPS do seu servidor.

### B. Monetização Oficial (Obrigatório pela Play Store)
- **Assinaturas PRO:** Use **Google Play Billing** (recomendado via SDK [RevenueCat](https://www.revenuecat.com/) — grátis até US\$ 2.500/mês de receita) na tela `ProPlanScreen.tsx`.
- **Anúncios:** Substitua o espaço `adSlot` em `ShowcaseScreen.tsx` pelo pacote `react-native-google-mobile-ads`.

### C. Gerar o arquivo `.aab` para a Google Play Console
1. Crie uma conta gratuita no [Expo EAS](https://expo.dev) e instale a CLI:
   ```powershell
   npm install -g eas-cli
   eas login
   ```
2. Altere `android.package` em `mobile/app.json` (ex: `com.seunome.ofertapro`).
3. Gere o pacote de produção para a Play Store:
   ```powershell
   cd mobile
   eas build --platform android --profile production
   ```
4. Envie o `.aab` gerado na **Google Play Console** (taxa única de US\$ 25 do Google para conta de desenvolvedor).

### D. Regras de Ouro para NÃO ser Rejeitado
- **Não use "Shopee" no nome principal do app nem na logo.** Use sua marca própria (ex: *OfertaPro*) e escreva na descrição: *"Compatível com programas oficiais de afiliados"*.
- **Nunca use Serviços de Acessibilidade para automatizar WhatsApp.** Este projeto já segue a arquitetura correta: disparos automáticos via **nuvem** (Telegram Bot API + WhatsApp Cloud API/Webhook) + **Compartilhamento em 1 Toque** nativo no Android.
- **Política de Privacidade:** Publique uma página simples de Política de Privacidade (pode ser no GitHub Pages) e informe o link na Play Console.
