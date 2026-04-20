# Software Requirements Specification

## Project Title

**Code Sync: A Real-Time Collaborative Coding and Communication Workspace**

## Document Control

- Version: 1.0
- Date: 20 April 2026
- Document Type: Software Requirements Specification
- Prepared For: Academic project documentation
- Prepared By: _Update with student name_

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification describes the functional and non-functional requirements of **Code Sync**, a browser-based collaborative coding platform that enables multiple users to join a shared room, edit source code together, communicate in real time, draw diagrams on a shared whiteboard, run code, and generate code suggestions using an AI copilot.

The purpose of this document is to define what the system does, the constraints under which it operates, the technologies involved, and the criteria by which it can be validated.

### 1.2 Scope

Code Sync is designed as a lightweight collaborative development environment for students, teams, interview practice sessions, and pair-programming use cases. The system supports:

- Room-based collaboration using a unique room ID
- Simultaneous multi-user code editing
- Shared file and folder management
- Real-time user presence and cursor awareness
- Group chat communication
- Collaborative drawing/whiteboard support
- Code execution for selected programming languages
- AI-assisted code generation through a copilot panel
- Local editor customization such as theme, font family, font size, and language preference

The current implementation is intended for small-group real-time collaboration in a browser environment.

### 1.3 Definitions and Acronyms

- **SRS**: Software Requirements Specification
- **UI**: User Interface
- **API**: Application Programming Interface
- **IDE**: Integrated Development Environment
- **Socket.IO**: Library used for real-time bidirectional communication between client and server
- **Judge0**: Third-party code execution service used to run source code
- **Copilot**: AI-based code generation assistant in the system
- **Room**: Shared collaboration session identified by a room ID

### 1.4 Intended Audience

This document is intended for:

- Project evaluators and faculty members
- Developers maintaining the system
- Testers performing validation
- Team members preparing project reports or presentations

### 1.5 Product Perspective

Code Sync is a web application built using a client-server architecture.

- The **frontend** is a React application built with Vite.
- The **backend** is an Express server with Socket.IO for real-time communication.
- Code execution is delegated to **Judge0** through backend proxy routes.
- AI code generation is delegated to **Hugging Face** or **Pollinations** through backend proxy routes.

The current version stores live room state in memory on the server. This means room data is available only while the server process remains active.

## 2. Overall Description

### 2.1 Product Functions

The major functions of the system are:

- Create or join a room using a room ID and username
- Prevent duplicate usernames inside the same room
- Show connected users and their online/offline state
- Maintain a shared virtual file structure for all users in a room
- Create, rename, delete, and update files and directories
- Open, edit, and switch among multiple files
- Synchronize file changes instantly across users
- Show remote typing indicators, cursors, and selected text
- Allow users to exchange text messages in a group chat
- Provide a shared collaborative drawing canvas
- Run code through Judge0 with optional standard input
- Generate code suggestions through the AI copilot
- Download the current project workspace as a ZIP archive
- Import a local folder or project structure into the workspace
- Customize editor appearance and behavior

### 2.2 User Classes and Characteristics

#### 2.2.1 Collaborator

- A normal user who joins a room by entering a username and room ID
- Can edit files, chat, draw, run code, and use copilot
- Has the same privileges as other room participants

#### 2.2.2 Session Creator

- A collaborator who generates a new room ID and invites others
- Has no special administrative privileges in the current implementation

#### 2.2.3 System Maintainer

- Configures environment variables and deployment
- Monitors server availability and third-party service availability

### 2.3 Operating Environment

#### Client Environment

- Modern browser with JavaScript enabled
- Desktop or mobile browser
- Browser support for WebSockets
- Optional support for `showDirectoryPicker` or `webkitdirectory` for folder import

#### Server Environment

- Node.js 18 to 22
- Express.js backend
- Socket.IO server
- Internet access to external APIs for Judge0 and AI provider integration

### 2.4 Design and Implementation Constraints

- The system depends on external services for code execution and AI generation.
- Live collaboration state is maintained in server memory and is not persisted to a database.
- No login/authentication module is implemented in the current version.
- Browser compatibility may affect folder upload behavior.
- Network interruptions can affect synchronization quality.

### 2.5 Assumptions and Dependencies

- Users have a stable internet connection during collaboration.
- The backend server is reachable from the frontend.
- Judge0 is available for code execution requests.
- Hugging Face or Pollinations is available for AI response generation.
- Users collaborate honestly; role-based permissions are not enforced.

## 3. System Features and Functional Requirements

### FR-1 Room Creation and Joining

The system shall allow a user to create a new room ID.

The system shall allow a user to join a room by providing:

- Username
- Room ID

