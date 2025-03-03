import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from './pluginId';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // register phase
  strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Access Page Builder',
      uid: 'editor.read',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Edit template content',
      uid: 'editor.edit',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Add & remove template components',
      uid: 'editor.modify',
      pluginName: PLUGIN_ID,
    },
    {
      section: "settings",
      displayName: "Access the Page Builder settings",
      category: "Page Builder",
      uid: "settings.modify",
      pluginName: PLUGIN_ID,
    }
  ])
};

export default register;
