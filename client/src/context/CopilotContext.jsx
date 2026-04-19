import { createContext, useContext, useState } from "react"
import toast from "react-hot-toast"
import { generateText as generateCode } from "../api/huggingface"

const CopilotContext = createContext(null)

export const useCopilot = () => {
    const context = useContext(CopilotContext)
    if (context === null) {
        throw new Error("useCopilot must be used within a CopilotContextProvider")
    }
    return context
}

const CopilotContextProvider = ({ children }) => {
    const [input, setInput] = useState("")
    const [output, setOutput] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const isConfigured = true

    const generateCodeHandler = async () => {
        if (input.trim().length === 0) {
            toast.error("Please write a prompt")
            return
        }

        const toastId = toast.loading("Generating code...")
        setIsRunning(true)

        try {
            const prompt = `
You are a code generation assistant for the project "Code Sync".
Generate accurate, complete, and clean code ONLY.
Format the response inside Markdown code blocks using the correct language syntax.
No explanations or extra text.
Prompt: ${input}
`

            const code = await generateCode(prompt)

            if (code && code.trim().length > 0) {
                setOutput(code)
                toast.success("Code generated successfully", { id: toastId })
            } else {
                setOutput("No response received.")
                toast("No response received.", {
                    icon: "i",
                    id: toastId,
                })
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to generate the code"

            setOutput(message)
            toast.error(message, { id: toastId })
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <CopilotContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                isConfigured,
                generateCode: generateCodeHandler,
            }}
        >
            {children}
        </CopilotContext.Provider>
    )
}

export { CopilotContextProvider }
export default CopilotContext
