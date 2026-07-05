import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside boundary:", error, errorInfo);
    (this as any).setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if ((this as any).state.hasError) {
      return (
        <div className="bg-neutral-950 border-4 border-red-900/45 p-6 md:p-8 font-mono text-left space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-red-500 pb-4 text-red-500">
            <span className="w-3 h-3 bg-red-500 animate-ping rounded-full shrink-0"></span>
            <h2 className="text-sm font-black uppercase tracking-wider">
              {(this as any).props.fallbackTitle || "WORKSPACE CRASH DIAGNOSTIC"}
            </h2>
          </div>

          <p className="text-xs text-neutral-300 font-bold leading-relaxed">
            A fatal React rendering exception occurred within this module. The workspace load was aborted to prevent corrupted operations. Please review the trace diagnostics below:
          </p>

          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded text-red-400 text-xs overflow-x-auto select-all max-h-[300px] whitespace-pre-wrap leading-relaxed">
            <strong className="block text-red-500 uppercase text-[10px] tracking-widest font-black mb-1">
              Error Message:
            </strong>
            {(this as any).state.error?.toString() || "Unknown rendering exception"}
            
            {(this as any).state.errorInfo?.componentStack && (
              <>
                <strong className="block text-red-500 uppercase text-[10px] tracking-widest font-black mt-4 mb-1">
                  Component Trace Stack:
                </strong>
                <span className="text-[10px] text-neutral-400 font-mono leading-normal">
                  {(this as any).state.errorInfo.componentStack}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="py-3 px-6 bg-red-500 hover:bg-red-400 text-neutral-950 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Force Reload Workspace
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.back();
                }
              }}
              className="py-3 px-6 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
