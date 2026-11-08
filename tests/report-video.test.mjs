import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {test} from 'node:test';
import {parseReportVideo} from '../src/schemas/report-video.ts';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const video = read('../src/templates/report-video.json');
const tracks = read('../src/templates/report-captions.json');
const parse = (change = {}) => parseReportVideo({...video, tracks, ...change});

test('the active report has valid timing, audio and scene order', () => {
  const parsed = parse();
  const sceneFrames = parsed.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  assert.equal(parsed.scenes.length, parsed.tracks.length);
  assert.ok(sceneFrames - parsed.audioEndFrame >= 45);
  assert.ok(sceneFrames - parsed.audioEndFrame <= 150);
  assert.ok(statSync(new URL(`../public/${parsed.audioPath}`, import.meta.url)).size > 100_000);
  assert.equal(parsed.scenes[0].type, 'TitleScene');
  assert.equal(parsed.scenes.at(-1).type, 'OutroScene');
});

test('rejects unsupported scenes, missing captions and references to absent cues', () => {
  assert.throws(() => parse({scenes: [{...video.scenes[0], type: 'UnknownScene'},
    ...video.scenes.slice(1)]}));
  assert.throws(() => parse({tracks: tracks.slice(1)}), /caption track|Track must match/);
  const scenes = structuredClone(video.scenes);
  scenes.find((scene) => scene.type === 'MetricScene').props.statCue = 99;
  assert.throws(() => parse({scenes}), /Cue 99 does not exist/);
});

test('rejects overlap, captions past audio end and an insufficient end card', () => {
  const overlapping = structuredClone(tracks);
  overlapping[0].captions[1].startMs = 100;
  assert.throws(() => parse({tracks: overlapping}), /Caption timing overlaps/);
  const afterAudio = structuredClone(tracks);
  const finalSceneStart = video.scenes.slice(0, -1).reduce((sum, scene) =>
    sum + scene.duration, 0);
  afterAudio.at(-1).captions.at(-1).endMs =
    Math.ceil((video.audioEndFrame - finalSceneStart) / 30 * 1000) + 100;
  assert.throws(() => parse({tracks: afterAudio}), /Caption continues after audio ends/);
  const sceneFrames = video.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  assert.throws(() => parse({audioEndFrame: sceneFrames - 30}), /End card must last/);
});

test('rejects too much text for the fixed layout', () => {
  const scenes = structuredClone(video.scenes);
  scenes[1].props.title = '过长标题'.repeat(10);
  assert.throws(() => parse({scenes}));
});

test('scene ids can change without changing the video template', () => {
  const scenes = structuredClone(video.scenes).map((scene, index) => ({
    ...scene, sceneId: `new-report-${index}`,
  }));
  const renamedTracks = structuredClone(tracks).map((track, index) => ({
    ...track, id: scenes[index].sceneId,
  }));
  assert.equal(parse({scenes, tracks: renamedTracks}).scenes.length, scenes.length);
});

test('rejects a reveal scheduled beyond its scene', () => {
  const scenes = structuredClone(video.scenes);
  const index = scenes.findIndex((scene) => scene.type === 'ExplanationScene');
  scenes[index].props.pointCues[2].offsetMs = 2500;
  scenes[index].props.pointCues[2].cue = tracks[index].captions.length - 1;
  assert.throws(() => parse({scenes}), /Reveal animation exceeds scene duration/);
});

test('comparison charts require previous values with valid narration cues', () => {
  const scenes = structuredClone(video.scenes);
  const chart = scenes.find((scene) => scene.props.view === 'comparison');
  delete chart.props.data[0].previous;
  assert.throws(() => parse({scenes}), /requires a previous value/);
  chart.props.data[0].previous = {value: 12774.81, cue: 99};
  assert.throws(() => parse({scenes}), /Cue 99 does not exist/);
});

test('chart views reject negative magnitude data and absent annotation cues', () => {
  const scenes = structuredClone(video.scenes);
  const chart = scenes.find((scene) => scene.props.view === 'ranking');
  chart.props.data[0].value = -1;
  assert.throws(() => parse({scenes}), /nonnegative values/);
  chart.props.data[0].value = 62.32;
  scenes.find((scene) => scene.props.view === 'columns').props.changeCue = 99;
  assert.throws(() => parse({scenes}), /Cue 99 does not exist/);
});
