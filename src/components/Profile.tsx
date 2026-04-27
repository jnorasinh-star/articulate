import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../App';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  LogOut, 
  Settings, 
  Award, 
  BookOpen, 
  Zap, 
  ShieldCheck,
  ChevronRight,
  User,
  GraduationCap,
  Star,
  Crown,
  TrendingUp
} from 'lucide-react';

export default function Profile() {
  const { user, profile } = useAuth();

  if (!profile) return null;

  // Mock data for the chart based on mastered words
  // In a production app, this would be fetched from a subcollection tracking daily progress
  const masteryData = [
    { day: 'Mon', words: Math.floor(profile.masteredWords * 0.4) },
    { day: 'Tue', words: Math.floor(profile.masteredWords * 0.5) },
    { day: 'Wed', words: Math.floor(profile.masteredWords * 0.65) },
    { day: 'Thu', words: Math.floor(profile.masteredWords * 0.75) },
    { day: 'Fri', words: Math.floor(profile.masteredWords * 0.85) },
    { day: 'Sat', words: Math.floor(profile.masteredWords * 0.95) },
    { day: 'Sun', words: profile.masteredWords },
  ];

  const handleUpgrade = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        subscription: 'premium'
      });
      alert("Welcome to Lexi Premium! Enjoy endless skips and an ad-free experience.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-16">
      <header className="flex items-center gap-12 border-b-2 border-deep pb-12">
        <div className="relative">
            <div className="w-32 h-40 bg-deep flex items-center justify-center text-paper font-serif text-6xl shadow-2xl academic-border">
                {profile.displayName.charAt(0)}
            </div>
            {profile.subscription === 'premium' && (
              <div className="absolute -top-3 -right-3 p-3 bg-accent text-deep shadow-xl border border-white">
                <Crown size={24} />
              </div>
            )}
        </div>
        <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black tracking-[0.4em] text-deep/40 italic">Principal Fellow</p>
              <h2 className="text-6xl font-serif font-black italic tracking-tighter text-deep uppercase leading-none">{profile.displayName}</h2>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col border-r border-deep/10 pr-6">
                    <span className="text-[8px] uppercase font-black opacity-40">Status</span>
                    <span className="font-serif italic text-lg">{profile.level} Scholar</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-black opacity-40">Academic Grade</span>
                    <span className="font-serif italic text-lg">{profile.grade}</span>
                </div>
            </div>
        </div>
      </header>

      {profile.subscription === 'free' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent/5 border border-accent/20 p-10 flex flex-col md:flex-row items-center justify-between gap-8 academic-border"
        >
          <div className="space-y-3">
            <h3 className="text-3xl font-serif font-bold italic text-deep">Elevated Scholars Membership</h3>
            <p className="text-sm text-deep/60 max-w-lg italic font-medium leading-relaxed">
              Commercial-free archives, unlimited lexicon skips, and priority access to academic grade sets.
            </p>
          </div>
          <button 
            onClick={handleUpgrade}
            className="whitespace-nowrap bg-deep text-accent px-10 py-5 font-serif italic text-lg shadow-2xl active:scale-95 transition-all flex items-center gap-3"
          >
            Commence Premium
            <Crown size={20} />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-white p-10 academic-border space-y-6">
            <p className="text-[10px] uppercase font-black tracking-widest text-deep/40">Lexical Archives</p>
            <div className="flex items-end justify-between">
                <div>
                    <h4 className="text-5xl font-serif font-black italic text-deep">{profile.masteredWords}</h4>
                    <p className="text-xs uppercase font-bold text-accent tracking-widest">Words Cataloged</p>
                </div>
                <Award className="text-accent/20" size={60} />
            </div>
        </div>

        <div className="bg-white p-10 academic-border space-y-6">
            <p className="text-[10px] uppercase font-black tracking-widest text-deep/40">Knowledge Equity</p>
            <div className="flex items-end justify-between">
                <div>
                    <h4 className="text-5xl font-serif font-black italic text-deep">{profile.points.toLocaleString()}</h4>
                    <p className="text-xs uppercase font-bold text-accent tracking-widest">Scholar Credits</p>
                </div>
                <Star className="text-accent/20" size={60} />
            </div>
        </div>
      </div>

      <div className="bg-white p-10 academic-border space-y-10">
        <div className="flex items-center justify-between border-b border-deep/10 pb-6">
            <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-widest text-deep/40">Academic Velocity</p>
                <h3 className="text-3xl font-serif font-bold italic text-deep flex items-center gap-3">
                    Acquisition Curve
                    <TrendingUp size={24} className="text-accent" />
                </h3>
            </div>
            <div className="text-right">
                <p className="text-[10px] uppercase font-black tracking-widest text-deep/40">Growth</p>
                <p className="font-serif italic text-xl text-accent">+12% Progression</p>
            </div>
        </div>
        
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={masteryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C4A484" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#C4A484" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0F172A10" />
                    <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#0F172A', fontSize: 10, fontWeight: 900 }}
                        dy={10}
                    />
                    <YAxis 
                        hide 
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#0F172A', 
                            border: 'none', 
                            borderRadius: '0px',
                            color: '#fff',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: '#C4A484', border: 'none' }}
                        cursor={{ stroke: '#C4A484', strokeWidth: 2 }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="words" 
                        stroke="#C4A484" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorWords)" 
                        animationDuration={2000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-6">
        <p className="text-[10px] uppercase font-black tracking-widest text-deep/40 pl-2">Researcher Portal</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="flex items-center justify-between p-8 bg-white academic-border hover:bg-paper transition-all text-left">
                <div className="flex items-center gap-6">
                    <Settings className="text-deep/40" size={20} />
                    <span className="font-serif italic text-lg">Academic Preferences</span>
                </div>
                <ChevronRight size={18} className="opacity-20" />
            </button>
            <button 
                onClick={() => signOut(auth)}
                className="flex items-center justify-between p-8 bg-white academic-border hover:bg-red-50 transition-all text-left text-red-600"
            >
                <div className="flex items-center gap-6">
                    <LogOut size={20} />
                    <span className="font-serif italic text-lg">Terminate Session</span>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
}
