import type React from 'react';
import type {Caption} from '@remotion/captions';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ReportScene} from '../schemas/report-video';

type Metric = Extract<ReportScene, {type: 'MetricScene'}>;
type Data = Extract<ReportScene, {type: 'DataScene'}>;
const teal = '#15998D';
const orange = '#D75B3D';
const muted = '#52636A';
const ticks = '#C8D9DB';
const progress = (frame: number, ms: number, fps: number) =>
  interpolate(frame, [ms / 1000 * fps + 8, ms / 1000 * fps + 44], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const fade = (frame: number, ms: number, fps: number) =>
  interpolate(frame, [ms / 1000 * fps, ms / 1000 * fps + 12], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const area: React.CSSProperties = {position: 'absolute', left: 96, right: 96,
  top: 306, height: 530};

export const MetricChart: React.FC<{readonly scene: Metric;
  readonly captions: readonly Caption[]}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const props = scene.props;
  const cueTime = (cue: number) => captions[cue]?.startMs ?? 0;
  const fullTime = Math.max(...props.bars.map((bar) => cueTime(bar.cue)));
  const total = props.bars.reduce((sum, bar) => sum + bar.value, 0);
  const share = props.bars[0].value / total;
  const circumference = 2 * Math.PI * 184;
  const max = Math.ceil(Math.max(...props.bars.map((bar) => bar.value)) / 20) * 20;
  return <div style={area}>
    <div style={{fontSize: 26, color: muted}}>{props.heading}</div>
    {props.view === 'donut' ? <>
      <svg width="760" height="480" style={{position: 'absolute', top: 35, left: 40}}>
        <circle cx="350" cy="240" r="184" fill="none" stroke="#DFE8EA" strokeWidth="56" />
        {props.bars.map((bar, i) => <circle key={bar.label} cx="350" cy="240" r="184"
          fill="none" stroke={i === 0 ? teal : orange} strokeWidth="56"
          strokeDasharray={circumference * bar.value / total * progress(frame, fullTime, fps) + ' ' + circumference}
          strokeDashoffset={i === 0 ? 0 : -circumference * share}
          transform="rotate(-90 350 240)" />)}
        <g opacity={fade(frame, fullTime, fps)}>
          <text x="350" y="236" textAnchor="middle" fill={teal} fontSize="87" fontWeight="750">
            {(share * 100).toFixed(1)}%</text>
          <text x="350" y="288" textAnchor="middle" fill={muted} fontSize="28">上涨占比</text>
        </g>
      </svg>
      <div style={{position: 'absolute', left: 930, top: 74, right: 30}}>
        {props.bars.map((bar, i) => <div key={bar.label} style={{marginBottom: 26,
          display: 'flex', alignItems: 'baseline', gap: 28,
          opacity: fade(frame, cueTime(bar.cue), fps)}}>
          <span style={{fontSize: 33, color: muted}}>{bar.label}</span>
          <strong style={{fontSize: 70, color: i === 0 ? teal : orange}}>
            {bar.value.toLocaleString('en-US')}</strong>
          <span style={{fontSize: 28, color: muted}}>家</span>
        </div>)}
        <div style={{fontSize: 27, color: muted, marginTop: 20,
          opacity: fade(frame, cueTime(props.statCue), fps)}}>
          {props.statLabel} {props.statValue} {props.statSuffix}
        </div>
        <div style={{fontSize: 27, color: muted, marginTop: 20,
          opacity: fade(frame, fullTime, fps)}}>
          上涨 + 下跌 = {total.toLocaleString('en-US')} 家
        </div>
      </div>
    </> : <>
      <svg width="1050" height="470" style={{position: 'absolute', top: 45, left: 0}}>
        {[0, 0.5, 1].map((ratio) => <g key={ratio}>
          <line x1="105" x2="950" y1={360 - ratio * 280} y2={360 - ratio * 280}
            stroke={ticks} strokeWidth="2" strokeDasharray={ratio === 0 ? undefined : '5 10'} />
          <text x="78" y={369 - ratio * 280} fill={muted} fontSize="26" textAnchor="end">
            {(max * ratio).toFixed(0)}</text>
        </g>)}
        {props.bars.map((bar, i) => {
          const time = cueTime(bar.cue);
          const height = bar.value / max * 280 * progress(frame, time, fps);
          const x = 220 + i * 400;
          return <g key={bar.label} opacity={fade(frame, time, fps)}>
            <rect x={x} y={360 - height} width="190" height={height} rx="20" fill={i === 0 ? '#91B6B6' : teal} />
            <text x={x + 95} y={338 - height} textAnchor="middle" fill={i === 0 ? muted : teal}
              fontSize="42" fontWeight="700">{bar.text}</text>
            <text x={x + 95} y="414" textAnchor="middle" fill={muted} fontSize="31">{bar.label}</text>
          </g>;
        })}
      </svg>
      <div style={{position: 'absolute', left: 1120, top: 90, right: 10}}>
        <div style={{opacity: fade(frame, fullTime, fps)}}>
          <div style={{fontSize: 29, color: muted}}>相对5日均量</div>
          <div style={{fontSize: 83, fontWeight: 750, color: teal, marginTop: 6}}>
            +{((props.bars[1].value / props.bars[0].value - 1) * 100).toFixed(2)}%</div>
        </div>
        <div style={{fontSize: 30, marginTop: 12,
          opacity: fade(frame, cueTime(props.changeCue ?? props.bars[1].cue), fps)}}>{props.changeText}</div>
        <div style={{marginTop: 38, opacity: fade(frame, cueTime(props.statCue), fps)}}>
          <span style={{fontSize: 27, color: muted}}>{props.statLabel} </span>
          <strong style={{fontSize: 47, color: orange}}>{props.statValue}{props.statSuffix}</strong>
        </div>
      </div>
    </>}
  </div>;
};

export const DataChart: React.FC<{readonly scene: Data;
  readonly captions: readonly Caption[]}> = ({scene, captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const props = scene.props;
  const max = Math.max(...props.data.map((datum) => datum.value), 1);
  return <div style={area}>
    {props.view === 'comparison' ? <>
      <div style={{fontSize: 25, color: muted}}>单位：亿元 · 各图独立刻度 · 前日与当日分别比较</div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 90, marginTop: 18}}>
        {props.data.map((datum, i) => {
          const previous = datum.previous!;
          const currentMs = captions[i]?.startMs ?? 0;
          const previousMs = captions[previous.cue]?.startMs ?? 0;
          const ceiling = Math.ceil(Math.max(datum.value, previous.value, 1) / 1000) * 1000;
          return <svg key={datum.label} width="819" height="460" viewBox="0 0 819 460">
            <text x="100" y="40" fill="#17222C" fontSize="35" fontWeight="700">{datum.label}</text>
            {[0, 0.5, 1].map((ratio) => <g key={ratio}>
              <line x1="100" x2="759" y1={365 - ratio * 240} y2={365 - ratio * 240}
                stroke={ticks} strokeWidth="2" strokeDasharray={ratio === 0 ? undefined : '4 10'} />
              <text x="80" y={373 - ratio * 240} textAnchor="end" fontSize="23" fill={muted}>
                {(ceiling * ratio).toLocaleString('en-US')}</text>
            </g>)}
            {[{label: '前日', value: previous.value, ms: previousMs},
              {label: '当日', value: datum.value, ms: currentMs}].map((bar, j) => {
              const height = bar.value / ceiling * 240 * progress(frame, bar.ms, fps);
              const x = 205 + j * 310;
              return <g key={bar.label} opacity={fade(frame, bar.ms, fps)}>
                <rect x={x} y={365 - height} width="136" height={height} rx="12" fill={j === 0 ? '#91B6B6' : teal} />
                <text x={x + 68} y={348 - height} textAnchor="middle" fontSize="33" fontWeight="700"
                  fill={j === 0 ? muted : teal}>{bar.value.toFixed(2)}</text>
                <text x={x + 68} y="408" textAnchor="middle" fontSize="28" fill={muted}>{bar.label}</text>
              </g>;
            })}
            <text x="759" y="40" textAnchor="end" fill={orange} fontSize="29" fontWeight="700"
              opacity={fade(frame, Math.max(previousMs, currentMs), fps)}>
              {previous.value > 0 ? '较前日 ' + ((datum.value / previous.value - 1) * 100).toFixed(1) + '%' : '前日为零'}</text>
          </svg>;
        })}
      </div>
    </> : <>
      <div style={{fontSize: 26, color: muted}}>主力净流入 · 单位：亿元</div>
      <svg width="1728" height="450" style={{marginTop: 20}}>
        {[0, 20, 40, 60].map((tick) => <g key={tick}>
          <line x1={330 + tick / max * 1020} x2={330 + tick / max * 1020} y1="30" y2="355"
            stroke={ticks} strokeWidth="2" strokeDasharray={tick === 0 ? undefined : '4 10'} />
          <text x={330 + tick / max * 1020} y="405" textAnchor="middle" fontSize="25" fill={muted}>{tick}</text>
        </g>)}
        {props.data.map((datum, i) => {
          const time = captions[i]?.startMs ?? 0;
          const width = datum.value / max * 1020 * progress(frame, time, fps);
          const color = i === props.highlightIndex ? orange : teal;
          const y = 80 + i * 122;
          return <g key={datum.label} opacity={fade(frame, time, fps)}>
            <text x="0" y={y + 12} fill={color} fontSize="28" fontWeight="700">0{i + 1}</text>
            <text x="64" y={y + 12} fill="#17222C" fontSize="36" fontWeight="650">{datum.label}</text>
            <line x1="330" x2={330 + width} y1={y} y2={y} stroke={color} strokeWidth="20" strokeLinecap="round" />
            <circle cx={330 + width} cy={y} r="17" fill={color} />
            <text x="1690" y={y + 16} textAnchor="end" fill={color} fontSize="49" fontWeight="700">
              +{datum.value.toFixed(2)}</text>
          </g>;
        })}
      </svg>
    </>}
  </div>;
};
