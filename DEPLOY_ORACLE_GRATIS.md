# Guia Passo a Passo — Servidor 100% Grátis na Oracle Cloud (Always Free)

Este guia coloca no ar **24 horas por dia (R\$ 0/mês)** tanto o **Backend do OfertaPro** quanto a **Evolution API** (para conectar vários WhatsApps pelo número de celular).

---

## Passo 1 — Criar conta gratuita na Oracle Cloud
1. Acesse [cloud.oracle.com/free](https://www.oracle.com/br/cloud/free/) e clique em **Comece gratuitamente**.
2. Escolha a região **Brazil East (São Paulo)** ou **Brazil Southeast (Vinhedo)** para ficar super rápido no Brasil.
3. Eles pedem um cartão de crédito/débito apenas para confirmar que você é humano (cobram e estornam um valor simbólico; a conta *Always Free* nunca cobra mensalidade).

---

## Passo 2 — Criar sua Máquina Virtual Gratuita (Always Free)
1. No painel da Oracle Cloud, clique em **Compute → Instances → Create Instance**.
2. Em **Image and shape**:
   - **Image:** escolha **Ubuntu 24.04 Minimal** (ou Ubuntu 22.04).
   - **Shape:** clique em **Change Shape → Ampere (ARM)** e selecione **VM.Standard.A1.Flex** com selo **Always Free** (ex: 2 OCPUs e 12 GB de RAM — sobra muito!).
3. Em **Add SSH keys**: clique em **Save private key** (guarde esse arquivo `.key` no seu PC).
4. Clique em **Create** e anote o **Public IP Address** que vai aparecer (ex: `129.148.xx.xx`).

---

## Passo 3 — Liberar as portas no Firewall da Oracle
1. Na página da instância criada, clique na **Subnet** (em *Primary VNIC*).
2. Clique em **Default Security List → Add Ingress Rules** e adicione:
   - **Source CIDR:** `0.0.0.0/0`
   - **Destination Port Range:** `3333,8080,80,443`
   - Clique em **Add Ingress Rules**.

---

## Passo 4 — Instalar Docker e subir o OfertaPro + Evolution API
Conecte na VM pelo PowerShell do seu Windows:
```powershell
ssh -i caminho\da\sua\chave.key ubuntu@SEU_IP_PUBLICO
```

Dentro do Ubuntu, cole e rode estes comandos:
```bash
# 1. Libera portas no firewall interno do Ubuntu
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3333 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save || true

# 2. Instala Docker + Docker Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Envie a pasta `ofertapro` do seu PC para o servidor (rodando no PowerShell do Windows):
```powershell
scp -i caminho\da\sua\chave.key -r C:\Users\Positivo\.gemini\antigravity\scratch\ofertapro ubuntu@SEU_IP_PUBLICO:~/ofertapro
```

Depois, volte no terminal SSH do Ubuntu e suba tudo em **1 comando**:
```bash
cd ~/ofertapro
docker compose up -d --build
```

Pronto!! Em ~1 minuto estarão rodando 24h na nuvem:
- **Backend OfertaPro:** `http://SEU_IP_PUBLICO:3333/health`
- **Evolution API:** `http://SEU_IP_PUBLICO:8080` (já conectada automaticamente ao Backend!)

---

## Passo 5 — Conectar o App Mobile ao seu Servidor na Nuvem
1. Abra [mobile/src/services/api.ts](file:///C:/Users/Positivo/.gemini/antigravity/scratch/ofertapro/mobile/src/services/api.ts) e troque `baseUrl` para `http://SEU_IP_PUBLICO:3333` (ou seu domínio HTTPS gratuito via Cloudflare/Caddy antes de enviar para a Play Store).
2. A partir daí, qualquer usuário que abrir o app e digitar o número de celular em **⚙️ Canais → ✅ Conectar pelo Número** receberá o **código real de 8 dígitos** do WhatsApp!
