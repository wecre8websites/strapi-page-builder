import { PLUGIN_ID } from "../pluginId";

export default {
  type: "admin",
  routes: [
    {
      method: 'POST',
      path: '/editor',
      handler: 'editor.getEditorData',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorRead`],
      },
    },
    {
      method: 'POST',
      path: '/editor/templates',
      handler: 'editor.saveTemplate',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorEdit`],
      },
    },
    {
      method: 'PUT',
      path: '/editor/templates/:templateId',
      handler: 'editor.saveTemplate',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorSave`],
      },
    },
    // {
    //   method: 'GET',
    //   path: "/editor/media",
    //   handler: "editor.getMedia",
    //   config: {
    //     policies: [`plugin::${PLUGIN_ID}.editorRead`],
    //   },
    // },
    {
      method: 'POST',
      path: '/editor/content/:contentType',
      handler: 'editor.getStrapiContent',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorRead`],
      },
    },
    // {
    //   method: 'POST',
    //   path: '/editor/content/:contentType/:documentId',
    //   handler: 'editor.getStrapiDocument',
    //   config: {
    //     policies: [`plugin::${PLUGIN_ID}.editorRead`],
    //   },
    // },
    {
      method: 'GET',
      path: '/settings',
      handler: 'editor.getSettings',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorRead`],
      },
    },
    {
      method: 'POST',
      path: '/settings',
      handler: 'editor.saveSettings',
      config: {
        policies: [`plugin::${PLUGIN_ID}.settingsSave`],
      },
    },
    {
      method: 'GET',
      path: '/settings/contentTypes',
      handler: 'editor.getSettingsContentTypes',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorRead`],
      },
    },
  ]
}