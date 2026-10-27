# 领航 · AI 指挥工作台

中文桌面端交互原型，包含三级 Agent 团队、项目与任务管理，以及 Supabase 邮箱密码登录和个人云端存储。

当前网站：https://ai-command-desk-wyy-oct27.foggyrook1026.chatgpt.site/

## 当前能力

- 一级总指挥、二级性能指挥、三级执行员工；按团队分派任务。
- 项目开始/暂停单图标切换，暂停后该项目全员停止模拟执行。
- 任务状态：进行中、异常、未开始、完成。
- README 编辑与版本记录；每次执行前模拟阅读最新 README。
- 项目与任务删除；作业提交快照、历史版本恢复、JSON 备份下载。
- 团队动态最近 5 条展示，详情窗口查看完整保留记录。
- 邮箱注册、密码登录、密码重置、退出登录。
- 账号级云端同步、本地旧数据导入、版本比较与冲突提示。

**AI 员工执行与聊天仍是模拟功能。模型 API 密钥输入为占位，未接入真实模型或后台任务服务。**

## 本地运行

需要 Python 3；检查和测试需要 Node.js。

```sh
npm start
```

打开 http://localhost:8765/ 。无需 npm install，浏览器 SDK 已随源码提供。

```sh
npm run check
npm test
```

测试使用模拟的 Supabase 接口，覆盖账号切换、备份同步、网络失败、重复写入、冲突保护等逻辑，不等同于真实数据库隔离的端到端测试。

## Supabase 配置

1. 在 Supabase SQL Editor 执行 `supabase/001-workspace.sql`。脚本创建工作空间表、按 `auth.uid()` 隔离的行级安全规则，以及带版本检查的写入函数。
2. 在 `dist/account.js` 中配置 `ACCOUNT_URL` 和 `ACCOUNT_KEY`。
3. Authentication → URL Configuration：设置 Site URL，并在 Redirect URLs 添加网站完整地址。测试本机邮件回调时另加 `http://localhost:8765/`。
4. 保持邮箱登录启用。默认邮件服务只能向 Supabase 项目组织成员邮箱发送邮件；对其他用户开放注册，需要配置自定义 SMTP。

当前源码中的 Supabase 地址和 `sb_publishable_` 密钥属于公开客户端配置，不具有管理员权限。不要在源码中加入数据库密码、`service_role`、secret key、SMTP 密码或模型 API 密钥。

## 数据存储

每个用户在 `linghang_workspaces` 中拥有独立记录，内容包括项目、员工、README、动态和项目备份。写入使用数据库内的版本比较，发生真实内容冲突时保留本地修改，不强制覆盖云端。

同步状态显示在左下角账号区域。未同步内容也会暂存在当前浏览器；只有显示“已同步云端”才表示该次写入成功。关闭页面不会继续执行 Agent。旧版浏览器数据需要用户在账号菜单中主动确认导入，且仅支持空工作空间。

工作空间 JSON 大小上限为 10 MiB；当前没有文件上传或独立对象存储，产出链接指向的外部文件不在快照中。不要将此演示当作唯一的数据备份。

## 部署

将 `dist/` 作为静态网站根目录发布。换域名后需更新 Supabase 的 Site URL 和 Redirect URLs。GitHub 上传与网站发布是独立操作，本仓库没有自动部署工作流。

Sites 托管项目的内部标识与源码仓库认证信息不包含在这个可移植版本内。

## 文件结构

- `dist/index.html`：页面结构和基础样式
- `dist/app.js`：工作台交互与模拟执行
- `dist/account.js`：账号和云端同步
- `dist/account.css`、`dist/refinement.css`：登录页及靛紫视觉主题
- `dist/supabase.js`：Supabase JavaScript SDK 2.118.0 的 UMD 构建
- `supabase/001-workspace.sql`：数据库初始化
- `tests/account.test.cjs`：同步逻辑测试

第三方 SDK 来自 `@supabase/supabase-js`，遵循其上游许可；许可声明见 `THIRD_PARTY_LICENSES.txt`。
