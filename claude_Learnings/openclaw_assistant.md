---
name: OpenClaw Personal AI Assistant
description: Brief overview of the OpenClaw personal AI assistant project
type: reference
---

# OpenClaw – Personal AI Assistant

OpenClaw is an open‑source personal AI assistant that enables conversational interaction with Claude‑style language models. It provides a lightweight UI (web, desktop, or VS Code extension) and integrates tightly with everyday tools such as the terminal, file system, web browser, calendar, and notes.

## Key Features
- **Chat interface** – Natural‑language conversation for asking questions, giving commands, or brainstorming.
- **Tool integration** – Built‑in actions for reading/writing files, executing shell commands, performing web searches, and accessing calendars.
- **Extensible plugins** – Add custom plugins to connect to Git, issue trackers, home‑automation, or any API you need.
- **Privacy‑first** – Run the model locally (e.g., via Ollama, LM‑Studio, or Anthropic API) or on a self‑hosted server; no data is forced to the cloud.
- **Cross‑platform** – Works on macOS, Linux, and Windows; usable as a CLI tool, background service, or editor plug‑in.
- **Open source** – MIT‑style license, fully inspectable and forkable.

## Typical Use Cases
- Quickly retrieve information from files or the web.
- Automate repetitive command‑line tasks via natural language.
- Manage calendar events, reminders, and notes.
- Integrate with development workflows (e.g., generate code snippets, run tests, create PRs). 

## Getting Started
1. Clone the repository: `git clone https://github.com/openclaw/openclaw.git`
2. Follow the installation guide to set up the model backend (Ollama, Anthropic API, etc.).
3. Launch the UI (`openclaw serve`) or use the VS Code extension.
4. Interact with the assistant using natural language; invoke actions with `/` commands.

---
*Generated with Claude Code.*