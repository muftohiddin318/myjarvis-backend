# MyJarvis Personal Telegram

MyJarvis uses Telegram MTProto through the maintained `teleproto` client. This sends from the authorized personal Telegram account, not from a bot.

## Required Vercel environment variables

- `TELEGRAM_API_ID` — numeric API ID from my.telegram.org
- `TELEGRAM_API_HASH` — API hash from my.telegram.org
- `TELEGRAM_STRING_SESSION` — a saved MTProto StringSession for the personal account
- `TELEGRAM_ACTION_SECRET` — long random secret used to sign approval tokens

Never commit the session string or API credentials.

## Endpoints

- `GET /api/telegram/status`
- `POST /api/actions/propose`
- `POST /api/actions/execute`

The propose endpoint creates a short-lived signed approval token for a specific Telegram send. The execute endpoint verifies that token and only then runs the medium-risk Telegram tool.

## Sending flow

1. MyJarvis identifies `send_telegram_message`.
2. The tool is marked medium-risk, so the normal agent loop cannot execute it automatically.
3. The app requests an approval token for the exact username and message.
4. The user approves.
5. The app sends the approval token to `/api/actions/execute`.
6. The backend verifies the signature/expiry and executes the MTProto send.
7. The response only reports success when Telegram accepted the send request.

## Session setup

The first MTProto login must be performed outside the serverless request path with the account owner's phone number, login code, and 2FA password if enabled. Save the resulting StringSession as a Vercel Secret. The StringSession is equivalent to a long-lived login credential and must never be exposed to frontend code or chat logs.
