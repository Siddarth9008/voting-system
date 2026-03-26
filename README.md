<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Voting System with Microservices

This is a MERN stack voting system implemented with microservices architecture.

## Architecture

- **Frontend**: React with Vite, TypeScript, Tailwind CSS
- **API Gateway**: Express.js proxy to route requests
- **Candidate Service**: Manages candidate data (port 3001)
- **Voting Service**: Handles voting logic (port 3002)
- **Database**: MongoDB

## Run Locally

**Prerequisites:** Node.js, MongoDB

1. Install dependencies for all services:
   `npm run install-services`

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (for AI features)

3. Start MongoDB

4. Run all services:
   `npm run dev`

This will start:
- Candidate Service on http://localhost:3001
- Voting Service on http://localhost:3002
- API Gateway on http://localhost:3000
- Frontend on http://localhost:3000

## Manual Startup

If you prefer to run services individually:

1. Candidate Service: `cd microservices/candidate-service && npm install && npm run dev`
2. Voting Service: `cd microservices/voting-service && npm install && npm run dev`
3. API Gateway: `cd microservices/api-gateway && npm install && npm run dev`
4. Frontend: `npm run dev`
