# Agent Arena - Workspace Directives

## Project Architecture
- **Backend**: A Python-based FastAPI application located in the `backend/` directory. It uses the Google Gemini SDK for agentic work and MongoDB for data persistence.
- **Frontend**: A TypeScript-based Next.js application in the `frontend/` directory. It uses MediaPipe for camera-based analysis.

## Core Directives
- **Dependency Management**: Use `requirements.txt` for the Python backend and `pnpm` for the frontend.
- **Configuration**: All secrets, such as `MONGO_URI` and `GEMINI_API_KEY`, must be managed via a `backend/.env` file. This file is intentionally not committed to source control. Use `backend/.env.example` as a template.
- **Code Style**: Adhere to standard Python (PEP 8) and TypeScript (Prettier) formatting conventions.
- **Commits**: Ensure `.env` files, `__pycache__` directories, and `node_modules` are never committed. The root `.gitignore` file is the source of truth for this policy.
