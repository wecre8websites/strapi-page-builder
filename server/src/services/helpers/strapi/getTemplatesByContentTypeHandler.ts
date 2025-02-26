import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../../../pluginId";

const getTemplatesByContentTypeHandler = async (strapi: Core.Strapi, contentType: string, locale?: string) => {
  const result = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findMany({
    filters: {
      contentType,
    },
    locale,
    fields: ["documentId", "shortName"]
  });
  return (result || []).map((templateDocument) => ({ documentId: templateDocument.documentId, shortName: templateDocument.shortName }));
}

export default getTemplatesByContentTypeHandler;