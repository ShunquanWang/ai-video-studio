# 报告旁白视频

基于 Remotion 的可复用报告视频模板。当前活动样例为 `AshareReboundReport`。
用户提供报告和旁白音频后，agent 按
[`报告视频 Workflow`](docs/REPORT_VIDEO_WORKFLOW.md) 自动制作分镜、字幕时间轴与配置。
画面渲染、动画、字体、颜色和版式集中在 `src/compositions/ReportVideo.tsx`。

```bash
npm install
npm run validate:report -- src/templates/report-video.json src/templates/report-captions.json
npm test
npm run lint
npm run dev
```

打开 `http://localhost:3000/AshareReboundReport` 预览。仅在明确需要成片时再导出。
# ai-video-studio
