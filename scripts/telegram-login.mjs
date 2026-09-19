import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { createInterface } from "node:readline/promises";
import process from "node:process";

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

if (!Number.isInteger(apiId) || !apiHash) {
  console.error("Set TELEGRAM_API_ID and TELEGRAM_API_HASH first.");
  process.exit(1);
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new TelegramClient(
  new StringSession(""),
  apiId,
  apiHash,
  { connectionRetries: 5 }
);

try {
  await client.start({
    phoneNumber: async () => rl.question("Telegram phone number: "),
    password: async () => rl.question("Telegram 2FA password (press Enter if none): "),
    phoneCode: async () => rl.question("Telegram login code: "),
    onError: (error) => console.error("Telegram login error:", error)
  });

  const me = await client.getMe();
  console.log("\nAuthenticated as:", me.username ? `@${me.username}` : me.firstName ?? "Telegram account");
  console.log("\nTELEGRAM_STRING_SESSION=");
  console.log(client.session.save());
  console.log("\nStore that value only as a Vercel Secret. Never commit it or paste it into chat.");
} finally {
  await client.disconnect();
  rl.close();
}
