import { Core } from "@strapi/strapi";
import { safeTitleField } from "./contentAccess";

const getContentByTypeHandler = async (strapi: Core.Strapi, contentType: string, searchQuery?: string, locale?: string, titleField?: string) => {
  //contentType sent by the client is the uid
  try {
    const foundContentType = strapi.contentTypes[contentType];
    if (!foundContentType) {
      return []
    }
    const mainField = await safeTitleField(strapi, foundContentType.uid, titleField);
    let request: any = {
      locale,
      fields: ["documentId", mainField],
      filters: searchQuery ? { [mainField]: { $containsi: searchQuery } } : undefined,
      limit: 10,
    }
    const content = await strapi.documents(foundContentType.uid)?.findMany(request);

    return (content || []).map((document) => ({ documentId: document.documentId, title: document[mainField] ?? document.documentId }));
  } catch (error) {
    console.error(`[Page Builder] getContentByTypeHandler Error getting content by type ${contentType}: ${(error as Error).message}`);
    return []
  }
}

export default getContentByTypeHandler;