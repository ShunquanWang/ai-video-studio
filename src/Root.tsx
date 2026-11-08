import {Composition} from 'remotion';
import {ReportVideoComposition, reportDurationInFrames} from './compositions/ReportVideo';

export const RemotionRoot: React.FC = () => <Composition
  id="AshareReboundReport"
  component={ReportVideoComposition}
  durationInFrames={reportDurationInFrames}
  fps={30}
  width={1920}
  height={1080}
/>;
