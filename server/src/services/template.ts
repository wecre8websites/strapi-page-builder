import { Core, factories } from "@strapi/strapi";
import { PLUGIN_ID } from "../pluginId";

const template = factories.createCoreService(`plugin::${PLUGIN_ID}.template`, ({ strapi }: { strapi: Core.Strapi }) => ({

}));

export default template;