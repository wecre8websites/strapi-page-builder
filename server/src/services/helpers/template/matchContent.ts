import TemplateComponent from "../../../../../shared/types/TemplateComponent";
import deepReplace from "./deepReplace";

const matchContent = (parent: TemplateComponent[], child: TemplateComponent[]) => {
  const finalContent: TemplateComponent [] = [];
  for (const parentComponent of parent) {
    const matchingChild = child.find((childComponent) => childComponent.props.id === parentComponent.props.id);
    if (!matchingChild) finalContent.push(parentComponent);
    else {
      let newChild = { ...parentComponent, props: deepReplace(parentComponent.props, matchingChild.props) } as TemplateComponent;
      finalContent.push(newChild);
    }
  }
  return finalContent;
}

export default matchContent;