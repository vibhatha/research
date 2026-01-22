# Legislation (Acts Navigation & Analysis)

This project provides a comprehensive platform for researching, analyzing, and navigating Sri Lankan legislative documents ("Acts"). It combines a modern web interface with advanced LLM-based analysis and lineage tracking.

## Key Features

-   **🔍 Semantic Search & Browsing**: Browse acts by year, category, or search content directly.
-   **🤖 AI Analysis**: Automated summarization, entity extraction, and "Ask Questions" features using Gemini/DeepSeek models.
-   **🌳 Act Lineage**: Visual interactive graphs showing the amendment history of acts (Parent Act → Amendments).
-   **📊 Analytics Dashboard**: Track usage, latency, and estimated costs of LLM operations.
-   **🛠️ Developer Tools**: CLI tools for managing data ingestion, categorization, and versioning.

## Getting Started

For detailed setup instructions, architecture overview, and contribution guidelines, please refer to the **[Developer Guide](DEVELOPER.md)**.

### Quick Links

-   **Web Interface**: [http://localhost:3000](http://localhost:3000) (when running)
-   **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
-   **Developer Guide**: [DEVELOPER.md](DEVELOPER.md)

## Tech Stack

-   **Frontend**: Next.js, Tailwind CSS, Shadcn UI, React Flow (Lineage)
-   **Backend**: FastAPI, SQLModel (SQLite), Google GenAI / DeepSeek
-   **Data Processing**: Python (Pandas), Playwright (Testing)
-   **Infrastructure**: Docker, Make
