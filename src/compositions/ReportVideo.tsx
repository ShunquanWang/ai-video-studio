import type React from 'react';
import {Audio} from '@remotion/media';
import type {Caption} from '@remotion/captions';
import {loadFont} from '@remotion/google-fonts/NotoSansSC';
import {AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame,
  useVideoConfig} from 'remotion';
import {parseReportVideo, type ReportScene} from '../schemas/report-video';
import report from '../templates/report-video.json';
import voiceover from '../templates/report-captions.json';
import {DataChart, MetricChart} from './ReportCharts';

const {fontFamily: notoSans} = loadFont('normal', {
  weights: ['400', '500', '700'],
  subsets: ['chinese-simplified', 'latin'],
  ignoreTooManyRequestsWarning: true,
});
const sansFont = `${notoSans}, "PingFang SC", "Microsoft YaHei", sans-serif`;

export const reportVideo = parseReportVideo({...report, tracks: voiceover});
export const reportDurationInFrames = reportVideo.introFrames +
  reportVideo.scenes.reduce((sum, scene) => sum + scene.duration, 0);
const background = 'linear-gradient(125deg, #E3EFF0 0%, #F2F5F7 52%, #F6E9E2 100%)';
const glass: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.68)',
  backdropFilter: 'blur(26px) saturate(1.5)',
  borderRadius: 32,
  boxShadow: '0 28px 70px rgba(47, 65, 78, 0.18), 0 3px 12px rgba(47, 65, 78, 0.07)',
  overflow: 'hidden',
};

