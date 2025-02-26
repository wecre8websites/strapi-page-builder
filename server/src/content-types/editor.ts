export default {
  kind: 'singleType',
  collectionName: 'editor',
  info: {
    name: 'editor',
    singularName: 'editor',
    pluralName: 'editors',
    displayName: 'Page Builder Settings',
    description: '',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
    i18n: {
      localized: false,
    },
  },
  attributes: {
    apiKey: {
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
      type: 'string',
      unique: false,
      required: false,
      maxLength: 100,
      visible: true,
      searchable: true,
      sortable: true,
      configurable: true,
    },
    defaultContentType: {
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
      type: 'string',
      unique: false,
      required: false,
      maxLength: 100,
      visible: true,
      searchable: true,
      sortable: true,
      configurable: true,
    },
    defaultContentId: {
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
      type: 'string',
      unique: false,
      required: false,
      maxLength: 100,
      visible: true,
      searchable: true,
      sortable: true,
      configurable: true,
    },
  }
}
