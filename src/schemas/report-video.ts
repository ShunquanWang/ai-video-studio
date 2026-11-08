import {z} from 'zod';

const label = (max: number) => z.string().trim().min(1).max(max);
const cue = z.number().int().min(0);
const base = {
  sceneId: label(40),
  duration: z.number().int().min(90).max(900),
  note: label(100).optional(),
  noteCue: cue.optional(),
};
const titled = {title: label(22)};

const scene = z.discriminatedUnion('type', [
  z.object({...base, type: z.literal('TitleScene'), props: z.object({
    ...titled, eyebrow: label(40), cards: z.array(label(11)).length(3),
  })}),
  z.object({...base, type: z.literal('DataScene'), props: z.object({
    ...titled, data: z.array(z.object({label: label(8), value: z.number().finite(),
      previous: z.object({value: z.number().nonnegative(), cue}).optional()}))
      .min(2).max(4), highlightIndex: z.number().int().min(0).optional(),
    suffix: label(4).default('%'),
    view: z.enum(['bars', 'ranking', 'comparison']).default('bars'),
  })}),
  z.object({...base, type: z.literal('MetricScene'), props: z.object({
    ...titled, heading: label(28), bars: z.array(z.object({
      label: label(12), value: z.number().positive(), text: label(18), cue,
    })).length(2), changeText: label(30), statLabel: label(18),
    statValue: label(14), statSuffix: label(8), statDescription: label(18),
    statCue: cue, changeCue: cue.optional(),
    view: z.enum(['bars', 'columns', 'donut']).default('bars'),
  })}),
  z.object({...base, type: z.literal('ArchitectureScene'), props: z.object({
    ...titled, nodes: z.array(label(10)).min(3).max(5),
    footnote: label(48), nodeCue: cue, nodeStaggerMs: z.number().int().min(0).max(1500),
    footnoteCue: cue,
  })}),
  z.object({...base, type: z.literal('ExplanationScene'), props: z.object({
    ...titled, body: label(50), points: z.array(label(42)).length(3),
    pointCues: z.array(z.object({cue, offsetMs: z.number().int().min(0).max(2500)
      .default(0)})).length(3),
    detail: z.object({pointIndex: z.number().int().min(0).max(2),
      text: label(30), cue}).optional(),
  })}),
  z.object({...base, type: z.literal('ComparisonScene'), props: z.object({
    ...titled, left: z.object({label: label(12), detail: label(52)}),
    right: z.object({label: label(12), detail: label(52)}),
    rightDetailCue: cue.optional(),
  })}),
  z.object({...base, type: z.literal('FlowScene'), props: z.object({
    ...titled, steps: z.array(z.object({date: label(10), detail: label(12), cue}))
      .min(2).max(3), footnote: label(65), footnoteCue: cue,
  })}),
  z.object({...base, type: z.literal('OutroScene'), props: z.object({
    ...titled, summary: label(55), takeaways: z.array(label(44)).length(3),
    takeawayCues: z.array(cue).length(3),
  })}),
]);

const caption = z.object({
  text: label(70), startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
  timestampMs: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});

