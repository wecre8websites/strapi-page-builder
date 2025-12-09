import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../../../pluginId";

const getTemplatesByContentTypeHandler = async (strapi: Core.Strapi, contentType: string, locale?: string, searchQuery?: string) => {
  const filters: any = {
    $and: [
      { contentType: { $eq: contentType } },
    ]
  }
  if (searchQuery) {
    filters.$and.push({
      shortName: { $containsi: searchQuery }
    });
  }
  const result = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findMany({
    filters,
    pageSize: 100,
    sort: "updatedAt:desc",
    locale,
    fields: ["documentId", "shortName"]
  });
  return (result || []).map((templateDocument) => ({ documentId: templateDocument.documentId, shortName: templateDocument.shortName }));
}

export default getTemplatesByContentTypeHandler;