---
status: observed
scope: 仓库 .gitignore 与新增前端目录树
date: 2026-10-16
---
规则:本仓 `.gitignore` 源自 Python 模板,`lib/`、`build/`、`dist/` 等规则**不限定根目录**,会静默忽略任意深度的同名目录;在仓内新增前端/Node 目录树(如 `ui/src/lib/`)后,必须先 `git check-ignore -v <路径>` 验证,再 `git ls-files <目录>` 确认文件真的入列,最后以干净 worktree `npm ci && npm run build` 证明可构建。
适用 / 不适用:任何在本仓新增含 lib/build/dist 命名的源码目录时;纯 Python 改动不适用。
证据:`feat/mist-ink-ui` 前四个提交整体缺失 `ui/src/lib/`(9 个数据层文件),分支在干净检出下无法构建;cs-review 复审发现,修复见 merge 969cc8446 中的 .gitignore 例外 `!ui/src/lib/`。
候选归宿:checker(pre-commit 钩子:对 staged 文件跑 check-ignore 体检)
