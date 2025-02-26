import matchContent from "./matchContent";
import matchRoot from "./matchRoot";
import matchZones from "./matchZones";

const matchTemplateShape = (parent: { [key: string]: any }, child: { [key: string]: any }) => {
  const matchedTemplate = {
    content: matchContent(parent.content, child.content),
    root: matchRoot(parent.root, child.root),
    zones: matchZones(parent.zones, child.zones)
  }
  return matchedTemplate;
}

export default matchTemplateShape;