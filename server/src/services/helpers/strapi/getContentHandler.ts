import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../../../pluginId";

const getContentHandler = async (strapi: Core.Strapi, contentType: string, contentId: string, locale?: string) => {
  const foundContentType = strapi.contentTypes[contentType];
  if (!foundContentType) return { error: `Content type ${contentType} not found` }

  let templateKey = "";
  const hasTemplateRelation = Object.entries(foundContentType.attributes).find(([attributeKey, attributeValues]: [string, any]) => {
    const hasRelation = attributeValues?.type === "relation"
      && attributeValues?.relation === "oneToOne"
      && attributeValues?.target === `plugin::${PLUGIN_ID}.template`
    // && attributeKey === 'template'
    if (hasRelation) templateKey = attributeKey
    return hasRelation
  });

  if (!hasTemplateRelation) return { error: `Template key not found in content type ${contentType}` }

  try {
    let content = await strapi.documents(foundContentType.uid)?.findOne({
      documentId: contentId,
      status: "published",
      locale,
      populate: "*"
    });
    if (!content) {
      content = await strapi.documents(foundContentType.uid)?.findOne({
        documentId: contentId,
        locale,
        populate: "*"
      });
    }
    const templateId = content?.[templateKey]?.documentId;
    const templateJson = content?.[templateKey]?.json;
    let cleanContent = { ...content }
    delete cleanContent[templateKey]
    delete cleanContent.updatedBy
    delete cleanContent.createdBy
    return { contentData: cleanContent, templateId, templateJson, error: null }
  } catch (error) {
    console.error(`[Page Builder] Document service Error getting content by id ${contentId}: ${(error as Error).message}`);
    return { error: (error as Error).message }
  }
}

export default getContentHandler;