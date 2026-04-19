// src/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import copilotRouter from "./routes/copilot.js";
import runCodeRouter from "./routes/runCode.js";
import { SocketEvent } from "./types/socket.js";
import { USER_CONNECTION_STATUS } from "./types/user.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  "http://localhost:5174",
];
if (CLIENT_ORIGIN) allowedOrigins.push(CLIENT_ORIGIN);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use("/api/copilot", copilotRouter);
app.use("/api/run-code", runCodeRouter);
app.use(express.static(path.join(__dirname, "public")));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
  transports: ["websocket", "polling"],
});

const LegacySocketEvent = {
  USER_JOINED: "user_joined",
  SYNC_FILE_STRUCTURE: "sync_file_structure",
  DIRECTORY_CREATED: "directory_created",
  DIRECTORY_UPDATED: "directory_updated",
  DIRECTORY_RENAMED: "directory_renamed",
  DIRECTORY_DELETED: "directory_deleted",
  FILE_CREATED: "file_created",
  FILE_UPDATED: "file_updated",
  FILE_RENAMED: "file_renamed",
  FILE_DELETED: "file_deleted",
  RECEIVE_MESSAGE: "receive_message",
  TYPING_START: "typing_start",
  TYPING_PAUSE: "typing_pause",
  CURSOR_MOVE: "cursor_move",
  REQUEST_DRAWING: "request_drawing",
  SYNC_DRAWING: "sync_drawing",
};

const userSocketMap = new Map();
const roomIdToFileStructureMap = new Map();
const roomIdToDrawingDataMap = new Map();

function getUsersInRoom(roomId) {
  return Array.from(userSocketMap.values()).filter(
    (user) => user.roomId === roomId,
  );
}

function getRoomId(socketId) {
  return userSocketMap.get(socketId)?.roomId || null;
}

function updateUser(socketId, updates) {
  const user = userSocketMap.get(socketId);
  if (!user) return null;

  const updatedUser = {
    ...user,
    ...updates,
  };

  userSocketMap.set(socketId, updatedUser);
  return updatedUser;
}

function emitToSocket(socketId, eventName, payload) {
  if (!socketId) return;
  io.to(socketId).emit(eventName, payload);
}

