import { Router } from "express";

const router = Router();

const HUGGING_FACE_URL = "https://router.huggingface.co/v1/chat/completions";
const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
const HUGGING_FACE_MODEL =
  process.env.HUGGING_FACE_MODEL?.trim() || "MiniMaxAI/MiniMax-M2:novita";
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL?.trim() || "openai";
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const POLLINATIONS_PROMO_PATTERNS = [
  /^\s*Support Pollinations\.AI:\s*$/gim,
  /^.*Powered by Pollinations\.AI free text APIs\. Support our mission to keep AI accessible for everyone\.?\s*$/gim,
];

const sleep = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

const getProviderConfig = () => {
  const huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY?.trim();

  if (huggingFaceApiKey) {
    return {
      name: "huggingface",
      url: HUGGING_FACE_URL,
      headers: {
        Authorization: `Bearer ${huggingFaceApiKey}`,
      },
      body: (messages) => ({
        model: HUGGING_FACE_MODEL,
        messages,
      }),
    };
  }

  return {
    name: "pollinations",
    url: POLLINATIONS_URL,
    headers: {},
    body: (messages) => ({
      model: POLLINATIONS_MODEL,
      messages,
    }),
  };
};

const parseResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return {
      rawText: "",
      parsedResponse: null,
    };
  }

  try {
    return {
      rawText: text,
      parsedResponse: JSON.parse(text),
    };
  } catch {
    return {
      rawText: text,
      parsedResponse: text,
    };
  }
};

const getResponseMessage = (payload, fallbackMessage) => {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  return (
    payload?.error ||
    payload?.message ||
    payload?.detail ||
    payload?.choices?.[0]?.message?.content ||
    fallbackMessage
  );
};

const getGeneratedText = (payload) => {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  return (
    payload?.choices?.[0]?.message?.content ||
    payload?.choices?.[0]?.text ||
    payload?.output ||
    payload?.text ||
    ""
  );
};

const stripPollinationsPromo = (content) => {
  if (typeof content !== "string" || content.length === 0) {
    return "";
  }

  const sanitizedContent = POLLINATIONS_PROMO_PATTERNS.reduce(
    (value, pattern) => value.replace(pattern, ""),
    content,
  );

  return sanitizedContent.replace(/\n{3,}/g, "\n\n").trim();
};

const createProxyErrorPayload = ({
  error,
  provider,
  upstreamStatus = null,
  upstreamResponse = null,
}) => ({
  success: false,
  error,
  message: error,
  provider,
  upstreamStatus,
  upstreamResponse,
});

const getProxyStatus = (upstreamStatus) => {
  if (!upstreamStatus) return 502;
  if (upstreamStatus >= 500) return 502;
  return upstreamStatus;
};

const isRetryableStatus = (status) => RETRYABLE_STATUS_CODES.has(status);

const logRequest = (provider, attempt, url) => {
  console.log(`[Copilot] ${provider} attempt ${attempt} POST ${url}`);
};

const logResponse = (provider, attempt, url, status) => {
  console.log(`[Copilot] ${provider} attempt ${attempt} POST ${url} -> ${status}`);
};

const logFailure = (provider, url, status, responsePayload) => {
  console.error(`[Copilot] ${provider} POST ${url} failed with status ${status}`);

  if (responsePayload !== null && responsePayload !== undefined) {
    console.error("[Copilot] Upstream response:", responsePayload);
  }
};

const requestCompletion = async (messages) => {
  const provider = getProviderConfig();
  let lastFailure = null;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      logRequest(provider.name, attempt, provider.url);

      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...provider.headers,
        },
        body: JSON.stringify(provider.body(messages)),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      logResponse(provider.name, attempt, provider.url, response.status);

      const { parsedResponse, rawText } = await parseResponsePayload(response);
      const responsePayload = parsedResponse ?? (rawText || null);

      if (response.ok) {
        const generatedText = getGeneratedText(responsePayload);
        const content =
          provider.name === "pollinations"
            ? stripPollinationsPromo(generatedText)
            : generatedText;

        return {
          provider: provider.name,
          content: content || "No response generated.",
        };
      }

      lastFailure = {
        provider: provider.name,
        status: response.status,
        responsePayload,
      };

      logFailure(provider.name, provider.url, response.status, responsePayload);

      if (attempt < MAX_RETRY_ATTEMPTS && isRetryableStatus(response.status)) {
        await sleep(500 * attempt);
        continue;
      }

      break;
    } catch (error) {
      clearTimeout(timeoutId);

      const isAbortError =
        error instanceof Error && error.name === "AbortError";
      const responsePayload = {
        message: isAbortError
          ? "The upstream AI provider timed out."
          : error instanceof Error
            ? error.message
            : "Unknown upstream request error.",
      };

      lastFailure = {
        provider: provider.name,
        status: null,
        responsePayload,
      };

      console.error(
        `[Copilot] ${provider.name} POST ${provider.url} failed before a valid response.`,
        error,
      );

      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(500 * attempt);
        continue;
      }

      break;
    }
  }

  return {
    provider: lastFailure?.provider || provider.name,
    error: getResponseMessage(
      lastFailure?.responsePayload,
      "Failed to generate code.",
    ),
    upstreamStatus: lastFailure?.status || null,
    upstreamResponse: lastFailure?.responsePayload || null,
  };
};

router.post("/", async (req, res) => {
  const prompt = req.body?.prompt;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "prompt is required.",
      message: "prompt is required.",
    });
  }

  const messages = [{ role: "user", content: prompt }];

  const result = await requestCompletion(messages);

  if (result.error) {
    return res.status(getProxyStatus(result.upstreamStatus)).json(
      createProxyErrorPayload({
        error: result.error,
        provider: result.provider,
        upstreamStatus: result.upstreamStatus,
        upstreamResponse: result.upstreamResponse,
      }),
    );
  }

  return res.json({
    success: true,
    provider: result.provider,
    content: result.content,
  });
});

export default router;
