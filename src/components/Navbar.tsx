import { User, Plus, LogIn, LogOut, UserCircle, Globe, MapPin, Search, Bell, Heart } from 'lucide-react';
import { Button } from './ui/Button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { Notifications } from './Notifications';
import { SUPPORT_URL } from '../constants';

interface NavbarProps {
  user: any;
  onLogin: (initialStep?: 'welcome' | 'auth-email') => void;
  onLogout: () => void;
  onCreate: () => void;
}

export const Navbar = ({ user, onLogin, onLogout, onCreate }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-charcoal rounded-sm rotate-45 flex items-center justify-center text-white">
            <span className="rotate-[-45deg] font-serif font-bold">F</span>
          </div>
          <h1 className="text-2xl font-serif tracking-tighter">Folio</h1>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link 
            to="/explore" 
            className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${location.pathname === '/explore' ? 'text-sage' : 'text-charcoal/40 hover:text-charcoal'}`}
          >
            <Globe size={14} /> Explore
          </Link>
          {user && (
            <Link 
              to="/map" 
              className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${location.pathname === '/map' ? 'text-sage' : 'text-charcoal/40 hover:text-charcoal'}`}
            >
              <MapPin size={14} /> Memory Map
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/20 group-focus-within:text-sage transition-colors" size={16} />
          <input 
            type="text"
            placeholder="Search curators, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-charcoal/5 border border-transparent focus:border-sage/20 focus:bg-white rounded-full py-2 pl-10 pr-4 text-sm outline-none transition-all"
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <a 
          href={SUPPORT_URL} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-sage/5 text-sage hover:bg-sage/10 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <Heart size={14} className="fill-sage/20" />
          Support Folio
        </a>

        {user ? (
          <>
            <Notifications />
            <Button variant="outline" size="sm" onClick={onCreate} className="hidden md:flex gap-2">
              <Plus size={16} />
              New Postcard
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l border-charcoal/10">
              <Link to="/profile" className="text-right hidden sm:block hover:opacity-70 transition-opacity">
                <div className="text-xs font-bold uppercase tracking-widest">{user.displayName}</div>
                <div className="text-[10px] text-charcoal/40">Creator Profile</div>
              </Link>
              <Link to="/profile" className="p-2 rounded-full hover:bg-charcoal/5 transition-colors">
                <UserCircle size={22} className="text-charcoal/60" />
              </Link>
              <Button variant="ghost" size="sm" onClick={onLogout} className="p-2 rounded-full">
                <LogOut size={18} />
              </Button>
            </div>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={() => onLogin('auth-email')} className="gap-2">
            <LogIn size={16} />
            Creator Login
          </Button>
        )}
      </div>
    </nav>
  );
};
