import TemplateComponent from "../../../../../shared/types/TemplateComponent";
import matchContent from "./matchContent";

const matchZones = (parent: { [key: string]: TemplateComponent[] }, child: { [key: string]: TemplateComponent[] }) => {
  let finalZones: { [key: string]: TemplateComponent[] } = {};
  for (const key in parent) {
    if (parent?.hasOwnProperty(key)) {
      const parentZone = parent[key];
      const childZone = child[key];
      if (!childZone) {
        finalZones[key] = parentZone;
        continue;
      }
      finalZones[key] = matchContent(parentZone, childZone);
    }
  }
  return finalZones;
}

export default matchZones;