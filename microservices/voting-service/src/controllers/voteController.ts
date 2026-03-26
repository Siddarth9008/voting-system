import { Request, Response } from 'express';
import axios from 'axios';
import VoteRecord from '../models/VoteRecord';

export const getVotes = async (req: Request, res: Response) => {
  try {
    const votes = await VoteRecord.find();
    res.json(votes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
};

export const submitVote = async (req: Request, res: Response) => {
  try {
    const voteData = req.body;

    const existingVote = await VoteRecord.findOne({
      $or: [
        { "voterDetails.studentId": voteData.voterDetails.studentId },
        { "voterDetails.email": voteData.voterDetails.email }
      ]
    });

    if (existingVote) {
      return res.status(400).json({ error: 'A vote has already been cast with this Student ID or Email.' });
    }

    // Create new vote record
    const newVote = new VoteRecord(voteData);
    await newVote.save();

    // Increment candidate vote if not flagged
    if (!voteData.isFlagged) {
      try {
        await axios.put(`${process.env.CANDIDATE_SERVICE_URL}/api/candidates/${voteData.candidateId}/vote`);
      } catch (error) {
        console.error('Failed to update candidate vote:', error);
        // Optionally, you might want to rollback the vote record here
      }
    }

    res.status(201).json(newVote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit vote' });
  }
};

export const deleteVote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vote = await VoteRecord.findOne({ id });
    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    // Decrement candidate vote if not flagged
    if (!vote.isFlagged) {
      try {
        await axios.put(`${process.env.CANDIDATE_SERVICE_URL}/api/candidates/${vote.candidateId}/unvote`);
      } catch (error) {
        console.error('Failed to update candidate vote:', error);
      }
    }

    await VoteRecord.findOneAndDelete({ id });
    res.status(200).json({ message: 'Vote deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vote' });
  }
};