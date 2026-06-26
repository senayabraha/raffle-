import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Top-level render-crash guard so a bug in any route shows a recoverable screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-app px-6">
        <div className="glass-strong relative max-w-md overflow-hidden p-8 text-center">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
              <AlertTriangle strokeWidth={1.75} className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tightest text-ink">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              We hit an unexpected error. Reloading the page usually fixes it.
            </p>
            <button
              onClick={() => (window.location.href = "/en")}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-accent-gradient px-5 text-sm font-semibold text-white shadow-accent-glow transition-all duration-300 hover:brightness-110 active:scale-[0.97]"
            >
              Back home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
