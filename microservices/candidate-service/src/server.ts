import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import candidateRoutes from './routes/candidateRoutes';
import Candidate from './models/Candidate';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

connectDB();

// Initial Candidates Seed
const INITIAL_CANDIDATES = [
  { id: '1', number: 'C-001', name: 'Ravi', party: 'Student Voice', department: 'Computer Science', avatar: 'RV', votes: 0 },
  { id: '2', number: 'C-002', name: 'Raju', party: 'Unity First', department: 'Business Admin', avatar: 'RJ', votes: 0 },
  { id: '3', number: 'C-003', name: 'Roja', party: 'Green Campus', department: 'Environmental Sci', avatar: 'RO', votes: 0 },
  { id: '4', number: 'C-004', name: 'Devika', party: 'Innovation Hub', department: 'Engineering', avatar: 'DV', votes: 0 },
];

async function seedDatabase() {
  const count = await Candidate.countDocuments();
  if (count === 0) {
    await Candidate.insertMany(INITIAL_CANDIDATES);
    console.log('Seeded initial candidates');
  }
}

seedDatabase();

app.use('/api/candidates', candidateRoutes);

app.listen(PORT, () => {
  console.log(`Candidate service running on http://localhost:${PORT}`);
});