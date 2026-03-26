import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());

const candidateServiceProxy = createProxyMiddleware({
  target: process.env.CANDIDATE_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/candidates': '/api/candidates'
  }
});

const votingServiceProxy = createProxyMiddleware({
  target: process.env.VOTING_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/votes': '/api/votes'
  }
});

app.use('/api/candidates', candidateServiceProxy);
app.use('/api/votes', votingServiceProxy);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});