/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  BarChart3, 
  History, 
  User, 
  ClipboardCheck, 
  CheckCircle2, 
  ChevronRight,
  ArrowLeft,
  Fingerprint,
  Database,
  Cpu,
  Lock,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { Candidate, VoteRecord, VoterDetails } from './types';

// --- Constants & Initial Data ---

const INITIAL_CANDIDATES: Candidate[] = [
  { id: '1', number: 'C-001', name: 'Ravi', party: 'Student Voice', department: 'Computer Science', avatar: 'RV', votes: 0 },
  { id: '2', number: 'C-002', name: 'Raju', party: 'Unity First', department: 'Business Admin', avatar: 'RJ', votes: 0 },
  { id: '3', number: 'C-003', name: 'Roja', party: 'Green Campus', department: 'Environmental Sci', avatar: 'RO', votes: 0 },
  { id: '4', number: 'C-004', name: 'Devika', party: 'Innovation Hub', department: 'Engineering', avatar: 'DV', votes: 0 },
];

const DEPARTMENTS = ['Computer Science', 'Business Admin', 'Engineering', 'Arts & Design', 'Natural Sciences'];

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function detectFraud(vote: Partial<VoteRecord>) {
  const prompt = `
    Analyze this college vote for potential fraud.
    Voter: ${vote.voterDetails?.name} (${vote.voterDetails?.studentId})
    Email: ${vote.voterDetails?.email}
    Candidate: ${vote.candidateId}
    
    Check for:
    1. Invalid email format for a college (must end in .edu or college.com).
    2. Suspicious student ID patterns.
    3. Duplicate submission patterns.
    
    Return JSON: { "isFlagged": boolean, "reason": "string" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-latest",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{"isFlagged":false,"reason":""}');
  } catch {
    return { isFlagged: false, reason: "" };
  }
}

// --- Components ---

type Step = 'vote' | 'details' | 'confirm' | 'receipt' | 'results';

export default function App() {
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    return (localStorage.getItem('ibm_voting_step') as Step) || 'vote';
  });
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(() => {
    return localStorage.getItem('ibm_voting_selected_candidate') || null;
  });
  const [voterDetails, setVoterDetails] = useState<VoterDetails>(() => {
    const saved = localStorage.getItem('ibm_voting_voter_details');
    return saved ? JSON.parse(saved) : {
      name: '',
      studentId: '',
      department: DEPARTMENTS[0],
      email: ''
    };
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', party: '', department: DEPARTMENTS[0] });
  const [voterError, setVoterError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(() => {
    return localStorage.getItem('ibm_voting_last_receipt') || null;
  });

  useEffect(() => {
    fetch('/api/candidates').then(r => r.json()).then(data => {
      if (data && data.length > 0) setCandidates(data);
    }).catch(console.error);

    fetch('/api/votes').then(r => r.json()).then(setVotes).catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem('ibm_voting_step', currentStep);
  }, [currentStep]);

  useEffect(() => {
    if (selectedCandidateId) {
      localStorage.setItem('ibm_voting_selected_candidate', selectedCandidateId);
    } else {
      localStorage.removeItem('ibm_voting_selected_candidate');
    }
  }, [selectedCandidateId]);

  useEffect(() => {
    localStorage.setItem('ibm_voting_voter_details', JSON.stringify(voterDetails));
  }, [voterDetails]);

  useEffect(() => {
    if (lastReceiptId) {
      localStorage.setItem('ibm_voting_last_receipt', lastReceiptId);
    } else {
      localStorage.removeItem('ibm_voting_last_receipt');
    }
  }, [lastReceiptId]);

  const selectedCandidate = useMemo(() => 
    candidates.find(c => c.id === selectedCandidateId), 
  [selectedCandidateId, candidates]);

  const generateReceiptId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `IBMvote-${segment()}-${segment()}`;
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.party) return;
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate)
      });
      const added = await res.json();
      setCandidates(prev => [...prev, added]);
      setIsAddingCandidate(false);
      setNewCandidate({ name: '', party: '', department: DEPARTMENTS[0] });
    } catch (err) {
      console.error('Failed to add candidate', err);
    }
  };

  const handleDeleteCandidate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent selecting the candidate
    try {
      await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      setCandidates(prev => prev.filter(c => c.id !== id));
      if (selectedCandidateId === id) setSelectedCandidateId(null);
    } catch (err) {
      console.error('Failed to delete candidate', err);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitError('');
    setIsProcessing(true);

    const hasVoted = votes.some(v => 
      v.voterDetails?.studentId === voterDetails.studentId || 
      v.voterDetails?.email === voterDetails.email
    );
    
    if (hasVoted) {
      setSubmitError("A vote has already been cast with this Student ID or Email.");
      setIsProcessing(false);
      return;
    }

    const receiptId = generateReceiptId();
    
    const voteData: Partial<VoteRecord> = {
      candidateId: selectedCandidateId!,
      voterDetails,
      timestamp: Date.now(),
      receiptId
    };

    const analysis = await detectFraud(voteData);

    const finalVote: VoteRecord = {
      id: `v-${Date.now()}`,
      candidateId: selectedCandidateId!,
      voterDetails,
      timestamp: Date.now(),
      receiptId,
      isFlagged: analysis.isFlagged,
      fraudReason: analysis.reason
    };

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalVote)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit vote');
      }
      
      setVotes(prev => [...prev, finalVote]);
      
      if (!analysis.isFlagged) {
        setCandidates(prev => prev.map(c => 
          c.id === selectedCandidateId ? { ...c, votes: c.votes + 1 } : c
        ));
      }

      setLastReceiptId(receiptId);
      setIsProcessing(false);
      setCurrentStep('receipt');
    } catch (err: any) {
      console.error('Failed to submit vote via API:', err);
      setSubmitError(err.message || 'An error occurred while casting your vote. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#161616] font-sans selection:bg-[#0F62FE]/20">
      {/* IBM Top Bar */}
      <header className="h-12 bg-[#161616] text-white flex items-center px-6 justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-1 h-4 bg-white/20" />
            ))}
          </div>
          <span className="font-bold tracking-tight text-sm uppercase">IBM <span className="font-normal opacity-60">Cloud Voting</span></span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono opacity-60">
          <span className="flex items-center gap-1"><Database className="w-3 h-3" /> CLOUDANT_ACTIVE</span>
          <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> WATSON_AI_ONLINE</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-12 px-6">
        {/* Step Indicator */}
        {currentStep !== 'receipt' && currentStep !== 'results' && (
          <div className="flex items-center gap-4 mb-12 overflow-x-auto pb-4">
            <StepIndicator active={currentStep === 'vote'} done={!!selectedCandidateId} label="1. Select Candidate" />
            <ChevronRight className="w-4 h-4 opacity-20 shrink-0" />
            <StepIndicator active={currentStep === 'details'} done={voterDetails.name !== ''} label="2. Voter Details" />
            <ChevronRight className="w-4 h-4 opacity-20 shrink-0" />
            <StepIndicator active={currentStep === 'confirm'} done={false} label="3. Confirmation" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentStep === 'vote' && (
            <motion.div 
              key="vote"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-light tracking-tight">Candidate Selection</h2>
                  <p className="text-sm text-[#525252] mt-1">Select one candidate to proceed to verification.</p>
                </div>
                <button 
                  onClick={() => setCurrentStep('results')}
                  className="text-xs font-medium text-[#0F62FE] hover:underline flex items-center gap-1"
                >
                  View live results <BarChart3 className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => {
                      setSelectedCandidateId(candidate.id);
                      setCurrentStep('details');
                    }}
                    className={cn(
                      "group text-left p-6 bg-white border transition-all flex gap-6 items-center",
                      selectedCandidateId === candidate.id ? "border-[#0F62FE] ring-1 ring-[#0F62FE]" : "border-[#E0E0E0] hover:border-[#A8A8A8]"
                    )}
                  >
                    <div className="w-16 h-16 bg-[#F4F4F4] flex items-center justify-center text-xl font-bold text-[#525252] shrink-0">
                      {candidate.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-[#0F62FE] font-bold">{candidate.number}</span>
                          <h3 className="text-lg font-medium leading-tight">{candidate.name}</h3>
                          <p className="text-xs text-[#525252]">{candidate.department}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <button 
                            onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                            className="text-[#8D8D8D] hover:text-[#DA1E28] transition-colors -mt-2 -mr-2 p-2"
                            title="Delete Candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="mt-1">
                            <span className="text-xs font-bold">{candidate.votes}</span>
                            <span className="text-[10px] text-[#525252] uppercase ml-1 block">Votes</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 h-1 bg-[#F4F4F4] w-full">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(candidate.votes / Math.max(...candidates.map(c => c.votes))) * 100}%` }}
                          className="h-full bg-[#0F62FE]" 
                        />
                      </div>
                    </div>
                  </button>
                ))}

                {isAddingCandidate ? (
                  <div className="p-6 bg-white border border-[#E0E0E0] col-span-1 md:col-span-2 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-medium">Add New Candidate</h3>
                      <button onClick={() => setIsAddingCandidate(false)} className="text-[#525252] text-xs hover:underline flex items-center gap-1">Cancel</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Input label="Full Name" value={newCandidate.name} onChange={v => setNewCandidate({...newCandidate, name: v})} placeholder="e.g. Jane Smith" />
                      <Input label="Party Name" value={newCandidate.party} onChange={v => setNewCandidate({...newCandidate, party: v})} placeholder="e.g. Progress Party" />
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#525252]">Department</label>
                        <select 
                          value={newCandidate.department}
                          onChange={e => setNewCandidate({...newCandidate, department: e.target.value})}
                          className="w-full h-10 px-3 bg-[#F4F4F4] border-b border-[#8D8D8D] focus:border-[#0F62FE] outline-none text-sm"
                        >
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-6">
                      <button 
                        onClick={handleAddCandidate}
                        disabled={!newCandidate.name || !newCandidate.party}
                        className="px-6 h-10 bg-[#0F62FE] text-white text-sm font-medium hover:bg-[#0353E9] disabled:opacity-50 transition-colors"
                      >
                        Save Candidate
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCandidate(true)}
                    className="p-6 bg-transparent border border-dashed border-[#A8A8A8] hover:bg-[#E0E0E0] hover:border-[#161616] transition-all flex flex-col items-center justify-center gap-2 group min-h-[116px]"
                  >
                    <Plus className="w-6 h-6 text-[#525252] group-hover:text-[#161616]" />
                    <span className="text-sm font-medium text-[#525252] group-hover:text-[#161616]">Add Candidate</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto bg-white p-8 border border-[#E0E0E0]"
            >
              <button onClick={() => setCurrentStep('vote')} className="text-xs text-[#525252] flex items-center gap-1 mb-6 hover:text-[#161616]">
                <ArrowLeft className="w-3 h-3" /> Back to selection
              </button>
              <h2 className="text-2xl font-light mb-8">Voter Information</h2>
              
              <div className="space-y-6">
                <Input label="Full Name" value={voterDetails.name} onChange={v => setVoterDetails({...voterDetails, name: v})} placeholder="e.g. John Doe" />
                <Input label="Student ID" value={voterDetails.studentId} onChange={v => setVoterDetails({...voterDetails, studentId: v})} placeholder="e.g. STU-2024-001" />
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#525252]">Department</label>
                  <select 
                    value={voterDetails.department}
                    onChange={e => setVoterDetails({...voterDetails, department: e.target.value})}
                    className="w-full h-10 px-3 bg-[#F4F4F4] border-b border-[#8D8D8D] focus:border-[#0F62FE] outline-none text-sm"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <Input label="College Email" value={voterDetails.email} onChange={v => setVoterDetails({...voterDetails, email: v})} placeholder="e.g. john@college.edu" />

                {voterError && (
                  <p className="text-xs font-medium text-[#DA1E28]">{voterError}</p>
                )}

                <button 
                  onClick={() => {
                    if (!voterDetails.name || !voterDetails.studentId || !voterDetails.email) {
                      setVoterError('All Voter Details fields are required to proceed.');
                      return;
                    }
                    setVoterError('');
                    setCurrentStep('confirm');
                  }}
                  className="w-full h-12 bg-[#0F62FE] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#0353E9] mt-8 transition-colors"
                >
                  Review Ballot <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'confirm' && (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-white border border-[#E0E0E0] overflow-hidden">
                <div className="bg-[#161616] p-4 text-white flex justify-between items-center">
                  <span className="text-xs font-mono uppercase tracking-widest">Ballot Review</span>
                  <Lock className="w-4 h-4 text-[#0F62FE]" />
                </div>
                
                <div className="p-8 space-y-8">
                  <div className="flex gap-6 items-center p-4 bg-[#F4F4F4]">
                    <div className="w-12 h-12 bg-white flex items-center justify-center font-bold text-[#0F62FE]">
                      {selectedCandidate?.avatar}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[#525252]">Your Selection</p>
                      <h3 className="text-lg font-medium">{selectedCandidate?.name}</h3>
                      <p className="text-xs text-[#0F62FE] font-mono">{selectedCandidate?.number}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <ReviewItem label="Voter Name" value={voterDetails.name} />
                    <ReviewItem label="Student ID" value={voterDetails.studentId} />
                    <ReviewItem label="Department" value={voterDetails.department} />
                    <ReviewItem label="Email Address" value={voterDetails.email} />
                  </div>

                  <div className="pt-6 border-t border-[#E0E0E0] space-y-4">
                    <p className="text-[10px] text-[#525252] leading-relaxed">
                      By clicking "Submit Ballot", you confirm that the information provided is accurate and that you are authorized to vote in this election. Your vote will be recorded on the IBM Blockchain ledger.
                    </p>
                    {submitError && (
                      <p className="text-xs font-medium text-[#DA1E28]">{submitError}</p>
                    )}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCurrentStep('details')}
                        className="flex-1 h-12 border border-[#161616] font-medium hover:bg-[#F4F4F4]"
                      >
                        Edit Details
                      </button>
                      <button 
                        onClick={handleFinalSubmit}
                        disabled={isProcessing}
                        className="flex-1 h-12 bg-[#0F62FE] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#0353E9] disabled:opacity-50"
                      >
                        {isProcessing ? "Processing..." : "Submit Ballot"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'receipt' && (
            <motion.div 
              key="receipt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto text-center"
            >
              <div className="bg-white border border-[#E0E0E0] p-12 space-y-8 shadow-sm">
                <div className="w-20 h-20 bg-[#24A148]/10 text-[#24A148] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                
                <div>
                  <h2 className="text-3xl font-light">Vote Recorded</h2>
                  <p className="text-[#525252] mt-2">Your ballot has been successfully processed and verified.</p>
                </div>

                <div className="bg-[#F4F4F4] p-6 text-left space-y-4 border-l-4 border-[#0F62FE]">
                  <div>
                    <p className="text-[10px] uppercase text-[#525252] font-bold">Transaction Receipt</p>
                    <p className="text-lg font-mono tracking-tighter text-[#161616] mt-1">{lastReceiptId}</p>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-[#D1D1D1]">
                    <span className="text-[10px] text-[#525252] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#24A148]" /> BLOCKCHAIN_VERIFIED
                    </span>
                    <span className="text-[10px] text-[#525252] font-mono">
                      {new Date().toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setSelectedCandidateId(null);
                      setVoterDetails({ name: '', studentId: '', department: DEPARTMENTS[0], email: '' });
                      setCurrentStep('vote');
                    }}
                    className="flex-1 h-12 border border-[#161616] font-medium hover:bg-[#F4F4F4]"
                  >
                    New Session
                  </button>
                  <button 
                    onClick={() => setCurrentStep('results')}
                    className="flex-1 h-12 bg-[#161616] text-white font-medium hover:bg-[#393939]"
                  >
                    View Results
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-light">Live Election Standings</h2>
                <button onClick={() => setCurrentStep('vote')} className="text-sm text-[#0F62FE] hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back to voting
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-[#E0E0E0] p-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#525252] mb-8">Vote Distribution</h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={candidates} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E0E0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#F4F4F4' }}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E0E0E0', borderRadius: '0' }}
                        />
                        <Bar dataKey="votes" radius={[0, 2, 2, 0]}>
                          {candidates.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.id === selectedCandidateId ? '#0F62FE' : '#8D8D8D'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#161616] text-white p-6">
                    <p className="text-[10px] uppercase opacity-60 mb-1">Total Ballots Cast</p>
                    <p className="text-4xl font-light">{candidates.reduce((acc, c) => acc + c.votes, 0)}</p>
                  </div>
                  <div className="bg-white border border-[#E0E0E0] p-6">
                    <h3 className="text-xs font-bold uppercase mb-4">Rankings</h3>
                    <div className="space-y-4">
                      {candidates.slice().sort((a, b) => b.votes - a.votes).map((c, i) => (
                        <div key={c.id} className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#525252]">#{i + 1}</span>
                            <span className="text-sm font-medium">{c.name}</span>
                          </div>
                          <span className="text-sm font-mono">{Math.round((c.votes / candidates.reduce((acc, cur) => acc + cur.votes, 1)) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* IBM Footer */}
      <footer className="mt-20 border-t border-[#E0E0E0] py-8 px-6 text-[10px] text-[#525252] flex justify-between items-center">
        <div className="flex gap-8">
          <span>© 2026 IBM Corporation</span>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SECURE_NODE_042</span>
          <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> BIOMETRIC_READY</span>
        </div>
        <div className="flex gap-4">
          <span className="hover:text-[#161616] cursor-pointer">Privacy Policy</span>
          <span className="hover:text-[#161616] cursor-pointer">Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---

function StepIndicator({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 shrink-0 transition-all",
      active ? "opacity-100" : "opacity-40"
    )}>
      <div className={cn(
        "w-6 h-6 flex items-center justify-center text-[10px] font-bold border",
        done ? "bg-[#24A148] border-[#24A148] text-white" : active ? "border-[#0F62FE] text-[#0F62FE]" : "border-[#8D8D8D] text-[#8D8D8D]"
      )}>
        {done ? <CheckCircle2 className="w-3 h-3" /> : label.split('.')[0]}
      </div>
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[#525252]">{label}</label>
      <input 
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 bg-[#F4F4F4] border-b border-[#8D8D8D] focus:border-[#0F62FE] outline-none text-sm placeholder:text-[#A8A8A8] transition-colors"
      />
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-[#525252] font-medium">{label}</p>
      <p className="text-sm text-[#161616] mt-0.5">{value || 'Not provided'}</p>
    </div>
  );
}
