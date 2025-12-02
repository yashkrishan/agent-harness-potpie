# Developer Build Agent

A full-stack application that automates the workflow from feature idea to pull request. Convert your ideas into production-ready code with AI-powered agents.

## Features

- **Idea Collection**: Describe features in natural language
- **Repository Analysis**: Automatic parsing of codebase structure, tech stack, and components
- **PRD Generation**: AI-powered Product Requirements Document creation
- **Task Planning**: Automatic breakdown into phases and tasks
- **System Design**: Architecture diagrams, API structures, and data flow
- **Code Execution**: AI agent implements tasks automatically
- **Testing**: Run tests and validate changes
- **PR Creation**: Automatic pull request generation

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python, SQLite
- **AI**: OpenAI GPT-4
- **Git Integration**: GitHub API, GitPython

## Setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- Git
- OpenAI API key (optional - demo uses hardcoded responses)

### Installation

1. **Install Frontend Dependencies**
```bash
cd frontend
npm install
cd ..
```

2. **Install Backend Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Environment Variables**

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Or create a `.env` file manually with:
```
OPENAI_API_KEY=your_openai_api_key_here  # Optional for demo (uses hardcoded responses)
DATABASE_URL=sqlite:///./build_agent.db
REPOS_DIR=./repos
NEXT_PUBLIC_API_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Note:** The demo mode uses hardcoded responses for all AI interactions, so OpenAI API key is not required. The demo is pre-configured for the fraud detection pipeline feature.

### Running the Application

1. **Start Backend Server**
```bash
cd backend
python main.py
```
The API will be available at `http://localhost:8000`

2. **Start Frontend Server**
```bash
cd frontend
npm run dev
```
The UI will be available at `http://localhost:3000`

## Usage

### Demo Mode (Hardcoded)

The application comes with a pre-configured demo for building a fraud detection pipeline:

1. **Start**: Click "See a Demo" on the home page
2. **Idea**: Pre-filled with "Build a fraud detection pipeline in the checkout service"
3. **Repository**: Enter any GitHub URL (creates mock structure for demo)
4. **PRD**: Pre-generated questions and PRD document
5. **Tasks**: 4 phases with 15 tasks total
6. **Design**: System designs for each phase
7. **Execution**: Watch hardcoded code being written
8. **Testing**: Test the generated code
9. **PR**: Create a pull request

### Custom Mode

1. **Start**: Choose "Build a Feature" on the home page
2. **Idea**: Describe your feature idea
3. **Repository**: Select a GitHub repository
4. **PRD**: Answer questions to generate a PRD
5. **Tasks**: Review generated phases and tasks
6. **Design**: Review and approve system designs
7. **Execution**: Watch the agent implement the code
8. **Testing**: Run tests and validate
9. **PR**: Create a pull request

## Project Structure

```
.
├── frontend/              # Next.js frontend application
│   ├── app/              # Next.js app directory
│   │   ├── page.tsx      # Entry screen
│   │   ├── idea/         # Idea collection
│   │   ├── repo/         # Repository selection
│   │   ├── prd/          # PRD generation
│   │   ├── tasks/        # Task planning
│   │   ├── design/       # System design
│   │   ├── execution/    # Code execution
│   │   └── testing/      # Testing & PR creation
│   ├── components/        # React components
│   ├── lib/              # Utilities and API client
│   └── package.json      # Frontend dependencies
├── backend/              # FastAPI backend
│   ├── main.py           # FastAPI app
│   ├── database.py       # Database models
│   └── routers/          # API routes
└── start.sh              # Startup script
```

## API Endpoints

- `POST /api/projects/` - Create project
- `GET /api/projects/{id}` - Get project
- `POST /api/repos/select` - Select repository
- `POST /api/repos/analyze` - Analyze repository
- `POST /api/prd/questions` - Generate PRD questions
- `POST /api/prd/generate` - Generate PRD document
- `POST /api/tasks/generate` - Generate tasks
- `POST /api/design/generate/{phase_id}` - Generate design
- `POST /api/execution/start` - Start execution
- `POST /api/testing/run-command` - Run test command
- `POST /api/pr/create` - Create pull request

## License

MIT

