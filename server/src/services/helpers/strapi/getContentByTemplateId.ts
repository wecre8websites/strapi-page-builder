import { Core } from "@strapi/strapi";

const getContentByTemplateId = async (strapi: Core.Strapi, contentType: string, templateId?: string, locale?: string, titleField?: string) => {
  //contentType sent by the client is the uid
  try {
    const foundContentType = strapi.contentTypes[contentType];
    if (!foundContentType) {
      return []
    }
    let mainField: string;
    let templateKey: string;
    if (titleField) {
      mainField = titleField;
    } else {
      try {
        //Get mainField for title from configuration service
        // const result = await strapi.service('plugin::content-manager.content-types').getContentTypeConfiguration({ uid: foundContentType.uid });
        const serviceResult = await strapi.service('plugin::content-manager.content-types').findConfiguration({ uid: foundContentType.uid });
        mainField = serviceResult?.settings?.mainField;
        const model = strapi.getModel(foundContentType.uid);
        templateKey = Object.entries(model?.attributes).find(([attributeKey, attributeValues]: [string, any]) => {
          const hasRelation = attributeValues?.type === "relation"
            && attributeValues?.relation === "oneToOne"
            && attributeValues?.target === `plugin::page-builder.template`
          return hasRelation
        })?.[0];
      } catch (error) {
        mainField = "id";
      }
    }
    let request: any = {
      locale,
      fields: ["documentId", mainField],
      filters: { [templateKey]: { documentId: { $eq: templateId } } },
      limit: 10,
    }
    const content = await strapi.documents(foundContentType.uid)?.findMany(request);
    console.log('[Page Builder] getContentByTemplateId results', content.length);

    return (content || []).map((document) => ({ documentId: document.documentId, title: mainField ? document[mainField] : document.documentId }));
  } catch (error) {
    console.error(`[Page Builder] getContentByTemplateId Error getting content by templateId ${templateId}: ${(error as Error).message}`);
    return []
  }
}

export default getContentByTemplateId;