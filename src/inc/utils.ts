import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

enum DataFileTypes {
    UNCATEGORIZED,
    CERTS,
    BACKUP,

    TMP_UNCATEGORIZED,
    TMP_LOG,
    TMP_UPLOAD
}


function makeUrl(relUrl: string) {
    const protocolStr = process.env.WEB_PUBLIC_HTTPS === '1' ? 'https' : 'http';
    const portStr = (
            (process.env.WEB_PUBLIC_HTTPS === '0' && process.env.WEB_PUBLIC_PORT === '80') ||
            (process.env.WEB_PUBLIC_HTTPS === '1' && process.env.WEB_PUBLIC_PORT === '443')
        ) ? '' : `:${process.env.WEB_PUBLIC_PORT}`;

    const publicPath: string = process.env.WEB_PUBLIC_PATH as string;
    if (publicPath.endsWith('/')) {
        if (relUrl.startsWith('/')) relUrl = relUrl.substring(1);
    } else {
        if (!relUrl.startsWith('/')) relUrl = '/' + relUrl;
    }

    return `${protocolStr}://${process.env.WEB_PUBLIC_HOST}${portStr}${publicPath}${relUrl}`;
}


function dirname(url: string) {
    return path.dirname(fileURLToPath(url));
}


function prepateDataFolders() {
    for (const cat of [
        DataFileTypes.UNCATEGORIZED,
        DataFileTypes.BACKUP,

        DataFileTypes.TMP_UNCATEGORIZED,
        DataFileTypes.TMP_LOG,
        DataFileTypes.TMP_UPLOAD
    ]) {
        prepareFolder(getDataFilePath('', cat));
    }
}


function getDataFilePath(relPath: string, type: DataFileTypes = DataFileTypes.UNCATEGORIZED) : string {
    const __dirname = dirname(import.meta.url);

    if (type == DataFileTypes.UNCATEGORIZED) return path.join(__dirname, `../../data/others/${relPath}`);
    if (type == DataFileTypes.CERTS) return path.join(__dirname, `../../data/cert/${relPath}`);
    if (type == DataFileTypes.BACKUP) return path.join(__dirname, `../../data/backup/${relPath}`);
    
    if (type == DataFileTypes.TMP_UNCATEGORIZED) return path.join(__dirname, `../../tmp/others/${relPath}`);
    if (type == DataFileTypes.TMP_LOG) return path.join(__dirname, `../../tmp/log/${relPath}`);
    if (type == DataFileTypes.TMP_UPLOAD) return path.join(__dirname, `../../tmp/upload/${relPath}`);

    throw 'Invalid data file type.';
}


/**
 * Checks and creates all the sub-directories along the given path if they don't exist
 */
function prepareFolder(path: string) {
    let p = '';
    path.split(/[\/\\]/).forEach((e, i) => {
        p += (i > 0 ? '/' : '') + e;
        if (!fs.existsSync(p)) fs.mkdirSync(p);
    })
}


/**
 * Recursively scan a directory for files and sub-directories.
 */
function walkDir(dir: string, callback: (path: string, stats: fs.Stats) => void) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const fstat = fs.statSync(dirPath);
        if (fstat.isDirectory()) walkDir(dirPath, callback);
        callback(path.join(dir, f), fstat);
    });
}


/**
 * Cleans up old files and directories that are older than the given age.
 * @param {string} dir The parent directory.
 * @param {int} seconds Threshold age in number of seconds.
 * @param {boolean} deleteDirectories (optional, default = `true`) Whether to delete sub-directories or not.
 * @param {function} filter (optional) Filter function that takes the entry path and fstat, then returns `true` if the entry matches.
 */
function cleanOldFiles(dir: string, seconds: number, deleteDirectories: boolean = true, filter: ((path: string, stats: fs.Stats) => boolean) | null = null) {
    const startTime = new Date().getTime() - seconds * 1000;

    walkDir(dir, (filePath, fstat) => {
        if (startTime < new Date(fstat.mtime).getTime()) return;
        if (filter && !filter(filePath, fstat)) return;

        if (fstat.isDirectory()) {
            if (deleteDirectories) {
                fs.rmdir(filePath, {}, console.error);
                console.log(`Folder deleted: ${filePath}`);
            }
        } else {
            fs.unlink(filePath, console.error);
            console.log(`File deleted: ${filePath}`);
        }
    });
}




export default {
    DataFileTypes,
    prepateDataFolders,
    getDataFilePath,
    makeUrl,
    dirname,
    walkDir,
    prepareFolder,
    cleanOldFiles,
}