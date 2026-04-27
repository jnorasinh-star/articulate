import { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronRight, GraduationCap, Users, UserPlus, ArrowRight } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  level: string;
}

interface Peer {
  uid: string;
  displayName: string;
  grade: string;
  points: number;
}

export default function PlacementTest({ onComplete }: { onComplete: (level: string, grade: string, friends: string[]) => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'test' | 'results' | 'friends'>('test');
  const [result, setResult] = useState<{ level: string; grade: string } | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [q, usersSnap] = await Promise.all([
        geminiService.generatePlacementQuestions(),
        getDocs(query(collection(db, 'leaderboard', 'global', 'entries'), orderBy('points', 'desc'), limit(5)))
      ]);
      setQuestions(q);
      
      const p = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as Peer));
      setPeers(p);
      setLoading(false);
    }
    load();
  }, []);

  const handleAnswer = (option: string) => {
    const newAnswers = [...answers, option];
    setAnswers(newAnswers);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      calculateResult(newAnswers);
    }
  };

  const calculateResult = (finalAnswers: string[]) => {
    let levelPoints = 0;
    let correctCount = 0;
    
    finalAnswers.forEach((ans, idx) => {
      if (ans === questions[idx].correctAnswer) {
        correctCount++;
        levelPoints += questions[idx].level || 1;
      }
    });

    const averageLevel = correctCount > 0 ? levelPoints / correctCount : 1;
    let level = 'Beginner';
    let grade = 'Elementary (Grade 3-5)';

    if (averageLevel >= 4.5) { level = 'Expert'; grade = 'Academic / Graduate Level'; }
    else if (averageLevel >= 3.5) { level = 'University'; grade = 'University / Undergraduate'; }
    else if (averageLevel >= 2.5) { level = 'Advanced'; grade = 'High School (Grade 9-12)'; }
    else if (averageLevel >= 1.5) { level = 'Intermediate'; grade = 'Middle School (Grade 6-8)'; }
    else { level = 'Beginner'; grade = 'Elementary (Grade 3-5)'; }

    setResult({ level, grade });
    setStep('results');
  };

  const toggleFriend = (uid: string) => {
    setSelectedFriends(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fdfaf6] p-10 space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <GraduationCap size={48} className="text-[#5A5A40]" />
        </motion.div>
        <p className="font-serif italic text-lg opacity-50">Calibrating your linguistic level...</p>
      </div>
    );
  }

  if (step === 'results' && result) {
    return (
      <div className="min-h-screen bg-[#fdfaf6] p-6 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border-2 border-[#5A5A40]/5 space-y-8 text-center"
        >
          <div className="bg-[#5A5A40]/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-[#5A5A40]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5A5A40]/40">Assessment Complete</h3>
            <h2 className="text-4xl font-serif text-[#1a1a1a]">{result.grade}</h2>
            <p className="text-sm text-[#5A5A40]/60">Your current path: <span className="font-bold underline">{result.level} Mastery</span></p>
          </div>

          <p className="text-sm opacity-70 leading-relaxed italic">
            "Your placement suggests a strong foundation. We've tailored your lexicon to match this trajectory."
          </p>

          <button 
            onClick={() => setStep('friends')}
            className="w-full bg-[#5A5A40] text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
          >
            Meet the Community
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === 'friends') {
    return (
      <div className="min-h-screen bg-[#fdfaf6] p-6 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border-2 border-[#5A5A40]/5 space-y-8"
        >
          <div className="text-center space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5A5A40]/40">Connect</h3>
            <h2 className="text-3xl font-serif text-[#1a1a1a]">Study Buddies</h2>
            <p className="text-xs text-[#5A5A40]/60">Follow active learners to compete on the leaderboards.</p>
          </div>

          <div className="space-y-3">
            {peers.length > 0 ? peers.map((peer) => (
              <div 
                key={peer.uid} 
                onClick={() => toggleFriend(peer.uid)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  selectedFriends.includes(peer.uid) 
                    ? 'border-[#5A5A40] bg-[#5A5A40]/5' 
                    : 'border-transparent bg-[#f5f5f0] hover:border-[#5A5A40]/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#5A5A40] text-white flex items-center justify-center font-bold">
                    {peer.displayName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm italic">{peer.displayName}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-40">{peer.grade}</p>
                  </div>
                </div>
                {selectedFriends.includes(peer.uid) ? <CheckCircle2 className="text-[#5A5A40]" size={20} /> : <UserPlus className="opacity-20" size={20} />}
              </div>
            )) : (
              <div className="py-10 text-center text-xs opacity-40 italic">
                Scanning for active learners nearby...
              </div>
            )}
          </div>

          <div className="space-y-4">
             <button 
              onClick={() => setSelectedFriends(peers.map(p => p.uid))}
              className="w-full text-[10px] font-black uppercase tracking-widest text-[#5A5A40] opacity-60 hover:opacity-100 transition-opacity"
            >
              Follow All Top Scholars
            </button>
            
            <button 
              onClick={() => onComplete(result!.level, result!.grade, selectedFriends)}
              className="w-full bg-[#5A5A40] text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
            >
              Finish Setup
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#5A5A40]/60">Step {currentIdx + 1} of {questions.length}</span>
            <h2 className="text-3xl font-serif text-[#1a1a1a]">Placement Test</h2>
            <div className="w-full bg-[#f5f5f0] h-1.5 rounded-full overflow-hidden mt-4">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIdx) / questions.length) * 100}%` }}
                    className="h-full bg-[#5A5A40]"
                />
            </div>
        </div>

        <AnimatePresence mode="wait">
            <motion.div 
                key={currentIdx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="bg-white rounded-3xl p-8 shadow-xl border border-[#f5f5f0] space-y-6"
            >
                <p className="text-xl font-medium leading-relaxed italic text-[#1a1a1a]">
                    "{currentQ.question}"
                </p>

                <div className="grid gap-3">
                    {currentQ.options.map((option, i) => (
                        <button
                            key={i}
                            onClick={() => handleAnswer(option)}
                            className="bg-[#f5f5f0] hover:bg-[#5A5A40] hover:text-white text-[#1a1a1a] p-4 rounded-2xl text-left transition-all group active:scale-[0.98] flex justify-between items-center"
                        >
                            <span className="font-medium">{option}</span>
                            <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </button>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
