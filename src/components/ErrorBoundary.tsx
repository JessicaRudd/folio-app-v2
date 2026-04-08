import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reported: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      reported: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reported: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.reportError(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/support/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          message: error.message,
          summary: `Runtime Error: ${error.message.slice(0, 30)}`,
          stack: error.stack + '\n\nComponent Stack:\n' + errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          identity: 'System Auto-Report'
        }),
      });
      this.setState({ reported: true });
    } catch (e) {
      console.error('Failed to auto-report error:', e);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, reported: false });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-12 text-center space-y-8 border border-charcoal/5"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <ShieldAlert size={40} className="text-red-500" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-serif">Something went wrong.</h1>
              <p className="text-charcoal/60 italic editorial-text leading-relaxed">
                We've encountered an unexpected error. Don't worry, our system has already automatically reported this to our team.
              </p>
            </div>

            {this.state.reported && (
              <div className="text-[10px] font-bold uppercase tracking-widest text-sage bg-sage/5 py-2 px-4 rounded-full inline-block">
                Report Sent Successfully
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <Button 
                variant="primary" 
                className="w-full gap-2"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={18} /> Try Refreshing
              </Button>
              <Button 
                variant="ghost" 
                className="w-full gap-2 text-charcoal/40"
                onClick={this.handleReset}
              >
                <Home size={18} /> Return to Home
              </Button>
            </div>

            <p className="text-[10px] text-charcoal/20 uppercase tracking-widest font-bold pt-4">
              Folio &mdash; Privacy First
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
