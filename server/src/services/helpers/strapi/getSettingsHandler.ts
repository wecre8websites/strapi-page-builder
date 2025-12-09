import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../../../pluginId";

const getSettingsHandler = async (strapi: Core.Strapi) => {
  let queryData = []
  try {
    queryData = await strapi.db.query(`plugin::${PLUGIN_ID}.editor`).findMany()
  } catch (error) {
    console.error(`[getSettingsHandler] Error getting settings ${(error as Error).message}`);
  }
  const settings = queryData?.[0];
  const apiKey = settings?.apiKey;
  const contentType = settings?.defaultContentType;
  const templateId = settings?.defaultTemplateId;
  const contentId = settings?.defaultContentId;
  const enforceTemplateShape = settings?.enforceTemplateShape ?? true;
  return {
    apiKey,
    contentType,
    templateId,
    contentId,
    enforceTemplateShape,
  };
}

export default getSettingsHandler;