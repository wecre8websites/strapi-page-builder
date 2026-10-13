import { Core, factories } from "@strapi/strapi";
import SaveTemplateRequest from "../../../shared/types/SaveTemplateRequest";
import GetEditorDataResponse from "../../../shared/types/GetEditorDataResponse";
import { PLUGIN_ID } from "../pluginId";
import { canReadContentType } from "../services/helpers/strapi/contentAccess";

const editor = factories.createCoreController(`plugin::${PLUGIN_ID}.editor`, ({ strapi }: { strapi: Core.Strapi }) => ({
  // Settings
  async getSettings(ctx) {
    const settings = await strapi.plugin(PLUGIN_ID).service('editor').getSettings();
    // the licence key is a secret: only admins who may change the settings get it back
    const canModify = ctx.state.userAbility?.can(`plugin::${PLUGIN_ID}.settings.modify`, null);
    ctx.body = canModify ? settings : { ...settings, apiKey: settings.apiKey ? "********" : "" };
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
    if (contentType && !canReadContentType(ctx.state.userAbility, contentType)) return ctx.forbidden();
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').getEditorData(contentType, templateId, contentId, locale) as GetEditorDataResponse;
  },
  async getStrapiContent(ctx) {
    const { contentType } = ctx.params
    const { searchQuery, locale, titleField } = ctx.request.body
    if (!canReadContentType(ctx.state.userAbility, contentType)) return ctx.forbidden();
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').getStrapiContent(contentType, searchQuery, locale, titleField);
  },
  async getTemplates(ctx) {
    const { contentType } = ctx.params
    const { searchQuery, locale } = ctx.request.body
    ctx.body = await strapi.plugin(PLUGIN_ID).service('editor').getTemplates(contentType, searchQuery, locale);
  },
  async saveTemplate(ctx) {
    const saveTemplateRequest: SaveTemplateRequest = {
      templateId: ctx.params.templateId,
      templateName: ctx.request.body.templateName,
      templateJson: ctx.request.body.templateJson,
      contentType: ctx.request.body.contentType,
      duplicateId: ctx.request.body.duplicateId,
      locale: ctx.request.body.locale,
      config: ctx.request.body.config
    }
    const result = await strapi.plugin(PLUGIN_ID).service('editor').saveTemplate(saveTemplateRequest);
    ctx.body = result;
  },
}));

export default editor;