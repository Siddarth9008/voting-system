import mongoose, { Schema, Document } from 'mongoose';

export interface ICandidate extends Document {
  id: string;
  number: string;
  name: string;
  party: string;
  department: string;
  avatar: string;
  votes: number;
}

const candidateSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  number: { type: String, required: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  department: { type: String, required: true },
  avatar: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

export default mongoose.model<ICandidate>('Candidate', candidateSchema);