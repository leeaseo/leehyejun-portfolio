import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('leehyejun_custom_about');
      localStorage.removeItem('leehyejun_custom_resume');
      localStorage.removeItem('leehyejun_custom_projects');
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-white text-black p-6 flex flex-col items-center justify-center font-sans">
          <div className="max-w-md w-full border border-black p-6 space-y-4">
            <h2 className="text-[16px] font-normal text-black border-b border-neutral-200 pb-2">
              시스템 안내 (오류 발생)
            </h2>
            <p className="text-[13px] text-neutral-600 leading-relaxed">
              화면을 렌더링하는 중 예기치 않은 오류가 발생했습니다. 브라우저 캐시를 초기화하거나 새로고침하여 복구할 수 있습니다.
            </p>
            {this.state.error && (
              <div className="p-3 bg-neutral-100 text-[11px] font-mono text-red-700 overflow-x-auto whitespace-pre-wrap">
                {this.state.error.toString()}
              </div>
            )}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-black text-white py-2 text-[13px] hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                다시 시도 (복구)
              </button>
              <button
                onClick={this.handleResetCache}
                className="flex-1 border border-neutral-300 py-2 text-[13px] text-neutral-700 hover:border-black hover:text-black transition-colors cursor-pointer"
              >
                저장소 초기화 후 복구
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
