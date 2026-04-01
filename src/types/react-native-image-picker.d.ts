import 'react-native-image-picker';

declare module 'react-native-image-picker' {
    interface OptionsCommon {
        conversionQuality?: PhotoQuality;
    }
}
