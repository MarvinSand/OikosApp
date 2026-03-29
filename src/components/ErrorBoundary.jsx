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
          <div className="bg-primary p-8 rounded-[24px] shadow-glass max-w-md w-full flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-dark mb-2">Ein Fehler ist aufgetreten</h2>
            <p className="text-dark-muted text-sm mb-8">
              Die App hat ein Problem festgestellt und wurde angehalten. Wir bitten um Entschuldigung.
            </p>
            <div className="bg-warm-4 p-4 rounded-xl w-full text-left overflow-hidden mb-8">
              <p className="text-xs text-dark-muted font-mono whitespace-pre-wrap break-all">
                {this.state.error?.toString() || 'Unbekannter Fehler'}
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center justify-center gap-2 bg-warm-1 text-white py-3 px-6 rounded-xl font-semibold hover:bg-warm-2 transition-colors"
            >
              <RefreshCw size={18} /> App neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
