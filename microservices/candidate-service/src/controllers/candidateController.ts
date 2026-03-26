import { Request, Response } from 'express';
import Candidate from '../models/Candidate';

export const getCandidates = async (req: Request, res: Response) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};

export const addCandidate = async (req: Request, res: Response) => {
  try {
    const { name, party, department } = req.body;
    const avatar = name.substring(0, 2).toUpperCase();

    const count = await Candidate.countDocuments();
    const number = `C-00${count + 1}`;

    const newCandidate = new Candidate({
      id: `c-${Date.now()}`,
      number,
      name,
      party,
      department,
      avatar,
      votes: 0
    });

    await newCandidate.save();
    res.status(201).json(newCandidate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add candidate' });
  }
};

export const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Candidate.findOneAndDelete({ id });
    res.status(200).json({ message: 'Candidate deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
};

export const incrementVote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findOneAndUpdate(
      { id },
      { $inc: { votes: 1 } },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to increment vote' });
  }
};

export const decrementVote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findOneAndUpdate(
      { id },
      { $inc: { votes: -1 } },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to decrement vote' });
  }
};