import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './index.css';
import { registerServiceWorker } from './utils/pwaManager.js';

// Register PWA service worker
registerServiceWorker();

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application exception:", error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem("pending_check_in");
    window.location.href = window.location.pathname;
  };

  private handleClearAll = () => {
    localStorage.clear();
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none">
          <div className="max-w-md w-full bg-[#111111] border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">System Safe Mode</h2>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {this.state.error?.message || "An unexpected error occurred during rendering. The interface has safely paused to protect your data."}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                Reload App
              </button>
              <button
                onClick={this.handleClearAll}
                className="py-3 px-4 bg-[#1A1A1A] hover:bg-[#222] border border-neutral-700 text-neutral-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
