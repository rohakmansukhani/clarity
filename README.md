# Clarity Financial AI 🚀

Clarity is an advanced AI-powered financial analytics platform dedicated to the Indian Stock Market. It combines real-time data, complex quantitative analysis, and generative AI to provide actionable investment insights.

**[🌐 Live Demo](https://clarity-invest.vercel.app/)**

## Key Features

### 🤖 AI Advisor
*   **Intelligent Chat**: Context-aware financial assistant that understands market terminology.
*   **Real-time Data**: Fetches live stock prices, P/E ratios, and market caps.
*   **Switch Mode**: Seamlessly transition between Stock Analysis and Sector Research.

### 🔍 Discovery Hub
*   **Sector Analysis**: Deep dive into specific sectors (Auto, Pharma, IT).
*   **Top Picks**: AI-curated list of top-performing stocks within a sector.
*   **Comparison Engine**: Side-by-side comparison of stocks with highlighted winners for Market Cap, PE, ROE, etc.

### 📉 Backtesting Engine
*   **Simulation**: "What if I bought X on date Y?" historical simulator.
*   **Visualizations**: Interactive PnL graphs and performance metrics.
*   **Custom Scenarios**: By Share or By Amount investment modes.

## Tech Stack

*   **Frontend**: Next.js 14, TypeScript, Material UI, Tailwind CSS, Framer Motion
*   **Backend**: FastAPI (Python), Uvicorn
*   **AI**: Groq (Llama 3 70B), LangChain (Function Calling)
*   **Database**: Supabase (PostgreSQL), Upstash (Redis)
*   **Deployment**: Vercel (Frontend), Azure/Railway (Backend)

## Getting Started

### Prerequisites
*   Node.js 18+
*   Python 3.9+
*   Docker (Optional)

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/finance-project.git
    cd finance-project
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    ```

3.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Environment Variables

Create `.env` files in both `frontend` and `backend` directories.

**Backend (.env)**
```env
GROQ_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
UPSTASH_REDIS_URL=your_url
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
