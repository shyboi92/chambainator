import {Router, Request, Response} from 'express';
import * as config from '../inc/config.js';
import {ErrorCodes, Roles, AUTHENTICATED_ROLES, API, UserInfo, NotificationInfo, HIGHER_ROLES} from '../inc/constants.js';
import db from '../inc/database.js';
import * as session from '../inc/session.js';

import {apiRoute, bindApiWithRoute, apiValidatorParam, ApiRequest} from '../inc/api.js';

const router = Router();
export default router;


/**
 * If no username is given, this API will check if the session user information is available and return it. This
 * helps the React app to reload the user information in case the user refreshes the page.
 */
bindApiWithRoute(API.USER__LOGIN, api => apiRoute(router, api,
	apiValidatorParam(api, 'username').optional().trim().notEmpty(),
	apiValidatorParam(api, 'password').optional().trim().notEmpty(),
	apiValidatorParam(api, 'remember_login').optional().isBoolean().toBoolean(),

	async (req: ApiRequest, res: Response) => {
		if (req.api.params.username) {
			const ret = await req.ctx.loginWithUsernameAndPassword(req.api.params.username, req.api.params.password, req.api.params.remember_login);
			const userId = ret.id;
			if (userId === null)
				return req.api.sendError(ErrorCodes.WRONG_USERNAME_OR_PASSWORD);
			
			const userInfo = await req.ctx.getUser()?.getClientInfo();
			if (!userInfo)
				return req.api.sendError(ErrorCodes.USER_NOT_LOGGED_IN);
	
			req.ctx.logActivity('Đăng nhập bằng tài khoản', {user_id: userInfo.id});
	
			return req.api.sendSuccess({
				user_info: userInfo,
				cookie: ret.cookie
			});
		}

		return req.api.sendError(ErrorCodes.INVALID_PARAMETERS)
	}
))



bindApiWithRoute(API.USER__LOGOUT, api => apiRoute(router, api,
	async (req: ApiRequest, res: Response) => {
		// writes the log first so that the session user information is still available
		req.ctx.logActivity('Đăng xuất');

		await req.ctx.logout();

		req.api.sendSuccess();
	}
))



bindApiWithRoute(API.USER__CREATE, api => apiRoute(router, api,
	apiValidatorParam(api, 'username').trim().notEmpty(),
	apiValidatorParam(api, 'password').trim().notEmpty(),
	apiValidatorParam(api, 'fullname').trim().notEmpty(),
	apiValidatorParam(api, 'role').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		if (await db.queryValue('select id from user where username = ?', [req.api.params.username]) !== null)
			return req.api.sendError(ErrorCodes.USERNAME_IN_USE);
		
		// if (!session.User.checkStrongPassword(req.api.params.password))
		// 	return req.api.sendError(ErrorCodes.INVALID_PASSWORD);

		if (!AUTHENTICATED_ROLES.includes(req.api.params.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		// admin creates user
		if ( userInfo.role !== Roles.SYSTEM_ADMIN || ![Roles.STUDENT,Roles.TEACHER].includes(req.api.params.role) )
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const encodedPwd = await session.encodeUserPassword(req.api.params.password);

		const newUserId = (await db.insert('user', {
			username: req.api.params.username,
			password: encodedPwd.combined,
			fullname: req.api.params.fullname,
			role: req.api.params.role,
		}))?.insertId;
		if (!newUserId) return req.api.sendError(ErrorCodes.INTERNAL_ERROR);

		req.ctx.logActivity('Tạo tài khoản mới', {user_id: newUserId});

		req.api.sendSuccess({ user_id: newUserId });
	}
))



bindApiWithRoute(API.USER__UPDATE_INFO, api => apiRoute(router, api,
	apiValidatorParam(api, 'user_id').notEmpty().isInt().toInt(),
	// apiValidatorParam(api, 'old_password').optional().trim().notEmpty(),
	apiValidatorParam(api, 'fullname').trim().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		const targetUser = new session.User(req.api.params.user_id);
		const targetUserInfo = await targetUser.getInfo();
		if (!targetUserInfo || !targetUserInfo.enabled)
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		// normal users can only update their own info
		if (userInfo.role == Roles.STUDENT && userInfo.id != targetUserInfo.id)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		// validates old password if the user is updating his own
		// if (userInfo.id == targetUserInfo.id && !(await targetUser.checkPassword(req.api.params.old_password)))
		// 	return req.api.sendError(ErrorCodes.WRONG_OLD_PASSWORD);

		db.query('update user set fullname = ? where id = ?', [req.api.params.fullname, targetUserInfo.id]);

		req.ctx.logActivity('Sửa thông tin tài khoản', { user_id: targetUserInfo.id });

		req.api.sendSuccess();
	}
))



