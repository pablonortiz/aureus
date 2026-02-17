import {
  DocumentDirectoryPath,
  DownloadDirectoryPath,
  exists as fsExists,
  mkdir,
  writeFile,
  copyFile,
  moveFile,
  stat as fsStat,
  unlink,
  readDir,
} from '@dr.pogodin/react-native-fs';
import {NativeModules} from 'react-native';
import {createThumbnail} from 'react-native-create-thumbnail';

const {GalleryPicker, VaultImport} = NativeModules;

const VAULT_DIR = `${DocumentDirectoryPath}/vault`;
const THUMBNAILS_DIR = `${VAULT_DIR}/.thumbnails`;

export interface PickedFile {
  filename: string;
  vaultPath: string;
  originalName: string;
  mediaType: 'image' | 'video';
  fileSize: number;
  deleted: boolean;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOriginalExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return 'jpg';
}

export const vaultService = {
  async initVault(): Promise<void> {
    const dirExists = await fsExists(VAULT_DIR);
    if (!dirExists) {
      await mkdir(VAULT_DIR);
    }
    const thumbExists = await fsExists(THUMBNAILS_DIR);
    if (!thumbExists) {
      await mkdir(THUMBNAILS_DIR);
    }
    const nomediaPath = `${VAULT_DIR}/.nomedia`;
    const nomediaExists = await fsExists(nomediaPath);
    if (!nomediaExists) {
      await writeFile(nomediaPath, '', 'utf8');
    }
  },

  /**
   * Open native file picker (ACTION_OPEN_DOCUMENT), copy selected files
   * to the vault, and delete the originals via DocumentsContract.
   * Returns array of imported files.
   */
  async pickAndImport(): Promise<PickedFile[]> {
    await this.initVault();
    const results: any[] = await GalleryPicker.pickAndImport(VAULT_DIR);

    const files: PickedFile[] = [];
    for (const r of results) {
      const file: PickedFile = {
        filename: r.filename,
        vaultPath: r.vaultPath,
        originalName: r.originalName,
        mediaType: r.mediaType === 'video' ? 'video' : 'image',
        fileSize: Math.round(r.fileSize) || 0,
        deleted: !!r.deleted,
      };
      files.push(file);

      // Generate thumbnail for videos
      if (file.mediaType === 'video') {
        const ext = getOriginalExtension(file.originalName);
        await this.generateThumbnail(file.filename, ext);
      }
    }

    return files;
  },

  /**
   * Import a file from camera (file:// URI) into the vault.
   * Camera files are owned by us, so we can move them directly.
   */
  async importFromCamera(
    sourceUri: string,
    mediaType: 'image' | 'video',
    originalName: string,
  ): Promise<{filename: string; vaultPath: string; fileSize: number}> {
    await this.initVault();

    const ext = getOriginalExtension(originalName);
    const filename = `${uuid()}.vault`;
    const vaultPath = `${VAULT_DIR}/${filename}`;

    let normalizedUri = sourceUri;
    if (normalizedUri.startsWith('file://')) {
      normalizedUri = normalizedUri.replace('file://', '');
    }

    try {
      await moveFile(normalizedUri, vaultPath);
    } catch {
      await copyFile(normalizedUri, vaultPath);
      try {
        await unlink(normalizedUri);
      } catch {
        // ignore
      }
    }

    const fileStat = await fsStat(vaultPath);
    const fileSize = Number(fileStat.size) || 0;

    if (mediaType === 'video') {
      await this.generateThumbnail(filename, ext);
    }

    return {filename, vaultPath, fileSize};
  },

  async deleteFile(vaultPath: string): Promise<void> {
    const fileExists = await fsExists(vaultPath);
    if (fileExists) {
      await unlink(vaultPath);
    }
    const filename = vaultPath.split('/').pop() || '';
    const thumbPath = `${THUMBNAILS_DIR}/${filename}.jpg`;
    const thumbExists = await fsExists(thumbPath);
    if (thumbExists) {
      await unlink(thumbPath);
    }
  },

  async exportFile(vaultPath: string, originalName: string): Promise<string> {
    // Use native MediaStore API to write to Downloads (scoped storage compatible)
    const exportedName = await VaultImport.exportToDownloads(vaultPath, originalName);
    return exportedName;
  },

  getFileUri(vaultPath: string): string {
    return `file://${vaultPath}`;
  },

  getThumbnailUri(filename: string): string {
    return `file://${THUMBNAILS_DIR}/${filename}.jpg`;
  },

  async generateThumbnail(
    filename: string,
    _originalExt: string,
  ): Promise<string | null> {
    try {
      const vaultPath = `${VAULT_DIR}/${filename}`;
      const result = await createThumbnail({
        url: `file://${vaultPath}`,
        timeStamp: 1000,
        format: 'jpeg',
      });
      const thumbPath = `${THUMBNAILS_DIR}/${filename}.jpg`;
      let thumbSource = result.path;
      if (thumbSource.startsWith('file://')) {
        thumbSource = thumbSource.replace('file://', '');
      }
      await copyFile(thumbSource, thumbPath);
      return thumbPath;
    } catch {
      return null;
    }
  },

  async cleanupFiles(vaultPaths: string[]): Promise<void> {
    for (const path of vaultPaths) {
      await this.deleteFile(path);
    }
  },

  async getVaultSize(): Promise<number> {
    try {
      const dirExists = await fsExists(VAULT_DIR);
      if (!dirExists) return 0;
      const items = await readDir(VAULT_DIR);
      let total = 0;
      for (const item of items) {
        if (item.isFile()) {
          total += Number(item.size) || 0;
        }
      }
      return total;
    } catch {
      return 0;
    }
  },
};
