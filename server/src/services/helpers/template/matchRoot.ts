import TemplateComponent from "../../../../../shared/types/TemplateComponent";
import deepReplace from "./deepReplace";

const matchRoot = (parent: TemplateComponent, child: TemplateComponent) => {
  let newRoot = { ...parent, props: deepReplace(parent.props, child.props) } as TemplateComponent;
  return newRoot;
}

export default matchRoot;