export const reportVideoSchema = z.object({
  version: z.literal(1),
  title: label(24),
  presentationDate: label(24),
  reportDate: label(24),
  header: label(24),
  verificationNotice: label(48),
  disclaimer: label(48),
  introFrames: z.number().int().min(30).max(120),
  audioPath: z.string().startsWith('voiceover/').refine((path) =>
    !path.includes('..') && /\.(mp3|wav|m4a)$/i.test(path), 'Invalid audio path'),
  audioEndFrame: z.number().int().positive(),
  scenes: z.array(scene).min(2).max(16),
  tracks: z.array(z.object({id: label(40), captions: z.array(caption).min(1)})),
}).superRefine((video, ctx) => {
  if (video.scenes[0]?.type !== 'TitleScene') ctx.addIssue({code: 'custom',
    path: ['scenes', 0], message: 'First scene must be TitleScene'});
  if (video.scenes[video.scenes.length - 1]?.type !== 'OutroScene') ctx.addIssue({code: 'custom',
    path: ['scenes', video.scenes.length - 1], message: 'Last scene must be OutroScene'});
  const totalFrames = video.scenes.reduce((sum, item) => sum + item.duration, 0);
  if (totalFrames - video.audioEndFrame < 45 ||
    totalFrames - video.audioEndFrame > 150) ctx.addIssue({code: 'custom',
      path: ['audioEndFrame'], message: 'End card must last 45-150 frames'});
  if (new Set(video.scenes.map((item) => item.sceneId)).size !== video.scenes.length)
    ctx.addIssue({code: 'custom', path: ['scenes'], message: 'Duplicate sceneId'});
  if (video.tracks.length !== video.scenes.length) ctx.addIssue({code: 'custom',
    path: ['tracks'], message: 'One caption track is required per scene'});

  let elapsed = 0;
  video.scenes.forEach((item, index) => {
    const track = video.tracks[index];
    if (!track || track.id !== item.sceneId) ctx.addIssue({code: 'custom',
      path: ['tracks', index], message: `Track must match ${item.sceneId}`});
    const captions = track?.captions ?? [];
    if (captions[0]?.startMs > 500) ctx.addIssue({code: 'custom',
      path: ['tracks', index, 'captions', 0], message: 'Scene starts with a long narration gap'});
    captions.forEach((entry, cueIndex) => {
      if (entry.endMs <= entry.startMs || entry.endMs > item.duration / 30 * 1000 + 34 ||
        (cueIndex > 0 && entry.startMs < captions[cueIndex - 1].endMs))
        ctx.addIssue({code: 'custom', path: ['tracks', index, 'captions', cueIndex],
          message: 'Caption timing overlaps or exceeds scene'});
      if ((elapsed + entry.endMs / 1000 * 30) > video.audioEndFrame + 1)
        ctx.addIssue({code: 'custom', path: ['tracks', index, 'captions', cueIndex],
          message: 'Caption continues after audio ends'});
      if (entry.timestampMs !== null &&
        (entry.timestampMs < entry.startMs || entry.timestampMs > entry.endMs))
        ctx.addIssue({code: 'custom', path: ['tracks', index, 'captions', cueIndex],
          message: 'Caption timestamp must lie inside the caption'});
    });
    const requireCue = (value: number | undefined, name: string) => {
      if (value !== undefined && value >= captions.length) ctx.addIssue({code: 'custom',
        path: ['scenes', index, name], message: `Cue ${value} does not exist`});
    };
    const requireRevealTime = (value: number, offsetMs: number, name: string) => {
      const startMs = captions[value]?.startMs;
      if (startMs !== undefined && startMs + offsetMs + 670 > item.duration / 30 * 1000)
        ctx.addIssue({code: 'custom', path: ['scenes', index, name],
          message: 'Reveal animation exceeds scene duration'});
    };
    requireCue(item.noteCue, 'noteCue');
    switch (item.type) {
      case 'TitleScene':
        item.props.cards.forEach((_, i) => {
          requireCue(i, `props.cards.${i}`);
          requireRevealTime(i, 0, `props.cards.${i}`);
        });
        break;
      case 'DataScene':
        if (item.props.highlightIndex !== undefined &&
          item.props.highlightIndex >= item.props.data.length) ctx.addIssue({code: 'custom',
            path: ['scenes', index, 'props', 'highlightIndex'], message: 'Invalid data index'});
        item.props.data.forEach((_, i) => {
          requireCue(i, `props.data.${i}`);
          requireRevealTime(i, 800, `props.data.${i}`);
        });
        item.props.data.forEach((datum, i) => {
          if (item.props.view !== 'bars' && datum.value < 0) ctx.addIssue({code: 'custom',
            path: ['scenes', index, 'props', 'data', i],
            message: 'This chart requires nonnegative values'});
          if (item.props.view === 'comparison' && !datum.previous) ctx.addIssue({code: 'custom',
            path: ['scenes', index, 'props', 'data', i, 'previous'],
            message: 'Comparison chart requires a previous value and cue'});
          if (datum.previous) {
            requireCue(datum.previous.cue, `props.data.${i}.previous.cue`);
            requireRevealTime(datum.previous.cue, 800, `props.data.${i}.previous.cue`);
          }
        });
        break;
      case 'MetricScene':
        item.props.bars.forEach((bar, i) => {
          requireCue(bar.cue, `props.bars.${i}.cue`);
          requireRevealTime(bar.cue, 800, `props.bars.${i}.cue`);
        });
        requireCue(item.props.statCue, 'props.statCue');
        requireRevealTime(item.props.statCue, 0, 'props.statCue');
        requireCue(item.props.changeCue, 'props.changeCue');
        break;
      case 'ArchitectureScene':
        requireCue(item.props.nodeCue, 'props.nodeCue');
        requireCue(item.props.footnoteCue, 'props.footnoteCue');
        requireRevealTime(item.props.nodeCue,
          (item.props.nodes.length - 2) * item.props.nodeStaggerMs, 'props.nodeCue');
        break;
      case 'ExplanationScene':
        item.props.pointCues.forEach((point, i) => {
          requireCue(point.cue, `props.pointCues.${i}.cue`);
          requireRevealTime(point.cue, point.offsetMs, `props.pointCues.${i}.cue`);
        });
        requireCue(item.props.detail?.cue, 'props.detail.cue');
        break;
      case 'ComparisonScene':
        requireCue(0, 'props.left'); requireCue(1, 'props.right');
        requireCue(item.props.rightDetailCue, 'props.rightDetailCue');
        requireRevealTime(1, 0, 'props.right');
        break;
      case 'FlowScene':
        item.props.steps.forEach((step, i) => {
          requireCue(step.cue, `props.steps.${i}.cue`);
          requireRevealTime(step.cue, 0, `props.steps.${i}.cue`);
        });
        requireCue(item.props.footnoteCue, 'props.footnoteCue');
        break;
      case 'OutroScene':
        item.props.takeawayCues.forEach((value, i) => {
          requireCue(value, `props.takeawayCues.${i}`);
          requireRevealTime(value, 0, `props.takeawayCues.${i}`);
        });
        break;
    }
    elapsed += item.duration;
  });
});

export type ReportVideo = z.infer<typeof reportVideoSchema>;
export type ReportScene = ReportVideo['scenes'][number];
export const parseReportVideo = (input: unknown): ReportVideo => reportVideoSchema.parse(input);
