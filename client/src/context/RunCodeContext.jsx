import langMap from "lang-map"
import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react"
import toast from "react-hot-toast"
import { useFileSystem } from "./FileContext"

const RunCodeContext = createContext(null)
const backendUrl = (
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
).replace(/\/$/, "")

const languageMap = {
    javascript: 63,
    python: 71,
    java: 62,
    c: 50,
    cpp: 54,
}
const MAX_POLL_ATTEMPTS = 30
const POLL_DELAY_MS = 1500

const supportedLanguages = [
    {
        language: "javascript",
        displayName: "JavaScript",
        language_id: languageMap.javascript,
        aliases: ["js", "jsx", "mjs", "cjs"],
    },
    {
        language: "python",
        displayName: "Python",
        language_id: languageMap.python,
        aliases: ["py"],
    },
    {
        language: "java",
        displayName: "Java",
        language_id: languageMap.java,
        aliases: ["java"],
    },
    {
        language: "c",
        displayName: "C",
        language_id: languageMap.c,
        aliases: ["c", "h"],
    },
    {
        language: "cpp",
        displayName: "C++",
        language_id: languageMap.cpp,
        aliases: ["cc", "cpp", "cxx", "c++", "hh", "hpp", "hxx"],
    },
]

const fileExtensionLanguageMap = {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    java: "java",
    c: "c",
    h: "c",
    cc: "cpp",
    cpp: "cpp",
    cxx: "cpp",
    "c++": "cpp",
    hh: "cpp",
    hpp: "cpp",
    hxx: "cpp",
}

const pendingStatuses = new Set(["In Queue", "Processing"])
const retryableJudge0Statuses = new Set([404, 429, 502, 503, 504])

const sleep = (duration) =>
    new Promise((resolve) => {
        setTimeout(resolve, duration)
    })

const readJsonResponse = async (response) => {
    const text = await response.text()

    if (!text) return {}

    try {
        return JSON.parse(text)
    } catch {
        return { message: text }
    }
}

const getJudge0ErrorMessage = (
    payload,
    fallback = "Failed to run the code.",
) => {
    const judge0Response = payload?.judge0Response
    const judge0Message =
        typeof judge0Response === "string"
            ? judge0Response
            : judge0Response?.error ||
              judge0Response?.message ||
              judge0Response?.stderr ||
              judge0Response?.compile_output ||
              judge0Response?.stdout

    const backendMessage = payload?.error || payload?.message || ""
    let baseMessage = fallback

    if (
        judge0Message &&
        backendMessage &&
        judge0Message !== backendMessage
    ) {
        baseMessage = `${backendMessage} ${judge0Message}`
    } else if (judge0Message) {
        baseMessage = judge0Message
    } else if (backendMessage) {
        baseMessage = backendMessage
    }

    if (
        payload?.judge0Status &&
        !baseMessage.includes(String(payload.judge0Status))
    ) {
        return `${baseMessage} (Judge0 status: ${payload.judge0Status})`
    }

    return baseMessage
}

const isRetryablePollFailure = (response, payload) => {
    const judge0Status = Number(payload?.judge0Status)

    if (retryableJudge0Statuses.has(judge0Status)) return true
    if (!Number.isNaN(judge0Status) && judge0Status >= 500) return true
    return response.status >= 500
}

const normalizeLanguageName = (value) =>
    value.toLowerCase().replace(/[^a-z0-9+]/g, "")

const findLanguageByName = (languageName) =>
    supportedLanguages.find((language) => language.language === languageName)

const findLanguageByFileName = (fileName) => {
    const extension = fileName?.split(".").pop()?.toLowerCase()
    if (!extension) return null

    const mappedLanguage = fileExtensionLanguageMap[extension]
    if (mappedLanguage) return findLanguageByName(mappedLanguage) || null

    const inferredLanguages = langMap.languages(extension)
    const languageNames = Array.isArray(inferredLanguages)
        ? inferredLanguages
        : inferredLanguages
          ? [inferredLanguages]
          : []

    return (
        supportedLanguages.find((language) => {
            const normalizedLanguage = normalizeLanguageName(language.language)
            const normalizedDisplayName = normalizeLanguageName(
                language.displayName,
            )

            return languageNames.some((name) => {
                const normalizedName = normalizeLanguageName(name)

                return (
                    normalizedName.includes(normalizedLanguage) ||
                    normalizedName.includes(normalizedDisplayName)
                )
            })
        }) || null
    )
}

