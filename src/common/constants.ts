export enum Roles {
	UNAUTHENTICATED = 0,

	SYSTEM_ADMIN = 1,
	TEACHER = 2,
	STUDENT = 3,
}

export interface WebApi {
	url: string;
	method: string;
	roles: Roles[];
}

export const AUTHENTICATED_ROLES: Roles[] = [
	Roles.SYSTEM_ADMIN,
	Roles.STUDENT,
	Roles.TEACHER,
];
export const HIGHER_ROLES: Roles[] = [Roles.SYSTEM_ADMIN, Roles.TEACHER];
export const ALL_ROLES: Roles[] = [
	Roles.UNAUTHENTICATED,
	...AUTHENTICATED_ROLES,
];

export enum ErrorCodes {
	OK,
	USER_NOT_LOGGED_IN,
	NO_PERMISSION,
	WRONG_USERNAME_OR_PASSWORD,
	WRONG_OLD_PASSWORD,
	USERNAME_IN_USE,
	INVALID_PASSWORD,
	INVALID_PARAMETERS,
	INTERNAL_ERROR,
	INVALID_UPLOAD_FILE_TYPE,
	PAGE_OUT_OF_RANGE,
	NOT_FOUND,

	// other codes to come...
}


export const API = {
	USER__LOGIN: {
		url: "/api/user/login",
		method: "post",
		roles: [Roles.UNAUTHENTICATED],
	},
	USER__LOGOUT: {
		url: "/api/user/logout",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	USER__CREATE: {
		url: "/api/user/create",
		method: "post",
		roles: [Roles.SYSTEM_ADMIN],
	},
	USER__UPDATE_INFO: {
		url: "/api/user/update-info",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},
	USER__UPDATE_PASSWORD: {
		url: "/api/user/update-password",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},
	USER__ENABLE: {
		url: "/api/user/enable",
		method: "post",
		roles: [Roles.SYSTEM_ADMIN],
	},
	USER__LIST: {
		url: "/api/user/list",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	USER__GET: {
		url: "/api/user/get",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	USER__NOTIFICATION__UNREAD_COUNT: {
		url: "/api/user/notification/unread-count",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	USER__NOTIFICATION__LIST: {
		url: "/api/user/notification/list",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	USER__NOTIFICATION__GET: {
		url: "/api/user/notification/get",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	USER__NOTIFICATION__MARK_READ: {
		url: "/api/user/notification/mark-read",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},
	USER__NOTIFICATION__MARK_READ_ALL: {
		url: "/api/user/notification/mark-read-all",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},
	USER__DELETE: {
		url: "/api/user/delete",
		method: "post",
		roles: [Roles.SYSTEM_ADMIN],
	},
};
export const API_COURSE = {
	COURSE__CREATE: {
		url: "/api/course/create",
		method: "post",
		roles: HIGHER_ROLES,
	},
	COURSE__DELETE: {
		url: "/api/course/delete",
		method: "post",
		roles: HIGHER_ROLES,
	},
	COURSE__UPDATE_INFO: {
		url: "/api/course/update_info",
		method: "post",
		roles: HIGHER_ROLES,
	},
	COURSE__LIST: {
		url: "/api/course/list",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	COURSE__USER__LIST: {
		url: "/api/course/user_list",
		method: "get",
		roles: HIGHER_ROLES,
	},
	COURSE__GET: {
		url: "/api/course/get",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
};
export const API_CLASS = {
	CLASS__CREATE: {
		url: "/api/class/create",
		method: "post",
		roles: HIGHER_ROLES,
	},
	CLASS__DELETE: {
		url: "/api/class/delete",
		method: "post",
		roles: HIGHER_ROLES,
	},
	CLASS__UPDATE_INFO: {
		url: "/api/class/update_info",
		method: "post",
		roles: HIGHER_ROLES,
	},
	CLASS__LIST: {
		url: "/api/class/list",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	CLASS__GET: {
		url: "/api/class/get",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	CLASS__ADD__USER: {
		url: "/api/class/add_user",
		method: "post",
		roles: HIGHER_ROLES,
	},
	CLASS__DELETE__USER: {
		url: "/api/class/delete_user",
		method: "post",
		roles: HIGHER_ROLES,
	},
	CLASS__LIST__USER: {
		url: "/api/class/list_user",
		method: "get",
		roles: HIGHER_ROLES,
	},
	STUDENT__LIST: {
		url: "/api/student_list",
		method: "get",
		roles: HIGHER_ROLES,
	},
};

export const API_EXERCISE = {
	EXERCISE__CREATE: {
		url: "/api/exercise/create",
		method: "post",
		roles: HIGHER_ROLES,
	},
	EXERCISE__DELETE: {
		url: "/api/exercise/delete",
		method: "post",
		roles: HIGHER_ROLES,
	},
	EXERCISE__LIST: {
		url: "/api/exercise/list",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	EXERCISE__UPDATE_INFO: {
		url: "/api/exercise/update_info",
		method: "post",
		roles: HIGHER_ROLES,
	},
	EXERCISE__GET: {
		url: "/api/exercise/get",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	TEST_CASE__CREATE: {
		url: "/api/test_case/create",
		method: "post",
		roles: HIGHER_ROLES,
	},
	TEST_CASE__DELETE: {
		url: "/api/test_case/delete",
		method: "post",
		roles: HIGHER_ROLES,
	},
	TEST_CASE__LIST: {
		url: "/api/test_case/list",
		method: "get",
		roles: HIGHER_ROLES,
	},
	TEST_CASE__UPDATE_INFO: {
		url: "/api/test_case/update_info",
		method: "post",
		roles: HIGHER_ROLES,
	},
	TEST_CASE__GET: {
		url: "/apitest_case/get",
		method: "get",
		roles: HIGHER_ROLES,
	},
};

export const API_EXAM = {
	EXAM__CREATE: {
		url: "/api/exam/create",
		method: "post",
		roles: HIGHER_ROLES,
	},
	EXAM_PAPER_CREATE: {
		url: "/api/exam/create/paper",
		method: "post",
		roles: HIGHER_ROLES,
	},
	EXAM__DELETE: {
		url: "/api/exam/delete",
		method: "post",
		roles: HIGHER_ROLES,
	},
	EXAM__LIST: {
		url: "/api/exam/list",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	EXAM__LIST__ALL: {
		url: "/api/exam/list_all",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	EXAM__UPDATE_INFO: {
		url: "/api/exam/update_info",
		method: "post",
		roles: HIGHER_ROLES,
	},
	EXAM__GET: {
		url: "/api/exam/get",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
};

export const API_SUBMISSION = {
	SUBMISSION_LIST_LANGUAGES: {
		url: "/api/submission/languages",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},

	SUBMISSION__CREATE: {
		url: "/api/submission/create",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},

	SUBMISSION__CREATE__BYTEXT: {
		url: "/api/submission/create_bytext",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},

	SUBMISSION_PAPER: {
		url: "/api/submission/paper",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},

	SUBMISSION__LIST: {
		url: "/api/submission/list",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},

	SUBMISSION__GET: {
		url: "/api/submission/get",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
	SUBMISSION__CHECK: {
		url: "/api/submission/check",
		method: "get",
		roles: HIGHER_ROLES,
	},
	SUBMISSION__CHECK__HARD: {
		url: "/api/submission/check_hard",
		method: "get",
		roles: HIGHER_ROLES,
	},
	SUBMISSION__GET_FILE: {
		url: "/api/submission/get-file",
		method: "get",
		roles: AUTHENTICATED_ROLES,
	},
};

export const API_MCT = {
	QUESTION_CREATE: {
		url: "/api/mct/question",
		method: "post",
		roles: AUTHENTICATED_ROLES,
	},
};

export interface UserInfo {
	id?: number;
	username: string;
	fullname: string;
	password?: string;
	role: Roles;
	enabled?: boolean;

	creation_time?: string;
	last_login_time?: string | null;
	last_update_time?: string;
}

export interface CourseInfo {
	id?: number;
	name: string;
	user_id?: number;
	description?: string;
	startDate?: string | null;
	endDate?: string | null;
}

export interface NotificationInfo {
	id?: number;
	seen: boolean;
	content: string;
	creation_time: string;
	action_url: string | null;
}
