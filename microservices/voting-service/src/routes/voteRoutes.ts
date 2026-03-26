import express from 'express';
import { getVotes, submitVote, deleteVote } from '../controllers/voteController';

const router = express.Router();

router.get('/', getVotes);
router.post('/', submitVote);
router.delete('/:id', deleteVote);

export default router;