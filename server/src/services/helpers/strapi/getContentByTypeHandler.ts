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

/** Title of one entry, so the editor can label the entry it has open even when a search or list would not include it. */
export const getContentTitle = async (strapi: Core.Strapi, contentType: string, documentId: string, locale?: string) => {
  try {
    const foundContentType = strapi.contentTypes[contentType];
    if (!foundContentType || !documentId) return null;
    const mainField = await safeTitleField(strapi, foundContentType.uid, undefined);
    const document = await strapi.documents(foundContentType.uid)?.findOne({ documentId, locale, fields: ["documentId", mainField] } as any);
    return document ? { documentId: document.documentId, title: document[mainField] ?? document.documentId } : null;
  } catch (error) {
    return null;
  }
}

export default getContentByTypeHandler;