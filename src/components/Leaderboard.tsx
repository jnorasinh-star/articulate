import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { motion } from 'motion/react';
import { Trophy, Medal, User, Crown } from 'lucide-react';
import { useAuth } from '../App';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  grade?: string;
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard', 'global', 'entries'),
      orderBy('points', 'desc'),
      limit(20)
    );

    const path = 'leaderboard/global/entries';
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => doc.data() as LeaderboardEntry);
      setEntries(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="space-y-4">
      {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-[#f5f5f0] rounded-2xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-2 border-deep pb-8">
        <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-deep/40 italic">Academic Performance</h3>
            <h2 className="text-5xl font-serif font-black italic tracking-tighter text-deep">Scholars Gallery</h2>
        </div>
      </div>

      <div className="bg-white academic-border">
        <div className="grid grid-cols-12 p-6 border-b border-deep/10 bg-paper/50">
            <div className="col-span-1 text-[10px] font-black uppercase tracking-widest opacity-40">Rank</div>
            <div className="col-span-8 text-[10px] font-black uppercase tracking-widest opacity-40">Scholar</div>
            <div className="col-span-3 text-right text-[10px] font-black uppercase tracking-widest opacity-40">Merit Points</div>
        </div>
        <div className="divide-y divide-deep/5">
          {entries.map((u, i) => {
            const isMe = u.userId === profile?.uid;
            return (
              <motion.div 
                key={u.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`grid grid-cols-12 p-8 items-center hover:bg-paper transition-colors group ${isMe ? 'bg-accent/5 ring-1 ring-accent/20' : ''}`}
              >
                <div className="col-span-1 font-serif italic text-2xl opacity-20 group-hover:opacity-100 transition-opacity">
                  {i + 1}
                </div>
                <div className="col-span-8 flex items-center gap-6">
                  <div className="w-12 h-12 flex items-center justify-center bg-deep text-paper font-serif text-xl academic-border">
                    {u.displayName[0]}
                  </div>
                  <div>
                    <div className="font-serif font-bold text-lg flex items-center gap-2">
                      {u.displayName}
                      {i === 0 && <Medal className="text-accent" size={16} />}
                      {isMe && <span className="text-[8px] uppercase px-1.5 py-0.5 bg-deep text-white">You</span>}
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-40">{u.grade || 'Lexicographer'}</div>
                  </div>
                </div>
                <div className="col-span-3 text-right font-serif text-xl italic text-deep">
                  {u.points.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
