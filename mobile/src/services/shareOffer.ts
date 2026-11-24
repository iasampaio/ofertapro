import { Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

/**
 * Baixa a FOTO real da oferta usando a API oficial do Expo SDK 58 (`expo-file-system`),
 * copia a legenda persuasiva para a área de transferência e abre o compartilhamento com a IMAGEM anexada.
 */
export async function shareOfferWithPhoto(
  imageUrl: string,
  caption: string
): Promise<void> {
  await Clipboard.setStringAsync(caption);

  if (imageUrl) {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        const destFile = new File(Paths.cache, `ofertapro_${Date.now()}.jpg`);
        const downloaded = await File.downloadFileAsync(imageUrl, destFile, {
          idempotent: true,
        });

        Alert.alert(
          'Legenda copiada! 📋',
          'A foto da oferta vai abrir agora — escolha o grupo ou Status no WhatsApp e toque em "Colar" na legenda!',
          [
            {
              text: 'Compartilhar Foto 📸',
              onPress: async () => {
                await Sharing.shareAsync(downloaded.uri, {
                  mimeType: 'image/jpeg',
                  UTI: 'public.jpeg',
                  dialogTitle: 'Compartilhar Oferta com Foto',
                });
              },
            },
          ]
        );
        return;
      }
    } catch (err) {
      console.warn('[shareOfferWithPhoto] Erro ao baixar foto:', err);
    }
  }

  await Share.share({ message: caption });
}
