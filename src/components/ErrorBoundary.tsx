import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { themeDefinitions } from '../theme/themes';

type ErrorBoundaryProps = {
    children: React.ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
};

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = {
        hasError: false,
    };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        if (__DEV__) {
            console.error('Unhandled render error', error, info.componentStack);
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View
                    style={styles.container}
                    testID="error-boundary-fallback"
                    accessible
                    accessibilityRole="alert"
                >
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        Please try again. Your saved data has not been removed.
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={this.handleRetry}
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                        testID="error-boundary-retry"
                    >
                        <Text style={styles.retryButtonText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = createStyles(themeDefinitions.dark.colors);

function createStyles(colors: typeof themeDefinitions.dark.colors) {
    return StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: colors.background,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    message: {
        maxWidth: 320,
        marginTop: 12,
        color: colors.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.primaryAction,
    },
    retryButtonText: {
        color: colors.textOnAction,
        fontSize: 15,
        fontWeight: '700',
    },
    });
}
