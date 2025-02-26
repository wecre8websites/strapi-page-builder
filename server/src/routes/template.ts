import { PLUGIN_ID } from "../pluginId"

export const admin = {
  type: "admin",
  routes: [
    {
      method: 'GET',
      path: '/templates/:id',
      handler: 'template.findOne',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorRead`],
      },
    },
    {
      method: 'GET',
      path: '/templates',
      handler: 'template.find',
      config: {
        policies: [`plugin::${PLUGIN_ID}.editorRead`],
      },
    },
    // {
    //   method: 'PUT',
    //   path: '/templates/:id',
    //   handler: 'template.update',
    //   config: {
    //     policies: [],
    //     auth: false,
    //   },
    // },
    // {
    //   method: 'POST',
    //   path: '/templates',
    //   handler: 'template.create',
    //   config: {
    //     policies: [],
    //     auth: false,
    //   },
    // }
  ]
}

export const contentApi = {
  type: "content-api",
  routes: [
    {
      method: 'GET',
      path: '/templates',
      handler: `plugin::${PLUGIN_ID}.template.find`,
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/templates/:id',
      handler: `plugin::${PLUGIN_ID}.template.findOne`,
      config: {
        policies: [],
      },
    },
  ]
}