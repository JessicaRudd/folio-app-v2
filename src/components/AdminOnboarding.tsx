import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Check, Mail, Loader2, Shield, Search, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { auth } from '../lib/firebase';

interface WaitlistEntry {
  id: string;
  email: string;
  status: 'pending' | 'approved';
  createdAt: any;
  approvedAt?: any;
  inviteToken?: string;
}

export const AdminOnboarding = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchWaitlist = async () => {
    if (!auth.currentUser) {
      console.log("No user logged in, skipping waitlist fetch");
      setLoading(false);
      return;
    }
    
    console.log("Fetching waitlist for admin:", auth.currentUser.uid);
    try {
      const response = await fetch('/api/admin/waitlist', {
        headers: {
          'x-admin-uid': auth.currentUser.uid
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Waitlist data received:", data.length, "entries");
        setEntries(data);
      } else {
        const errData = await response.json();
        console.error("Failed to fetch waitlist:", response.status, errData);
      }
    } catch (err) {
      console.error("Failed to fetch waitlist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchWaitlist();
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchWaitlist();
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (email: string, id: string) => {
    if (!auth.currentUser) return;
    setApprovingId(id);
    
    try {
      const response = await fetch('/api/admin/waitlist/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-uid': auth.currentUser.uid
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        await fetchWaitlist();
      }
    } catch (err) {
      console.error("Failed to approve user:", err);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDirectInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !auth.currentUser) return;

    setIsInviting(true);
    try {
      const response = await fetch('/api/admin/waitlist/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-uid': auth.currentUser.uid
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      if (response.ok) {
        setInviteEmail('');
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 3000);
        await fetchWaitlist();
      }
    } catch (err) {
      console.error("Failed to invite user:", err);
    } finally {
      setIsInviting(false);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = entries.filter(e => e.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas space-y-4">
        <Loader2 className="animate-spin text-sage" size={32} />
        <p className="text-charcoal/40 italic">Accessing Gatekeeper...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-charcoal">
      {/* Header */}
      <header className="bg-white border-b border-charcoal/5 px-8 py-6 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-charcoal rounded-lg flex items-center justify-center text-white">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-serif">Gatekeeper</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Admin Onboarding Dashboard</p>
              </div>
            </div>

            <Link 
              to="/" 
              className="md:hidden flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/60 hover:text-sage transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Folio</span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal/60 hover:text-sage transition-colors px-4 py-2 rounded-full border border-charcoal/20 hover:border-sage/40 bg-charcoal/5"
            >
              <ArrowLeft size={14} />
              <span>Back to Folio</span>
            </Link>
            
            <div className="bg-sage/10 px-4 py-2 rounded-full border border-sage/20">
              <span className="text-xs font-bold text-sage uppercase tracking-widest">{pendingCount} Pending Requests</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 space-y-12">
        {/* Direct Invite Section */}
        <section className="bg-white rounded-2xl border border-charcoal/5 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus size={20} className="text-sage" />
            <h2 className="font-serif text-xl">Direct Invitation</h2>
          </div>
          <form onSubmit={handleDirectInvite} className="flex gap-4">
            <div className="flex-1 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/20" size={18} />
              <input
                type="email"
                placeholder="Enter email to bypass waitlist"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-canvas rounded-xl border border-charcoal/5 focus:ring-2 focus:ring-sage/20 focus:border-sage outline-none transition-all"
              />
            </div>
            <Button 
              type="submit" 
              variant={inviteSuccess ? "secondary" : "primary"} 
              disabled={isInviting || !inviteEmail}
              className="px-8 min-w-[160px]"
            >
              {isInviting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : inviteSuccess ? (
                <div className="flex items-center gap-2">
                  <Check size={18} />
                  <span>Sent</span>
                </div>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </form>
        </section>

        {/* Waitlist Section */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-sage" />
              <h2 className="font-serif text-xl">Waitlist Management</h2>
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/20" size={16} />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-charcoal/5 text-sm outline-none focus:ring-2 focus:ring-sage/20 transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-charcoal/5 overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-6 py-4 bg-charcoal/[0.02] border-b border-charcoal/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 italic">Email Address</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 italic">Joined</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 italic">Status</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 italic text-right">Action</span>
            </div>

            <div className="divide-y divide-charcoal/5">
              <AnimatePresence mode="popLayout">
                {filteredEntries.map((entry) => (
                  <motion.div 
                    key={entry.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-6 py-4 items-center hover:bg-charcoal/[0.01] transition-colors"
                  >
                    <div className="font-medium text-sm truncate">{entry.email}</div>
                    <div className="text-xs text-charcoal/40 font-mono">
                      {new Date(entry.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                        entry.status === 'approved' 
                          ? 'bg-sage/10 text-sage' 
                          : 'bg-charcoal/5 text-charcoal/40'
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="text-right">
                      {entry.status === 'pending' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleApprove(entry.email, entry.id)}
                          disabled={approvingId === entry.id}
                          className="text-sage hover:bg-sage/10 h-8 w-8 p-0 rounded-full"
                        >
                          {approvingId === entry.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                        </Button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button 
                            title="Copy Invite Link"
                            onClick={() => {
                              const url = `${window.location.origin}/api/unlock?token=${entry.inviteToken}`;
                              navigator.clipboard.writeText(url);
                            }}
                            className="text-charcoal/20 hover:text-sage transition-colors"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredEntries.length === 0 && (
                <div className="py-20 text-center space-y-2">
                  <p className="text-charcoal/40 italic">No entries found.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
