# AutoAnalyst AI 🤖📊
> Autonomous Data Scientist Platform — React + FastAPI + Llama3 + SQLite

AutoAnalyst AI lets you upload any CSV/Excel dataset and instantly get:
- **Automated EDA** — distributions, correlations, missing values, outliers
- **Auto ML** — trains 5 models (Logistic/Linear Regression, Decision Tree, Random Forest, Gradient Boosting, XGBoost) and picks the best one
- **AI Insights** — Llama3 explains your data and models in plain English
- **Chat** — ask questions about your data in natural language

---

## 🏗️ Project Structure

```
autoanalyst/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLite models (SQLAlchemy)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── routers/
│       ├── datasets.py      # Upload / list / preview / delete
│       ├── analysis.py      # EDA — stats, correlations, outliers
│       ├── ml.py            # Train 5 ML models, compare, rank
│       ├── insights.py      # Llama3 AI explanations
│       └── chat.py          # Conversational AI with context
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Dataset list + stats
│   │   │   ├── UploadPage.jsx     # Drag-and-drop upload
│   │   │   └── DatasetDetail.jsx  # 5-tab analysis view
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── PreviewTab.jsx     # Data table
│   │       ├── EDATab.jsx         # Charts + stats
│   │       ├── MLTab.jsx          # Model training + results
│   │       ├── InsightsTab.jsx    # AI insights
│   │       └── ChatTab.jsx        # AI chat
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.ai) (for AI features)

### 2. Start Ollama + Pull Llama3
```bash
# Install Ollama from https://ollama.ai
ollama serve
ollama pull llama3
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:3000

---

## 🐳 Docker (Production)

```bash
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

> **Note:** For Docker + Ollama, update `OLLAMA_URL` in `routers/insights.py` and `routers/chat.py` from `localhost` to your host machine's IP.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/datasets/upload` | Upload CSV/Excel |
| GET | `/api/datasets/` | List all datasets |
| GET | `/api/datasets/{id}/preview` | Preview rows |
| DELETE | `/api/datasets/{id}` | Delete dataset |
| GET | `/api/analysis/{id}` | Run full EDA |
| POST | `/api/ml/{id}/train` | Train ML models |
| GET | `/api/ml/{id}/results` | Get ML results |
| GET | `/api/insights/{id}/auto` | AI dataset insights |
| GET | `/api/insights/{id}/ml-explanation` | AI ML explanation |
| POST | `/api/chat/` | Chat with data |
| GET | `/api/chat/{id}/history` | Chat history |

---

## 🧠 ML Models Trained

| Model | Classification | Regression |
|-------|---------------|------------|
| Linear / Logistic Regression | ✅ | ✅ |
| Decision Tree | ✅ | ✅ |
| Random Forest | ✅ | ✅ |
| Gradient Boosting | ✅ | ✅ |
| XGBoost | ✅ | ✅ |

Auto-detects problem type (classification vs regression) based on target column.

---

## ⚙️ Configuration

Edit these constants in the backend to customize:

**`routers/insights.py` and `routers/chat.py`:**
```python
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3"   # or "llama3:8b", "mistral", "gemma", etc.
```

**`database.py`:**
```python
SQLALCHEMY_DATABASE_URL = "sqlite:///./autoanalyst.db"
# Change to PostgreSQL: "postgresql://user:pass@localhost/dbname"
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Recharts |
| Backend | FastAPI, Uvicorn |
| ML | Scikit-learn, XGBoost |
| AI | Llama3 via Ollama |
| Database | SQLite (SQLAlchemy) |
| Deployment | Docker, Nginx |

---

## 🛣️ Future Roadmap
- [ ] PostgreSQL support (production)
- [ ] Celery + Redis background task queue
- [ ] AutoML with hyperparameter tuning (Optuna)
- [ ] SHAP / LIME explainability
- [ ] Real-time streaming (Kafka)
- [ ] PDF report export
- [ ] Multi-dataset comparison

---

Built with ❤️ — AutoAnalyst AI
