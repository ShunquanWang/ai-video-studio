# Report video workflow

用户在本项目提供报告和旁白音频、要求生成同风格视频时，执行
[`docs/REPORT_VIDEO_WORKFLOW.md`](docs/REPORT_VIDEO_WORKFLOW.md)。
只要求用户提供这两项输入；分镜、字幕时间、配置、校验和预览由 agent 完成。
保留 `AshareReboundReport` 这个 Remotion Studio 入口，便于沿用预览地址。
除非用户明确要求导出，不运行 MP4 导出。
