import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Trophy, 
  Users, 
  Settings as SettingsIcon,
  Search,
  CheckCircle,
  GraduationCap,
  PenLine,
  ChevronRight,
  LogOut,
  Flame,
  Award,
  UserCircle
} from 'lucide-react';

// Components (Inlined or imported later)
import WordView from './components/WordView';
import Leaderboard from './components/Leaderboard';
import Deck from './components/Deck';
import Profile from './components/Profile';
import PlacementTest from './components/PlacementTest';
import SearchView from './components/SearchView';

// Types
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  points: number;
  level: string;
  grade?: string;
  friends: string[];
  masteredWords: number;
  streak: number;
  lastLogin: string;
  subscription: 'free' | 'premium';
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'study' | 'deck' | 'leaderboard' | 'profile' | 'search'>('study');
  const [showPlacement, setShowPlacement] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userDoc);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            // New User - Show Placement
            setShowPlacement(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Listen for profile updates
  useEffect(() => {
    if (user) {
      const path = `users/${user.uid}`;
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setProfile(doc.data() as UserProfile);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
      return unsubscribe;
    }
  }, [user]);

  const handlePlacementComplete = async (level: string, grade: string, initialFriends: string[] = []) => {
    if (!user) return;
    const newProfile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Learner',
      email: user.email || '',
      points: 100, // Initial points for completing placement
      level: level,
      grade: grade,
      friends: initialFriends,
      masteredWords: 0,
      streak: 1,
      lastLogin: new Date().toISOString(),
      subscription: 'free'
    };
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
    setProfile(newProfile);
    setShowPlacement(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#fdfaf6]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl font-serif italic text-[#5A5A40]"
        >
          Articulate
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fdfaf6] p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-5xl font-serif text-[#1a1a1a]">Articulate</h1>
            <p className="text-[#5A5A40] opacity-80 uppercase tracking-widest text-xs font-semibold">Master one word a day</p>
          </div>
          
          <div className="py-8">
            <div className="aspect-square bg-[#f5f5f0] rounded-full flex items-center justify-center mx-auto w-48 mb-6 overflow-hidden border-8 border-[#fdfaf6]">
              <GraduationCap size={80} className="text-[#5A5A40]" />
            </div>
            <p className="text-[#1a1a1a] opacity-70">
              Welcome to Articulate. Journey through high-level vocabulary with daily challenges and AI-powered learning.
            </p>
          </div>

          <button 
            onClick={signInWithGoogle}
            className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            Get Started with Google
            <ChevronRight size={20} />
          </button>
        </motion.div>
      </div>
    );
  }

  if (showPlacement) {
    return <PlacementTest onComplete={handlePlacementComplete} />;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
       {/* SVG Filters for Chalk Effect */}
       <svg className="hidden">
        <filter id="chalk-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
          <feGaussianBlur stdDeviation="0.4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </svg>
      <div className="min-h-screen bg-paper text-deep font-sans flex flex-col md:flex-row h-screen overflow-hidden">
        {/* Academic Sidebar */}
        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-deep/10 p-6 md:p-10 flex flex-col justify-between bg-white z-50 landscape:hidden md:landscape:flex">
          <div className="space-y-12">
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tighter mb-2 uppercase italic text-deep">Lexicon.</h1>
              <div className="h-0.5 w-8 bg-accent"></div>
            </div>
            
            <div className="hidden md:block space-y-12">
              <section className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-deep/40 mb-1">Scholar Rank</p>
                  <div className="text-2xl font-serif italic text-deep">{profile?.level}</div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-deep/40 mb-1">Academic Grade</p>
                  <div className="text-sm font-medium">{profile?.grade}</div>
                </div>
              </section>

              <nav className="flex flex-col space-y-6">
                {[
                  { id: 'study', label: 'Encyclopedia', icon: BookOpen },
                  { id: 'search', label: 'Reference', icon: Search },
                  { id: 'deck', label: 'Examination', icon: PenLine },
                  { id: 'leaderboard', label: 'Academic Standing', icon: Award },
                  { id: 'profile', label: 'Personal Ledger', icon: GraduationCap },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-4 text-left transition-all group ${
                      activeTab === item.id 
                      ? 'text-deep' 
                      : 'text-deep/40 hover:text-deep/80'
                    }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-accent' : ''} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === item.id ? 'underline underline-offset-8 decoration-accent decoration-2' : ''}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="hidden md:block bg-deep text-paper p-8 border border-deep/5 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40 mb-1">Merit Points</p>
              <div className="text-4xl font-serif italic">
                  {profile?.points.toLocaleString()}
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none">
              <Award size={100} />
            </div>
          </div>
          
          {/* Mobile basic stats */}
          <div className="md:hidden flex justify-between items-center bg-white p-4 academic-border">
             <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase font-black opacity-40">Points</span>
                  <span className="font-serif italic">{profile?.points.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase font-black opacity-40">Rank</span>
                  <span className="font-serif italic">{profile?.level}</span>
                </div>
             </div>
             <button onClick={() => setShowPlacement(true)} className="text-[10px] font-black uppercase underline tracking-widest">Placement</button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-y-auto">
          <div className="flex-1 px-6 md:px-20 py-10 landscape:pt-0 landscape:px-0">
            <AnimatePresence mode="wait">
              {activeTab === 'study' && (
                <motion.div key="study" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <WordView onSearch={(term) => {
                    setSearchQuery(term);
                    setActiveTab('search');
                  }} />
                </motion.div>
              )}
              {activeTab === 'search' && (
                <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <SearchView initialQuery={searchQuery} />
                </motion.div>
              )}
              {activeTab === 'deck' && (
                <motion.div key="deck" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Deck />
                </motion.div>
              )}
              {activeTab === 'leaderboard' && (
                <motion.div key="leaderboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}>
                  <Leaderboard />
                </motion.div>
              )}
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Profile />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-deep/10 px-8 py-4 landscape:py-2 landscape:px-12 flex justify-between items-center z-50">
          <button onClick={() => setActiveTab('study')} className={`${activeTab === 'study' ? 'text-accent' : 'opacity-30'}`}>
            <BookOpen size={24} />
          </button>
          <button onClick={() => setActiveTab('search')} className={`${activeTab === 'search' ? 'text-accent' : 'opacity-30'}`}>
            <Search size={24} />
          </button>
          <button onClick={() => setActiveTab('deck')} className={`${activeTab === 'deck' ? 'text-accent' : 'opacity-30'}`}>
            <PenLine size={24} />
          </button>
          <button onClick={() => setActiveTab('leaderboard')} className={`${activeTab === 'leaderboard' ? 'text-accent' : 'opacity-30'}`}>
            <Award size={24} />
          </button>
          <button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'text-accent' : 'opacity-30'}`}>
            <UserCircle size={24} />
          </button>
        </nav>
      </div>
    </AuthContext.Provider>
  );
}
