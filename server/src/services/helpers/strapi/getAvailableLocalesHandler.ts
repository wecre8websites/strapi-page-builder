import { Core } from "@strapi/strapi";

const getAvailableLocalesHandler = async (strapi: Core.Strapi) => {
  const defaultLocale = await strapi.service("plugin::i18n.locales").getDefaultLocale();
  const availableLocales = await strapi.db.query("plugin::i18n.locale").findMany();
  const locales = availableLocales.map((locale: any) => ({ name: locale.name as string, code: locale.code as string, isDefault: defaultLocale === locale.code as boolean }));
  return locales;
}

export default getAvailableLocalesHandler;