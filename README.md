# Agent Arena - AI Presentation & Interview Coach

This repository contains the full-stack application for **Agent Arena**, an AI-powered coach designed to help users improve their presentation and public speaking skills.

The system uses a multi-agent pipeline to analyze user practice sessions, providing a detailed scorecard with actionable feedback and personalized drills.

## Core Technologies

- **Frontend**: Next.js, TypeScript, MediaPipe for real-time facial landmark detection.
- **Backend**: FastAPI, Python, Google Gemini SDK, and Motor for asynchronous MongoDB access.
- **Database**: MongoDB Atlas for episodic memory and Vector Search.

---

## Project Structure

- `frontend/`: Contains the Next.js client application. See `frontend/README.md` for setup and usage instructions.
- `backend/`: Contains the FastAPI server, agent pipeline, and database logic. See `backend/README.md` for API details and configuration.

---

## License

Copyright (c) 2026 jaimehernan95. All rights reserved.

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
