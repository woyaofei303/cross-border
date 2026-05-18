# Issue tracker（任务管理）

当前项目使用本地 Markdown 文件管理 PRD 和任务，目录约定为：

```text
.scratch/<feature>/
```

因为当前项目还没有配置 GitHub 或 GitLab remote，所以先使用本地 markdown 作为 issue tracker。

当前主线 Multi-site Commerce OS PRD 和任务存放在：

```text
.scratch/multi-site-commerce-os/
```

早期单站点 Storefront 相关 PRD 和任务存放在：

```text
.scratch/cross-border-storefront/
```

注意：`.scratch/cross-border-storefront/` 属于早期前台原型阶段。继续开发当前系统时，优先使用 `.scratch/multi-site-commerce-os/`。

创建新任务时遵循这些规则：

- 一个任务一个 Markdown 文件
- 文件名前缀使用顺序编号，例如 `001-market-aware-shopping-flow.md`
- 文件顶部保留 `Status` 和 `Triage label`
- `ready-for-agent` 表示任务已经足够明确，可以交给 agent 独立实现
- 父级 PRD 和拆分出来的任务放在同一个 feature 目录中

如果后续项目迁移到 GitHub Issues，需要更新本文件，并把当前本地 markdown issues 迁移到 GitHub。
