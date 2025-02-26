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
  const contentId = settings?.defaultContentId;
  return {
    apiKey,
    contentType,
    contentId,
  };
}

export default getSettingsHandler;