# MyJarvis Backend

Server-side backend foundation for MyJarvis.

## Endpoints

- GET /api/health
- POST /api/chat

## Environment variables

- GEMINI_API_KEY
- GEMINI_MODEL (optional)
- GROQ_API_KEY
- OPENROUTER_API_KEY

Secrets must only be configured in the deployment environment, never committed to Git.

The backend is intentionally provider-agnostic and will grow into the JARVIS Core, tool engine, memory service, permissions, approvals, integrations, voice, and Telegram layers.
