import { ConfigComponentType, Field, PBConfig, PBTemplateConfig, TemplateComponentType } from "../../../../../shared/types/FieldTypes";

const matchTemplateShape = (primary: PBTemplateConfig, secondary: PBTemplateConfig, config: PBConfig) => {

  const root = componentHandler({ parentComponent: { ...primary.root, type: "_ROOT" } as TemplateComponentType, childComponent: { ...secondary.root, type: "_ROOT" } as TemplateComponentType | undefined, componentsConfig: { "_ROOT": config.root } as any as { [key: string]: ConfigComponentType } });

  const zones = Object.entries(primary.zones as { [key: string]: TemplateComponentType[] }).reduce((acc, [zoneKey, parentZoneComponents]) => {
    const childZoneComponents = (secondary.zones as { [key: string]: TemplateComponentType[] })[zoneKey];
    if (!childZoneComponents) {
      return {
        ...acc,
        [zoneKey]: parentZoneComponents
      }
    }

    return {
      ...acc,
      [zoneKey]: parentZoneComponents.map(parentComponent => {
        const childComponent = childZoneComponents.find(c => c.props.id === parentComponent.props.id);
        return componentHandler({ parentComponent, childComponent, componentsConfig: config.components as any as { [key: string]: ConfigComponentType } });
      })
    }
  }, {} as { [key: string]: TemplateComponentType[] });

  const content = (primary.content as TemplateComponentType[]).map((parentComponent) => {
    const childComponent = (secondary.content as TemplateComponentType[]).find(c => c.props.id === parentComponent.props.id)
    return componentHandler({ parentComponent, childComponent, componentsConfig: config.components as any as { [key: string]: ConfigComponentType } });
  })

  const newSecondary = {
    ...secondary,
    root,
    zones,
    content
  }
  return newSecondary;
}

const fieldHandler = (payload: { key: string, parentValue: any, childValue: any, parentComponent: TemplateComponentType, childComponent?: TemplateComponentType, matchingComponentFields: ConfigComponentType["fields"], componentsConfig: { [key: string]: ConfigComponentType } }): any => {
  const { key, parentValue, childValue, parentComponent, childComponent, matchingComponentFields, componentsConfig } = payload;
  const fieldDef = matchingComponentFields?.[key] as Field | undefined;

  if (fieldDef?.enforcedSync) return parentValue;
  switch (fieldDef?.type) {
    case "slot": {
      if (Array.isArray(parentValue)) {
        return parentValue.map((parentSlotItem: any, index) => componentHandler({ parentComponent: parentSlotItem, childComponent: childValue?.[index], componentsConfig }));
      }
      return parentValue;
    }
    case "array": {
      return parentValue.map((parentArrayItem: any, arrayIndex: number) => {
        const childArrayItem = childValue?.[arrayIndex];
        if (!childArrayItem) return parentArrayItem;
        return Object.entries(parentArrayItem).reduce((acc, [arrayKey, arrayParentItemValue]) => {
          const arrayChildItemValue = childArrayItem?.[arrayKey];
          if (!arrayChildItemValue) return {
            ...acc,
            [arrayKey]: arrayParentItemValue
          };

          //@ts-ignore
          const matchingSubComponentFields = (matchingComponentFields?.[key] as any)?.arrayFields as ConfigComponentType["fields"] | undefined;

          //@ts-ignore
          if (!matchingSubComponentFields) return acc

          return {
            ...acc,
            [arrayKey]: fieldHandler({ key: arrayKey, parentValue: arrayParentItemValue, childValue: arrayChildItemValue, parentComponent: parentArrayItem, childComponent: childArrayItem, matchingComponentFields: matchingSubComponentFields, componentsConfig })
          }
        }, {} as { [key: string]: any });
      });
    }
    case "object": {
      return Object.entries(parentValue).reduce((acc, [objKey, objParentValue]) => {
        const childObjValue = childValue?.[objKey];
        if (!childObjValue) return {
          ...acc,
          [objKey]: objParentValue
        };

        //@ts-ignore
        const matchingSubComponentFields = matchingComponentFields?.[key]?.objectFields as ConfigComponentType["fields"] | undefined;
        if (!matchingSubComponentFields) return acc

        return {
          ...acc,
          [objKey]: fieldHandler({ key: objKey, parentValue: objParentValue, childValue: childObjValue, parentComponent, childComponent, matchingComponentFields: matchingSubComponentFields, componentsConfig })
        }
      }, {} as { [key: string]: any }) as { [key: string]: any };
    }
    default:
      return childValue ?? parentValue;
  }
}

const componentHandler = (payload: { parentComponent: TemplateComponentType, childComponent?: TemplateComponentType, componentsConfig: { [key: string]: ConfigComponentType } }) => {
  const { parentComponent, childComponent, componentsConfig } = payload;
  const type = parentComponent.type;
  if (!componentsConfig[type]) {
    throw new Error(`No matching component type: ${type}`);
  }
  const matchingComponentFields = componentsConfig[type]?.fields;
  if (!matchingComponentFields) {
    let newChildComponent: any = {
      ...parentComponent,
    };
    if (type === "_ROOT") delete newChildComponent.type;
    return newChildComponent;
  };
  let newChildComponent: any = {
    ...parentComponent,
    // ...childComponent,
    type: type === "_ROOT" ? undefined : type,
    props: Object.entries(parentComponent.props).reduce((acc, [key, parentValue]) => {
      const childValue = childComponent?.props?.[key];
      return {
        ...acc,
        [key]: fieldHandler({ key, parentValue, childValue, parentComponent, childComponent, matchingComponentFields, componentsConfig })
      };
    }, {} as { [key: string]: any }),
  };
  return newChildComponent;
}

export default matchTemplateShape;