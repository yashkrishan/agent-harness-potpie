# Setup Instructions

## Quick Start

1. **Install Dependencies**

```bash
# Frontend
cd frontend
npm install
cd ..

# Backend
cd backend
pip install -r requirements.txt
cd ..
```

2. **Configure Environment**

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Or create a `.env` file manually in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=sqlite:///./build_agent.db
REPOS_DIR=./repos
NEXT_PUBLIC_API_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Note:** The startup script (`start.sh`) will automatically create a `.env` file from `.env.example` if it doesn't exist.

3. **Run the Application**

**Option 1: Use the startup script**
```bash
chmod +x start.sh
./start.sh
```

**Option 2: Manual start**

Terminal 1 (Backend):
```bash
cd backend
python main.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

4. **Access the Application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## First Time Setup

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add it to your `.env` file
3. For GitHub integration, you'll need a GitHub Personal Access Token (optional for public repos)

## Troubleshooting

### Backend Issues

- **Port 8000 already in use**: Change the port in `backend/main.py`
- **Database errors**: Delete `build_agent.db` and restart
- **OpenAI API errors**: Check your API key and account balance

### Frontend Issues

- **Port 3000 already in use**: Next.js will automatically use the next available port
- **API connection errors**: Ensure backend is running and `NEXT_PUBLIC_API_URL` is correct

### Git/Repository Issues

- **Clone fails**: Check repository URL and permissions
- **Private repos**: Use GitHub token in the repo selection screen

## Development

### Project Structure

```
.
├── frontend/        # Next.js frontend
│   ├── app/        # Next.js pages
│   ├── components/ # React components
│   └── lib/        # Utilities
├── backend/        # FastAPI backend
│   ├── routers/    # API endpoints
│   └── database.py # Database models
└── start.sh        # Startup script
```

### Adding New Features

1. Backend: Add routes in `backend/routers/`
2. Frontend: Add pages in `frontend/app/`
3. Database: Update models in `backend/database.py`

## Production Deployment

1. Build frontend: `cd frontend && npm run build`
2. Set production environment variables
3. Use a production WSGI server (e.g., Gunicorn) for backend
4. Configure reverse proxy (e.g., Nginx)

