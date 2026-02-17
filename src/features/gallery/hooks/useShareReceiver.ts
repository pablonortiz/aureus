import {useEffect} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';
import {getDatabase} from '../../../core/database';
import {vaultService} from '../services/vaultService';
import {useGalleryStore} from '../store/useGalleryStore';

const {ShareReceiver, VaultImport} = NativeModules;

interface SharedFile {
  filename: string;
  vaultPath: string;
  originalName: string;
  mediaType: 'image' | 'video';
  fileSize: number;
  deleted: boolean;
  contentUri: string;
}

function getOriginalExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return 'jpg';
}

async function processFiles(files: SharedFile[]): Promise<void> {
  const db = getDatabase();

  useGalleryStore.setState({
    importToast: {visible: true, message: `Importando ${files.length} archivo(s)...`},
  });

  for (const file of files) {
    await db.execute(
      `INSERT INTO gallery_media
       (filename, original_name, vault_path, media_type, file_size, folder_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        file.filename,
        file.originalName,
        file.vaultPath,
        file.mediaType,
        Math.round(file.fileSize),
        null,
      ],
    );

    if (file.mediaType === 'video') {
      const ext = getOriginalExtension(file.originalName);
      await vaultService.generateThumbnail(file.filename, ext);
    }
  }

  ShareReceiver.clearShareIntent();

  // For files not silently deleted by the native module, use MediaStore delete request
  const pendingUris = files
    .filter(f => !f.deleted && f.contentUri)
    .map(f => f.contentUri);
  if (pendingUris.length > 0) {
    try {
      await VaultImport.removeOriginals(pendingUris);
    } catch {
      // User may deny deletion — files are already safe in vault
    }
  }

  useGalleryStore.setState({
    importToast: {visible: true, message: `${files.length} archivo(s) importado(s)`},
  });
  setTimeout(() => {
    useGalleryStore.setState({importToast: null});
  }, 2000);
}

export function useShareReceiver(): void {
  useEffect(() => {
    // Cold start: check if app was launched via share intent
    ShareReceiver.getShareIntent()
      .then((files: SharedFile[] | null) => {
        if (files && files.length > 0) {
          processFiles(files);
        }
      })
      .catch(() => {});

    // Warm start: listen for new share intents while app is running
    const emitter = new NativeEventEmitter(ShareReceiver);
    const subscription = emitter.addListener(
      'onShareReceived',
      (files: SharedFile[]) => {
        if (files && files.length > 0) {
          processFiles(files);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
