import { Core, factories } from "@strapi/strapi";
import { PLUGIN_ID } from "../pluginId";

const TEMPLATE_UID = `plugin::${PLUGIN_ID}.template`;
const PAGE_SIZE = 100;

// Opt-in switch for the DropZone -> slots migration endpoints. Off by default, 404 when off.
export const isSlotMigrationEnabled = () => process.env.PAGE_BUILDER_SLOT_MIGRATION === "true";

const template: typeof Core.CoreAPI.Controller = factories.createCoreController(TEMPLATE_UID, ({ strapi }: { strapi: Core.Strapi }) => ({
  // GET /api/page-builder/migration/templates  (API token, flag required)
  async migrationList(ctx) {
    if (!isSlotMigrationEnabled()) return ctx.notFound();
    const templates: any[] = [];
    for (let start = 0; ; start += PAGE_SIZE) {
      const page = await strapi.documents(TEMPLATE_UID).findMany({
        locale: "*",
        start,
        limit: PAGE_SIZE,
        sort: "name:asc",
        fields: ["documentId", "locale", "name", "shortName", "contentType", "updatedAt", "json"],
      } as any);
      templates.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    ctx.body = { data: templates };
  },
  // PUT /api/page-builder/migration/templates/:documentId?locale=en  body: { json }
  async migrationUpdate(ctx) {
    if (!isSlotMigrationEnabled()) return ctx.notFound();
    const { documentId } = ctx.params;
    const locale = ctx.query.locale;
    const json = ctx.request.body?.json;
    if (typeof locale !== "string" || !locale) return ctx.badRequest("locale query parameter is required");
    if (!json || typeof json !== "object" || !Array.isArray(json.content)) return ctx.badRequest("json must be a template object with a content array");
    const existing = await strapi.documents(TEMPLATE_UID).findOne({ documentId, locale, fields: ["documentId"] } as any);
    if (!existing) return ctx.notFound();
    const updated = await strapi.documents(TEMPLATE_UID).update({ documentId, locale, data: { json } } as any);
    ctx.body = { data: { documentId: updated?.documentId, locale, updatedAt: updated?.updatedAt } };
  },
}));

export default template;
