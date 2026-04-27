import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs, limit } from 'firebase/firestore';
import { geminiService, WordData } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Volume2, Sparkles, Loader2, Book, ArrowRight, BookOpen, Plus } from 'lucide-react';
import AddWordModal from './AddWordModal';
import { useAuth } from '../App';

interface SearchViewProps {
  initialQuery?: string;
}

export default function SearchView({ initialQuery }: SearchViewProps) {
  const { user } = useAuth();
  const [queryTerm, setQuery] = useState(initialQuery || '');
  const [result, setResult] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (termToSearch: string) => {
    if (!termToSearch.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const term = termToSearch.trim();
      
      // First check personal lexicon
      if (user) {
        const personalQuery = query(
          collection(db, 'users', user.uid, 'personal_lexicon'),
          where('term', '==', term),
          limit(1)
        );
        const personalSnap = await getDocs(personalQuery);

        if (!personalSnap.empty) {
          const data = personalSnap.docs[0].data();
          setResult({
            term: data.term,
            definition: data.definition,
            pos: data.pos,
            ipa: '/personal/',
            examples: ['User defined entry in personal archives.'],
            level: 'Personal',
            related: { synonyms: [], antonyms: [] },
            origin: 'Hand-cataloged in personal manuscripts.'
          });
          setLoading(false);
          return;
        }
      }

      const wordRef = doc(db, 'words', term.toLowerCase());
      const snap = await getDoc(wordRef);

      if (snap.exists()) {
        setResult(snap.data() as WordData);
      } else {
        const data = await geminiService.lookupWord(term);
        if (data.term) {
          await setDoc(wordRef, data);
          setResult(data);
        } else {
          setError("Word not found or invalid.");
        }
      }
    } catch (err) {
      setError("Failed to fetch word details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    if (!result) return;
    speak(result.term, 0.9);
  };

  const handlePlaySentence = (text: string) => {
    speak(text, 1);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(queryTerm);
  };

  return (
    <div className="space-y-16 py-10 max-w-5xl mx-auto">
      <AddWordModal isOpen={isAdding} onClose={() => setIsAdding(false)} />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-2 border-deep pb-8">
            <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-deep/40 italic">Lexical Inquiry</h3>
                <h2 className="text-5xl font-serif font-black italic tracking-tighter text-deep uppercase leading-none">Archives Reference</h2>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-3 bg-deep text-accent px-6 py-3 font-serif italic text-lg academic-border shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} />
              Add Manuscript
            </button>
        </div>
        <form onSubmit={handleSearch} className="relative group">
          <input 
            type="text" 
            value={queryTerm}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search academic lexicon..."
            className="w-full bg-white border border-deep/20 academic-border p-8 pl-16 text-2xl font-serif italic outline-none transition-all focus:border-accent focus:shadow-2xl shadow-sm"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-deep/20 group-focus-within:text-accent transition-colors" size={28} />
          <button 
            type="submit"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-deep text-accent p-4 academic-border hover:scale-105 transition-all active:scale-95 shadow-xl"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
          </button>
        </form>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-6"
          >
            <Book className="text-accent animate-pulse" size={64} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">Querying Digital Manuscripts</p>
          </motion.div>
        )}

        {error && (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 p-10 academic-border border-red-100 font-serif italic text-xl text-center shadow-sm"
            >
                {error}
            </motion.div>
        )}

        {result && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-16"
          >
            <div className="chalkboard-bg rounded-[40px] p-12 md:p-20 relative text-center overflow-hidden shadow-2xl academic-border border-[10px] border-deep">
                 <div className="flex flex-nowrap justify-center items-center gap-x-0.5 sm:gap-x-1 md:gap-x-2 mb-8 overflow-hidden w-full px-4">
                    {result.term.split('').map((char, index) => (
                        <motion.span
                            key={`${result.term}-${index}`}
                            initial={{ opacity: 0, scale: 1.1, rotate: 2 }}
                            animate={{ opacity: 0.95, scale: 1, rotate: 0 }}
                            transition={{ 
                              duration: 0.05,
                              delay: index * 0.1,
                              ease: "linear"
                            }}
                            className="text-[30px] sm:text-[50px] md:text-[70px] lg:text-[100px] font-hand chalk-text uppercase inline-block whitespace-nowrap leading-none relative chalk-writing"
                        >
                            {char}
                        </motion.span>
                    ))}
                </div>
                <p className="chalk-text text-xl sm:text-2xl italic font-serif opacity-80 font-medium">"{result.definition}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="bg-white p-10 academic-border space-y-8 shadow-sm">
                    <div className="flex items-center justify-between border-b border-deep/5 pb-6">
                        <span className="text-[10px] bg-deep text-white px-3 py-1.5 font-black uppercase tracking-widest">{result.level} Grade</span>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handlePlayAudio}
                                className="p-2 hover:bg-paper rounded-full transition-colors text-accent border border-deep/5"
                                title="Listen to pronunciation"
                            >
                                <Volume2 size={24} />
                            </button>
                            <span className="text-sm font-serif italic text-deep/40 tracking-tight">/{result.ipa}/</span>
                        </div>
                    </div>
                    <div className="space-y-6">
                         <p className="text-[10px] uppercase font-black tracking-widest text-deep/30 italic underline underline-offset-4 decoration-accent">Literature Samples</p>
                         <div className="space-y-6">
                           {result.examples.map((ex, i) => (
                               <div key={i} className="flex items-start gap-4 group/ex">
                                  <p className="text-xl font-serif italic text-deep/80 leading-relaxed pl-6 border-l-2 border-accent transition-colors group-hover/ex:border-deep">{ex}</p>
                                  <button 
                                    onClick={() => handlePlaySentence(ex)}
                                    className="opacity-20 hover:opacity-100 transition-opacity p-2 hover:bg-paper rounded"
                                  >
                                    <Volume2 size={16} className="text-deep hover:text-accent" />
                                  </button>
                               </div>
                           ))}
                         </div>
                    </div>
                </div>

                <div className="space-y-12">
                  {result.origin && (
                      <div className="bg-deep text-paper p-10 academic-border space-y-6 relative overflow-hidden shadow-2xl">
                          <BookOpen className="absolute -right-6 -bottom-6 opacity-5 rotate-12" size={120} />
                          <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 italic">Etymological Genesis</p>
                          <p className="font-serif italic text-xl leading-relaxed relative z-10">{result.origin}</p>
                      </div>
                  )}

                  {result.related && (
                    <div className="bg-white p-10 academic-border space-y-6 shadow-sm">
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-deep/30 italic">Related Manuscripts</p>
                      <div className="space-y-8">
                        {result.related.synonyms.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            <span className="text-[10px] font-black text-accent uppercase w-full tracking-widest">Synonymous Affiliates</span>
                            {result.related.synonyms.slice(0, 6).map(syn => (
                              <button key={syn} onClick={() => performSearch(syn)} className="text-sm font-serif italic px-4 py-2 border border-deep/5 bg-paper hover:bg-deep hover:text-white transition-all">
                                {syn}
                              </button>
                            ))}
                          </div>
                        )}
                        {result.related.antonyms.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            <span className="text-[10px] font-black text-red-600 uppercase w-full tracking-widest">Antonymic Contrasts</span>
                            {result.related.antonyms.slice(0, 6).map(ant => (
                              <button key={ant} onClick={() => performSearch(ant)} className="text-sm font-serif italic px-4 py-2 border border-red-100 bg-red-50 hover:bg-red-600 hover:text-white transition-all text-red-600">
                                {ant}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
