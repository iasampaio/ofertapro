# Checklist Completo — Publicação do OfertaPro na Google Play Store

Siga esta lista na ordem para publicar seu app sem ser rejeitado e começar a faturar com **Comissões + Assinaturas PRO + AdMob**.

---

## 1. Textos Prontos para a Google Play Console (ASO — Sem Violação de Marca)

- **Nome do App (máx. 30 caracteres):**
  `OfertaPro: Achadinhos e Cupom`
- **Descrição Curta (máx. 80 caracteres):**
  `Achadinhos com desconto, cupons diários e automação de ofertas para afiliados.`
- **Descrição Completa (pronta para copiar e colar):**
  > Descubra os melhores achadinhos e cupons de desconto todos os dias das maiores lojas online em um só lugar — com tema Claro e Escuro em Roxo & Lilás!
  >
  > **Para quem quer economizar:**
  > • Vitrine atualizada com achadinhos de até 70% OFF em Eletrônicos, Casa & Cozinha, Moda, Beleza, Pets, Fitness, Gamer e muito mais;
  > • Aba exclusiva de Cupons de Desconto para copiar em 1 toque;
  > • Redirecionamento seguro para o aplicativo ou site oficial da loja.
  >
  > **Para Afiliados e Criadores de Ofertas (Área do Afiliado):**
  > • Busca inteligente por nicho com gerador automático de legendas persuasivas;
  > • Compartilhamento em 1 toque para grupos, Status e redes sociais;
  > • Conexão de múltiplos canais (WhatsApp e Telegram) organizados por nicho;
  > • **Plano PRO:** Piloto Automático na nuvem 24h com escolha de intervalo em minutos e desconto mínimo, múltiplos números conectados e zero anúncios.
  >
  > *Aviso: O OfertaPro é um aplicativo independente compatível com programas públicos de afiliados e não possui vínculo oficial com as lojas exibidas.*

---

## 2. Política de Privacidade (Obrigatório na Play Console)
- O arquivo já está pronto em `playstore/privacy-policy.html` e também é servido automaticamente pelo seu backend em:
  `https://SEU-DOMINIO/privacy`
- Antes de subir, troque `suporte@ofertapro.app` pelo seu e-mail real de suporte.

---

## 3. Monetização Oficial (Google Play Billing + AdMob)
1. **Assinaturas PRO (Google Play Billing via RevenueCat):**
   - Na **Play Console → Monetizar → Produtos → Assinaturas**, crie:
     - `ofertapro_pro_mensal` — R\$ 29,90/mês
     - `ofertapro_pro_anual` — R\$ 249,90/ano
   - Conecte sua Play Console no [RevenueCat](https://www.revenuecat.com) (grátis até US\$ 2.500/mês) e cole sua Public Android Key em `mobile/src/services/monetization.ts`.
2. **Anúncios (Google AdMob):**
   - Crie um bloco de anúncio **Banner** no [Google AdMob](https://admob.google.com) e cole o ID em `mobile/src/services/monetization.ts`.

---

## 4. Segurança dos Dados (Data Safety na Play Console)
Marque na Play Console:
- **Coleta dados?** Sim (opcional na área de afiliado: Nome e E-mail para autenticação).
- **Dados criptografados em trânsito?** Sim (HTTPS).
- **Usuário pode solicitar exclusão da conta/dados?** Sim (via link/e-mail na Política de Privacidade).
- **Compartilha dados com terceiros?** Apenas identificadores de dispositivo para anúncios (AdMob) na versão gratuita.

---

## 5. Gerar o arquivo `.aab` oficial da Play Store
1. Troque `android.package` em `mobile/app.json` (ex: `com.seunome.ofertapro`).
2. Troque `baseUrl` em `mobile/src/services/api.ts` pela URL **HTTPS** do seu backend na nuvem (Oracle Cloud).
3. Instale o EAS CLI e gere o `.aab`:
   ```powershell
   npm install -g eas-cli
   eas login
   cd C:\Users\Positivo\.gemini\antigravity\scratch\ofertapro\mobile
   eas build --platform android --profile production
   ```
4. Baixe o arquivo `.aab` gerado pelo Expo EAS e faça upload na **Google Play Console → Produção → Criar nova versão**!
