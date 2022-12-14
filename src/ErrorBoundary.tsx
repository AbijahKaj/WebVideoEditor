import React from "react";

export class ErrorBoundary extends React.Component<{ [key: string]: any }, { error: any, errorInfo: any }> {
    constructor(props: {} | Readonly<{}>) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error: any, errorInfo: any) {
        // Catch errors in any components below and re-render with error message
        this.setState({
            error: error,
            errorInfo: errorInfo
        })
        // You can also log error messages to an error reporting service here
    }

    componentDidUpdate(prevProps: Readonly<{ [key: string]: any; }>, prevState: Readonly<{ error: any; errorInfo: any; }>, snapshot?: any): void {
        if (prevProps !== this.props) {
            this.setState({ error: null, errorInfo: null })
        }
    }

    render() {
        if (this.state.errorInfo) {
            // Error path
            return (
                <div>
                    <h2>Something went wrong.</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        // Normally, just render children
        return this.props.children;
    }
}