import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { useCallback, useEffect, useRef } from "react"
import { Tldraw, useEditor } from "tldraw"
import { SocketEvent } from "@/types/socket"

function DrawingEditor() {
    const { isMobile } = useWindowDimensions()

    return (
        <Tldraw
            inferDarkMode
            forceMobile={isMobile}
            defaultName="Editor"
            className="z-0"
        >
            <ReachEditor />
        </Tldraw>
    )
}

function ReachEditor() {
    const editor = useEditor()
    const { drawingData, setDrawingData } = useAppContext()
    const { socket } = useSocket()
    const hasLoadedInitialSnapshotRef = useRef(false)

    const loadSnapshot = useCallback(
        (snapshot) => {
            if (!snapshot || Object.keys(snapshot).length === 0) return
            editor.loadSnapshot(snapshot)
        },
        [editor],
    )

    const handleChangeEvent = useCallback(
        (change) => {
            const snapshot = change.changes
            const drawingSnapshot = editor.store.getStoreSnapshot()

            setDrawingData(drawingSnapshot)
            socket.emit(SocketEvent.DRAWING_UPDATE, {
                snapshot,
                drawingData: drawingSnapshot,
            })
        },
        [editor.store, setDrawingData, socket],
    )

    const handleRemoteDrawing = useCallback(
        ({ snapshot }) => {
            if (!snapshot) return

            editor.store.mergeRemoteChanges(() => {
                editor.store.applyDiff(snapshot, { runCallbacks: false })
            })

            setDrawingData(editor.store.getStoreSnapshot())
        },
        [editor.store, setDrawingData],
    )

    useEffect(() => {
        if (hasLoadedInitialSnapshotRef.current) return
        if (!drawingData || Object.keys(drawingData).length === 0) return

        loadSnapshot(drawingData)
        hasLoadedInitialSnapshotRef.current = true
    }, [drawingData, loadSnapshot])

    useEffect(() => {
        const cleanupFunction = editor.store.listen(handleChangeEvent, {
            source: "user",
            scope: "document",
        })

        socket.on(SocketEvent.DRAWING_UPDATE, handleRemoteDrawing)

        return () => {
            cleanupFunction()
            socket.off(SocketEvent.DRAWING_UPDATE, handleRemoteDrawing)
        }
    }, [editor.store, handleChangeEvent, handleRemoteDrawing, socket])

    return null
}

export default DrawingEditor