const reveal = (frame: number, startMs: number, fps: number) =>
  interpolate(frame, [startMs / 1000 * fps, startMs / 1000 * fps + 10], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const cardEnter = (frame: number, startMs: number, fps: number): React.CSSProperties => {
  const start = startMs / 1000 * fps;
  const options = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  return {
    opacity: interpolate(frame, [start, start + 12], [0, 1], options),
    scale: interpolate(frame, [start, start + 12], [0.97, 1], options),
    translate: `0px ${interpolate(frame, [start, start + 12], [14, 0], options)}px`,
  };
};

const textReveal = (frame: number, startMs: number, fps: number,
  delayFrames = 0): React.CSSProperties => {
  const start = startMs / 1000 * fps + delayFrames;
  const options = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  return {
    opacity: interpolate(frame, [start, start + 12], [0, 1], options),
  };
};

const barProgress = (frame: number, startMs: number, fps: number) => {
  const start = startMs / 1000 * fps;
  return interpolate(frame, [start + 8, start + 44], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

const SceneShell: React.FC<{readonly title: string; readonly children: React.ReactNode}> =
  ({title, children}) => <AbsoluteFill style={{background, color: '#17222C',
    fontFamily: sansFont}}>
    <div style={{position: 'absolute', top: 132, left: 96, right: 96}}>
      <div style={{fontSize: 23, fontWeight: 700, color: '#177F79'}}>
        {reportVideo.header} · {reportVideo.reportDate}
      </div>
      <h1 style={{fontSize: 68, lineHeight: 1.15, margin: '12px 0 0',
        fontWeight: 760}}>{title}</h1>
    </div>
    {children}
  </AbsoluteFill>;

const ReportOpening: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'TitleScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const points = scene.props.cards;
  return <AbsoluteFill style={{background, color: '#17222C', fontFamily: sansFont}}>
    <div style={{position: 'absolute', top: 260, left: 96, right: 96,
      textAlign: 'center'}}>
      <div style={{color: '#177F79', fontSize: 27, fontWeight: 700}}>
        {scene.props.eyebrow}
      </div>
      <h1 style={{fontSize: 82, lineHeight: 1.2, margin: '30px 0 0'}}>
        {scene.props.title}
      </h1>
    </div>
    <div style={{position: 'absolute', left: 96, right: 96, top: 590,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32}}>
      {points.map((point, index) => <div key={point} style={{
        ...glass, ...cardEnter(frame, captions[index]?.startMs ?? 0, fps),
        height: 225, display: 'grid', placeItems: 'center',
        fontSize: 43, fontWeight: 720}}>
        <span style={textReveal(frame, captions[index]?.startMs ?? 0, fps, 8)}>
          {point}
        </span>
      </div>)}
    </div>
  </AbsoluteFill>;
};

const ReportData: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'DataScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const max = Math.max(...scene.props.data.map((item) => Math.abs(item.value)), 1);
  if (scene.props.view !== 'bars') return <SceneShell title={scene.props.title}>
    <DataChart scene={scene} captions={captions} />
  </SceneShell>;
  return <SceneShell title={scene.props.title}>
    <div style={{...glass, position: 'absolute', left: 180, right: 180,
      top: 320, height: 515, padding: '43px 60px', boxSizing: 'border-box',
      display: 'grid', gridTemplateRows: `repeat(${scene.props.data.length}, 1fr)`, gap: 10}}>
      {scene.props.data.map((datum, index) => {
        const startMs = captions[index]?.startMs ?? 0;
        const progress = barProgress(frame, startMs, fps);
        return <div key={datum.label} style={{display: 'grid',
          gridTemplateColumns: '250px 1fr 180px', alignItems: 'center', gap: 28,
          opacity: reveal(frame, startMs, fps)}}>
          <span style={{fontSize: 31, fontWeight: 650,
            ...textReveal(frame, startMs, fps)}}>{datum.label}</span>
          <div style={{height: 25, borderRadius: 999, background: '#DFE8EA',
            overflow: 'hidden', opacity: reveal(frame, startMs, fps)}}>
            <div style={{height: '100%', borderRadius: 999,
              width: `${Math.abs(datum.value) / max * progress * 100}%`,
              background: index === scene.props.highlightIndex ? '#D75B3D' : '#15998D'}} />
          </div>
          <strong style={{fontSize: 39, color: index === scene.props.highlightIndex ? '#D75B3D' : '#107F76',
            textAlign: 'right', ...textReveal(frame, startMs, fps)}}>
            {datum.value > 0 ? '+' : ''}{datum.value.toFixed(2)}{scene.props.suffix}</strong>
        </div>;
      })}
    </div>
  </SceneShell>;
};

const ReportMetric: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'MetricScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bars = scene.props.bars;
  const max = Math.max(...bars.map((item) => item.value));
  if (scene.props.view !== 'bars') return <SceneShell title={scene.props.title}>
    <MetricChart scene={scene} captions={captions} />
  </SceneShell>;
  return <SceneShell title={scene.props.title}>
    <div style={{position: 'absolute', top: 330, left: 96, right: 96,
      display: 'grid', gridTemplateColumns: '1.55fr 0.85fr', gap: 32}}>
      <div style={{...glass, height: 470, padding: '45px 52px', boxSizing: 'border-box'}}>
        <div style={{fontSize: 27, color: '#52636A', marginBottom: 42}}>{scene.props.heading}</div>
        {bars.map((bar, index) => {
          const start = captions[bar.cue]?.startMs ?? 0;
          const progress = barProgress(frame, start, fps);
          return <div key={bar.label} style={{marginBottom: index === 0 ? 48 : 0,
            opacity: reveal(frame, start, fps)}}>
            <div style={{display: 'flex', justifyContent: 'space-between',
              fontSize: 31, fontWeight: 680, marginBottom: 18,
              ...textReveal(frame, start, fps)}}>
              <span>{bar.label}</span><span>{bar.text}</span>
            </div>
            <div style={{height: 37, background: '#DFE8EA', borderRadius: 999,
              overflow: 'hidden'}}>
              <div style={{height: '100%', borderRadius: 999,
                width: `${bar.value / max * progress * 100}%`,
                background: index === 0 ? '#15998D' : '#91B6B6'}} />
            </div>
          </div>;
        })}
        <div style={{fontSize: 26, fontWeight: 700, color: '#D75B3D',
          marginTop: 40, ...textReveal(frame, captions[bars[1].cue]?.startMs ?? 0, fps)}}>
          {scene.props.changeText}
        </div>
      </div>
      <div style={{...glass, ...cardEnter(frame, captions[scene.props.statCue]?.startMs ?? 0, fps),
        height: 470, padding: '70px 42px',
        boxSizing: 'border-box', textAlign: 'center'}}>
        <div>
          <div style={{fontSize: 27, color: '#52636A',
            ...textReveal(frame, captions[scene.props.statCue]?.startMs ?? 0, fps, 8)}}>{scene.props.statLabel}</div>
          <div style={{fontSize: 82, fontWeight: 780, color: '#D75B3D',
            marginTop: 40, ...textReveal(frame, captions[scene.props.statCue]?.startMs ?? 0, fps, 12)}}>
            {scene.props.statValue}<span style={{fontSize: 44}}>{scene.props.statSuffix}</span>
          </div>
          <div style={{fontSize: 31, fontWeight: 650, marginTop: 14,
            ...textReveal(frame, captions[scene.props.statCue]?.startMs ?? 0, fps, 16)}}>{scene.props.statDescription}</div>
        </div>
      </div>
    </div>
  </SceneShell>;
};