bindApiWithRoute(API.USER__UPDATE_PASSWORD, api => apiRoute(router, api,
	apiValidatorParam(api, 'user_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'old_password').optional().trim().notEmpty(),
	apiValidatorParam(api, 'new_password').trim().notEmpty(),

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		const targetUser = new session.User(req.api.params.user_id);
		const targetUserInfo = await targetUser.getInfo();
		if (!targetUserInfo || !targetUserInfo.enabled)
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		// normal users can only update their own password
		if (userInfo.role == Roles.STUDENT && userInfo.id != targetUserInfo.id)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		// validates old password if the user is updating his own
		if (userInfo.id == targetUserInfo.id && !(await targetUser.checkPassword(req.api.params.old_password)))
			return req.api.sendError(ErrorCodes.WRONG_OLD_PASSWORD);

		// validates new password strength
		if (!session.User.checkStrongPassword(req.api.params.new_password))
			return req.api.sendError(ErrorCodes.INVALID_PASSWORD);

		targetUser.updatePassword(req.api.params.new_password);

		req.ctx.logActivity('Đổi mật khẩu', { user_id: targetUserInfo.id });

		req.api.sendSuccess();
	}
))


bindApiWithRoute(API.USER__ENABLE, api => apiRoute(router, api,
	apiValidatorParam(api, 'user_id').notEmpty().isInt().toInt(),
	apiValidatorParam(api, 'enabled').notEmpty().isBoolean().toBoolean(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		// a user cannot enable/disable himself
		if (userInfo.id == req.api.params.user_id) return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const targetUserInfo = await (new session.User(req.api.params.user_id)).getInfo();
		if (!targetUserInfo) return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		db.query('update user set enabled = ?, last_update_time = current_timestamp where id = ?', [req.api.params.enabled, req.api.params.user_id]);

		req.ctx.logActivity(`${req.api.params.enabled ? 'Mở khoá' : 'Khoá'} tài khoản`, { user_id: userInfo.id });

		req.api.sendSuccess();
	}
))




bindApiWithRoute(API.USER__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'user_id').notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

		let targetUserInfo = await (new session.User(req.api.params.user_id)).getClientInfo();
		if (!targetUserInfo) return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		// a normal user can only get info of himself
		if (userInfo.role == Roles.STUDENT && targetUserInfo.id != userInfo.id)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const info: UserInfo = {
            id: targetUserInfo.id,
			username: targetUserInfo.username,
            fullname: targetUserInfo.fullname,
			role: targetUserInfo.role,
			enabled: targetUserInfo.enabled,
			creation_time: targetUserInfo.creation_time,
			last_login_time: targetUserInfo.last_login_time,
			last_update_time: targetUserInfo.last_update_time,
        };

		req.api.sendSuccess({
			user_info: info
		});
	}
))



// bindApiWithRoute(API.USER__LIST, api => apiRoute(router, api,
// 	apiValidatorParam(api, 'enabled').optional().isBoolean().toBoolean(),
// 	apiValidatorParam(api, 'paging_page').optional().isInt().toInt(),

// 	async (req: ApiRequest, res: Response) => {
// 		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;

// 		const params: any[] = [];
// 		const selectClause = 'select u.id, u.username, u.fullname, u.role, u.enabled, u.creation_time, u.last_login_time, u.last_update_time';
// 		const fromClause = 'from user u';
// 		let whereClause = 'where 1';

// 		if (req.api.params.hasOwnProperty('enabled')) {
// 			whereClause += ' and enabled = ?';
// 			params.push(req.api.params.enabled);
// 		}

// 		const item_count = await db.queryValue(`select count(*) ${fromClause} ${whereClause}`, params) as number;
// 		const page_count = Math.floor((item_count + config.LIST_ITEMS_PER_PAGE - 1) / config.LIST_ITEMS_PER_PAGE);

// 		let query = `${selectClause} ${fromClause} ${whereClause}`;
// 		if (req.api.params.paging_page) {  // Đổi từ req.api.params.paging?.page thành req.api.params.paging_page
// 			if (req.api.params.paging_page <= 0 || req.api.params.paging_page > page_count) req.api.sendError(ErrorCodes.PAGE_OUT_OF_RANGE);
// 			query += ` limit ${(req.api.params.paging_page - 1) * config.LIST_ITEMS_PER_PAGE}, ${config.LIST_ITEMS_PER_PAGE}`;
// 		}

// 		const list = await db.query(query, params);
// 		req.api.sendSuccess({
// 			item_count,
// 			page_count,
// 			user_info: list.map(e => {
// 				const item: UserInfo = {
// 					id: e.id,
// 					username: e.username,
// 					fullname: e.fullname,
// 					role: e.role,
// 					enabled: e.enabled == 1,
// 					creation_time: e.creation_time,
// 					last_login_time: e.last_login_time,
// 					last_update_time: e.last_update_time,
// 				}	
// 				return item;
// 			})
// 		});
// 	}
// ));

