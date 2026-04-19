const backendUrl = (
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
).replace(/\/$/, "")

const readResponsePayload = async (response) => {
    const text = await response.text()

    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

const getErrorMessage = (payload, fallbackMessage) => {
    if (typeof payload === "string" && payload.trim().length > 0) {
        return payload
    }

    const upstreamMessage =
        typeof payload?.upstreamResponse === "string"
            ? payload.upstreamResponse
            : payload?.upstreamResponse?.error ||
              payload?.upstreamResponse?.message ||
              payload?.upstreamResponse?.detail

    const baseMessage =
        payload?.error || payload?.message || upstreamMessage || fallbackMessage

    if (payload?.upstreamStatus) {
        return `${baseMessage} (upstream status: ${payload.upstreamStatus})`
    }

    return baseMessage
}

export async function generateText(prompt) {
    const response = await fetch(`${backendUrl}/api/copilot`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            prompt,
        }),
    })

    const payload = await readResponsePayload(response)

    if (!response.ok || !payload?.success) {
        throw new Error(getErrorMessage(payload, "Copilot request failed."))
    }

    return payload.content || "No response generated."
}