The system shall validate:

- Username must not be empty
- Username must contain at least 3 characters
- Room ID must not be empty
- Room ID must contain at least 5 characters

The system shall reject duplicate usernames inside the same room.

### FR-2 User Presence Management

The system shall maintain a list of users in each room.

The system shall notify users when:

- A user joins the room
- A user disconnects from the room
- A user becomes online
- A user becomes offline

The system shall display the presence state of users in the UI.

### FR-3 Shared File Management

The system shall maintain a room-level shared file structure.

The system shall allow collaborators to:

- Create files
- Rename files
- Delete files
- Create directories
- Rename directories
- Delete directories
- Expand and collapse directories
- Open multiple files in tabs

The system shall synchronize file structure changes across all users in the room.

### FR-4 Collaborative Code Editing

The system shall allow users to edit the content of an open file.

The system shall broadcast file content changes to other collaborators in the same room.

The system shall track:

- Active file per user
- Cursor position
- Selection start and end
- Typing status

The system shall visually indicate remote cursors and text selections for collaborators editing the same file.

### FR-5 Chat Module

The system shall allow users to send and receive text messages in a room.

Each message shall contain:

- Message ID
- Username
- Message text
- Timestamp

The system shall display sent and received messages in a scrollable chat list.

### FR-6 Drawing Workspace

The system shall provide a shared drawing mode for whiteboarding and diagram sketching.

The system shall allow users to switch between:

- Coding mode
- Drawing mode

The system shall synchronize drawing changes across connected users in the same room.

The system shall send existing drawing data to newly connected collaborators when available.

### FR-7 Code Execution

The system shall allow a user to run the code of the active file.

The system shall support the following languages in the current implementation:

- JavaScript
- Python
- Java
- C
- C++

The system shall allow users to provide standard input before execution.

The system shall submit code to Judge0 through the backend and poll for execution results.

The system shall display one of the following outputs:

- Standard output
- Standard error
- Compile output
- Execution message

### FR-8 AI Copilot

The system shall provide an AI copilot interface where a user can enter a code generation prompt.

The system shall send the prompt to the backend AI route.

The system shall render the response as Markdown with code blocks.

The system shall allow users to:

- Copy the generated output
- Paste the output into the current file
- Replace the current file content with the generated output

### FR-9 Project Import and Export

The system shall allow users to load a local directory into the workspace.

The system shall ignore common non-essential directories such as:

- `node_modules`
- `.git`
- `.vscode`
- `.next`

The system shall allow users to download the workspace as a ZIP archive.

### FR-10 Editor Settings

The system shall allow users to configure:

- Editor theme
- Programming language mode
- Font family
- Font size
- GitHub corner visibility setting

The system shall store settings in local browser storage.

## 4. External Interface Requirements

### 4.1 User Interface Requirements

The application shall provide:

- A home page to create or join a collaboration room
- An editor page with a sidebar and main workspace
- Sidebar panels for Files, Chat, Copilot, Run, Users, and Settings
- A toggle to switch between coding mode and drawing mode
- A responsive layout for desktop and mobile screens

### 4.2 Hardware Interface Requirements

No specialized hardware interface is required.

Recommended hardware:

- Standard keyboard and mouse for desktop use
- Touch support for mobile drawing and navigation where supported

### 4.3 Software Interface Requirements

#### Frontend Interfaces

- React 18
- React Router
- CodeMirror
- Tldraw
- Socket.IO client
- Tailwind CSS utilities

#### Backend Interfaces

- Express.js
- Socket.IO server
- CORS middleware

#### External Service Interfaces

- Judge0 CE API for code execution
- Hugging Face Router API for AI generation when API key is configured
- Pollinations API as fallback AI provider when Hugging Face key is unavailable

### 4.4 Communication Interfaces

- HTTP/HTTPS for REST API requests
- WebSocket communication through Socket.IO for real-time updates
- JSON payloads for client-server data exchange

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

- The system should propagate collaboration updates with minimal perceived delay on a normal broadband connection.
- The system should return room join feedback promptly.
- The system should display AI or code-execution progress states during long-running requests.

### 5.2 Reliability Requirements

- The system should recover from transient API failures where retry logic is implemented.
- The system should display meaningful error messages when third-party services fail.
- The system should avoid crashing on malformed or empty API responses.

### 5.3 Availability Requirements

- The system should remain available as long as the frontend, backend, and third-party services are available.
- Real-time features depend on WebSocket connectivity.

### 5.4 Usability Requirements

- The UI should be simple enough for students and new users.
- Common actions such as joining a room, opening files, chatting, and running code should require minimal steps.
- Visual feedback should be provided through toasts, status indicators, and icons.