const normalizeJavaSource = (fileName, sourceCode) => {
    if (!fileName?.toLowerCase().endsWith(".java")) return sourceCode

    const classNameMatch = sourceCode.match(
        /\b(?:public\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/,
    )
    const className = classNameMatch?.[1]

    if (!className || className === "Main") return sourceCode

    const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    return sourceCode.replace(new RegExp(`\\b${escapedClassName}\\b`, "g"), "Main")
}

const getExecutionOutput = (submission) => {
    const outputs = [
        submission?.stdout,
        submission?.stderr,
        submission?.compile_output,
        submission?.message,
    ]

    const resolvedOutput = outputs.find(
        (value) => typeof value === "string" && value.length > 0,
    )

    return resolvedOutput || "No output"
}

const pollSubmission = async (token) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        const response = await fetch(`${backendUrl}/api/run-code/${token}`)
        const payload = await readJsonResponse(response)

        if (!response.ok || !payload.success) {
            if (
                attempt < MAX_POLL_ATTEMPTS - 1 &&
                isRetryablePollFailure(response, payload)
            ) {
                await sleep(POLL_DELAY_MS)
                continue
            }

            throw new Error(
                getJudge0ErrorMessage(
                    payload,
                    "Failed to fetch code execution result.",
                ),
            )
        }

        const submission = payload.data
        const statusId = submission?.status?.id ?? submission?.status_id
        const statusDescription = submission?.status?.description || ""
        const isPending =
            statusId === 1 ||
            statusId === 2 ||
            pendingStatuses.has(statusDescription)

        if (!isPending) return submission

        await sleep(POLL_DELAY_MS)
    }

    throw new Error("Code execution timed out. Please try again.")
}

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error(
            "useRunCode must be used within a RunCodeContextProvider",
        )
    }
    return context
}

const RunCodeContextProvider = ({ children }) => {
    const { activeFile } = useFileSystem()
    const [input, setInput] = useState("")
    const [output, setOutput] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const [selectedLanguage, setSelectedLanguage] = useState(
        supportedLanguages[0],
    )

    // Set the selected language based on the file extension
    useEffect(() => {
        if (!activeFile?.name) return

        const language = findLanguageByFileName(activeFile.name)
        if (language) setSelectedLanguage(language)
    }, [activeFile?.name])

    const runCode = async () => {
        if (!activeFile) {
            return toast.error("Please open a file to run the code")
        }

        if (!selectedLanguage?.language_id) {
            return toast.error("Please select a language to run the code")
        }

        const toastId = toast.loading("Running code...")

        try {
            setIsRunning(true)
            setOutput("")
            const activeFileContent = activeFile.content || ""

            const source_code =
                selectedLanguage.language === "java"
                    ? normalizeJavaSource(activeFile.name, activeFileContent)
                    : activeFileContent

            const submissionResponse = await fetch(`${backendUrl}/api/run-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source_code,
                    language_id: selectedLanguage.language_id,
                    stdin: input,
                }),
            })

            const submissionPayload = await readJsonResponse(submissionResponse)

            if (
                !submissionResponse.ok ||
                !submissionPayload.success ||
                !submissionPayload.token
            ) {
                throw new Error(
                    getJudge0ErrorMessage(
                        submissionPayload,
                        "Failed to submit code for execution.",
                    ),
                )
            }

            const submission = await pollSubmission(submissionPayload.token)

            setOutput(getExecutionOutput(submission))
            toast.dismiss(toastId)
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to run the code."

            console.error(error)
            setOutput(message)
            toast.error(message, {
                id: toastId,
            })
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <RunCodeContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }
export default RunCodeContext
