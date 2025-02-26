export default {
  kind: 'collectionType',
  collectionName: 'templates',
  info: {
    name: 'template',
    singularName: 'template',
    pluralName: 'templates',
    displayName: 'Template',
    description: 'Page builder templates',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': {
      visible: true,
    },
    'content-type-builder': {
      visible: true,
    },
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
      type: 'string',
      unique: true,
      required: true,
      maxLength: 100,
      visible: true,
      searchable: true,
      sortable: true,
      configurable: true,
    },
    shortName: {
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
      type: 'string',
      required: true,
      maxLength: 100,
      visible: true,
      searchable: true,
      sortable: true,
      configurable: true,
    },
    contentType: {
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
      type: 'string',
      required: true,
      maxLength: 100,
      visible: true,
      searchable: true,
      sortable: true,
      configurable: true,
    },
    json: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'json',
      required: true,
      visible: true,
      searchable: true,
      sortable: true,
      configurable: true,
    },
  }
}
