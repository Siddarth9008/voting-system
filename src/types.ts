export interface Candidate {
  id: string;
  number: string;
  name: string;
  party: string;
  department: string;
  avatar: string;
  votes: number;
}

export interface VoterDetails {
  name: string;
  studentId: string;
  department: string;
  email: string;
}

export interface VoteRecord {
  id: string;
  candidateId: string;
  timestamp: number;
  voterDetails: VoterDetails;
  receiptId: string;
  isFlagged: boolean;
  fraudReason?: string;
}