bindApiWithRoute(API.USER__LIST, api => apiRoute( router, api,

	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getInfo() as UserInfo;
		const notAdmin = (userInfo.role !== Roles.SYSTEM_ADMIN)

		if (!AUTHENTICATED_ROLES.includes(userInfo.role))
			return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		if (notAdmin)
			return req.api.sendError(ErrorCodes.NO_PERMISSION);

		const users = await db.query(`select id ,username, fullname, role, enabled , creation_time, last_login_time , last_update_time FROM user `)

		req.api.sendSuccess({ users: users })
	}
))

bindApiWithRoute(API.USER__NOTIFICATION__UNREAD_COUNT, api => apiRoute(router,api,
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getClientInfo() as UserInfo;

		const count = await db.queryValue('select count(id) from notification_user where user = ? and seen = 0', [userInfo.id])
		req.api.sendSuccess({count});
	}
))


bindApiWithRoute(API.USER__NOTIFICATION__LIST, api => apiRoute(router, api,
	apiValidatorParam(api, 'paging.page').optional().isInt().toInt(),
		
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getClientInfo() as UserInfo;

		const params = [userInfo.id];
		const selectClause = 'select n.id, nu.user, nu.seen, n.content, n.creation_time, n.action_url';
		const fromClause = 'from notification n join notification_user nu on n.id = nu.notification';
		const whereClause = 'where nu.user = ?';

		const item_count = await db.queryValue(`select count(*) ${fromClause} ${whereClause}`, params) as number;
		const page_count = Math.floor((item_count + config.LIST_ITEMS_PER_PAGE - 1) / config.LIST_ITEMS_PER_PAGE);

		let otherClauses = 'order by creation_time desc';
		if (req.api.params.paging?.page) {
			if (req.api.params.paging?.page <= 0 || req.api.params.paging?.page > page_count) req.api.sendError(ErrorCodes.PAGE_OUT_OF_RANGE);
			otherClauses += ` limit ${(req.api.params.page - 1) * config.LIST_ITEMS_PER_PAGE}, ${config.LIST_ITEMS_PER_PAGE}`;
		}

		const list = await db.query(`${selectClause} ${fromClause} ${whereClause} ${otherClauses}`, params);
		req.api.sendSuccess({
			item_count,
			page_count,
			notification_info: list.map(item => {
				const notiInfo: NotificationInfo = {
					id: item.id,
					seen: item.seen == 1,
					content: item.content,
					creation_time: item.creation_time,
					action_url: item.action_url
				}
				return notiInfo;
			})
		});
	}	
))


bindApiWithRoute(API.USER__NOTIFICATION__GET, api => apiRoute(router, api,
	apiValidatorParam(api, 'notification_id').trim().notEmpty().isInt().toInt(),
		
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getClientInfo() as UserInfo;

		const query = 'select nu.user, nu.seen, n.content, n.creation_time, n.action_url ' +
  			' from notification n join notification_user nu on n.id = nu.notification' +
			' where nu.user = ? and n.id = ?'
		const info = await db.queryRow(query, [userInfo.id, req.api.params.notification_id]);
		if (!info) return req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		const notification_info: NotificationInfo = {
			seen: info.seen == 1,
			content: info.content,
			creation_time: info.creation_time,
			action_url: info.action_url
		}

		req.api.sendSuccess({notification_info});
		
	}	
))


bindApiWithRoute(API.USER__NOTIFICATION__MARK_READ, api => apiRoute(router, api,
	apiValidatorParam(api, 'notification_id').trim().notEmpty().isInt().toInt(),
		
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getClientInfo() as UserInfo;

		if (!(await db.queryValue('select 1 from notification_user where user = ? and notification = ?', [userInfo.id, req.api.params.notification_id])))
			req.api.sendError(ErrorCodes.INVALID_PARAMETERS);

		await db.query('update notification_user set seen = 1 where user = ? and notification = ?', [userInfo.id, req.api.params.notification_id]);
		
		req.api.sendSuccess();
	}	
))	



bindApiWithRoute(API.USER__NOTIFICATION__MARK_READ_ALL, api => apiRoute(router, api,
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getClientInfo() as UserInfo;

		await db.query('update notification_user set seen = 1 where user = ?', [userInfo.id]);

		req.api.sendSuccess();
	}	
))	

bindApiWithRoute(API.USER__DELETE, api => apiRoute(router, api,
	apiValidatorParam(api, 'user_id').trim().notEmpty().isInt().toInt(),
	
	async (req: ApiRequest, res: Response) => {
		const userInfo = await req.ctx.getUser()?.getClientInfo() as UserInfo;

		if (!AUTHENTICATED_ROLES.includes(userInfo.role)) return req.api.sendError(ErrorCodes.INVALID_PARAMETERS)
		const notAdmin = userInfo.role!= Roles.SYSTEM_ADMIN;
		const isNormalUser = userInfo.role== Roles.STUDENT;
		if (notAdmin || isNormalUser) return req.api.sendError(ErrorCodes.NO_PERMISSION);

		await db.query('DELETE FROM user WHERE id = ?',[req.api.params.user_id])
		req.api.sendSuccess();
	}	
))