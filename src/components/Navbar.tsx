import { 
  User, 
  Plus, 
  LogIn, 
  LogOut, 
  UserCircle, 
  Globe, 
  MapPin, 
  Search, 
  Bell, 
  Heart, 
  Menu, 
  X, 
  Settings, 
  MessageSquare,
  ChevronDown,
  Info
} from 'lucide-react';
import { Button } from './ui/Button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { Notifications } from './Notifications';
import { SUPPORT_URL } from '../constants';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { cn } from '../lib/utils';

interface NavbarProps {
  user: any;
  onLogin: (initialStep?: 'welcome' | 'auth-email') => void;
  onLogout: () => void;
  onCreate: () => void;
  onFeedback: () => void;
}

export const Navbar = ({ user, onLogin, onLogout, onCreate, onFeedback }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  // Hide on scroll logic
  useMotionValueEvent(scrollY, "change", (latest) => {
    const direction = latest > lastScrollY.current ? "down" : "up";
    if (latest > 100 && direction === "down" && isVisible) {
      setIsVisible(false);
    } else if (direction === "up" && !isVisible) {
      setIsVisible(true);
    }
    lastScrollY.current = latest;
  });

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Folios', path: '/', icon: <User size={16} />, curatorOnly: true },
    { name: 'Explore', path: '/explore', icon: <Globe size={16} /> },
    { name: 'Memory Map', path: '/map', icon: <MapPin size={16} />, curatorOnly: true },
  ];

  const secondaryLinks = [
    { name: 'Create Postcard', onClick: onCreate, icon: <Plus size={16} />, curatorOnly: true, tabletOnly: true },
    { name: 'Settings', path: '/profile', icon: <Settings size={16} />, curatorOnly: true },
    { name: 'Feedback', onClick: onFeedback, icon: <MessageSquare size={16} /> },
    { name: 'What is Folio?', path: '/explore', icon: <Info size={16} />, guestOnly: true },
  ];

  const filteredLinks = navLinks.filter(link => {
    if (link.curatorOnly && !user) return false;
    return true;
  });

  const filteredSecondary = secondaryLinks.filter(link => {
    if (link.curatorOnly && !user) return false;
    if (link.guestOnly && user) return false;
    return true;
  });

  const tabletSecondary = filteredSecondary.filter(link => {
    // On tablet (md), we show the "Create" button in the More menu
    return true;
  });

  const desktopSecondary = filteredSecondary.filter(link => {
    // On desktop (lg), we hide "Create" from the secondary list because it's a main button
    return !link.tabletOnly;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          "bg-canvas/70 backdrop-blur-md border-b border-charcoal/5",
          "px-6 py-4 flex items-center justify-between"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-charcoal rounded-sm rotate-45 flex items-center justify-center text-white group-hover:bg-sage transition-colors duration-500">
              <span className="rotate-[-45deg] font-serif font-bold">F</span>
            </div>
            <h1 className="text-2xl font-serif tracking-tighter group-hover:text-sage transition-colors duration-500">Folio</h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {filteredLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 relative py-1",
                  isActive(link.path) 
                    ? "text-sage" 
                    : "text-charcoal/40 hover:text-charcoal"
                )}
              >
                {link.name}
                {isActive(link.path) && (
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-sage rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Tablet "More" Menu */}
          <div className="hidden md:flex lg:hidden relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-charcoal/40 hover:text-charcoal transition-colors"
            >
              More <ChevronDown size={14} className={cn("transition-transform", isMoreMenuOpen && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {isMoreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-4 w-48 bg-white rounded-xl shadow-2xl border border-charcoal/5 p-2 overflow-hidden"
                >
                  {tabletSecondary.map((link) => (
                    link.path ? (
                      <Link
                        key={link.name}
                        to={link.path}
                        className="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-charcoal/60 hover:text-sage hover:bg-sage/5 rounded-lg transition-all"
                      >
                        {link.icon} {link.name}
                      </Link>
                    ) : (
                      <button
                        key={link.name}
                        onClick={() => {
                          link.onClick?.();
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-charcoal/60 hover:text-sage hover:bg-sage/5 rounded-lg transition-all"
                      >
                        {link.icon} {link.name}
                      </button>
                    )
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Secondary Links */}
          <div className="hidden lg:flex items-center gap-6 mr-4 border-r border-charcoal/5 pr-6">
            {desktopSecondary.map((link) => (
              link.path ? (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30 hover:text-charcoal transition-colors"
                >
                  {link.name}
                </Link>
              ) : (
                <button
                  key={link.name}
                  onClick={link.onClick}
                  className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30 hover:text-charcoal transition-colors"
                >
                  {link.name}
                </button>
              )
            ))}
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <Notifications />
              <Button 
                variant="primary" 
                size="sm" 
                onClick={onCreate} 
                className="hidden lg:flex gap-2 shadow-lg shadow-sage/20"
              >
                <Plus size={16} />
                Create Postcard
              </Button>
              <Link to="/profile" className="p-1 rounded-full border-2 border-transparent hover:border-sage transition-all">
                <div className="w-8 h-8 rounded-full bg-charcoal/5 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={24} className="text-charcoal/20" />
                  )}
                </div>
              </Link>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={() => onLogin('auth-email')} className="gap-2">
              <LogIn size={16} />
              Login
            </Button>
          )}

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-charcoal/60 hover:text-charcoal transition-colors"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-charcoal/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              id="mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-xs bg-canvas shadow-2xl lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-charcoal/5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-charcoal rounded-sm rotate-45 flex items-center justify-center text-white">
                    <span className="rotate-[-45deg] text-[10px] font-serif font-bold">F</span>
                  </div>
                  <h2 className="text-lg font-serif">Folio</h2>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-charcoal/40 hover:text-charcoal transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                <div className="space-y-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/20">Navigation</p>
                  <nav className="flex flex-col gap-6">
                    {filteredLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={cn(
                          "text-3xl font-serif transition-colors",
                          isActive(link.path) ? "text-sage" : "text-charcoal/60"
                        )}
                      >
                        {link.name}
                      </Link>
                    ))}
                  </nav>
                </div>

                <div className="space-y-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/20">Support & Info</p>
                  <nav className="flex flex-col gap-4">
                    {filteredSecondary.map((link) => (
                      link.path ? (
                        <Link
                          key={link.name}
                          to={link.path}
                          className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-charcoal/40 hover:text-sage transition-colors"
                        >
                          {link.icon} {link.name}
                        </Link>
                      ) : (
                        <button
                          key={link.name}
                          onClick={link.onClick}
                          className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-charcoal/40 hover:text-sage transition-colors"
                        >
                          {link.icon} {link.name}
                        </button>
                      )
                    ))}
                  </nav>
                </div>
              </div>

              {user ? (
                <div className="p-8 border-t border-charcoal/5 bg-charcoal/[0.02]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-charcoal/5 overflow-hidden">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={48} className="text-charcoal/10" />
                      )}
                    </div>
                    <div>
                      <p className="font-serif text-lg">{user.displayName}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30">Curator</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={onLogout}>
                    <LogOut size={16} /> Logout
                  </Button>
                </div>
              ) : (
                <div className="p-8 border-t border-charcoal/5">
                  <Button variant="primary" className="w-full" onClick={() => onLogin('auth-email')}>
                    Login to Folio
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
