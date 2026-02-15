# Youth Financial Empowerment Platform - Backend

AI-powered financial planning platform for young adults in India.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication
- **Bill OCR**: Extract expenses from bill images using Tesseract
- **AI Financial Advisor**: RAG-based personalized financial advice using OpenAI + Pinecone
- **ML User Segmentation**: KMeans clustering for personalized recommendations
- **Privacy Protection**: Automatic detection and masking of sensitive data
- **Dashboard Analytics**: Comprehensive financial insights and trends
- **Impact Metrics**: Platform-wide savings tracking

## 🏗️ Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL + SQLAlchemy
- **AI/ML**: OpenAI GPT-4, Pinecone (RAG), scikit-learn
- **OCR**: Tesseract
- **Authentication**: JWT (python-jose)

## 📦 Installation

### 1. Prerequisites

- Python 3.9+
- PostgreSQL 13+
- Tesseract OCR

### 2. Install Tesseract

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki

### 3. Setup Backend

```bash
# Clone repository
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 4. Setup Database

```bash
# Create PostgreSQL database
createdb fintech_db

# Or using psql
psql -U postgres
CREATE DATABASE fintech_db;
```

### 5. Configure Environment Variables

Edit `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fintech_db

# Security (generate with: openssl rand -hex 32)
SECRET_KEY=your-secret-key-here

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Pinecone
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=financial-advisor
```

### 6. Setup Pinecone Index

```python
from pinecone import Pinecone

pc = Pinecone(api_key="your-key")
pc.create_index(
    name="financial-advisor",
    dimension=1536,  # OpenAI embedding dimension
    metric="cosine"
)
```

### 7. Run the Application

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user info

### Expenses
- `POST /api/expenses/` - Create expense manually
- `POST /api/expenses/upload-bill` - Upload bill image (OCR)
- `GET /api/expenses/` - Get user expenses
- `GET /api/expenses/{id}` - Get specific expense
- `DELETE /api/expenses/{id}` - Delete expense

### Dashboard
- `GET /api/dashboard/summary` - Complete financial summary
- `GET /api/dashboard/statistics` - Detailed statistics
- `POST /api/dashboard/update-segments` - Trigger ML segmentation
- `GET /api/dashboard/global-impact` - Platform-wide metrics

### AI Advisor
- `POST /api/advisor/ask` - Ask financial question
- `POST /api/advisor/investment-suggestion` - Get investment advice
- `GET /api/advisor/quick-tips` - Get personalized tips

## 🧪 Testing

### Manual Testing with cURL

```bash
# Register user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
    "age": 25,
    "monthly_income": 50000,
    "risk_tolerance": "medium"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Use token for authenticated requests
TOKEN="your-token-here"

# Get dashboard
curl -X GET http://localhost:8000/api/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"

# Upload bill
curl -X POST http://localhost:8000/api/expenses/upload-bill \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@bill.jpg"

# Ask AI advisor
curl -X POST http://localhost:8000/api/advisor/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "How should I start investing?"}'
```

## 🚢 Deployment

### AWS EC2

1. Launch EC2 instance (Ubuntu 22.04)
2. Install dependencies:
```bash
sudo apt update
sudo apt install python3-pip postgresql tesseract-ocr
```

3. Setup application:
```bash
git clone <your-repo>
cd backend
pip install -r requirements.txt
```

4. Setup systemd service:
```bash
sudo nano /etc/systemd/system/fintech-api.service
```

```ini
[Unit]
Description=Fintech API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/backend
Environment="PATH=/home/ubuntu/backend/venv/bin"
ExecStart=/home/ubuntu/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

5. Start service:
```bash
sudo systemctl start fintech-api
sudo systemctl enable fintech-api
```

### Docker

```dockerfile
FROM python:3.9-slim

RUN apt-get update && apt-get install -y tesseract-ocr

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔒 Security Notes

1. **Never commit .env file**
2. **Use strong SECRET_KEY** (32+ chars random)
3. **Enable HTTPS in production**
4. **Rate limit API endpoints**
5. **Sanitize all user inputs**
6. **Regular security audits**

## 🎯 Hackathon Demo Flow

1. **Register** youth user (age 23, income ₹30,000)
2. **Upload bill** image → Shows OCR extraction
3. **View dashboard** → Real-time analytics
4. **Ask AI advisor** → Get personalized advice
5. **Show ML segmentation** → User classified
6. **Display impact** → Platform-wide savings

## 📊 Database Schema

See database migrations in `alembic/versions/`

## 🐛 Troubleshooting

### Tesseract not found
```bash
# Set path in code or environment
export TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
```

### Database connection errors
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d fintech_db
```

### Pinecone errors
- Verify API key is correct
- Check index name matches
- Ensure index dimension is 1536

## 📝 License

MIT License - See LICENSE file

## 👥 Team

Built for hackathon demo - Youth Financial Empowerment

## 🙏 Acknowledgments

- OpenAI for GPT models
- Pinecone for vector database
- FastAPI framework
- Tesseract OCR
