import mongoose, { Schema, Document } from 'mongoose';

export interface IVoteRecord extends Document {
  id: string;
  candidateId: string;
  voterDetails: {
    name: string;
    studentId: string;
    department: string;
    email: string;
  };
  timestamp: number;
  receiptId: string;
  isFlagged: boolean;
  fraudReason?: string;
}

const voteRecordSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  candidateId: { type: String, required: true },
  voterDetails: {
    name: { type: String, required: true },
    studentId: { type: String, required: true },
    department: { type: String, required: true },
    email: { type: String, required: true }
  },
  timestamp: { type: Number, required: true },
  receiptId: { type: String, required: true },
  isFlagged: { type: Boolean, default: false },
  fraudReason: { type: String }
});

export default mongoose.model<IVoteRecord>('VoteRecord', voteRecordSchema);