### 5.5 Security Requirements

- The current version does not include authentication or authorization.
- Sensitive API keys shall remain on the server side.
- The system should validate basic request payloads on backend routes.
- CORS shall be restricted to allowed origins configured in the backend.

### 5.6 Maintainability Requirements

- The project should remain modular through separate contexts, components, and route files.
- Future features should be implementable without rewriting the entire architecture.

### 5.7 Portability Requirements

- The application should run in modern browsers.
- The backend should run on standard Node.js hosting environments.

## 6. Data Requirements

### 6.1 Core Data Entities

#### User

- Username
- Room ID
- Socket ID
- Online/offline status
- Current file
- Cursor position
- Selection range
- Typing state

#### File Node

- ID
- Name
- Type (`file` or `directory`)
- Content for files
- Children for directories
- Open/closed state for directories

#### Chat Message

- ID
- Username
- Message text
- Timestamp

#### Drawing Data

- Shared tldraw snapshot/state

#### Code Execution Request

- Source code
- Language ID
- Standard input
- Submission token
- Execution output

#### Copilot Request

- Prompt
- Provider
- Generated content

### 6.2 Data Storage

- Room user state is stored in server memory
- File structure is stored in server memory per room
- Drawing data is stored in server memory per room
- User preferences are stored in browser local storage
- Chat messages are stored in client memory during active session

### 6.3 Data Retention

In the current implementation:

- Room state is not persisted after server restart
- Chat history is not permanently stored
- Drawing history is not permanently stored
- User settings remain in local storage on the client device

## 7. System Architecture

### 7.1 Architectural Style

The system follows a client-server architecture with event-driven real-time synchronization.

### 7.2 High-Level Components

#### Frontend

- Home page for room entry
- Editor page for workspace access
- Sidebar modules for navigation and tools
- Context providers for app, socket, file system, run code, chat, settings, views, and copilot

#### Backend

- Express application
- Socket.IO collaboration server
- REST route for code execution
- REST route for AI copilot

#### External Services

- Judge0 for code execution
- Hugging Face or Pollinations for AI generation

### 7.3 Architectural Flow

1. A user opens the frontend and enters room details.
2. The frontend sends a join request to the backend through Socket.IO.
3. The backend validates the username and room state.
4. On success, the backend joins the socket to the room and sends room data.
5. File edits, cursor updates, chat messages, drawing updates, and presence changes are broadcast through Socket.IO.
6. Code execution and AI copilot requests are sent over HTTP to backend routes.
7. The backend proxies these requests to external providers and returns the result to the client.

## 8. Constraints, Risks, and Limitations

### 8.1 Constraints

- External APIs may impose rate limits or temporary outages.
- Browser security rules limit direct local file system access.
- Collaboration quality depends on network performance.

### 8.2 Risks

- External dependency downtime may disable AI or execution features.
- In-memory room data may be lost if the backend restarts.
- Simultaneous edits from multiple users may cause last-write-wins behavior for file content.

### 8.3 Current Limitations

- No user authentication
- No persistent database-backed storage
- No version control integration
- No role-based permissions
- Limited built-in execution language set

## 9. Validation and Acceptance Criteria

The system shall be considered acceptable if:

- Users can create or join a room successfully.
- Multiple users can edit shared files in real time.
- File create, rename, delete, and synchronization operations work across clients.
- Group chat messages are exchanged correctly.
- Drawing mode synchronizes between room participants.
- Code execution returns valid results for supported languages.
- Copilot generates code suggestions and allows insertion into files.
- User settings persist across browser reloads.

## 10. Suggested Test Cases

- Join room with valid username and room ID
- Reject duplicate username in same room
- Create, rename, and delete file
- Create, rename, and delete directory
- Edit file from one client and verify change on another client
- Verify remote cursor and selection indication
- Send and receive chat messages
- Switch to drawing mode and verify shared synchronization
- Execute valid and invalid code samples in supported languages
- Generate code from copilot and insert it into active file
- Download workspace ZIP
- Load a local project folder into the workspace

## 11. Future Enhancements

- Persistent storage using a database
- Authentication and authorization
- Room ownership and moderation controls
- More programming language support
- Shared terminal or debugger integration
- File version history and rollback
- Richer AI assistance such as bug fixing and explanation mode

## 12. Conclusion

Code Sync is a modern collaborative coding platform that combines real-time editing, communication, drawing, execution, and AI assistance into a single browser-based workspace. The current implementation is suitable as a strong academic project because it demonstrates full-stack development, event-driven synchronization, API integration, and interactive UI design. This SRS captures the present scope of the system and provides a foundation for evaluation and future development.
