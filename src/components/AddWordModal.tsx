import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Book, Save, Loader2, Sparkles } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PARTS_OF_SPEECH = ['Noun', 'Verb', 'Adj.', 'Adv.', 'Prep.', 'Conj.'];

export default function AddWordModal({ isOpen, onClose }: AddWordModalProps) {
  const { user } = useAuth();
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [pos, setPos] = useState('Noun');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !term || !definition) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'personal_lexicon'), {
        term: term.trim(),
        definition: definition.trim(),
        pos,
        level: 'Personal',
        createdAt: serverTimestamp(),
        mastered: true
      });
      setTerm('');
      setDefinition('');
      onClose();
    } catch (error) {
      console.error("Error adding word:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-deep/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="max-w-md w-full bg-paper academic-border shadow-2xl relative overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-deep p-8 text-paper flex justify-between items-center border-b border-accent/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/20 border border-accent/40 flex items-center justify-center academic-border">
                  <Book className="text-accent" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Manuscript Entry</p>
                  <h3 className="text-2xl font-serif italic font-bold">Add to Archives</h3>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-paper/40 hover:text-paper">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSave} className="p-8 space-y-8 bg-paper">
              <p className="text-sm font-serif italic text-deep/60 leading-relaxed text-center">
                "Document a new linguistic specimen within your personal encyclopedia for future reference."
              </p>

              {/* POS Selection */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-deep/30">Lexical Category</p>
                <div className="flex flex-wrap gap-2">
                  {PARTS_OF_SPEECH.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPos(p)}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                        pos === p 
                        ? 'bg-deep text-white border-deep' 
                        : 'bg-white text-deep/40 border-deep/10 hover:border-accent'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-deep/30">Term</p>
                  <input 
                    autoFocus
                    required
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Enter word..."
                    className="w-full bg-white border border-deep/20 p-4 font-serif italic text-xl focus:border-accent outline-none academic-border shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-deep/30">Scholarly Definition</p>
                  <textarea 
                    required
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    placeholder="Define the term..."
                    rows={4}
                    className="w-full bg-white border border-deep/20 p-4 font-serif italic text-lg focus:border-accent outline-none academic-border shadow-inner resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="pt-4">
                <button 
                  disabled={saving || !term || !definition}
                  className="w-full bg-deep text-accent p-6 flex justify-between items-center group disabled:opacity-50 transition-all font-serif italic text-xl academic-border shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3">
                    {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    {saving ? 'Archiving...' : 'Commit to Record'}
                  </span>
                  <Sparkles size={20} className="text-accent/40" />
                </button>
              </div>
            </form>

            <div className="bg-paper p-4 text-center border-t border-deep/5">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-deep/20 italic">Formal Lexicography Protocol</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
