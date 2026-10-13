import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  if (process.env.PAGE_BUILDER_SLOT_MIGRATION === "true") {
    strapi.log.warn("[Page Builder] PAGE_BUILDER_SLOT_MIGRATION is enabled: template migration endpoints are exposed to API tokens. Unset it once your templates are migrated.");
  }
};

export default bootstrap;