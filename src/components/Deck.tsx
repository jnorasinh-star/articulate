import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { geminiService } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  RotateCcw, 
  Star,
  Layers,
  ChevronRight,
  GraduationCap,
  ArrowRight,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../App';

interface SRSItem {
  id: string;
  wordId: string;
  nextReview: any;
  interval: number;
  easeFactor: number;
  repetitions: number;
  isMastered: boolean;
  term?: string;
  definition?: string;
}

export default function Deck() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<SRSItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSRS() {
      if (!user) return;
      const srsRef = collection(db, 'users', user.uid, 'srs');
      const q = query(srsRef, where('nextReview', '<=', new Date()));
      try {
        const snap = await getDocs(q);
        
        const sessionItems: SRSItem[] = [];
        for (const d of snap.docs) {
          const item = { id: d.id, ...d.data() } as SRSItem;
          // Fetch word details
          try {
            const wordSnap = await getDocs(query(collection(db, 'words'), where('term', '==', item.wordId)));
            if (!wordSnap.empty) {
                const wordData = wordSnap.docs[0].data();
                item.term = wordData.term;
                item.definition = wordData.definition;
            }
          } catch (wordError) {
            handleFirestoreError(wordError, OperationType.LIST, 'words');
          }
          sessionItems.push(item);
        }
        
        setItems(sessionItems);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/srs`);
      }
    }
    fetchSRS();
  }, [user]);

  const handleGrade = async (quality: number) => {
    if (!user || !items[currentIndex]) return;
    const item = items[currentIndex];
    
    // Simple SM-2 logic
    let { interval, easeFactor, repetitions } = item;
    
    if (quality >= 3) {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }
    
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    try {
      await updateDoc(doc(db, 'users', user.uid, 'srs', item.id), {
        interval,
        easeFactor,
        repetitions,
        nextReview,
        isMastered: interval > 30
      });

      if (quality >= 3) {
        await updateDoc(doc(db, 'users', user.uid), {
          points: increment(10)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/srs/${item.id}`);
    }

    setShowAnswer(false);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setItems([]); // End of session
    }
  };

  const [isTesting, setIsTesting] = useState(false);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<boolean[]>([]);

  const startAdvancementTest = async () => {
    if (!profile) return;
    setLoading(true);
    const q = await geminiService.generateAdvancementTest(profile.grade);
    setTestQuestions(q);
    setIsTesting(true);
    setLoading(false);
  };

  const handleTestAnswer = async (option: string) => {
    const isCorrect = option === testQuestions[testIndex].correctAnswer;
    const newAnswers = [...testAnswers, isCorrect];
    setTestAnswers(newAnswers);

    if (testIndex < testQuestions.length - 1) {
      setTestIndex(testIndex + 1);
    } else {
      // End test
      setShowAnswer(false);
      const correctCount = newAnswers.filter(a => a).length;
      if (correctCount >= 4) { // 80% pass rate
        // Level Up!
        const levels = ['Beginner', 'Intermediate', 'Advanced', 'University', 'Expert'];
        const grades = [
          'Elementary (Grade 3-5)', 
          'Middle School (Grade 6-8)', 
          'High School (Grade 9-12)', 
          'University / Undergraduate', 
          'Academic / Graduate Level'
        ];
        
        const currentIndex = levels.indexOf(profile?.level || 'Beginner');
        if (currentIndex < levels.length - 1) {
          const nextLevel = levels[currentIndex + 1];
          const nextGrade = grades[currentIndex + 1];
          
          await updateDoc(doc(db, 'users', user!.uid), {
            level: nextLevel,
            grade: nextGrade,
            points: increment(500)
          });
          alert(`Congratulations! You've advanced to ${nextGrade}!`);
        }
      } else {
        alert(`Test completed. You got ${correctCount}/5 correct. You need 4/5 to advance.`);
      }
      setIsTesting(false);
      setTestIndex(0);
      setTestAnswers([]);
      setItems([]); // Refresh state
    }
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Layers className="text-[#5A5A40] animate-bounce" size={40} />
              <p className="font-serif italic">Reviewing your deck...</p>
          </div>
      );
  }

  if (isTesting && testQuestions.length > 0) {
    const q = testQuestions[testIndex];
    return (
      <div className="space-y-12 py-12 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <GraduationCap size={48} className="text-accent mx-auto" />
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-accent mb-2">Advancement Assessment</h3>
            <div className="text-3xl font-serif">Level Up to Next Grade</div>
          </div>
          <div className="w-full bg-deep/5 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(testIndex / testQuestions.length) * 100}%` }}
              className="h-full bg-accent"
            />
          </div>
        </div>

        <motion.div 
          key={testIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[40px] shadow-2xl p-10 border-2 border-deep relative overflow-hidden space-y-8"
        >
          <p className="text-2xl font-serif italic text-deep leading-relaxed">
            "{q.question}"
          </p>

          <div className="grid gap-4">
            {q.options.map((option: string, i: number) => (
              <button
                key={i}
                onClick={() => handleTestAnswer(option)}
                className="w-full text-left p-6 rounded-2xl bg-deep/5 hover:bg-deep hover:text-white transition-all font-medium flex justify-between items-center group"
              >
                <span>{option}</span>
                <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-12 text-center border border-[#f5f5f0] shadow-xl space-y-8">
        <div className="bg-[#f5f5f0] w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Check className="text-accent" size={40} />
        </div>
        <div className="space-y-2">
            <h3 className="text-3xl font-serif text-[#1a1a1a]">Deck Cleared</h3>
            <p className="text-[#5A5A40]/60 text-sm">You've mastered your scheduled reviews. Ready to step up?</p>
        </div>
        
        <div className="grid gap-4 max-w-xs mx-auto">
          <button 
             onClick={startAdvancementTest}
             className="bg-accent text-white px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
          >
              <GraduationCap size={18} />
              Advancement Exam
          </button>

          <button 
             onClick={() => window.location.reload()}
             className="bg-[#f5f5f0] text-[#5A5A40] px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
              <RotateCcw size={18} />
              Refresh Deck
          </button>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="space-y-12 py-12">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-accent mb-2">SRS Practice</h3>
            <div className="text-4xl font-serif italic">Learning Pipeline</div>
        </div>
        <div className="text-xs font-black text-deep/60 border-2 border-deep/10 px-4 py-2 rounded-xl">
            {currentIndex + 1} / {items.length} Remaining
        </div>
      </div>

      <motion.div 
        layout
        className="bg-white rounded-[40px] shadow-2xl p-10 min-h-[500px] flex flex-col items-center justify-center text-center border-4 border-deep relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
            {!showAnswer ? (
                <motion.div 
                    key="front"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="space-y-12 flex flex-col items-center"
                >
                    <BookOpen size={64} className="text-deep/10" />
                    <h2 className="text-[80px] font-serif font-black leading-tight tracking-tighter text-deep uppercase">{currentItem.term}</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-deep/40">Recall the definition</p>
                    <button 
                        onClick={() => setShowAnswer(true)}
                        className="bg-deep text-white px-12 py-6 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                    >
                        Reveal Essence
                    </button>
                </motion.div>
            ) : (
                <motion.div 
                    key="back"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-12 flex flex-col items-center w-full"
                >
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-black tracking-widest text-accent mb-4">Mastered Word</p>
                        <h2 className="text-3xl font-serif opacity-40 uppercase italic tracking-tighter mb-8">{currentItem.term}</h2>
                    </div>
                    
                    <p className="text-3xl font-serif font-medium text-deep italic leading-tight max-w-lg mb-12">
                        "{currentItem.definition}"
                    </p>

                    <div className="flex gap-4 w-full">
                        <button 
                             onClick={() => handleGrade(1)}
                             className="flex-1 bg-white text-deep border-2 border-deep p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black uppercase tracking-widest text-[8px] hover:bg-red-50 hover:border-red-500 hover:text-red-500 transition-all shadow-lg active:scale-95"
                        >
                            <X size={20} />
                            Retry
                        </button>
                        <button 
                             onClick={() => handleGrade(3)}
                             className="flex-1 bg-white text-deep border-2 border-deep p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black uppercase tracking-widest text-[8px] hover:bg-yellow-50 hover:border-yellow-500 hover:text-yellow-500 transition-all shadow-lg active:scale-95"
                        >
                            <RotateCcw size={20} />
                            Hard
                        </button>
                        <button 
                             onClick={() => handleGrade(4)}
                             className="flex-1 bg-white text-deep border-2 border-deep p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black uppercase tracking-widest text-[8px] hover:bg-green-50 hover:border-green-500 hover:text-green-500 transition-all shadow-lg active:scale-95"
                        >
                            <ArrowRight size={20} />
                            Good
                        </button>
                        <button 
                             onClick={() => handleGrade(5)}
                             className="flex-1 bg-deep text-accent p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black uppercase tracking-widest text-[8px] hover:bg-accent hover:text-white transition-all shadow-xl active:scale-95"
                        >
                            <Check size={20} />
                            Perfect
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
