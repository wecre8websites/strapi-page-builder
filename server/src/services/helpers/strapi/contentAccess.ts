import { Core } from "@strapi/strapi";

// Never offered through the page builder, whatever the admin's permissions
const DENIED = [/^admin::/, /^plugin::users-permissions\./];
const TITLE_TYPES = ["string", "text", "uid", "email", "enumeration", "integer", "biginteger", "decimal", "float", "date", "datetime", "time"];

type Ability = { can: (action: string, subject?: any) => boolean } | undefined;

/** The admin may list content of this type: not a denied type and has Content Manager read permission. */
export const canReadContentType = (ability: Ability, uid: string) =>
  !!uid && !DENIED.some((re) => re.test(uid)) && !!ability?.can("plugin::content-manager.explorer.read", uid);

const isSafeTitle = (attribute: any) =>
  !!attribute && TITLE_TYPES.includes(attribute.type) && !attribute.private && attribute.type !== "password";

/** A title field is only ever a public scalar attribute of the type, so a client cannot read arbitrary columns (e.g. password hashes). */
export const safeTitleField = async (strapi: Core.Strapi, uid: string, requested?: string) => {
  const attributes = (strapi.contentTypes as Record<string, any>)[uid]?.attributes || {};
  if (requested && isSafeTitle(attributes[requested])) return requested;
  try {
    const configured = (await strapi.service("plugin::content-manager.content-types").findConfiguration({ uid }))?.settings?.mainField;
    if (configured && isSafeTitle(attributes[configured])) return configured as string;
  } catch (error) { /* fall through */ }
  return "documentId";
};
