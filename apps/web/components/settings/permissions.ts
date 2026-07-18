/**
 * The settings module is guarded by the backend's `setting.manage` permission.
 * The same slug gates `GET/PUT /settings` and grading-scale writes.
 */
export const SETTING_MANAGE = "setting.manage"
