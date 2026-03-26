import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import voteRoutes from './routes/voteRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/votes', voteRoutes);

app.listen(PORT, () => {
  console.log(`Voting service running on http://localhost:${PORT}`);
});