const ReportArchitecture: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'ArchitectureScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <SceneShell title={scene.props.title}>
    <div style={{...glass, position: 'absolute', top: 315, left: 710,
      width: 500, height: 150, display: 'grid', placeItems: 'center',
      fontSize: 52, fontWeight: 750, color: '#107F76',
      ...cardEnter(frame, captions[0]?.startMs ?? 0, fps)}}>
      <span style={textReveal(frame, captions[0]?.startMs ?? 0, fps, 8)}>{scene.props.nodes[0]}</span>
    </div>
    <div style={{position: 'absolute', top: 530, left: 96, right: 96,
      display: 'grid', gridTemplateColumns: `repeat(${scene.props.nodes.length - 1}, 1fr)`, gap: 28}}>
      {scene.props.nodes.slice(1).map((node, index) => <div key={`${node}-${index}`}
        style={{...glass, height: 205, display: 'grid', placeItems: 'center',
          fontSize: 38, fontWeight: 700,
          ...cardEnter(frame, (captions[scene.props.nodeCue]?.startMs ?? 0) +
            index * scene.props.nodeStaggerMs, fps)}}>
        <span style={textReveal(frame,
          (captions[scene.props.nodeCue]?.startMs ?? 0) +
            index * scene.props.nodeStaggerMs, fps, 8)}>{node}</span>
      </div>)}
    </div>
    <div style={{position: 'absolute', top: 775, left: 96, right: 96,
      textAlign: 'center', fontSize: 27, color: '#52636A',
      ...textReveal(frame, captions[scene.props.footnoteCue]?.startMs ?? 0, fps)}}>
      {scene.props.footnote}
    </div>
  </SceneShell>;
};

const ReportExplanation: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'ExplanationScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pointStarts = scene.props.pointCues.map((point) =>
    (captions[point.cue]?.startMs ?? 0) + point.offsetMs);
  return <SceneShell title={scene.props.title}>
    <div style={{position: 'absolute', top: 300, left: 96, right: 96,
      textAlign: 'center', fontSize: 36, fontWeight: 650,
      ...textReveal(frame, captions[0]?.startMs ?? 0, fps)}}>{scene.props.body}</div>
    <div style={{position: 'absolute', top: 400, left: 96, right: 96,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32}}>
      {scene.props.points.map((point, index) => <div key={point} style={{
        ...glass, ...cardEnter(frame, pointStarts[index] ?? 0, fps),
        minHeight: 310, padding: '48px 40px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={textReveal(frame, pointStarts[index] ?? 0, fps, 8)}>
          <div style={{fontSize: 24, color: '#177F79', fontWeight: 750,
            marginBottom: 24}}>{String(index + 1).padStart(2, '0')}</div>
          <div style={{fontSize: 37, lineHeight: 1.35, fontWeight: 680}}>
            {scene.props.detail?.pointIndex === index ? <>
              <div>{point}</div>
              <div style={{marginTop: 14, fontSize: 30,
                ...textReveal(frame, captions[scene.props.detail.cue]?.startMs ?? 0, fps)}}>
                {scene.props.detail.text}
              </div>
            </> : point}
          </div>
        </div>
      </div>)}
    </div>
  </SceneShell>;
};

const ReportComparison: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'ComparisonScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <SceneShell title={scene.props.title}>
    <div style={{position: 'absolute', top: 355, left: 96, right: 96,
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 36}}>
      {[scene.props.left, scene.props.right].map((item, index) => <div key={item.label}
        style={{...glass, ...cardEnter(frame, captions[index]?.startMs ?? 0, fps),
          height: 390, padding: '70px 58px',
          boxSizing: 'border-box', textAlign: 'center'}}>
        <div style={textReveal(frame, captions[index]?.startMs ?? 0, fps, 8)}>
          <div style={{fontSize: 26, color: index === 0 ? '#107F76' : '#D75B3D',
            fontWeight: 750}}>{index === 0 ? '01' : '02'}</div>
          <div style={{fontSize: 47, fontWeight: 740, marginTop: 26}}>{item.label}</div>
          <div style={{fontSize: 32, lineHeight: 1.4, color: '#52636A',
            marginTop: 30,
            ...(scene.props.rightDetailCue !== undefined && index === 1
              ? textReveal(frame, captions[scene.props.rightDetailCue]?.startMs ?? 0, fps) : {})}}>
            {item.detail}
          </div>
        </div>
      </div>)}
    </div>
  </SceneShell>;
};

