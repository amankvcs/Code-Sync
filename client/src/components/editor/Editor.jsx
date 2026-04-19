import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import { useSocket } from "@/context/SocketContext"
import usePageEvents from "@/hooks/usePageEvents"
import useResponsive from "@/hooks/useResponsive"
import { editorThemes } from "@/resources/Themes"
import { getEditorLanguageKey } from "@/utils/editorLanguages"
import { color } from "@uiw/codemirror-extensions-color"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { loadLanguage } from "@uiw/codemirror-extensions-langs"
import CodeMirror, {
    scrollPastEnd,
} from "@uiw/react-codemirror"
import { EditorView } from "@codemirror/view"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { collaborativeHighlighting, updateRemoteUsers } from "./collaborativeHighlighting"
import { SocketEvent } from "@/constants/SocketEvent"

function Editor() {
    const { users, currentUser } = useAppContext()
    const { activeFile, setActiveFile } = useFileSystem()
    const { theme, language, fontSize } = useSettings()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()
    const [timeOut, setTimeOut] = useState(setTimeout(() => {}, 0))
    const filteredUsers = useMemo(() => {
        if (!activeFile?.id) return []

        return users.filter((user) => {
            const isCurrentUser = currentUser.socketId
                ? user.socketId === currentUser.socketId
                : user.username === currentUser.username

            return !isCurrentUser && user.currentFile === activeFile.id
        })
    }, [activeFile?.id, currentUser.socketId, currentUser.username, users])
    const [extensions, setExtensions] = useState([])
    const editorRef = useRef(null)
    const lastCursorPositionRef = useRef(0)
    const lastSelectionRef = useRef({})
    const cursorMoveTimeoutRef = useRef(null)

    const onCodeChange = (code, view) => {
        if (!activeFile) return

        const file = { ...activeFile, content: code }
        setActiveFile(file)

        // Get cursor position and selection range
        const selection = view.state?.selection?.main
        const cursorPosition = selection?.head || 0
        const selectionStart = selection?.from
        const selectionEnd = selection?.to

        // Emit cursor and selection data
        socket.emit("typing_start", {
            fileId: activeFile.id,
            cursorPosition,
            selectionStart,
            selectionEnd
        })
        socket.emit("file_updated", {
            fileId: activeFile.id,
            newContent: code,
        })
        clearTimeout(timeOut)

        const newTimeOut = setTimeout(
            () => socket.emit("typing_pause"),
            1000,
        )
        setTimeOut(newTimeOut)
    }

    // Handle cursor/selection changes without typing
    const handleSelectionChange = useCallback((view) => {
        if (!activeFile || !view.selectionSet) return

        const selection = view.state?.selection?.main
        const cursorPosition = selection?.head || 0
        const selectionStart = selection?.from
        const selectionEnd = selection?.to

        // Check if cursor or selection actually changed
        const cursorChanged =
            cursorPosition !== lastCursorPositionRef.current
        const selectionChanged =
            selectionStart !== lastSelectionRef.current.start ||
            selectionEnd !== lastSelectionRef.current.end

        if (cursorChanged || selectionChanged) {
            lastCursorPositionRef.current = cursorPosition
            lastSelectionRef.current = {
                start: selectionStart,
                end: selectionEnd,
            }

            // Clear existing timeout
            if (cursorMoveTimeoutRef.current) {
                clearTimeout(cursorMoveTimeoutRef.current)
            }

            // Debounce cursor move events
            cursorMoveTimeoutRef.current = setTimeout(() => {
                socket.emit(SocketEvent.CURSOR_MOVE, {
                    fileId: activeFile.id,
                    cursorPosition,
                    selectionStart,
                    selectionEnd
                })
            }, 100) // 100ms debounce
        }
    }, [activeFile, socket])

    // Listen wheel event to zoom in/out and prevent page reload
    usePageEvents()

    useEffect(() => {
        const extensions = [
            color,
            hyperLink,
            collaborativeHighlighting(),
            EditorView.updateListener.of(handleSelectionChange),
            scrollPastEnd(),
        ]
        const languageKey = getEditorLanguageKey(language)
        const langExt = loadLanguage(languageKey)

        if (langExt) {
            toast.dismiss("syntax-highlighting-unavailable")
            extensions.push(langExt)
        } else {
            toast.error(
                "Syntax highlighting is unavailable for this language. Please adjust the editor settings; it may be listed under a different name.",
                {
                    duration: 5000,
                    id: "syntax-highlighting-unavailable",
                },
            )
        }

        setExtensions(extensions)
    }, [language, handleSelectionChange])

    // Update remote users when filteredUsers changes
    useEffect(() => {
        if (editorRef.current?.view) {
            editorRef.current.view.dispatch({
                effects: updateRemoteUsers.of(filteredUsers)
            })
        }
    }, [filteredUsers])

    return (
        <CodeMirror
            ref={editorRef}
            theme={editorThemes[theme]}
            onChange={onCodeChange}
            value={activeFile?.content}
            extensions={extensions}
            minHeight="100%"
            maxWidth="100vw"
            style={{
                fontSize: fontSize + "px",
                height: viewHeight,
                position: "relative",
            }}
        />
    )
}

export default Editor
