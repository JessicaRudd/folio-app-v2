import { User, Plus, LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/Button';

interface NavbarProps {
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  onCreate: () => void;
}

export const Navbar = ({ user, onLogin, onLogout, onCreate }: NavbarProps) => {
  return (
    <nav className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-charcoal rounded-sm rotate-45 flex items-center justify-center text-white">
          <span className="rotate-[-45deg] font-serif font-bold">F</span>
        </div>
        <h1 className="text-2xl font-serif tracking-tighter">Folio</h1>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Button variant="outline" size="sm" onClick={onCreate} className="hidden md:flex gap-2">
              <Plus size={16} />
              New Postcard
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l border-charcoal/10">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold uppercase tracking-widest">{user.displayName}</div>
                <div className="text-[10px] text-charcoal/40">Creator</div>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout} className="p-2 rounded-full">
                <LogOut size={18} />
              </Button>
            </div>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={onLogin} className="gap-2">
            <LogIn size={16} />
            Creator Login
          </Button>
        )}
      </div>
    </nav>
  );
};
