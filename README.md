# Q-BRIDGE

Q-BRIDGE is a web application developed as part of a quantum-computing mini project.  
The project explores how market belief and public sentiment can be represented as an index to understand possible upward or downward movement in stock prices.

## Live Demo

[View the deployed application](https://stock-belief-index.vercel.app/)

## Project Overview

Financial markets are influenced not only by historical prices and company performance, but also by investor confidence and public belief.

Q-BRIDGE presents these belief signals through an interactive web interface. The application is designed to help users explore market sentiment and understand how collective belief may relate to changes in stock movement.

> This project is intended for educational and experimental purposes only. It is not financial advice and should not be used as the sole basis for investment decisions.

## Main Features

- Interactive stock-belief dashboard
- Visual representation of market sentiment
- Indication of possible upward or downward market belief
- User-friendly interface for exploring stock-related signals
- Separate frontend and backend structure
- Deployment support for cloud platforms

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- HTML and CSS

### Backend
- Python
- API-based backend services

### Development and Deployment
- Git and GitHub
- Docker
- Vercel
- Render

## Project Structure

```text
Q-BRIDGE/
├── backend/              # Backend application and API logic
├── components/           # Reusable user-interface components
├── deploy/               # Deployment-related files
├── lib/                  # Shared utilities and supporting logic
├── src/                  # Frontend source code
├── .env.example          # Example environment-variable configuration
├── Dockerfile.frontend   # Frontend Docker configuration
├── docker-compose        # Multi-service Docker configuration
├── package.json          # Frontend dependencies and scripts
├── requirements.txt      # Python backend dependencies
├── vite.config           # Vite configuration
└── README.md
```

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/snigdha950/Q-BRIDGE.git
cd Q-BRIDGE
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and add the required values.

```bash
cp .env.frontend.example .env.frontend
```

Do not upload files containing private API keys or credentials.

### 4. Start the frontend

```bash
npm run dev
```

### 5. Set up the backend

Create and activate a Python virtual environment, then install the backend dependencies.

```bash
python -m venv venv
```

On Windows:

```bash
venv\Scripts\activate
```

Install the requirements:

```bash
pip install -r requirements.txt
```

Start the backend using the command defined by the project configuration.

## Team Project

This project was developed collaboratively as an academic mini project. Team members contributed to the planning, implementation, interface, backend integration, testing, and deployment of the application.

## Future Improvements

- Improve the belief-index calculation using larger and more reliable datasets
- Add historical comparisons between sentiment and actual stock movement
- Include more stocks and market indicators
- Improve model evaluation and explainability
- Add authentication and personalized watchlists
- Strengthen backend validation and error handling

## Disclaimer

Q-BRIDGE is an academic and experimental project. The information shown by the application does not guarantee future stock performance.

## Author

**Bonthu Snigdha Naidu**

- GitHub: [snigdha950](https://github.com/snigdha950)
- LinkedIn: [Snigdha Naidu](https://www.linkedin.com/in/snigdha-naidu-83b888327)
