import { dot } from 'dot-object'
const prefixPluginTranslations = (trad: Record<string, string>, pluginId?: string) => {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty")
  }
  const dotted = dot(trad)
  return Object.entries(dotted).reduce(
    (acc, [key, value]) => {
      acc[`${pluginId}.${key}`] = value as string
      return acc
    },
    {} as Record<string, string>
  )
}

export { prefixPluginTranslations }
