
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.WEB_PUBLIC_PATH) throw '.env file is not configured.';




export const SECRET_STRING = process.env.SECRET_STRING ?? '3fddeabf-884b-4a0f-9796-3fc5860ded1f';

export const SESSION_COOKIE_NAME = '1c874894-3e68-4afb-bb6b-f8870c537848';
export const SESSION_MAX_AGE_SECONDS = 30 * 60;

export const REMEMBER_LOGIN_COOKIE_NAME = 'lord-dankhonklonk';
export const REMEMBER_LOGIN_MAX_AGE_DAYS = 30;

export const UNCATEGORIZED_TMP_FILES_MAX_AGE_DAYS = 3;
export const BACKUP_FILES_MAX_AGE_DAYS = 30 * 6;
export const LOG_FILES_MAX_AGE_DAYS = 30;

export const UPLOAD_SIZE_LIMIT_MBS = 5;
export const UPLOAD_FILES_MAX_AGE_DAYS = 3;

export const LIST_ITEMS_PER_PAGE = 20;

export const PRINT_DATETIME_FORMAT = 'DD/MM/YYYY HH:mm:ss';
export const SQL_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

