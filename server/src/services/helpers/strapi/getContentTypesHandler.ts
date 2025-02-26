import { Core } from "@strapi/strapi";
import SettingsContentType from "../../../../../shared/types/SettingsContentType";
import SimplifiedContentType from "../../../../../shared/types/SimplifiedContentType";
import { PLUGIN_ID } from "../../../pluginId";

const getContentTypesHandler = async (strapi: Core.Strapi, isSettings: boolean): Promise<SimplifiedContentType[] | SettingsContentType[]> => {
  const contentTypes = strapi.contentTypes;

  let types: any[] = [];

  const blackListedPlugins = ['upload', 'i18n', 'users-permissions'];

  for await (const [name, contentType] of Object.entries(contentTypes)) {
    let templateKey = "";
    const hasTemplateRelation = Object.entries(contentType.attributes).find(([attributeKey, attributeValues]: [string, any]) => {
      const hasRelation = attributeValues?.type === "relation"
        && attributeValues?.relation === "oneToOne"
        && attributeValues?.target === `plugin::${PLUGIN_ID}.template`
      // && attributeKey === 'template'
      if (hasRelation) templateKey = attributeKey
      return hasRelation
    });
    if (hasTemplateRelation) {
      if ((name.includes("api::") || (contentType?.pluginOptions?.['content-manager']?.visible)) && !blackListedPlugins.includes(name.replace('plugin::', '').split('.')[0])) {
        const templateDocuments = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findMany({
          filters: {
            contentType: contentType.uid,
          },
          fields: ["documentId", "shortName"]
        })
        const object = {
          // templateKey: templateKey || null,
          uid: contentType?.uid,
          kind: contentType?.kind,
          source: name.split('::')[0],
          globalId: contentType?.globalId,
          attributes: contentType?.attributes,
          templateDocuments: templateDocuments as unknown as { id: string; documentId: string; shortName: string; }[]
        };
        if (contentType?.uid && contentType?.kind && contentType?.globalId) types.push(object)
      }
    }
  }
  if (!!isSettings) {
    const simplifiedTypes: SettingsContentType[] = types.map((contentType) => ({
      // templateKey: contentType?.templateKey || null,
      uid: contentType?.uid as string,
      globalId: contentType?.globalId as string,
      source: contentType?.source as string,
      kind: contentType?.kind as string,
    }))
    return simplifiedTypes;
  }
  const simplifiedTypes: SimplifiedContentType[] = types.map((contentType) => ({
    uid: contentType?.uid as string,
    globalId: contentType?.globalId as string,
    source: contentType?.source as string,
    kind: contentType?.kind as string,
    attributes: Object.entries(contentType.attributes || {}).reduce((acc, [key, value]: [string, any]) => ({
      ...acc,
      [key]: {
        type: value.type,
        localized: value.pluginOptions?.i18n?.localized || false
      }
    }), {}),
    templateDocuments: contentType.templateDocuments.map((templateDocument) => ({
      documentId: templateDocument.documentId,
      shortName: templateDocument.shortName
    }))

  }));
  return simplifiedTypes;
}

export default getContentTypesHandler;