const ReportFlow: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'FlowScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <SceneShell title={scene.props.title}>
    <div style={{position: 'absolute', top: 355, left: 96, right: 96,
      display: 'grid', gridTemplateColumns: `repeat(${scene.props.steps.length}, 1fr)`, gap: 32}}>
      {scene.props.steps.map((step, index) => {
        return <div key={`${step.date}-${index}`} style={{...glass,
          ...cardEnter(frame, captions[step.cue]?.startMs ?? 0, fps), height: 315,
          padding: '48px 42px', boxSizing: 'border-box', textAlign: 'center'}}>
          <div style={textReveal(frame, captions[step.cue]?.startMs ?? 0, fps, 8)}>
            <div style={{fontSize: 34, color: '#107F76', fontWeight: 750}}>{step.date}</div>
            <div style={{fontSize: 40, marginTop: 36, fontWeight: 700}}>{step.detail}</div>
          </div>
        </div>;
      })}
    </div>
    <div style={{position: 'absolute', top: 730, left: 160, right: 160,
      fontSize: 28, textAlign: 'center', color: '#52636A',
      ...textReveal(frame, captions[scene.props.footnoteCue]?.startMs ?? 0, fps)}}>
      {scene.props.footnote}
    </div>
  </SceneShell>;
};

const ReportClosing: React.FC<{
  readonly scene: Extract<ReportScene, {type: 'OutroScene'}>;
  readonly captions: readonly Caption[];
}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <SceneShell title={scene.props.title}>
    <div style={{position: 'absolute', top: 290, left: 96, right: 96,
      fontSize: 49, fontWeight: 730, textAlign: 'center',
      ...textReveal(frame, captions[1]?.startMs ?? 0, fps)}}>{scene.props.summary}</div>
    <div style={{position: 'absolute', top: 430, left: 96, right: 96,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32}}>
      {scene.props.takeaways.map((point, index) => <div key={point} style={{
        ...glass, ...cardEnter(frame,
          captions[scene.props.takeawayCues[index]]?.startMs ?? 0, fps),
        height: 280, padding: '42px 38px', boxSizing: 'border-box'}}>
        <div style={textReveal(frame,
          captions[scene.props.takeawayCues[index]]?.startMs ?? 0, fps, 8)}>
          <div style={{fontSize: 23, color: '#107F76', fontWeight: 750}}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <div style={{fontSize: 34, lineHeight: 1.4, fontWeight: 680,
            marginTop: 29}}>{point}</div>
        </div>
      </div>)}
    </div>
  </SceneShell>;
};

const ReportVisual: React.FC<{
  readonly scene: ReportScene; readonly captions: readonly Caption[];
}> = ({scene, captions}) => <AbsoluteFill>
  {scene.type === 'TitleScene' ? <ReportOpening scene={scene} captions={captions} /> :
    scene.type === 'DataScene' ?
      <ReportData scene={scene} captions={captions} /> :
    scene.type === 'MetricScene' ?
      <ReportMetric scene={scene} captions={captions} /> :
    scene.type === 'ArchitectureScene' ?
      <ReportArchitecture scene={scene} captions={captions} /> :
    scene.type === 'ExplanationScene' ?
      <ReportExplanation scene={scene} captions={captions} /> :
    scene.type === 'ComparisonScene' ?
      <ReportComparison scene={scene} captions={captions} /> :
    scene.type === 'FlowScene' ?
      <ReportFlow scene={scene} captions={captions} /> :
    scene.type === 'OutroScene' ?
      <ReportClosing scene={scene} captions={captions} /> :
      null}
</AbsoluteFill>;

