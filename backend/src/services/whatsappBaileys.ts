import fs from 'fs';
import path from 'path';

const SESSIONS_ROOT = path.join(__dirname, '..', '..', 'data', 'wa_sessions');
if (!fs.existsSync(SESSIONS_ROOT)) {
  fs.mkdirSync(SESSIONS_ROOT, { recursive: true });
}

interface ActiveSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock: any;
  connected: boolean;
  phoneNumber: string;
}

const sessions = new Map<string, ActiveSession>();

// Carrega o módulo Baileys dinamicamente (instalado no Render via package.json)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadBaileys(): Promise<{ baileys: any; pino: any }> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>;
  const baileys = await dynamicImport('@whiskeysockets/baileys');
  const pinoMod = (await dynamicImport('pino')) as { default?: unknown };
  const pino = pinoMod.default || pinoMod;
  return { baileys, pino };
}

function getSessionDir(accountId: string): string {
  const dir = path.join(SESSIONS_ROOT, accountId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Inicia uma sessão real do WhatsApp via Baileys e gera o código oficial de 8 dígitos
 * para o usuário digitar em: WhatsApp → Aparelhos conectados → Conectar com número de telefone.
 */
export async function requestBaileysPairingCode(
  accountId: string,
  phoneNumber: string
): Promise<{ pairingCode: string; connected: boolean }> {
  const { baileys, pino } = await loadBaileys();
  const makeWASocket = baileys.default || baileys.makeWASocket;
  const {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    Browsers,
  } = baileys;

  // Limpa sessão antiga para garantir pareamento limpo
  const sessionDir = getSessionDir(accountId);
  const existing = sessions.get(accountId);
  if (existing?.sock) {
    try {
      existing.sock.end(undefined);
    } catch {
      // ignora
    }
    sessions.delete(accountId);
  }
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    fs.mkdirSync(sessionDir, { recursive: true });
  } catch {
    // ignora
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
  });

  const entry: ActiveSession = {
    sock,
    connected: false,
    phoneNumber,
  };
  sessions.set(accountId, entry);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: { connection?: string; lastDisconnect?: { error?: { output?: { statusCode?: number } } } }) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      entry.connected = true;
      console.log(`[Baileys] WhatsApp ${phoneNumber} (${accountId}) CONECTADO!`);
    } else if (connection === 'close') {
      entry.connected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        setTimeout(() => {
          reconnectBaileysSession(accountId, phoneNumber).catch(() => {});
        }, 3000);
      } else {
        sessions.delete(accountId);
      }
    }
  });

  // Aguarda o socket iniciar e solicita o código de pareamento real de 8 dígitos
  await new Promise((resolve) => setTimeout(resolve, 2200));

  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const rawCode: string = await sock.requestPairingCode(cleanPhone);
  const formatted =
    rawCode.length === 8 ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}` : rawCode;

  return { pairingCode: formatted, connected: entry.connected };
}

export async function reconnectBaileysSession(
  accountId: string,
  phoneNumber: string
): Promise<ActiveSession | null> {
  const sessionDir = getSessionDir(accountId);
  if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
    return null;
  }

  const { baileys, pino } = await loadBaileys();
  const makeWASocket = baileys.default || baileys.makeWASocket;
  const { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = baileys;

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
  });

  const entry: ActiveSession = {
    sock,
    connected: false,
    phoneNumber,
  };
  sessions.set(accountId, entry);

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update: { connection?: string }) => {
    if (update.connection === 'open') {
      entry.connected = true;
    } else if (update.connection === 'close') {
      entry.connected = false;
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 2500));
  return entry;
}

export async function sendBaileysImage(
  accountId: string,
  phoneNumber: string,
  targetJid: string,
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; message: string }> {
  let entry: ActiveSession | null | undefined = sessions.get(accountId);
  if (!entry || !entry.connected) {
    entry = await reconnectBaileysSession(accountId, phoneNumber);
  }
  if (!entry || !entry.sock) {
    return {
      success: false,
      message:
        'WhatsApp ainda não está pareado. Gere o código de 8 dígitos na aba Canais e digite no seu WhatsApp.',
    };
  }

  const jid =
    targetJid === 'status@broadcast' || targetJid.includes('@')
      ? targetJid
      : `${targetJid.replace(/\D/g, '')}@s.whatsapp.net`;

  if (jid === 'status@broadcast') {
    await entry.sock.sendMessage(
      'status@broadcast',
      { image: { url: imageUrl }, caption },
      { broadcast: true }
    );
    return { success: true, message: 'Publicado no Status do WhatsApp!' };
  }

  await entry.sock.sendMessage(jid, {
    image: { url: imageUrl },
    caption,
  });

  return { success: true, message: 'Enviado no WhatsApp com sucesso!' };
}

export async function listBaileysGroups(
  accountId: string
): Promise<Array<{ id: string; name: string; participantsCount: number }>> {
  const entry = sessions.get(accountId);
  if (!entry || !entry.connected) {
    return [];
  }
  const groupsObj = (await entry.sock.groupFetchAllParticipating()) as Record<
    string,
    { id: string; subject?: string; participants?: unknown[] }
  >;
  return Object.values(groupsObj).map((g) => ({
    id: g.id,
    name: g.subject || g.id,
    participantsCount: g.participants?.length || 0,
  }));
}

export function isBaileysConnected(accountId: string): boolean {
  return Boolean(sessions.get(accountId)?.connected);
}
