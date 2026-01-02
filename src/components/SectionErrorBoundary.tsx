'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    sectionName?: string;
    onError?: (error: Error) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Section-level Error Boundary
 * Catches errors in a specific section without crashing the entire app
 */
export class SectionErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[SectionErrorBoundary:${this.props.sectionName || 'unknown'}]`, error, errorInfo);
        this.props.onError?.(error);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 my-2">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">
                            {this.props.sectionName
                                ? `Erreur dans ${this.props.sectionName}`
                                : 'Une erreur est survenue'}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                        Cette section a rencontré un problème.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Réessayer
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default SectionErrorBoundary;
