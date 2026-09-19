import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  answerCallbackQuery,
  isOwnerChat,
  processBotText,
  sendBotMessage,
  validateBotSecret
} from "../../../src/core/telegram/bot.js";
import { executeTool } from "../../../src/core/tools/executor.js";
import { verifyApprovalToken } from "../../../src/core/actions/approvalToken.js";

type Update = {
  update_id?: number;
  message?: {
    message_id?: number;
    chat?: { id?: number | string; type?: string };
    text?: string;
    from?: { id?: number | string };
  };
  callback_query?: {
    id?: string;
    data?: string;
    from?: { id?: number | string };
    message?: { chat?: { id?: number | string } };
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  if (!validateBotSecret(req.headers["x-telegram-bot-api-secret-token"] as string | undefined)) {
    return res.status(401).json({ error: "invalid_webhook_secret" });
  }

  const update = req.body as Update;

  try {
    if (update.callback_query?.id && update.callback_query.data) {
      const callback = update.callback_query;
      const chatId = callback.message?.chat?.id;
      if (chatId === undefined || !isOwnerChat(callback.from?.id)) {
        await answerCallbackQuery(callback.id, "Unauthorized");
        return res.status(200).json({ ok: true });
      }

      const [action, token] = callback.data.split(":", 2);
      if (action === "reject" && token) {
        await answerCallbackQuery(callback.id, "Rejected");
        await sendBotMessage(chatId, "❌ Approval rejected. Nothing was executed.");
        return res.status(200).json({ ok: true });
      }
      if (action === "approve" && token) {
        const approval = verifyApprovalToken(token);
        const result = await executeTool(approval.tool, approval.args, "medium");

        if (result.ok) {
          await answerCallbackQuery(callback.id, "Approved and executed");
          await sendBotMessage(chatId, `✅ Done. The ${approval.tool.replaceAll("_", " ")} action completed successfully.`);
        } else {
          await answerCallbackQuery(callback.id, "Execution failed");
          await sendBotMessage(chatId, `❌ The approved action failed: ${result.error || "unknown_error"}`);
        }
        return res.status(200).json({ ok: true });
      }

      await answerCallbackQuery(callback.id, "Unknown action");
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message?.chat?.id;
    const senderId = update.message?.from?.id;
    const text = update.message?.text?.trim();

    if (chatId === undefined || !isOwnerChat(senderId)) {
      if (chatId !== undefined) {
        await sendBotMessage(chatId, "Unauthorized.");
      }
      return res.status(200).json({ ok: true });
    }

    if (!text) {
      await sendBotMessage(chatId, "Send me a text command.");
      return res.status(200).json({ ok: true });
    }

    if (text === "/start") {
      await sendBotMessage(chatId, "JARVIS online. Give me an order.");
      return res.status(200).json({ ok: true });
    }

    const result = await processBotText(chatId, text);

    if (!result.ok) {
      await sendBotMessage(chatId, `❌ ${result.message}`);
    } else {
      const approvals = (result.meta as { pendingApprovals?: Array<{ tool: string; args: Record<string, unknown>; approvalToken: string }> } | undefined)?.pendingApprovals ?? [];
      if (approvals.length) {
        for (const approval of approvals.slice(0, 3)) {
          const summary = approval.tool === "send_telegram_message"
            ? `Send to ${String(approval.args.username)}: ${String(approval.args.message)}`
            : approval.tool === "bot_send_message"
              ? `Send as @My_Jarvis_AI_1bot: ${String(approval.args.message)}`
              : `Approve action: ${approval.tool}`;
          await sendBotMessage(
            chatId,
            `⚠️ Approval required\\n\\n${summary}`,
            {
              inline_keyboard: [[
                { text: "✅ Approve", callback_data: `approve:${approval.approvalToken}` },
                { text: "❌ Reject", callback_data: `reject:${approval.approvalToken}` }
              ]]
            }
          );
        }
      } else {
        await sendBotMessage(chatId, result.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("MyJarvis Telegram bot webhook error", error);
    const chatId = update.message?.chat?.id;
    if (chatId !== undefined && isOwnerChat(update.message?.from?.id)) {
      try {
        await sendBotMessage(
          chatId,
          `❌ JARVIS could not complete that request: ${error instanceof Error ? error.message : String(error)}`
        );
      } catch {}
    }
    return res.status(200).json({ ok: false, handled: true });
  }
}
