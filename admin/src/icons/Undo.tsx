import { FC, SVGProps } from "react";
import Redo from "./Redo";

const Undo: FC<SVGProps<SVGElement> & { enabled?: boolean }> = (props) => (
  <Redo style={{ transform: "scaleX(-1)" }} {...props} enabled={props.enabled} />
);

export default Undo;
