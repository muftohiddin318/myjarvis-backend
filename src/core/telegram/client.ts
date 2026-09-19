import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";

let cachedClient: TelegramClient | null = null;

function getConfig() {
  const apiIdRaw = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_STRING_SESSION;

  if (!apiIdRaw || !apiHash || !session) {
    throw new Error("telegram_not_configured");
  }

  const apiId = Number(apiIdRaw);
  if (!Number.isInteger(apiId) || apiId <= 0) {
    throw new Error("telegram_api_id_invalid");
  }

  return { apiId, apiHash, session };
}

async function getClient() {
  if (cachedClient) {
    try {
      await cachedClient.getMe();
      return cachedClient;
    } catch {
      try { await cachedClient.disconnect(); } catch {}
      cachedClient = null;
    }
  }

  const { apiId, apiHash, session } = getConfig();
  const client = new TelegramClient(
    new StringSession(session),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
      autoReconnect: true
    }
  );

  await client.connect();
  cachedClient = client;
  return client;
}

export async function getTelegramAccount() {
  const client = await getClient();
  const me = await client.getMe();
  return {
    id: String(me.id),
    username: typeof me.username === "string" ? me.username : null,
    firstName: typeof me.firstName === "string" ? me.firstName : null,
    lastName: typeof me.lastName === "string" ? me.lastName : null
  };
}

export async function sendTelegramMessage(username: string, message: string) {
  const client = await getClient();
  const target = username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;

  const entity = await client.getEntity(target);
  const sent = await client.sendMessage(entity, { message });

  return {
    sent: true,
    messageId: typeof sent?.id === "number" ? sent.id : String(sent?.id ?? ""),
    target,
    confirmed: true
  };
}
