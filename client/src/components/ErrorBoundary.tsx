import React, { Component, ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    // Clear potentially corrupted localStorage data
    let clearSuccess = false;
    try {
      localStorage.removeItem("custom_watchlists");
      clearSuccess = true;
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
    
    // Only reload if we successfully cleared the data or can't access localStorage
    if (clearSuccess || typeof localStorage === "undefined") {
      window.location.reload();
    } else {
      // If we can't clear localStorage, show an error message
      alert("Failed to clear corrupted data. Please try clearing your browser cache manually.");
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-secondary/50 backdrop-blur-md rounded-2xl border border-border/50 p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-2">
              The app encountered an unexpected error. This might be caused by corrupted watchlist data in your browser storage.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Clicking the button below will clear your custom watchlists and reload the page.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset and Reload
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-background/50 rounded text-xs overflow-auto">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
