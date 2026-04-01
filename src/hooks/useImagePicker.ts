import { useState } from 'react';
import {
    Asset,
    ImagePickerResponse,
    PhotoQuality,
    launchCamera,
    launchImageLibrary,
} from 'react-native-image-picker';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useI18n } from './useI18n';

type UseImagePickerOptions = {
    allowGallery?: boolean;
    cameraType?: 'front' | 'back';
    permissionMessage?: string;
    promptTitle?: string;
    promptMessage?: string;
    takePhotoLabel?: string;
    chooseGalleryLabel?: string;
    quality?: PhotoQuality;
    conversionQuality?: PhotoQuality;
    maxWidth?: number;
    maxHeight?: number;
    assetRepresentationMode?: 'auto' | 'current' | 'compatible';
};

export function useImagePicker(options?: UseImagePickerOptions) {
    const [profileImage, setProfileImage] = useState<Asset | null>(null);
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const allowGallery = options?.allowGallery ?? true;
    const cameraType = options?.cameraType ?? 'front';
    const quality: PhotoQuality = options?.quality ?? 0.8;
    const conversionQuality: PhotoQuality =
        options?.conversionQuality ?? quality;
    const maxWidth = options?.maxWidth ?? 1024;
    const maxHeight = options?.maxHeight ?? 1024;
    const assetRepresentationMode = options?.assetRepresentationMode ?? 'compatible';

    const onImagePicked = (result: ImagePickerResponse) => {
        if (result.didCancel) return;

        if (result.errorCode) {
            alert(t('image.error'), result.errorMessage || t('image.selectFailed'));
            return;
        }

        const selectedAsset = result.assets?.[0];
        const pickedUri = selectedAsset?.uri;
        if (!pickedUri) {
            alert(t('image.error'), t('image.readFailed'));
            return;
        }

        setProfileImage(selectedAsset);
    };

    const ensureCameraPermission = async () => {
        if (Platform.OS !== 'android') return true;

        const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
        const hasPermission = await PermissionsAndroid.check(permission);
        if (hasPermission) return true;

        const result = await PermissionsAndroid.request(permission, {
            title: t('camera.permissionTitle'),
            message: options?.permissionMessage || t('camera.permissionMessage'),
            buttonPositive: t('camera.allow'),
            buttonNegative: t('camera.deny'),
            buttonNeutral: t('camera.later'),
        });

        if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            alert(
                t('camera.blockedTitle'),
                t('camera.blockedMessage'),
                [
                    {
                        text: t('camera.openSettings'),
                        onPress: () => {
                            Linking.openSettings().catch(() => {
                                alert(
                                    t('camera.permissionTitleGeneric'),
                                    t('camera.openSettingsFailed'),
                                );
                            });
                        },
                    },
                    { text: t('common.cancel'), style: 'cancel' },
                ],
            );
            return false;
        }

        alert(t('camera.permissionDeniedTitle'), t('camera.permissionDeniedMessage'));
        return false;
    };

    const onTakePhoto = async () => {
        try {
            const hasPermission = await ensureCameraPermission();
            if (!hasPermission) return;

            const result = await launchCamera({
                mediaType: 'photo',
                quality,
                conversionQuality,
                maxWidth,
                maxHeight,
                saveToPhotos: false,
                cameraType,
                assetRepresentationMode,
            });
            onImagePicked(result);
        } catch {
            alert(t('image.error'), t('image.openCameraFailed'));
        }
    };

    const onChooseFromGallery = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality,
                conversionQuality,
                maxWidth,
                maxHeight,
                assetRepresentationMode,
            });
            onImagePicked(result);
        } catch {
            alert(t('image.error'), t('image.selectFailed'));
        }
    };

    const promptPickImage = () => {
        if (!allowGallery) {
            onTakePhoto();
            return;
        }

        alert(
            options?.promptTitle || t('profileImage.title'),
            options?.promptMessage || t('profileImage.message'),
            [
                {
                    text: options?.takePhotoLabel || t('profileImage.takePhoto'),
                    onPress: () => onTakePhoto(),
                },
                {
                    text:
                        options?.chooseGalleryLabel || t('profileImage.chooseGallery'),
                    onPress: () => onChooseFromGallery(),
                },
                { text: t('common.cancel'), style: 'cancel' },
            ],
        );
    };

    return {
        profileImage,
        setProfileImage,
        onTakePhoto,
        onChooseFromGallery,
        promptPickImage,
    };
}
