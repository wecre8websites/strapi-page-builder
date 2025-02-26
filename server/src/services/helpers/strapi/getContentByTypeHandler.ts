import { Core } from "@strapi/strapi";

const getContentByTypeHandler = async (strapi: Core.Strapi, contentType: string, searchQuery?: string, locale?: string) => {
  //contentType sent by the client is the uid
  try {
    const foundContentType = strapi.contentTypes[contentType];
    if (!foundContentType) {
      return []
    }
    let mainField: string;
    try {
      //Get mainField for title from configuration service
      // const result = await strapi.service('plugin::content-manager.content-types').getContentTypeConfiguration({ uid: foundContentType.uid });
      const serviceResult = await strapi.service('plugin::content-manager.content-types').findConfiguration({ uid: foundContentType.uid });
      mainField = serviceResult?.settings?.mainField;
    } catch (error) {
    }
    let request: any = {
      locale,
      fields: ["documentId", mainField],
      filters: searchQuery ? { [mainField]: { $contains: searchQuery } } : undefined
    }
    const content = await strapi.documents(foundContentType.uid)?.findMany(request);

    return (content || []).map((document) => ({ documentId: document.documentId, title: mainField ? document[mainField] : document.documentId }));
  } catch (error) {
    console.error(`[Page Builder] getContentByTypeHandler Error getting content by type ${contentType}: ${(error as Error).message}`);
    return []
  }
}

export default getContentByTypeHandler;