const SceneCaption: React.FC<{readonly captions: readonly Caption[]}> = ({captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const timeMs = frame / fps * 1000;
  const caption = captions.find((item) => timeMs >= item.startMs && timeMs < item.endMs);
  if (!caption) return null;
  return <div style={{position: 'absolute', left: 280, right: 280, bottom: 92,
    textAlign: 'center', pointerEvents: 'none'}}>
    <span style={{display: 'inline-block', padding: '12px 24px',
      borderRadius: 18, background: 'rgba(23, 34, 44, 0.88)',
      color: '#FFFFFF', fontFamily: sansFont, fontSize: 33, fontWeight: 650,
      lineHeight: 1.35, boxShadow: '0 14px 32px rgba(23, 34, 44, 0.2)'}}>
      {caption.text}
    </span>
  </div>;
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background, fontFamily: sansFont, color: '#17222C'}}>
    <div style={{position: 'absolute', inset: 0, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      scale: interpolate(frame, [0, reportVideo.introFrames - 1], [0.97, 1],
        {extrapolateRight: 'clamp'})}}>
      <div style={{fontSize: 98, fontWeight: 780}}>{reportVideo.title}</div>
      <div style={{fontSize: 30, color: '#52636A', marginTop: 26}}>
        {reportVideo.presentationDate}
      </div>
    </div>
  </AbsoluteFill>;
};

const ThankYou: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background, fontFamily: sansFont,
    color: '#17222C', opacity: interpolate(frame, [0, 10], [0, 1],
      {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
    <div style={{position: 'absolute', inset: 0, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontSize: 98, fontWeight: 780}}>谢谢观看</div>
      <div style={{fontSize: 30, color: '#52636A', marginTop: 26}}>
        {reportVideo.title} · {reportVideo.presentationDate}
      </div>
    </div>
    <div style={{position: 'absolute', bottom: 45, left: 96, right: 96,
      display: 'flex', justifyContent: 'space-between', fontSize: 21,
      color: '#52636A'}}>
      <span>{reportVideo.verificationNotice}</span><span>{reportVideo.disclaimer}</span>
    </div>
  </AbsoluteFill>;
};

export const ReportVideoComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const totalFrames = reportVideo.scenes.reduce(
    (sum, item) => sum + item.duration, 0);
  const reportFrame = frame - reportVideo.introFrames;
  let elapsed = 0;
  const scene = reportVideo.scenes.find((item) => {
    const visible = reportFrame >= elapsed && reportFrame < elapsed + item.duration;
    elapsed += item.duration;
    return visible;
  });
  const sceneTrack = reportVideo.tracks.find((entry) => entry.id === scene?.sceneId);
  const noteStart = sceneTrack?.captions[scene?.noteCue ?? 0]
    ?.startMs ?? 0;
  const sceneFrame = scene ? reportFrame - (elapsed - scene.duration) : 0;
  let start = 0;

  return <>
    <Sequence durationInFrames={reportVideo.introFrames} name="Intro">
      <Intro />
    </Sequence>
    <Sequence from={reportVideo.introFrames} durationInFrames={reportVideo.audioEndFrame}
      name="Clean narration">
      <Audio src={staticFile(reportVideo.audioPath)} />
    </Sequence>
    {reportVideo.scenes.map((item) => {
      const from = reportVideo.introFrames + start;
      start += item.duration;
      const track = reportVideo.tracks.find((entry) => entry.id === item.sceneId);
      return <Sequence key={item.sceneId} name={item.sceneId} from={from}
        durationInFrames={item.duration}>
        {track && <ReportVisual scene={item} captions={track.captions} />}
        {track && <SceneCaption captions={track.captions} />}
      </Sequence>;
    })}
    {reportFrame >= 0 && reportFrame < reportVideo.audioEndFrame &&
    <AbsoluteFill style={{pointerEvents: 'none', fontFamily: sansFont,
      color: '#52636A'}}>
      {scene?.note && <div style={{position: 'absolute',
        left: 96, right: 96, bottom: 190, color: '#17222C',
        fontSize: 24, fontWeight: 600,
        opacity: reveal(sceneFrame, noteStart, fps)}}>{scene.note}</div>}
      <div style={{position: 'absolute', left: 96, right: 96, bottom: 34,
        display: 'flex', justifyContent: 'space-between', fontSize: 20}}>
        <span>{reportVideo.verificationNotice}</span>
        <span>{reportVideo.disclaimer}</span>
      </div>
    </AbsoluteFill>}
    <Sequence from={reportVideo.introFrames + reportVideo.audioEndFrame}
      durationInFrames={totalFrames - reportVideo.audioEndFrame}
      name="Thank you"><ThankYou /></Sequence>
  </>;
};
