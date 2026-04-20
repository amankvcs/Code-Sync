# Project Synopsis

## Project Title

**Code Sync: A Real-Time Collaborative Coding and Communication Workspace**

## 1. Introduction

Software development increasingly depends on collaboration, rapid communication, shared understanding, and quick experimentation. Traditional coding tools are powerful for individuals, but many lightweight classroom and project environments still lack an integrated platform where multiple users can code, discuss, draw, and test ideas together in real time.

**Code Sync** is developed to address this gap. It is a browser-based collaborative coding workspace in which users join a common room and work together on shared files. Along with collaborative editing, the platform also includes a group chat module, a shared drawing board, a code execution panel, and an AI copilot for code generation support.

## 2. Abstract

Code Sync is a full-stack web application that provides a real-time collaborative programming environment. It allows multiple users to join a shared room and work on the same codebase simultaneously. The platform supports live code editing, synchronized file and folder management, remote cursor awareness, group chat, collaborative drawing, code execution through Judge0, and AI-assisted code generation through an integrated copilot panel.

The frontend is built using React and Vite, while the backend is implemented with Express and Socket.IO. The system follows an event-driven client-server architecture to synchronize actions across all users in a room. By integrating communication, editing, execution, and AI assistance in one place, Code Sync improves teamwork and learning efficiency for collaborative programming scenarios.

## 3. Problem Statement

In academic and small-team coding environments, collaboration is often fragmented across multiple tools. One tool is used for code editing, another for chat, another for whiteboarding, and another for execution or code assistance. This separation increases context switching, slows communication, and reduces productivity.

The problem addressed by this project is the lack of a single, lightweight, browser-accessible workspace that supports:

- Shared real-time coding
- Team discussion
- Diagram or logic sketching
- Code execution
- AI-assisted coding support

## 4. Proposed Solution

The proposed solution is a unified collaborative web platform called **Code Sync**. The system provides a room-based shared workspace where users can:

- Join using a room ID and username
- Collaboratively manage files and directories
- Write and edit code simultaneously
- View typing status and remote cursor positions
- Exchange messages through group chat
- Draw diagrams and flow sketches on a shared canvas
- Run source code in supported languages
- Generate code snippets using an AI copilot

This integration reduces tool fragmentation and creates a more effective environment for coding practice, team collaboration, and project-based learning.

## 5. Objectives

The main objectives of the project are:

- To develop a real-time collaborative code editor accessible through a browser
- To support multi-user synchronization using WebSockets
- To provide a shared file explorer and editor workspace
- To enable communication using a built-in group chat
- To provide a shared drawing board for discussions and planning
- To integrate code execution for common programming languages
- To include AI-based code generation support
- To create a responsive and user-friendly interface for desktop and mobile usage

## 6. Scope of the Project

The scope of the current project includes:

- Real-time room-based collaboration
- Shared file structure management
- Collaborative code editing
- Chat-based communication
- Shared whiteboard mode
- Code execution for JavaScript, Python, Java, C, and C++
- AI-assisted code generation
- User settings for editor customization

The current version does not include:

- Authentication and user accounts
- Persistent database storage for room history
- Version control integration
- Advanced access control or moderator roles

## 7. Development Methodology

The project follows an incremental and modular development approach.

### Step 1: Requirement Analysis

- Identify the need for collaborative coding and integrated communication
- Define core modules such as editor, chat, drawing, execution, and copilot

### Step 2: System Design

- Design a client-server architecture
- Plan real-time event flow using Socket.IO
- Structure the frontend using reusable React components and context providers

### Step 3: Implementation

- Build the frontend interface using React and Vite
- Build the backend using Express and Socket.IO
- Integrate Judge0 for code execution
- Integrate Hugging Face or Pollinations for AI code generation

### Step 4: Testing

- Validate room joining and synchronization
- Test file operations and editor behavior
- Verify chat, drawing, code execution, and copilot features

### Step 5: Deployment and Documentation

- Configure backend deployment settings
- Prepare academic documentation such as synopsis and SRS

## 8. Technologies Used

### Frontend

- React
- Vite
- React Router
- CodeMirror
- Tldraw
- Tailwind CSS utilities
- Socket.IO Client

### Backend

