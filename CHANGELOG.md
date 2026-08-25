# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/)。

## [0.1.0] - Unreleased

### Added

- OMP Extension 入口，通过 `package.json#omp.extensions` 加载
- OMP 18.0.4 `/settings` 页签、分组、设置、警告和静态选项的简体中文显示元数据
- 基于官方英文原文独立生成的克制译文，保留产品名、工具名、协议和技术缩写
- 宿主结构与主版本兼容预检
- 原子 Mutation Plan、写入后验证、完整回滚和共享元数据冲突检测
- 英文回退、重复应用幂等性和一次性兼容警告
- 翻译覆盖率、选项值漂移和英文原文哈希检查
- OMP 18.0.4 契约测试、初始化冒烟检查和真实 TUI 验证流程
