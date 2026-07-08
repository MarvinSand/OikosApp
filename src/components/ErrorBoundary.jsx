import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in React Tree:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
          <div className="glass-panel p-8 rounded-[24px] max-w-md w-full flex flex-col items-center">
            <div className="w-16 h-16 bg-error-bg text-error rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-warm-1 mb-2">Ups, da ist etwas schiefgelaufen</h2>
            <p className="text-dark-muted text-sm mb-6">
              Die App hat ein unerwartetes Problem festgestellt. Lade sie einfach neu – deine Daten sind sicher.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center justify-center gap-2 bg-warm-1 text-bg py-3 px-6 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={18} /> App neu laden
            </button>
            <details className="w-full mt-6 text-left">
              <summary className="text-xs text-dark-light cursor-pointer">Technische Details</summary>
              <div className="bg-warm-4 p-3 rounded-xl mt-2 overflow-hidden">
                <p className="text-xs text-dark-muted font-mono whitespace-pre-wrap break-all">
                  {this.state.error?.toString() || 'Unbekannter Fehler'}
                </p>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
