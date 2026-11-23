import { Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Compartilha a FOTO real da oferta + copia a legenda persuasiva para colar no WhatsApp/Status/Instagram.
 * Requer `expo-file-system` e `expo-sharing` (instalados via `npx expo install expo-file-system expo-sharing`).
 */
export async function shareOfferWithPhoto(
  imageUrl: string,
  caption: string
): Promise<void> {
  await Clipboard.setStringAsync(caption);

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sharing = require('expo-sharing');

    const canShare = await Sharing.isAvailableAsync();
    if (canShare && imageUrl) {
      const localPath = `${FileSystem.cacheDirectory}ofertapro_${Date.now()}.jpg`;
      const download = await FileSystem.downloadAsync(imageUrl, localPath);

      Alert.alert(
        'Legenda copiada! 📋',
        'A foto do produto vai abrir para você escolher o grupo ou Status — depois é só tocar em "Colar" na legenda!',
        [
          {
            text: 'Compartilhar Foto Agora',
            onPress: async () => {
              await Sharing.shareAsync(download.uri, {
                mimeType: 'image/jpeg',
                dialogTitle: 'Compartilhar Oferta com Foto',
              });
            },
          },
        ]
      );
      return;
    }
  } catch {
    // Fallback caso expo-file-system / expo-sharing ainda não tenham sido instalados
  }

  await Share.share({ message: caption });
}
