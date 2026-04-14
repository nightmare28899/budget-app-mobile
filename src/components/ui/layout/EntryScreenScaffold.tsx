import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../../theme/index';
import { AnimatedScreen } from '../primitives/AnimatedScreen';
import { HomeBackground } from './HomeBackground';
import { ScreenBackButton } from '../primitives/ScreenBackButton';

type EntryScreenScaffoldProps = {
    title: string;
    subtitle: string;
    embedded?: boolean;
    onBack: () => void;
    children: React.ReactNode;
    scrollRef?: React.Ref<ScrollView>;
    scrollContentContainerStyle?: StyleProp<ViewStyle>;
    scrollBottomSpacing: number;
    footer?: React.ReactNode;
    footerContainerStyle?: StyleProp<ViewStyle>;
    footerBottomPadding?: number;
    showsVerticalScrollIndicator?: boolean;
    animationDelay?: number;
    animationDuration?: number;
    animationTravelY?: number;
};

export function EntryScreenScaffold({
    title,
    subtitle,
    embedded = false,
    onBack,
    children,
    scrollRef,
    scrollContentContainerStyle,
    scrollBottomSpacing,
    footer,
    footerContainerStyle,
    footerBottomPadding,
    showsVerticalScrollIndicator,
    animationDelay = 8,
    animationDuration = 200,
    animationTravelY = 6,
}: EntryScreenScaffoldProps) {
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const { contentMaxWidth, horizontalPadding, scaleFont } = useResponsive();

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? (embedded ? 0 : insets.top) : 0}
        >
            <HomeBackground />
            <AnimatedScreen
                style={styles.flex1}
                delay={animationDelay}
                duration={animationDuration}
                travelY={animationTravelY}
            >
                <View
                    style={[
                        styles.header,
                        {
                            backgroundColor: colors.background,
                            paddingTop: embedded ? spacing.base : insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                    ]}
                >
                    <View style={styles.headerRow}>
                        {!embedded ? (
                            <ScreenBackButton
                                onPress={onBack}
                                containerStyle={styles.backButton}
                            />
                        ) : null}
                        <View style={styles.headerCopy}>
                            <Text
                                style={[
                                    styles.headerTitle,
                                    { fontSize: scaleFont(typography.fontSize['2xl']) },
                                ]}
                            >
                                {title}
                            </Text>
                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.md) },
                                ]}
                            >
                                {subtitle}
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[
                        scrollContentContainerStyle,
                        {
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + scrollBottomSpacing,
                        },
                        contentMaxWidth
                            ? {
                                maxWidth: contentMaxWidth,
                                alignSelf: 'center',
                                width: '100%',
                            }
                            : null,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    showsVerticalScrollIndicator={showsVerticalScrollIndicator}
                >
                    {children}
                </ScrollView>

                {footer ? (
                    <View
                        style={[
                            styles.footerContainer,
                            {
                                paddingHorizontal: horizontalPadding,
                                paddingBottom:
                                    footerBottomPadding ?? (embedded ? spacing.lg : insets.bottom || spacing.lg),
                            },
                            footerContainerStyle,
                        ]}
                    >
                        {footer}
                    </View>
                ) : null}
            </AnimatedScreen>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        flex1: {
            flex: 1,
        },
        header: {
            marginBottom: spacing.base,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        backButton: {
            marginRight: spacing.sm,
            marginTop: 2,
        },
        headerCopy: {
            flex: 1,
        },
        headerTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: -0.4,
        },
        headerSubtitle: {
            marginTop: spacing.xs,
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.medium,
            lineHeight: 20,
        },
        footerContainer: {
            backgroundColor: colors.background,
        },
    });