- Node.js
- Express.js
- Socket.IO
- CORS
- dotenv

### External Services

- Judge0 API for code execution
- Hugging Face Router API for AI generation
- Pollinations API as AI fallback provider

### Supporting Libraries

- JSZip
- File Saver
- React Hot Toast
- React Icons
- React Markdown
- UUID

## 9. System Architecture Overview

The project uses a client-server architecture.

- The **client** handles the user interface, code editor, file explorer, chat, drawing board, settings, and API requests.
- The **server** handles room management, user synchronization, real-time event broadcasting, code execution proxying, and AI request proxying.
- **External services** perform code execution and AI generation.

### Data Flow Summary

1. User enters username and room ID.
2. Frontend sends a join request to the server.
3. Server validates the request and returns room state.
4. Users collaborate through real-time Socket.IO events.
5. Code execution and copilot requests go from frontend to backend and then to third-party APIs.

## 10. Module Description

### 10.1 Room and Presence Module

- Allows room creation and joining
- Prevents duplicate usernames in the same room
- Shows active users and connection state

### 10.2 File Management Module

- Maintains a shared file structure
- Supports file and directory create, rename, delete, open, and download actions
- Allows local folder import into the collaborative workspace

### 10.3 Collaborative Editor Module

- Provides code editing through CodeMirror
- Synchronizes file content in real time
- Displays remote cursor positions and text selection
- Supports theme and language configuration

### 10.4 Chat Module

- Enables group messaging inside a room
- Displays sender name and timestamp

### 10.5 Drawing Module

- Provides a shared drawing board
- Synchronizes drawing snapshots across users

### 10.6 Code Execution Module

- Sends source code to Judge0 through the backend
- Polls for execution result
- Displays output, compile errors, or runtime errors

### 10.7 AI Copilot Module

- Accepts a user prompt for code generation
- Fetches AI-generated code through the backend
- Allows copy, paste, and replace actions for generated output

### 10.8 Settings Module

- Stores theme, language, font size, and font family preferences in local storage

## 11. Feasibility Study

### 11.1 Technical Feasibility

The project is technically feasible because it uses widely adopted web technologies and available third-party APIs. Real-time communication is effectively handled by Socket.IO, while Judge0 and AI providers simplify advanced feature integration.

### 11.2 Economic Feasibility

The project is economically feasible for academic development because it relies on open-source frameworks and can operate with low-cost or free-tier services during development and demonstration.

### 11.3 Operational Feasibility

The project is operationally feasible because users only need a browser and internet connection. The interface is straightforward, and no complex installation is required on the client side.

## 12. Hardware and Software Requirements

### Hardware Requirements

- Processor: Dual-core or higher
- RAM: 4 GB minimum
- Storage: 1 GB free space for development environment
- Internet connection for real-time collaboration and API usage

### Software Requirements

- Operating System: Windows, Linux, or macOS
- Browser: Chrome, Edge, Firefox, or equivalent modern browser
- Node.js: Version 18 to 22
- Package Manager: npm

## 13. Expected Outcomes

At the end of the project, the system should:

- Allow multiple users to collaborate in a shared coding room
- Synchronize source code and file operations in real time
- Support communication and whiteboard-style interaction
- Run code using external execution infrastructure
- Provide AI assistance to improve coding speed

## 14. Limitations

The present implementation has the following limitations:

- No persistent database storage
- No login or account management
- No full project history or version control
- Dependence on external services for execution and AI features
- Room data may be lost on backend restart

## 15. Future Scope

The project can be extended with:

- User authentication and profiles
- Persistent project storage
- Git integration
- Voice or video communication
- More programming languages
- Role-based permissions
- Session recovery and history
- Advanced AI features such as debugging help or explanation mode

## 16. Conclusion

Code Sync is a practical and relevant collaborative software project that brings together multiple essential development activities into a single browser-based platform. It demonstrates the integration of real-time communication, code editing, whiteboarding, execution, and AI support in one system. The project is well suited for academic evaluation because it combines frontend development, backend communication, API integration, and collaborative system design in a meaningful real-world use case.

## 17. References

- React Documentation
- Vite Documentation
- Express.js Documentation
- Socket.IO Documentation
- Judge0 API Documentation
- CodeMirror Documentation
- Tldraw Documentation
