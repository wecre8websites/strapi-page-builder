import { Core, factories } from "@strapi/strapi";
import { PLUGIN_ID } from "../pluginId";
import GetEditorDataResponse from "../../../shared/types/GetEditorDataResponse";
import SaveTemplateRequest from "../../../shared/types/SaveTemplateRequest";
import SettingsContentType from "../../../shared/types/SettingsContentType";
import SimplifiedContentType from "../../../shared/types/SimplifiedContentType";
import getLicenceSettings from "./helpers/license/getLicenceSettings";
import updateLicenceToken from "./helpers/license/updateLicenceToken";
import getContentTypesHandler from "./helpers/strapi/getContentTypesHandler";
import matchTemplateShape from "./helpers/template";
import getContentHandler from "./helpers/strapi/getContentHandler";
import getSettingsHandler from "./helpers/strapi/getSettingsHandler";
import getTemplateHandler from "./helpers/strapi/getTemplateHandler";
import getTemplatesByContentTypeHandler from "./helpers/strapi/getTemplatesByContentTypeHandler";
import getContentByTypeHandler from "./helpers/strapi/getContentByTypeHandler";
import getAvailableLocalesHandler from "./helpers/strapi/getAvailableLocalesHandler";
import saveLicenceSettings from "./helpers/license/saveLicenceSettings";

const LICENCE_SERVER = "https://licence.wc8.io/strapi-page-builder"
// const LICENCE_SERVER = `http://127.0.0.1:5001/licence-server-682e3/us-central1/routes/strapi-page-builder`

