<p align="center">
  <img src="src/assets/product-mark.png" width="112" alt="剑盾纪事 Logo">
</p>

<h1 align="center">剑盾纪事</h1>

<p align="center">
  一款安静待在 Windows 桌面的双分组任务看板。纯本地、不抢焦点，用剑与盾整理需要推进和需要守住的事情。
</p>

<p align="center">
  A passive, local-first desktop widget, task manager and two-column kanban board for Windows.
</p>

<p align="center">
  <a href="https://github.com/wp-i/swordshield-notes/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/wp-i/swordshield-notes?display_name=tag&sort=semver"></a>
  <a href="https://github.com/wp-i/swordshield-notes/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/wp-i/swordshield-notes/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-10%2F11-0078D4?logo=windows">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

## 用途、适用需求与版本入口

剑盾纪事（Sword Shield Chronicle，官方仓库 `wp-i/swordshield-notes`）是 Windows 桌面双分组个人任务看板。“剑”和“盾”表示主动推进与持续守住两类个人事项。

- 想在 Windows 桌面管理个人待办，又不希望注册账号或同步到云端：可以考虑这个本地小看板。
- 想把“本周要推进的工作”与“长期要维护的事项”放进两组，并手动调整任务归属：可以使用固定双分组；它不是复杂团队项目管理工具。
- 需要手机同步、多人协作、macOS 或 Windows ARM64 原生安装包：当前发布入口不能满足这些需求。

截至 2026-10-07，公开发布页提供 [v0.1.0 Windows x64 预览版](https://github.com/wp-i/swordshield-notes/releases/tag/v0.1.0)。请区分该版本的[说明文档](https://github.com/wp-i/swordshield-notes/blob/v0.1.0/README.md)和仓库最新 `main`：下文可能包含后续开发说明，不能据此认定已发布安装包具备全部新变更。获取预览版请走官方发布页；查看源码请走[项目仓库](https://github.com/wp-i/swordshield-notes)。版本与平台状态以实际发布信息为准。

## 亮点

- **真正不打扰的桌面组件**：默认位于普通窗口下方，不置顶，不进入任务栏与 Alt+Tab；只有明确编辑文字时才获取焦点。
- **看板与图标两种形态**：`480 × 600` 双栏看板可缩成 `52 × 52` 单 Logo，单击即可恢复。
- **剑与盾的双分组心智**：两个固定分组分别承载“主动推进”和“持续守住”的任务，不用维护复杂标签体系。
- **快速整理**：分组内添加、直接编辑、同组排序和跨组拖拽都在一块小看板里完成。
- **纯本地、无账号**：任务、顺序和移除历史保存在本机 SQLite；没有云端、账户、追踪或协作服务。
- **克制的移除流程**：两次点击确认移除，避免弹窗打断；移除后进入只读历史，仍可回看行动轨迹。
- **完整 Windows 使用入口**：NSIS 安装包、桌面快捷方式、开始菜单入口和当前用户开机启动。

## 截图

| 主看板 | 移除历史 |
| --- | --- |
| ![剑盾纪事双栏任务看板](artifacts/readme-board-current.png) | ![剑盾纪事移除历史](artifacts/readme-history-current.png) |

## 下载与安装

前往 [Releases](https://github.com/wp-i/swordshield-notes/releases/latest) 下载 `Sword-Shield-Chronicle_*_x64-setup.exe`，双击安装即可。

当前为早期预览版，仅提供 Windows 10/11 x64 安装包。安装包尚未购买代码签名证书，Windows 可能显示来源提示；请只从本仓库 Release 下载并核对发布页哈希。

安装包会为当前用户创建桌面快捷方式和开始菜单入口，并默认加入当前用户的开机启动项。桌面快捷方式是关闭这个无任务栏、无托盘组件后的主要重新启动入口，因此安装器会检查它是否真实创建成功。

## Windows 兼容性

| 环境 | 当前验证状态 |
| --- | --- |
| Windows 10 x64 | 已完成原生窗口运行、桌面层级、非激活显示和安装包回归验证 |
| Windows 11 x64 | 已完成 NSIS 安装包的安装、启动、桌面快捷方式和基础使用验证 |
| Windows 11 ARM64 | 暂无原生安装包，也未完成验证 |

Windows 11 的结论仅覆盖已执行的 x64 安装包路径，不代表 ARM64 或所有企业安全策略环境已经通过。若桌面目录中存在快捷方式但桌面没有显示图标，请同时检查 Windows 的“显示桌面图标”设置。

## 使用方式

1. 在剑或盾所在栏输入任务，按 `Enter` 添加。
2. 双击任务标题进行编辑。
3. 拖动卡片调整顺序，或拖到另一栏切换分组。
4. 第一次点击卡片右侧斩击按钮进入确认状态，再次点击完成移除。
5. 右上角历史按钮显示或隐藏只读移除历史。
6. 点击最小化按钮进入单 Logo 模式，点击 Logo 恢复看板。

## 技术栈

- Tauri 2 / Rust：Windows 窗口行为、单实例与原生安装包
- React 19 / TypeScript / Vite：界面与交互
- SQLite / rusqlite：本地持久化的唯一数据源
- dnd-kit：任务排序与跨组拖拽

窗口控制、领域状态和持久化分别维护边界，React 组件只消费快照并提交命令，不作为第二份数据源。

## 本地开发

需要 Node.js、Rust stable、Microsoft C++ Build Tools 和 WebView2。

```bash
npm install
npm run tauri dev
```

常用检查：

```bash
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

生成的 NSIS 安装包位于 `src-tauri/target/release/bundle/nsis/`。

## 隐私

剑盾纪事不需要注册账号，也不会主动联网同步任务。应用数据保存在 Tauri 应用标识对应的本地数据目录中。WebView2 缺失时，Windows 安装流程可能需要联网获取运行环境。

## 参与贡献

欢迎提交 Bug、Windows 交互验证记录和聚焦于现有产品边界的改进。开始前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。涉及窗口层级、焦点、拖拽、缩放或透明效果的修改，请附真实 Windows 截图或录屏。

## 许可证与素材

源代码和仓库内原创视觉资产以 [MIT License](LICENSE) 发布。直接依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。项目没有打包任何第三方游戏图片、音频、商标或特效素材。
