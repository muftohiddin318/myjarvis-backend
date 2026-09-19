# MyJarvis Telegram activation

The application code is complete and typechecks. Live activation requires private credentials that must never be committed to GitHub or sent through chat.

## Vercel Production Secrets

Configure these in the MyJarvis Vercel project.

### MyJarvis bot

- TELEGRAM_BOT_TOKEN — token for @My_Jarvis_AI_1bot
- TELEGRAM_BOT_WEBHOOK_SECRET — a long random secret
- MYJARVIS_OWNER_TELEGRAM_ID — numeric Telegram user ID of the owner
- MYJARVIS_OWNER_TELEGRAM_USERNAME — optional owner username without @

### Personal Telegram MTProto

- TELEGRAM_API_ID — numeric API ID from my.telegram.org
- TELEGRAM_API_HASH — API hash from my.telegram.org
- TELEGRAM_STRING_SESSION — saved personal-account StringSession
- TELEGRAM_ACTION_SECRET — long random approval-token secret

## GitHub Actions Secret

Add:

- VERCEL_TOKEN — Vercel access token for the account/team that owns the MyJarvis project

The deployment workflow uses this secret to deploy the latest main branch to the existing MyJarvis Vercel project.

## Bot Webhook

After the Vercel deployment succeeds, run the GitHub Actions workflow named:

Register MyJarvis Telegram bot webhook

It registers:

https://myjarvis-backend.vercel.app/api/telegram/bot/webhook

with Telegram and the configured webhook secret.

## Personal Telegram Session

The first MTProto authentication must be performed interactively using scripts/telegram-login.mjs. Save the resulting session as the Vercel secret TELEGRAM_STRING_SESSION.

Never put the session string in GitHub, frontend code, logs, issues, or chat.

## Final Acceptance Tests

1. Send a normal message to @My_Jarvis_AI_1bot.
2. Confirm JARVIS responds.
3. Ask the bot to perform a safe tool action.
4. Ask it to perform an external action.
5. Confirm Telegram displays Approve / Reject.
6. Approve.
7. Confirm the real action executes.
8. For personal Telegram sending, confirm the message appears in the recipient chat.
9. JARVIS reports success only after the real API call succeeds.
