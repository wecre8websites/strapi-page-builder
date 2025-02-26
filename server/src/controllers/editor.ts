import { Core, factories } from "@strapi/strapi";
import SaveTemplateRequest from "../../../shared/types/SaveTemplateRequest";
import GetEditorDataResponse from "../../../shared/types/GetEditorDataResponse";
import { PLUGIN_ID } from "../pluginId";

const editor = factories.createCoreController(`plugin::${PLUGIN_ID}.editor`, ({ strapi }: { strapi: Core.Strapi }) => ({
  // Settings
  async getSettings(ctx) {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').getSettings();
  },
  async saveSettings(ctx) {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').saveSettings(ctx.request.body);
  },
  async getSettingsContentTypes(ctx) {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').getSettingsContentTypes();
  },
  //Editor
  async getEditorData(ctx) {
    const { contentType, contentId, templateId, locale } = ctx.request.body;
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').getEditorData(contentType, contentId, templateId, locale) as GetEditorDataResponse;
  },
  async getStrapiContent(ctx) {
    const { contentType } = ctx.params
    const { searchQuery, locale } = ctx.request.body
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').getStrapiContent(contentType, searchQuery, locale);
  },
  async saveTemplate(ctx) {
    const saveTemplateRequest: SaveTemplateRequest = {
      templateId: ctx.params.templateId,
      templateName: ctx.request.body.templateName,
      templateJson: ctx.request.body.templateJson,
      contentType: ctx.request.body.contentType,
      duplicateId: ctx.request.body.duplicateId,
      locale: ctx.request.body.locale
    }
    const result = await strapi.plugin(PLUGIN_ID).service('editor').saveTemplate(saveTemplateRequest);
    ctx.body = result;
  },
}));

export default editor;