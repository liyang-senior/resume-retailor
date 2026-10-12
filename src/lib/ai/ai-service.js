import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { AVAILABLE_MODELS, getDefaultModel } from "./models";
import { callChatGPTSession } from "./chatgpt-session";

// Initialize clients
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Re-export for backward compatibility
export { AVAILABLE_MODELS, getDefaultModel };

// Which providers actually have credentials configured on this server.
export function getConfiguredProviders() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    "chatgpt-session": Boolean(process.env.CHATGPT_SESSION_TOKEN),
  };
}

// Best provider to use when the caller doesn't explicitly pick one — prefers
// a paid API key if configured, otherwise falls back to the free ChatGPT
// session so the app still works with zero API keys set up.
export function resolveDefaultProvider() {
  const configured = getConfiguredProviders();
  if (configured.openai) return "openai";
  if (configured.claude) return "claude";
  if (configured["chatgpt-session"]) return "chatgpt-session";
  return "openai";
}

function outputTokenCap(model) {
  const id = String(model || "");
  if (/^gpt-3\.5/.test(id)) return 4096;
  if (id === "gpt-4") return 8192;
  return 16000;
}

// Call AI with timeout & retries (provider-agnostic)
export async function callAI(
  promptOrMessages,
  provider = "openai",
  model = null,
  maxTokens = 16000,
  retries = 2,
  timeoutMs = 180000
) {
  // Validate provider
  if (!AVAILABLE_MODELS[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Validate model if specified
  if (model) {
    const validModels = AVAILABLE_MODELS[provider].map(m => m.id);
    if (!validModels.includes(model)) {
      console.warn(`Model ${model} not in allowed list, but attempting to use it anyway.`);
      // Allow the model to be used - the API will reject it if it's invalid
    }
  }

  // Get default model if not specified
  if (!model) {
    model = getDefaultModel(provider);
  }

  maxTokens = Math.min(maxTokens, outputTokenCap(model));

  // Route to appropriate provider
  switch (provider) {
    case "claude":
      return await callClaude(promptOrMessages, model, maxTokens, retries, timeoutMs);
    case "openai":
      return await callOpenAI(promptOrMessages, model, maxTokens, retries, timeoutMs);
    case "chatgpt-session":
      return await callChatGPTSession(promptOrMessages, model, maxTokens, retries, timeoutMs);
    default:
      throw new Error(`Provider ${provider} not implemented`);
  }
}

// Claude implementation
async function callClaude(promptOrMessages, model, maxTokens, retries, timeoutMs) {
  if (!anthropic) {
    throw new Error("Anthropic API key not configured");
  }

  while (retries > 0) {
    try {
      let messages;
      let systemPrompt = null;

      if (typeof promptOrMessages === 'string') {
        messages = [{ role: "user", content: promptOrMessages }];
      } else if (Array.isArray(promptOrMessages)) {
        const systemMsg = promptOrMessages.find(msg => msg.role === 'system');
        if (systemMsg) {
          systemPrompt = systemMsg.content;
        }
        messages = promptOrMessages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({ role: msg.role, content: msg.content }));
      } else {
        messages = [{ role: "user", content: String(promptOrMessages) }];
      }

      const apiParams = {
        model: model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
        max_tokens: maxTokens,
        temperature: 0.7,
        messages: messages
      };

      if (systemPrompt) {
        apiParams.system = systemPrompt;
      }

      const response = await Promise.race([
        anthropic.messages.create(apiParams),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("AI request timed out")), timeoutMs)
        )
      ]);

      // Normalize response format
      return {
        provider: "claude",
        model: response.model,
        content: response.content,
        usage: response.usage,
        stop_reason: response.stop_reason
      };
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      console.log(`Retrying Claude... (${retries} attempts left)`);
    }
  }
}

// OpenAI implementation
async function callOpenAI(promptOrMessages, model, maxTokens, retries, timeoutMs) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  let allowReasoning = true;
  while (retries > 0) {
    try {
      let messages;
      let systemPrompt = null;

      if (typeof promptOrMessages === 'string') {
        messages = [{ role: "user", content: promptOrMessages }];
      } else if (Array.isArray(promptOrMessages)) {
        const systemMsg = promptOrMessages.find(msg => msg.role === 'system');
        if (systemMsg) {
          systemPrompt = systemMsg.content;
        }
        messages = promptOrMessages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({ role: msg.role, content: msg.content }));
      } else {
        messages = [{ role: "user", content: String(promptOrMessages) }];
      }

      // Add system message if present
      if (systemPrompt) {
        messages = [{ role: "system", content: systemPrompt }, ...messages];
      }

      const resolvedModel = model || process.env.OPENAI_MODEL || "gpt-5-mini";
      const apiParams = {
        model: resolvedModel,
        max_completion_tokens: maxTokens,
        messages: messages
      };
      // Reasoning models spend completion tokens on hidden reasoning. Keep that
      // budget small so the resume JSON is actually returned.
      if (allowReasoning && /^gpt-5/.test(resolvedModel)) {
        apiParams.reasoning_effort = "low";
      }

      const response = await Promise.race([
        openai.chat.completions.create(apiParams),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("AI request timed out")), timeoutMs)
        )
      ]);

      const choice0 = response.choices?.[0];
      const msg = choice0?.message;
      let textOut = msg?.content;
      if (Array.isArray(textOut)) {
        textOut = textOut
          .map((p) => (typeof p === "object" && p?.text ? p.text : String(p ?? "")))
          .join("");
      }
      if (textOut == null || (typeof textOut === "string" && !textOut.trim())) {
        const usage = response.usage || {};
        console.error("OpenAI empty message", {
          status: 200,
          model: response.model,
          finish_reason: choice0?.finish_reason,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens,
        });
        throw new Error(
          `OpenAI returned no text (finish_reason=${choice0?.finish_reason || "unknown"}, completion_tokens=${usage.completion_tokens ?? "unknown"}). The token budget was likely used before any resume JSON was written.`
        );
      }
      const finish = choice0?.finish_reason ?? "stop";

      // Normalize response format to match Claude's structure
      return {
        provider: "openai",
        model: response.model,
        content: [{ text: typeof textOut === "string" ? textOut : String(textOut) }],
        usage: {
          input_tokens: response.usage?.prompt_tokens,
          output_tokens: response.usage?.completion_tokens
        },
        stop_reason: finish === "length" ? "max_tokens" : finish
      };
    } catch (err) {
      retries--;
      if (/reasoning_effort/i.test(String(err.message || ""))) allowReasoning = false;
      console.error("OpenAI request failed", {
        status: err.status || err.statusCode || null,
        message: err.message,
        attemptsLeft: retries,
      });
      if (retries === 0) throw err;
      console.log(`Retrying OpenAI... (${retries} attempts left)`);
    }
  }
}

