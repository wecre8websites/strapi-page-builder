import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import Logo from './icons/Logo';
export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}/editor`,
      icon: Logo,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: PLUGIN_ID,
      },
      Component: async () => {
        const { App } = await import('./pages/App');
        return App;
      },
      permissions: [
        {
          action: `plugin::${PLUGIN_ID}.editor.read`,
          subject: null
        }
      ]
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });

    // app.createSettingSection(
    //   {
    //     id: PLUGIN_ID,
    //     intlLabel: { id: `${PLUGIN_ID}.plugin.name`, defaultMessage: 'Page Builder' },
    //   },
    //   [
    //     {
    //       intlLabel: {
    //         id: `${PLUGIN_ID}.plugin.name`,
    //         defaultMessage: 'Settings',
    //       },
    //       id: 'settings',
    //       to: `/settings/${PLUGIN_ID}`,
    //       Component: async () => {
    //         const { SettingsPage } = await import('./pages/Settings');
    //         return SettingsPage;
    //       },
    //     },
    //   ],
    // )
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

  bootstrap(app: any) {
    app.addSettingsLinks(
      'global', // id of the section to add the link in
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.plugin.name`,
            defaultMessage: 'Page Builder',
          },
          id: 'settings',
          to: `/settings/${PLUGIN_ID}`,
          Component: async () => {
            const { SettingsPage } = await import('./pages/Settings');
            return SettingsPage;
          },
          licenseOnly: true,
          permissions: [
            {
              action: `plugin::${PLUGIN_ID}.settings.modify`,
              subject: null
            }
          ]
        },
      ]
    )
  }
};
