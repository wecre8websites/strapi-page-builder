import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../../../pluginId";

const getTemplateHandler = async (strapi: Core.Strapi, templateId: string, locale?: string) => {
  const template = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findOne({
    documentId: templateId,
    locale,
    fields: ["documentId", "json"]
  });
  return template;
}

export default getTemplateHandler;