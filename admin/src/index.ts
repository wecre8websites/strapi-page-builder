import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { App } from './pages/App';
import SettingsPage from './pages/SettingsPage';
import { PLUGIN_ID } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

const name = "page-builder"
const displayName = "Page Builder"

export default {
  register(app: any) {
    app.createSettingSection(
      'global', // id of the section to add the link in
      [
        {
          id: PLUGIN_ID,
          intlLabel: {
            id: `${PLUGIN_ID}.plugin.name`,
            defaultMessage: `${displayName} plugin`,
          },
          to: `/settings/${PLUGIN_ID}`,
          Component() {
            return SettingsPage
          },
          // licenseOnly: true,
          permissions: [{ action: `plugin::${PLUGIN_ID}.settings.modify`, subject: null }]
        },
      ]
    );

    app.addMenuLink({
      to: `/plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: displayName,
      },
      Component() {
        return App
      },
      permissions: [{ action: `plugin::${PLUGIN_ID}.editor.read`, subject: null }],
      position: 0,
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data: prefixPluginTranslations(data, PLUGIN_ID), locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },

  // bootstrap(app: any) {
  //   app.addSettingsLinks(
  //     'global', // id of the section to add the link in
  //     [
  //       {
  //         id: 'settings',
  //         intlLabel: {
  //           id: `${PLUGIN_ID}.plugin.name`,
  //           defaultMessage: 'Page Builder',
  //         },
  //         to: `/settings/${PLUGIN_ID}`,
  //         Component() {
  //           return SettingsPage
  //         },
  //         licenseOnly: true,
  //         permissions: [{ action: `plugin::${PLUGIN_ID}.settings.modify`, subject: null }]
  //       },
  //     ]
  //   )
  // }
};