function emitToRoom(roomId, excludedSocketId, eventName, payload) {
  if (!roomId) return;

  if (excludedSocketId) {
    io.except(excludedSocketId).to(roomId).emit(eventName, payload);
    return;
  }

  io.to(roomId).emit(eventName, payload);
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
    const existingUsersInRoom = getUsersInRoom(roomId);
    const isUsernameExist = existingUsersInRoom.some(
      (user) => user.username === username,
    );

    if (isUsernameExist) {
      emitToSocket(socket.id, SocketEvent.USERNAME_EXISTS);
      return;
    }

    const existingRoomState = roomIdToFileStructureMap.get(roomId) || null;
    const existingDrawingData = roomIdToDrawingDataMap.get(roomId) || null;

    const newUser = {
      username,
      roomId,
      status: USER_CONNECTION_STATUS.ONLINE,
      cursorPosition: 0,
      typing: false,
      socketId: socket.id,
      currentFile: null,
      selectionStart: undefined,
      selectionEnd: undefined,
    };

    userSocketMap.set(socket.id, newUser);
    socket.join(roomId);

    emitToRoom(roomId, socket.id, LegacySocketEvent.USER_JOINED, {
      user: newUser,
    });

    emitToSocket(socket.id, SocketEvent.JOIN_ACCEPTED, {
      user: newUser,
      users: getUsersInRoom(roomId),
      fileStructure: existingRoomState?.fileStructure || [],
    });

    if (existingRoomState) {
      emitToSocket(
        socket.id,
        LegacySocketEvent.SYNC_FILE_STRUCTURE,
        existingRoomState,
      );
    }

    if (existingDrawingData) {
      emitToSocket(socket.id, SocketEvent.SYNC_DRAWING, {
        drawingData: existingDrawingData,
      });
    }
  });

  socket.on(LegacySocketEvent.SYNC_FILE_STRUCTURE, (payload = {}) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;

    const roomState = {
      fileStructure: payload.fileStructure,
      openFiles: payload.openFiles,
      activeFile: payload.activeFile,
    };

    roomIdToFileStructureMap.set(roomId, roomState);

    if (payload.socketId) {
      emitToSocket(
        payload.socketId,
        LegacySocketEvent.SYNC_FILE_STRUCTURE,
        roomState,
      );
      return;
    }

    emitToRoom(
      roomId,
      socket.id,
      LegacySocketEvent.SYNC_FILE_STRUCTURE,
      roomState,
    );
  });

  socket.on(LegacySocketEvent.DIRECTORY_CREATED, (payload = {}) => {
    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.DIRECTORY_CREATED,
      payload,
    );
  });

  socket.on(LegacySocketEvent.DIRECTORY_UPDATED, (payload = {}) => {
    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.DIRECTORY_UPDATED,
      payload,
    );
  });

  socket.on(LegacySocketEvent.DIRECTORY_RENAMED, (payload = {}) => {
    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.DIRECTORY_RENAMED,
      payload,
    );
  });

  socket.on(LegacySocketEvent.DIRECTORY_DELETED, (payload = {}) => {
    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.DIRECTORY_DELETED,
      payload,
    );
  });

  socket.on(LegacySocketEvent.FILE_CREATED, (payload = {}) => {
    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.FILE_CREATED,
      payload,
    );
  });

  socket.on(LegacySocketEvent.FILE_UPDATED, (payload = {}) => {
    if (payload.fileId) {
      updateUser(socket.id, {
        currentFile: payload.fileId,
      });
    }

    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.FILE_UPDATED,
      payload,
    );
  });

  socket.on(LegacySocketEvent.FILE_RENAMED, (payload = {}) => {
    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.FILE_RENAMED,
      payload,
    );
  });

  socket.on(LegacySocketEvent.FILE_DELETED, (payload = {}) => {
    emitToRoom(
      getRoomId(socket.id),
      socket.id,
      LegacySocketEvent.FILE_DELETED,
      payload,
    );
  });

  socket.on(SocketEvent.SEND_MESSAGE, ({ message } = {}) => {
    if (!message) return;

    emitToRoom(getRoomId(socket.id), socket.id, LegacySocketEvent.RECEIVE_MESSAGE, {
      message,
    });
  });

  socket.on(LegacySocketEvent.TYPING_START, (payload = {}) => {
    updateUser(socket.id, {
      currentFile: payload.fileId,
      typing: true,
      cursorPosition: payload.cursorPosition ?? 0,
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd,
    });

    emitToRoom(getRoomId(socket.id), socket.id, LegacySocketEvent.TYPING_START, {
      socketId: socket.id,
      fileId: payload.fileId,
      cursorPosition: payload.cursorPosition ?? 0,
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd,
    });
  });

  socket.on(LegacySocketEvent.TYPING_PAUSE, () => {
    updateUser(socket.id, {
      typing: false,
    });

    emitToRoom(getRoomId(socket.id), socket.id, LegacySocketEvent.TYPING_PAUSE, {
      socketId: socket.id,
    });
  });

  socket.on(LegacySocketEvent.CURSOR_MOVE, (payload = {}) => {
    updateUser(socket.id, {
      currentFile: payload.fileId,
      cursorPosition: payload.cursorPosition ?? 0,
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd,
    });

    emitToRoom(getRoomId(socket.id), socket.id, LegacySocketEvent.CURSOR_MOVE, {
      socketId: socket.id,
      fileId: payload.fileId,
      cursorPosition: payload.cursorPosition ?? 0,
      selectionStart: payload.selectionStart,
      selectionEnd: payload.selectionEnd,
    });
  });

  socket.on(SocketEvent.USER_ONLINE, () => {
    updateUser(socket.id, {
      status: USER_CONNECTION_STATUS.ONLINE,
    });

    emitToRoom(getRoomId(socket.id), socket.id, SocketEvent.USER_ONLINE, {
      socketId: socket.id,
    });
  });

  socket.on(SocketEvent.USER_OFFLINE, () => {
    updateUser(socket.id, {
      status: USER_CONNECTION_STATUS.OFFLINE,
      typing: false,
    });

    emitToRoom(getRoomId(socket.id), socket.id, SocketEvent.USER_OFFLINE, {
      socketId: socket.id,
    });
  });

  socket.on(LegacySocketEvent.REQUEST_DRAWING, () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;

    const existingDrawingData = roomIdToDrawingDataMap.get(roomId);
    if (existingDrawingData) {
      emitToSocket(socket.id, SocketEvent.SYNC_DRAWING, {
        drawingData: existingDrawingData,
      });
      return;
    }

    emitToRoom(roomId, socket.id, SocketEvent.REQUEST_DRAWING, {
      socketId: socket.id,
    });
  });

  socket.on(LegacySocketEvent.SYNC_DRAWING, ({ socketId, drawingData } = {}) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;

    if (drawingData) {
      roomIdToDrawingDataMap.set(roomId, drawingData);
    }

    const payload = { drawingData };

    if (socketId) {
      emitToSocket(socketId, SocketEvent.SYNC_DRAWING, payload);
      return;
    }

    emitToRoom(roomId, socket.id, SocketEvent.SYNC_DRAWING, payload);
  });

  socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot, drawingData } = {}) => {
    const roomId = getRoomId(socket.id);
    if (!roomId || !snapshot) return;

    if (drawingData) {
      roomIdToDrawingDataMap.set(roomId, drawingData);
    }

    emitToRoom(roomId, socket.id, SocketEvent.DRAWING_UPDATE, {
      snapshot,
    });
  });

  socket.on("disconnecting", () => {
    const user = userSocketMap.get(socket.id);
    if (!user) return;

    userSocketMap.delete(socket.id);
    emitToRoom(user.roomId, socket.id, SocketEvent.USER_DISCONNECTED, {
      user,
    });
    socket.leave(user.roomId);
  });
});

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
