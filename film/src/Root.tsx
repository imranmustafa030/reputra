import { Composition } from "remotion";
import { Intro } from "./Intro";

// Two framings of the same film: portrait for phones (where nearly every customer opens the
// page) and landscape for desktop. Both are 2 seconds and end on solid amber.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="IntroPortrait" component={Intro} durationInFrames={60} fps={30} width={720} height={1280} defaultProps={{ vertical: true }} />
      <Composition id="IntroWide" component={Intro} durationInFrames={60} fps={30} width={1280} height={720} defaultProps={{ vertical: false }} />
    </>
  );
};