const editor = factories.createCoreService(`plugin::${PLUGIN_ID}.editor`, ({ strapi }: { strapi: Core.Strapi }) => ({
  //Settings
  async getSettings() {
    let queryData = await strapi.db.query(`plugin::${PLUGIN_ID}.editor`).findMany()
    const settings = queryData?.[0];
    const apiKey = settings?.apiKey;
    const defaultContentType = settings?.defaultContentType;
    const defaultContentId = settings?.defaultContentId;
    if (apiKey) {
      const licenceData = await getLicenceSettings(apiKey);
      return {
        apiKey,
        ...licenceData,
        defaultContentType,
        defaultContentId
      }
    }
    return {
      apiKey,
      url: "",
      defaultContentType,
      defaultContentId,
      error: null
    };
  },
  async saveSettings(data: { apiKey?: string, url?: string, defaultContentType?: string, defaultContentId?: string }) {
    let queryData = await strapi.db.query(`plugin::${PLUGIN_ID}.editor`).findMany()
    const settings = queryData?.[0];
    const apiKey = data?.apiKey || settings?.apiKey;
    const url = data?.url || undefined
    const defaultContentType = data?.defaultContentType || undefined
    const defaultContentId = data?.defaultContentId || undefined
    if (!apiKey) return {
      apiKey: "",
      success: false,
      defaultContentType,
      defaultContentId,
      error: 'API Key is required'
    }
    try {
      const licenceData = await saveLicenceSettings(apiKey, url);
      if (settings) {
        await strapi.db.query(`plugin::${PLUGIN_ID}.editor`).update({
          where: { id: settings.id },
          data: {
            apiKey,
            defaultContentType,
            defaultContentId,
          }
        });
      } else {
        await strapi.db.query(`plugin::${PLUGIN_ID}.editor`).create({
          data: {
            apiKey,
            defaultContentType,
            defaultContentId,
          }
        });
      }
      return {
        apiKey,
        ...licenceData,
        defaultContentType,
        defaultContentId,
        error: null
      };
    } catch (error) {
      console.error(`[Page Builder] Error saving settings ${(error as Error).message}`);
      return {
        apiKey,
        success: false,
        defaultContentType,
        defaultContentId,
        error: 'Unable to save settings'
      }
    }
  },
  async getSettingsContentTypes() {
    const contentTypes = strapi.contentTypes;

    let types: any[] = [];

    const blackListedPlugins = ['upload', 'i18n', 'users-permissions'];

    for await (const [name, contentType] of Object.entries(contentTypes)) {
      let templateKey = "";
      const hasTemplateRelation = Object.entries(contentType.attributes).find(([attributeKey, attributeValues]: [string, any]) => {
        const hasRelation = attributeValues?.type === "relation"
          && attributeValues?.relation === "oneToOne"
          && attributeValues?.target === `plugin::${PLUGIN_ID}.template`
        // && attributeKey === 'template'
        if (hasRelation) templateKey = attributeKey
        return hasRelation
      });
      if (hasTemplateRelation) {
        if ((name.includes("api::") || (contentType?.pluginOptions?.['content-manager']?.visible)) && !blackListedPlugins.includes(name.replace('plugin::', '').split('.')[0])) {
          const object = {
            // templateKey: templateKey || null,
            uid: contentType?.uid,
            kind: contentType?.kind,
            source: name.split('::')[0],
            globalId: contentType?.globalId,
          };
          if (contentType?.uid && contentType?.kind && contentType?.globalId) types.push(object)
        }
      }
    }
    const settingsContentTypes: SettingsContentType[] = types.map((contentType) => ({
      // templateKey: contentType?.templateKey || null,
      uid: contentType?.uid as string,
      globalId: contentType?.globalId as string,
      source: contentType?.source as string,
      kind: contentType?.kind as string,
    }));
    return settingsContentTypes;
  },

  //Editor
  async getEditorData(contentType?: string, contentId?: string, templateId?: string, locale?: string): Promise<GetEditorDataResponse> {
    let selectedContentType = contentType || "";
    let selectedContentId = contentId || "";
    let selectedTemplateId = templateId || "";

    const locales = await getAvailableLocalesHandler(strapi);

    const { apiKey, contentType: settingsContentType, contentId: settingsContentId } = await getSettingsHandler(strapi);
    selectedContentType = selectedContentType || settingsContentType;
    selectedContentId = selectedContentId || settingsContentId;

    const licenceTokenData = await updateLicenceToken(apiKey);
    const { token, web_url, error: licenceError } = licenceTokenData

    const contentTypes = await getContentTypesHandler(strapi, false) as SimplifiedContentType[];

    const contentDocuments = await getContentByTypeHandler(strapi, selectedContentType);
    const firstContentId = contentDocuments?.[0]?.documentId;

    const templateDocuments = await getTemplatesByContentTypeHandler(strapi, contentType || settingsContentType, locale);
    const firstTemplateId = templateDocuments?.[0]?.documentId;

    let contentResult: Awaited<ReturnType<typeof getContentHandler>>
    if (!!selectedContentType && selectedContentType !== settingsContentType && contentDocuments?.length) {
      selectedContentId = firstContentId;
      contentResult = await getContentHandler(strapi, contentType, selectedContentId, locale);
    } else {
      contentResult = await getContentHandler(strapi, settingsContentType, selectedContentId, locale);
    }
    const { contentData, templateId: contentTemplateId, error: contentError } = contentResult;
    selectedTemplateId = selectedTemplateId || contentTemplateId || firstTemplateId;
    let { templateJson } = contentResult
    if (selectedTemplateId && selectedTemplateId !== contentTemplateId) {
      const template = await getTemplateHandler(strapi, templateId, locale);
      templateJson = template?.json;
    }
    const response: GetEditorDataResponse = {
      token,
      url: web_url,
      locales,
      contentTypes,
      contentType: selectedContentType,
      contentId: selectedContentId,
      contentData,
      contentDocuments,
      templateId: selectedTemplateId,
      templateJson,
      templateDocuments,
      errors: {
        licenceError,
        contentError
      }
    }
    return response
  },
  async getStrapiContent(contentType: string, searchQuery?: string, locale?: string, titleField?: string) {
    const contentDocuments = await getContentByTypeHandler(strapi, contentType, searchQuery, locale, titleField);
    return contentDocuments;
  },
  async saveTemplate(data: SaveTemplateRequest) {
    let saveType: "update" | "create";
    if (data.templateId) saveType = "update";
    else if (data.templateName) saveType = "create";
    else return { error: "Template name or ID is required" }

    if (saveType === "update" && !data.templateId) return { error: "Template is required for update" }
    if (saveType === "update" && !data.templateJson) return { error: "Template JSON is required for update" }
    if (saveType === "create" && !data.contentType) return { error: "Content type is required for create" }
    if (saveType === "create" && !data.templateName) return { error: "Template name is required for create" }
    const locales = await getAvailableLocalesHandler(strapi);
    const defaultLocale = locales.find(l => l.isDefault)?.code || data?.locale || undefined;
    try {
      let defaultJson: any = {
        content: [],
        root: {},
        zones: {},
      };
      let result: any
      switch (saveType) {
        case "create": {
          let json = { ...defaultJson }
          if (data?.duplicateId) {
            try {
              const duplicateDoc = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findOne({
                documentId: data.duplicateId,
                locale: defaultLocale,
                populate: "*"
              });
              if (duplicateDoc) {
                json = { ...json, ...duplicateDoc?.json };
              }
            } catch (error) {
              console.error(`[Page Builder] Error getting template to duplicate ${data.duplicateId}: ${(error as Error).message}`);
            }
          } else json = { ...json, ...(data?.templateJson || {}) }
          const isPlugin = data.contentType.includes("plugin::");
          const contentTypeName = data.contentType?.split(".").pop();
          const name = (`${isPlugin ? "plugin." : ""}${contentTypeName.toLowerCase()}.${data.templateName.toLowerCase()}`).replace(/[^A-Za-z0-9-.]/gi, "-");
          result = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.create({
            data: {
              name,
              shortName: data.templateName,
              contentType: data.contentType,
              locale: locales?.find(l => l.isDefault)?.code || data?.locale,
              json,
            }
          });
          const remainingLocales = locales.filter((locale) => locale.code !== data?.locale).map((locale) => locale.code);
          for (const locale of remainingLocales) {
            let json = { ...defaultJson }
            if (data?.duplicateId) {
              try {
                const duplicateDoc = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findOne({
                  documentId: data.duplicateId,
                  locale,
                  populate: "*"
                });
                if (duplicateDoc) {
                  json = { ...json, ...duplicateDoc?.json };
                }
              } catch (error) {
                console.error(`[Page Builder] Error getting template to duplicate ${data.duplicateId}: ${(error as Error).message}`);
              }
            } else json = { ...json, ...(data?.templateJson || {}) }
            await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.update({
              documentId: result.documentId,
              locale,
              //@ts-ignore
              data: { name, shortName: data.templateName, contentType: data.contentType, locale, json, }
            });
          }
          break;
        }
        case "update": {
          const isDefaultLocale = defaultLocale === data?.locale || data?.locale === undefined;
          if (isDefaultLocale) {
            let parentJson = { ...defaultJson, ...data.templateJson }
            result = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.update({
              documentId: data.templateId,
              locale: data?.locale,
              //@ts-ignore
              data: { json: parentJson }
            });
            const remainingLocales = locales.filter((locale) => locale.code !== data?.locale).map((locale) => locale.code);
            //For each remaining locale, get the tramplateJson for that locale, traverse through the object and insert or remove any differences in key before saving
            for (const locale of remainingLocales) {
              const localeDoc = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findOne({
                documentId: data.templateId,
                locale,
                populate: "*"
              });
              const childJson = localeDoc?.json;
              const matchedJson = matchTemplateShape(parentJson, childJson);
              let json = { ...defaultJson, ...matchedJson }
              await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.update({
                documentId: data.templateId,
                locale,
                //@ts-ignore
                data: { json }
              });
            }
          } else if (data?.locale) {
            const childJson = { ...defaultJson, ...data.templateJson }
            const parentDoc = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.findOne({
              documentId: data.templateId,
              locale: defaultLocale,
              populate: "*"
            });
            const parentJson = parentDoc?.json;
            const matchedJson = matchTemplateShape(parentJson, childJson);
            result = await strapi.documents(`plugin::${PLUGIN_ID}.template`)?.update({
              documentId: data.templateId,
              locale: data.locale,
              //@ts-ignore
              data: { json: matchedJson }
            });
          }
          break;
        }
      }

      const templateDocuments = await getTemplatesByContentTypeHandler(strapi, data.contentType || result.contentType);
      const response = {
        templateId: result.documentId,
        templateJson: result.json,
        templateDocuments
      }
      return response
    } catch (error) {
      console.log(error)
      console.error(`[Page Builder] Error creating template ${(error as Error).message}`);
      return { error: (error as Error).message }
    }
  },
}));

export default editor;