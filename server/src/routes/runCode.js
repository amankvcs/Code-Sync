import { Router } from "express";

const router = Router();
const judge0SubmissionResultFields =
  "token,status_id,stdout,stderr,compile_output,message";

const getJudge0BaseUrl = () =>
  process.env.JUDGE0_BASE_URL?.trim() || "https://ce.judge0.com";

const logJudge0Request = (method, url) => {
  console.log(`[Judge0] ${method} ${url}`);
};

const logJudge0Response = (method, url, status) => {
  console.log(`[Judge0] ${method} ${url} -> ${status}`);
};

const createJudge0Url = (pathname, searchParams = {}) => {
  const url = new URL(pathname, getJudge0BaseUrl());

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

const parseJudge0Response = async (response) => {
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

const createProxyErrorPayload = ({
  error,
  judge0Status = null,
  judge0Response = null,
}) => {
  return {
    success: false,
    error,
    message: error,
    judge0Status,
    judge0Response,
  };
};

const getProxyStatus = (judge0Status) => {
  if (!judge0Status) return 502;
  if (judge0Status >= 500) return 502;
  return judge0Status;
};

const logJudge0Error = (method, url, status, responsePayload) => {
  console.error(`[Judge0] ${method} ${url} failed with status ${status}`);
  if (responsePayload !== null && responsePayload !== undefined) {
    console.error("[Judge0] Upstream response:", responsePayload);
  }
};

const shouldRetryWithBase64 = (responsePayload) => {
  const errorMessage =
    typeof responsePayload === "string"
      ? responsePayload
      : responsePayload?.error || responsePayload?.message || "";

  return (
    typeof errorMessage === "string" &&
    errorMessage.includes("cannot be converted to UTF-8")
  );
};

const decodeBase64Field = (value) => {
  if (typeof value !== "string" || value.length === 0) return value;

  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
};

const decodeJudge0Base64Payload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  return {
    ...payload,
    stdout: decodeBase64Field(payload.stdout),
    stderr: decodeBase64Field(payload.stderr),
    compile_output: decodeBase64Field(payload.compile_output),
    message: decodeBase64Field(payload.message),
  };
};

router.post("/", async (req, res) => {
  const { source_code, language_id, stdin = "" } = req.body ?? {};
  const normalizedLanguageId = Number(language_id);

  if (typeof source_code !== "string" || source_code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "source_code is required.",
    });
  }

  if (!Number.isInteger(normalizedLanguageId)) {
    return res.status(400).json({
      success: false,
      message: "language_id must be a valid integer.",
    });
  }

  try {
    const judge0Url = createJudge0Url("/submissions", {
      base64_encoded: "false",
    });

    logJudge0Request("POST", judge0Url);
    const response = await fetch(judge0Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        source_code,
        language_id: normalizedLanguageId,
        stdin: typeof stdin === "string" ? stdin : "",
      }),
    });
    logJudge0Response("POST", judge0Url, response.status);

    const { parsedResponse, rawText } = await parseJudge0Response(response);

    if (!response.ok) {
      const error = "Failed to create Judge0 submission.";
      const judge0Response = parsedResponse ?? (rawText || null);

      logJudge0Error("POST", judge0Url, response.status, judge0Response);
      return res.status(getProxyStatus(response.status)).json(
        createProxyErrorPayload({
          error,
          judge0Status: response.status,
          judge0Response,
        }),
      );
    }

    if (!parsedResponse?.token) {
      const error = "Judge0 did not return a submission token.";
      const judge0Response = parsedResponse ?? (rawText || null);

      console.error(`[Judge0] ${error}`);
      if (judge0Response !== null) {
        console.error("[Judge0] Upstream response:", judge0Response);
      }

      return res.status(502).json(
        createProxyErrorPayload({
          error,
          judge0Status: response.status,
          judge0Response,
        }),
      );
    }

    return res.status(201).json({
      success: true,
      token: parsedResponse.token,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while creating Judge0 submission.";

    console.error("[Judge0] POST request failed before a valid response.", error);
    return res.status(502).json(
      createProxyErrorPayload({
        error: "Failed to reach Judge0 while creating submission.",
        judge0Response: { message },
      }),
    );
  }
});

router.get("/:token", async (req, res) => {
  const token = req.params.token?.trim();

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "A submission token is required.",
    });
  }

  try {
    const judge0Url = createJudge0Url(
      `/submissions/${encodeURIComponent(token)}`,
      {
        base64_encoded: "false",
        fields: judge0SubmissionResultFields,
      },
    );

    logJudge0Request("GET", judge0Url);
    const response = await fetch(judge0Url, {
      headers: {
        Accept: "application/json",
      },
    });
    logJudge0Response("GET", judge0Url, response.status);

    const { parsedResponse, rawText } = await parseJudge0Response(response);

    if (!response.ok) {
      const error = "Failed to fetch Judge0 submission.";
      const judge0Response = parsedResponse ?? (rawText || null);

      if (response.status === 400 && shouldRetryWithBase64(judge0Response)) {
        const base64Judge0Url = createJudge0Url(
          `/submissions/${encodeURIComponent(token)}`,
          {
            base64_encoded: "true",
            fields: judge0SubmissionResultFields,
          },
        );

        logJudge0Request("GET", base64Judge0Url);
        const base64Response = await fetch(base64Judge0Url, {
          headers: {
            Accept: "application/json",
          },
        });
        logJudge0Response("GET", base64Judge0Url, base64Response.status);

        const {
          parsedResponse: parsedBase64Response,
          rawText: rawBase64Text,
        } = await parseJudge0Response(base64Response);

        if (base64Response.ok) {
          return res.json({
            success: true,
            data: decodeJudge0Base64Payload(parsedBase64Response),
          });
        }

        const fallbackJudge0Response =
          parsedBase64Response ?? (rawBase64Text || null);
        logJudge0Error(
          "GET",
          base64Judge0Url,
          base64Response.status,
          fallbackJudge0Response,
        );

        return res.status(getProxyStatus(base64Response.status)).json(
          createProxyErrorPayload({
            error,
            judge0Status: base64Response.status,
            judge0Response: fallbackJudge0Response,
          }),
        );
      }

      logJudge0Error("GET", judge0Url, response.status, judge0Response);
      return res.status(getProxyStatus(response.status)).json(
        createProxyErrorPayload({
          error,
          judge0Status: response.status,
          judge0Response,
        }),
      );
    }

    return res.json({
      success: true,
      data: parsedResponse,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while fetching Judge0 submission.";

    console.error("[Judge0] GET request failed before a valid response.", error);
    return res.status(502).json(
      createProxyErrorPayload({
        error: "Failed to reach Judge0 while fetching submission.",
        judge0Response: { message },
      }),
    );
  }
});

export default router;
