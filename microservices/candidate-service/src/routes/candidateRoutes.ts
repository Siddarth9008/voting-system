import express from 'express';
import { getCandidates, addCandidate, deleteCandidate, incrementVote, decrementVote } from '../controllers/candidateController';

const router = express.Router();

router.get('/', getCandidates);
router.post('/', addCandidate);
router.delete('/:id', deleteCandidate);
router.put('/:id/vote', incrementVote);
router.put('/:id/unvote', decrementVote);

export default router;