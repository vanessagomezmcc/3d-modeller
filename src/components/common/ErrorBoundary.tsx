import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("3D Modeller crashed:", error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fatal-state">
        <div className="fatal-card">
          <h1 className="fatal-title">Something went wrong</h1>
          <p className="fatal-text">
            The editor hit an unexpected error. Reloading the page will restore the demo scene;
            anything you saved to this browser is still available under Load.
          </p>
          <button type="button" className="btn btn-accent" onClick={this.handleReload}>
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
