import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { geminiService, WordData } from '../services/geminiService';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  CheckCircle, 
  Share2,
  Sparkles,
  AlertCircle,
  Loader2,
  RotateCcw,
  Zap,
  Crown,
  Play,
  BookOpen,
  Mic
} from 'lucide-react';
import PronunciationLive from './PronunciationLive';

export default function WordView({ onSearch }: { onSearch?: (term: string) => void }) {
  const { profile } = useAuth();
  const [word, setWord] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [usedToday, setUsedToday] = useState(false);
  const [sentence, setSentence] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipMessage, setSkipMessage] = useState<string | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [showLive, setShowLive] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchWord = async (isManualRefresh = false, isSkip = false) => {
    if (!profile || !auth.currentUser) return;
    
    setLoading(true);
    const userWordRef = doc(db, 'users', auth.currentUser.uid, 'daily_state', today);
    
    try {
      const snap = await getDoc(userWordRef);
      if (snap.exists() && !isManualRefresh) {
        setWord(snap.data().word as WordData);
        setUsedToday(snap.data().used || false);
      } else {
        // Generate new word
        const newWord = isManualRefresh 
          ? await geminiService.getRandomWord(profile.level)
          : await geminiService.generateDailyWord(profile.level);
        await setDoc(userWordRef, {
          word: newWord,
          used: false,
          skippedCount: increment(isSkip ? 1 : 0)
        }, { merge: true });
        
        if (isSkip) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            points: increment(-1)
          });
        }
        
        setWord(newWord);
        setUsedToday(false);
        setSentence('');
        setFeedback(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}/daily_state`);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWord();
  }, [profile?.level, today]);

  const handleUseWord = async () => {
    if (!profile || !word || !auth.currentUser || !sentence) return;
    
    setVerifying(true);
    setFeedback(null);
    
    try {
      const result = await geminiService.validateSentence(word.term, sentence);
      
      const sentencePath = `users/${auth.currentUser.uid}/sentences`;
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'sentences'), {
        userId: auth.currentUser.uid,
        wordId: word.term.toLowerCase(),
        sentence,
        isValid: result.isValid,
        feedback: result.feedback,
        createdAt: new Date().toISOString()
      });

      if (result.isValid) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          points: increment(50),
          masteredWords: increment(1)
        });

        const dailyStateRef = doc(db, 'users', auth.currentUser.uid, 'daily_state', today);
        await updateDoc(dailyStateRef, { used: true });
        
        const srsRef = doc(db, 'users', auth.currentUser.uid, 'srs', word.term.toLowerCase());
        await setDoc(srsRef, {
          wordId: word.term.toLowerCase(),
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          isMastered: false
        });

        const lbRef = doc(db, 'leaderboard/global/entries', auth.currentUser.uid);
        await setDoc(lbRef, {
          userId: auth.currentUser.uid,
          displayName: profile.displayName,
          points: profile.points + 50,
          grade: profile.grade
        });

        setUsedToday(true);
        setFeedback(result.feedback);
      } else {
        setFeedback(result.feedback);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'users');
    } finally {
      setVerifying(false);
    }
  };

  const triggerSkip = async () => {
    setIsSkipping(true);
    setSkipMessage(profile?.subscription === 'premium' ? "Premium Instant Skip" : "-1 Point Penalty Applied");
    setTimeout(() => setSkipMessage(null), 3000);
    await fetchWord(true, true);
    setIsSkipping(false);
  };

  const handleSkipRequest = () => {
    if (profile?.subscription === 'premium') {
      triggerSkip();
    } else {
      setShowAd(true);
      setAdCountdown(5);
    }
  };

  useEffect(() => {
    if (showAd && adCountdown > 0) {
      const timer = setTimeout(() => setAdCountdown(adCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showAd && adCountdown === 0) {
      setShowAd(false);
      triggerSkip();
    }
  }, [showAd, adCountdown]);

  const handleSkip = async () => {
    handleSkipRequest();
  };

  const speak = (text: string, rate: number = 1) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const americanVoice = voices.find(v => (v.lang === 'en-US' || v.lang === 'en_US') && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium")));
      const fallbackUS = voices.find(v => v.lang === 'en-US');
      
      if (americanVoice) utterance.voice = americanVoice;
      else if (fallbackUS) utterance.voice = fallbackUS;
      
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  };

  const handlePlayAudio = () => {
    if (!word) return;
    speak(word.term, 0.9);
  };

  const handlePlaySentence = (text: string) => {
    speak(text, 1);
  };

  if (loading || !word) {
    return (
      <div className="space-y-6 animate-pulse py-12">
        <div className="h-4 w-24 bg-deep/5 rounded-full" />
        <div className="h-24 w-full bg-deep/5 rounded-2xl" />
        <div className="h-32 w-full bg-deep/5 rounded-2xl" />
      </div>
    );
  }

  const wordChars = word.term.split('');

  return (
    <div className="space-y-16 py-10 landscape:pt-0 landscape:space-y-8 max-w-6xl mx-auto">
      {/* Chalkboard Section */}
      <div className="chalkboard-bg rounded-[40px] p-12 md:p-20 relative min-h-[450px] flex flex-col items-center justify-center text-center overflow-hidden shadow-2xl academic-border border-[12px] border-deep landscape:sticky landscape:top-0 landscape:z-40 landscape:min-h-0 landscape:p-4 landscape:md:p-8 landscape:rounded-none landscape:border-x-0 landscape:border-t-0 landscape:border-b-8 landscape:shadow-md">
        <div className="absolute top-10 left-12 flex items-center gap-3 opacity-20 landscape:hidden">
             <div className="w-4 h-4 rounded-full bg-white" />
             <div className="w-16 h-1 bg-white rounded-full" />
        </div>

        <p className="text-[10px] uppercase tracking-[0.5em] font-black text-accent mb-12 italic landscape:hidden">Volume {new Date().getDate()} • Daily Lexicon</p>
        
        <div className="flex flex-nowrap justify-center items-center gap-x-0.5 sm:gap-x-1 md:gap-x-2 mb-10 landscape:mb-0 overflow-hidden w-full px-4 relative">
            {wordChars.map((char, index) => (
                <motion.span
                    key={`${word.term}-${index}`}
                    initial={{ opacity: 0, scale: 0.8, rotate: Math.random() * 20 - 10, y: 10 }}
                    animate={{ opacity: 0.95, scale: 1, rotate: Math.random() * 4 - 2, y: 0 }}
                    transition={{ 
                        duration: 0.1, 
                        delay: index * 0.12,
                        type: "spring",
                        stiffness: 200,
                        damping: 10
                    }}
                    className="text-[35px] xs:text-[45px] sm:text-[70px] md:text-[100px] lg:text-[130px] landscape:text-[40px] landscape:md:text-[60px] font-hand chalk-text uppercase inline-block whitespace-nowrap leading-none relative chalk-writing"
                >
                    {char}
                </motion.span>
            ))}
            
            {/* Live Pronunciation Button */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              onClick={() => setShowLive(true)}
              className="absolute -right-4 top-1/2 -translate-y-1/2 p-4 bg-accent text-deep rounded-full shadow-lg hover:scale-110 transition-transform landscape:hidden md:landscape:flex"
            >
              <Mic size={24} />
            </motion.button>
        </div>

        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: wordChars.length * 0.1 + 0.5 }}
            className="space-y-4 max-w-3xl landscape:hidden"
        >
            <p className="chalk-text text-xl sm:text-3xl italic font-serif leading-relaxed font-medium">
                "{word.definition}"
            </p>
        </motion.div>
      </div>

      {/* Details & Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-10">
          <div className="space-y-8">
            <div className="flex items-center gap-6">
                <span className="text-[10px] bg-deep text-white px-3 py-1.5 font-black uppercase tracking-widest">{word.level} Class</span>
                <div className="flex items-center gap-3">
                    <span className="text-lg font-serif italic text-deep/40 tracking-tight">/ {word.ipa || 'pronunciation'} /</span>
                    <button 
                        onClick={handlePlayAudio}
                        className="p-2 hover:bg-paper rounded-full transition-colors text-accent border border-deep/5"
                        title="Listen to pronunciation"
                    >
                        <Volume2 size={20} />
                    </button>
                </div>
            </div>
            
            <div className="p-10 bg-white academic-border relative">
                <p className="text-[10px] uppercase font-black tracking-widest text-deep/40 mb-6 italic underline underline-offset-4 decoration-accent">Usage Context</p>
                <p className="font-serif italic text-deep text-2xl leading-relaxed">
                "{word.examples[0]}"
                </p>
                <div className="absolute -bottom-6 right-10 flex gap-2">
                    <button 
                      onClick={() => handlePlaySentence(word.examples[0])} 
                      className="hover:scale-105 transition-transform p-3 bg-deep text-accent academic-border shadow-xl"
                      title="Phonetic translation"
                    >
                        <Volume2 size={24} />
                    </button>
                </div>
            </div>

            {word.related && (
              <div className="space-y-6 pt-8 border-t-2 border-deep/5">
                {word.related.synonyms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 italic">Linguistic Affiliates</span>
                    <div className="flex flex-wrap gap-2">
                      {word.related.synonyms.slice(0, 4).map((syn) => (
                        <button 
                          key={syn} 
                          onClick={() => onSearch?.(syn)}
                          className="text-xs font-serif italic text-deep/60 hover:text-deep hover:bg-paper px-4 py-2 border border-deep/5 transition-all"
                        >
                          {syn}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {!usedToday && (
                <button 
                  onClick={handleSkipRequest}
                  disabled={isSkipping || showAd}
                  className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-deep/40 hover:text-accent transition-all group"
                >
                  {isSkipping ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-700" />}
                  {profile?.subscription === 'premium' ? "Premium Instant Rotation" : "Lexical Skip (Requires Brief Media)"}
                </button>
            )}
            <AnimatePresence>
              {skipMessage && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0 }}
                  className={`text-[10px] font-black uppercase tracking-widest ${profile?.subscription === 'premium' ? 'text-accent' : 'text-red-600'}`}
                >
                  {skipMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showAd && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-deep/95 backdrop-blur-md flex items-center justify-center p-6"
              >
                <div className="max-w-md w-full bg-white academic-border p-12 text-center space-y-10 relative overflow-hidden shadow-[0_0_100px_rgba(196,164,132,0.2)]">
                  <div className="absolute top-0 left-0 w-full h-3 bg-paper">
                    <motion.div 
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      className="h-full bg-accent"
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-deep text-accent border border-accent/20 flex items-center justify-center mx-auto mb-6 academic-border shadow-2xl">
                      <Play size={40} className="ml-1" />
                    </div>
                    <h3 className="text-3xl font-serif font-black italic text-deep uppercase tracking-tighter">Academic Archives</h3>
                    <p className="text-sm text-deep/60 leading-relaxed font-serif italic">
                      Elevate your membership to eliminate lexical latency and preserve your merit points across all grades.
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="py-4 px-8 bg-paper border border-deep/10 font-serif italic text-lg text-deep/40">
                      Archive Access in {adCountdown}s...
                    </div>
                    <button 
                      className="flex items-center justify-center gap-3 text-deep font-black uppercase tracking-widest text-[10px] hover:text-accent transition-colors"
                      onClick={() => {
                        alert("Commencing Premium Enrollment...");
                      }}
                    >
                      <Crown size={20} className="text-accent" />
                      Enroll in Premium Fellowship
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col justify-end items-start space-y-8">
          <AnimatePresence mode="wait">
              {usedToday ? (
                  <motion.div 
                      key="verified"
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full bg-deep text-paper p-12 academic-border space-y-8 shadow-2xl relative overflow-hidden"
                  >
                      <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none rotate-12">
                          <BookOpen size={240} />
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                          <div className="w-16 h-16 bg-accent/20 flex items-center justify-center border border-accent">
                             <CheckCircle className="text-accent" size={32} />
                          </div>
                          <h3 className="text-4xl font-serif font-black italic tracking-tighter uppercase leading-none">Cataloged.</h3>
                      </div>
                      <p className="text-xl font-serif italic opacity-80 leading-relaxed relative z-10">
                          {feedback || "Your lexical contribution has been verified. Academic records updated."}
                      </p>
                      <div className="flex justify-between items-center pt-8 border-t border-paper/10 relative z-10">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-40">Merit Awarded</span>
                            <span className="text-4xl font-serif font-black text-accent italic tracking-tighter">+50 PTS</span>
                          </div>
                          <button 
                            onClick={() => fetchWord(true, false)}
                            className="bg-accent text-deep px-8 py-4 font-serif italic text-lg academic-border shadow-xl hover:scale-105 active:scale-95 transition-all"
                          >
                            Next Volume
                          </button>
                      </div>
                  </motion.div>
              ) : (
                  <motion.div key="form" className="w-full space-y-6">
                      <div className="relative">
                        <textarea 
                            value={sentence}
                            onChange={(e) => setSentence(e.target.value)}
                            placeholder="Construct a scholarly sentence using the vocabulary above..."
                            className="w-full bg-white border border-deep/20 academic-border p-10 font-serif italic text-2xl focus:border-accent transition-all min-h-[250px] outline-none shadow-inner leading-relaxed placeholder:opacity-20"
                        />
                        <div className="absolute bottom-10 right-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-deep/20">
                            <Sparkles size={16} className="text-accent/40" />
                            Active Scholarly Verification
                        </div>
                      </div>
                      
                      {feedback && !verifying && (
                          <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-start gap-6 bg-red-50 p-8 academic-border border-red-100 italic"
                          >
                              <AlertCircle size={24} className="mt-1 flex-shrink-0 text-red-600" />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-red-600/40">Critique Available</p>
                                <p className="text-lg font-serif font-black text-red-600 leading-tight">{feedback}</p>
                              </div>
                          </motion.div>
                      )}

                      <button 
                          disabled={verifying || sentence.length < 5}
                          onClick={handleUseWord}
                          className="w-full bg-deep text-paper p-10 academic-border flex justify-between items-center group disabled:opacity-50 transition-all cursor-pointer shadow-2xl active:scale-[0.99]"
                      >
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Commit to Archives</span>
                            <span className="font-serif italic text-2xl">
                                {verifying ? 'Conducting Audit...' : 'Register Proficiency'}
                            </span>
                          </div>
                          <span className="text-4xl font-serif font-black italic tracking-tighter text-accent group-hover:scale-110 transition-transform">+50 XP</span>
                      </button>
                      
                      <div className="flex items-center justify-between px-2 pt-2">
                        <p className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-medium italic">
                            Academic Integrity Enforced by Articulate AI
                        </p>
                        <button className="text-[10px] font-black uppercase tracking-widest opacity-20 hover:opacity-100 flex items-center gap-2 transition-opacity">
                            <Share2 size={12} />
                            Dispatch to Circle
                        </button>
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {showLive && word && (
          <PronunciationLive 
            word={word.term} 
            onClose={() => setShowLive(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
