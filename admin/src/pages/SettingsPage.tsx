import { Box, Button, DesignSystemProvider, Field, Flex, Grid, LinkButton, SingleSelect, SingleSelectOption, Typography, lightTheme, darkTheme } from '@strapi/design-system';
import { Check, Cross, ExternalLink } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useRBAC } from '@strapi/strapi/admin';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SimplifiedContentType from '../../../shared/types/SimplifiedContentType';
import useTranslation from '../hooks/useTranslation';
import Logo from '../icons/Logo';
import { PLUGIN_ID } from '../pluginId';
import { Combobox } from '@strapi/design-system';
import { ComboboxOption } from '@strapi/design-system';
import debounce from 'lodash.debounce';
import GetEditorDataResponse from '../../../shared/types/GetEditorDataResponse';

const SIGN_UP_URL = "https://pagebuilder.wc8.io?utm_source=strapi_plugin"

const SettingsPageInner = () => {
  const isDarkMode = useMemo(() => window?.localStorage?.STRAPI_THEME === "dark", [window?.localStorage?.STRAPI_THEME]);
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("http://localhost:3000/editor");
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const { get, post } = useFetchClient();
  const [contentTypes, setContentTypes] = useState<SimplifiedContentType[]>([]);
  const [defaultContentType, setDefaultContentType] = useState("");
  const [defaultContentId, setDefaultContentId] = useState("");
  const [defaultTemplateId, setDefaultTemplateId] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [enforceTemplateShape, setEnforceTemplateShape] = useState(true);

  const saveSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSaved(false);
      const { data } = await post(`/${PLUGIN_ID}/settings`, {
        apiKey,
        url: previewUrl || undefined,
        defaultContentType,
        defaultTemplateId,
        defaultContentId,
        enforceTemplateShape
      });
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.web_url) setPreviewUrl(data.web_url);
        if (data.defaultContentType) setDefaultContentType(defaultContentType);
        if (data.defaultContentId) setDefaultContentId(defaultContentId);
        setEnforceTemplateShape(data.enforceTemplateShape ?? true);
        setErrorMessage("");
        setSaved(true);
      }
    } catch (error) {
      console.error("[saveSettings]", error);
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, previewUrl, defaultContentType, defaultContentId, enforceTemplateShape]);

  const getSettings = useCallback(async () => {
    try {
      const { data } = await get(`/${PLUGIN_ID}/settings`);
      const { apiKey, web_url, defaultContentType, defaultContentId, enforceTemplateShape } = data;
      if (apiKey) setApiKey(apiKey);
      if (web_url) setPreviewUrl(web_url);
      if (defaultContentType) setDefaultContentType(defaultContentType);
      if (defaultTemplateId) setDefaultTemplateId(defaultTemplateId);
      if (defaultContentId) setDefaultContentId(defaultContentId);
      setEnforceTemplateShape(enforceTemplateShape ?? true);
      setErrorMessage("");
    } catch (error) {
      console.error("[getSettings]", error);
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getContentTypes = async () => {
    try {
      const { data } = await get(`/${PLUGIN_ID}/settings/contentTypes`);
      setContentTypes(data);
      if (data.length > 0) {
        setDefaultContentType(data[0].uid);
      }
    } catch (error) {
      setContentTypes([]);
    }
  };

  const getContentByType = async (contentType: string) => {
    setContentLoading(true);
    try {
      const { data } = await post(`/${PLUGIN_ID}/editor/content/${contentType}`);
      setAvailableContent(data);
      if (data.length > 0) {
        setDefaultContentId(data[0].documentId);
      }
    } catch (error) {
      setAvailableContent([]);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    getSettings();
    getContentTypes();
  }, []);

  useEffect(() => {
    if (!defaultContentType) return;
    getContentByType(defaultContentType);
    searchForTemplate().then(setAvailableTemplates);

  }, [defaultContentType])

  const searchContentType = useCallback(async (searchQuery?: string, titleField?: string) => {
    const { data } = await post<{ documentId: string; title: any; }[]>(`/${PLUGIN_ID}/editor/content/${defaultContentType}`, { searchQuery, titleField });
    return data
  }, [defaultContentType]);

  const searchForTemplate = useCallback(async (searchQuery?: string) => {
    const { data } = await post<{ documentId: string; shortName: any; }[]>(`/${PLUGIN_ID}/editor/content/${defaultContentType}/templates`, { searchQuery });
    return data
  }, [defaultContentType]);

  const [availableTemplates, setAvailableTemplates] = useState<GetEditorDataResponse["templateDocuments"]>([]);
  const [availableContent, setAvailableContent] = useState<GetEditorDataResponse["contentDocuments"]>([]);
  const [contentSearchQuery, setContentSearchQuery] = useState<string | undefined>(undefined);
  const [debouncedContentSearchQuery, setDebouncedContentSearchQuery] = useState<string>("");
  const debouncedContentSearch = useCallback(debounce(query => setDebouncedContentSearchQuery(query), 1000), [setDebouncedContentSearchQuery])
  const searchContent = useCallback((query: string) => {
    setContentSearchQuery(query);
    debouncedContentSearch(query);
  }, [debouncedContentSearch]);

  useEffect(() => {
    searchContentType(debouncedContentSearchQuery ?? undefined).then(setAvailableContent);
  }, [debouncedContentSearchQuery])

  const [templateSearchQuery, setTemplateSearchQuery] = useState<string | undefined>(undefined);
  const [debouncedTemplateSearchQuery, setDebouncedTemplateSearchQuery] = useState<string>("");
  const debouncedTemplateSearch = useCallback(debounce(query => setDebouncedTemplateSearchQuery(query), 1000), [setDebouncedTemplateSearchQuery])
  const searchTemplates = useCallback((query: string) => {
    setTemplateSearchQuery(query);
    debouncedTemplateSearch(query);
  }, [debouncedTemplateSearch]);

  useEffect(() => {
    searchForTemplate(debouncedTemplateSearchQuery ?? undefined).then(setAvailableTemplates);
  }, [debouncedTemplateSearchQuery])


  const { allowedActions, isLoading, error } = useRBAC([{ action: `plugin::${PLUGIN_ID}.settings.modify`, subject: null }])
  // const permissions = useAuth('SettingsPage', (state) => state.permissions);
  // const canModify = useMemo(() => !!permissions.find(p => p.action === `plugin::${PLUGIN_ID}.settings.modify`), [permissions])

  if (isLoading) return <Page.Loading />
  if (error) return <Page.Error />;
  if (!allowedActions.canModify) return <Page.NoPermissions />;

  return (
    <Layouts.Root>
      <Layouts.Header
        style={isDarkMode ? { backgroundColor: "#181826", color: "#fff" } : undefined}
        title={t("settings.header.title")}
        subtitle={t("settings.header.subtitle")}
        primaryAction={(
          <LinkButton
            endIcon={<ExternalLink color="white" />}
            href={SIGN_UP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("settings.header.learn_more")}
          </LinkButton>
        )}
      >

      </Layouts.Header>

      <Layouts.Content>
        {/* <pre>{JSON.stringify(allowedActions || "{}", null, 2)}</pre> */}
        <Box padding={6} paddingLeft={8} paddingRight={8} shadow="filterShadow" background="neutral0" marginBottom={6} style={isDarkMode ? { backgroundColor: "#212134", color: "#fff" } : undefined}>
          <Flex gap={2} direction="row" style={{ alignItems: "center" }}>
            <Logo width={75} height={75} />
            <Flex gap={2} direction="column" style={{ alignItems: "start" }}>
              <Typography variant="beta">{t("settings.card.header")}</Typography>
              <div>
                <Typography variant="omega">
                  {t("settings.card.subheader")}
                </Typography>
              </div>
            </Flex>
          </Flex>
          <Grid.Root gap={0} paddingTop={6}>
            <Grid.Item xs={12}>
              <div style={{ width: "100%" }}>
                <Box paddingTop={2}>
                  <Field.Root name="token" style={{ flexGrow: 1 }}>
                    <Field.Label>
                      {t("settings.card.api_key")}
                    </Field.Label>
                    <Field.Input
                      type="password"
                      value={apiKey}
                      placeholder=""
                      onChange={(e: any) => setApiKey(e.target.value)}
                      endAction={<LinkButton marginRight={0} href={SIGN_UP_URL} target="_blank" rel="noopener" endIcon={<ExternalLink />} variant="ghost">{t("settings.card.no_api_key")}</LinkButton>}
                    />
                  </Field.Root>
                </Box>
                <Box paddingTop={2}>
                  <Field.Root name="token" style={{ flexGrow: 1 }}>
                    <Field.Label>
                      {t("settings.card.editor_url")}
                    </Field.Label>
                    <Field.Input
                      type="text"
                      value={previewUrl}
                      placeholder=""
                      disabled={!apiKey}
                      onChange={(e: any) => setPreviewUrl(e.target.value)}
                    />
                  </Field.Root>
                </Box>
                <Flex paddingTop={2}>
                  <Box paddingRight={6}>
                    <Field.Root name="contentType" style={{ flexGrow: 1 }}>
                      <Field.Label>
                        {t("settings.card.default_content_type")}
                      </Field.Label>
                      <SingleSelect style={{ flexGrow: 1 }} value={defaultContentType} onChange={(e: string) => setDefaultContentType(e)}>
                        {contentTypes.map((contentType) => (<SingleSelectOption key={contentType.uid} value={contentType.uid}>{contentType.displayName}</SingleSelectOption>))}
                      </SingleSelect>
                    </Field.Root>
                  </Box>
                  <Box paddingRight={6}>
                    <Field.Root name="templateId" style={{ flexGrow: 1 }}>
                      <Field.Label>
                        {t("settings.card.default_template")}
                      </Field.Label>
                      <Combobox
                        autocomplete="none"
                        onTextValueChange={(value: string) => searchTemplates(value)}
                        textValue={templateSearchQuery || availableTemplates?.find(t => t.documentId === defaultTemplateId)?.shortName || ""}
                        defaultTextValue={availableTemplates?.find(t => t.documentId === defaultTemplateId)?.shortName || ""}
                        onChange={(value: string) => {
                          setTemplateSearchQuery("")
                          setDebouncedTemplateSearchQuery("")
                          setDefaultTemplateId(value)
                        }}
                        value={defaultTemplateId || ""}
                        placeholder={t("editor.header.search_template")}
                        // createDisabled={true}
                        size="S"
                        onClear={() => {
                          setTemplateSearchQuery("");
                          setDebouncedTemplateSearchQuery("")
                        }}>
                        {availableTemplates?.map(template => (<ComboboxOption key={template.documentId} value={template.documentId} textValue={template.shortName} selected={template.documentId === defaultTemplateId}
                          style={isDarkMode ? { color: "#fff" } : undefined}
                        >{template.shortName}</ComboboxOption>))}
                      </Combobox>
                    </Field.Root>
                  </Box>
                  <Box paddingRight={6}>
                    <Field.Root name="contentId" style={{ flexGrow: 1 }}>
                      <Field.Label>
                        {t("settings.card.default_content")}
                      </Field.Label>
                      {/* <SingleSelect style={{ flexGrow: 1 }} loading={contentLoading} disabled={!defaultContentType} value={defaultContentId} onChange={(e: string) => setDefaultContentId(e)}>
                        {availableContent.map((content) => (<SingleSelectOption key={content.documentId} value={content.documentId}>{content.title}</SingleSelectOption>))}
                      </SingleSelect> */}
                      <Combobox
                        autocomplete="none"
                        onTextValueChange={(value: string) => searchContent(value)}
                        textValue={contentSearchQuery || availableContent?.find(c => c.documentId === defaultContentId)?.title || ""}
                        defaultTextValue={availableContent?.find(c => c.documentId === defaultContentId)?.title || ""}
                        onChange={(value: string) => {
                          setContentSearchQuery("")
                          setDebouncedContentSearchQuery("")
                          setDefaultContentId(value)
                        }}
                        value={defaultContentId || ""}
                        placeholder={t("editor.header.search_content")}
                        // createDisabled={true}
                        size="S"
                        onClear={() => {
                          setContentSearchQuery("");
                          setDebouncedContentSearchQuery("")
                        }}>
                        {availableContent?.map(content => (<ComboboxOption key={content.documentId} value={content.documentId} textValue={content.title} selected={content.documentId === defaultContentId}
                          style={isDarkMode ? { color: "#fff" } : undefined}
                        >{content.title}</ComboboxOption>))}
                      </Combobox>
                    </Field.Root>
                  </Box>
                  <Box paddingRight={6}>
                    <Field.Root name="enforceTemplateShape" style={{ flexGrow: 1 }}>
                      <Field.Label>
                        {t("settings.card.enforce_template_shape")}
                      </Field.Label>
                      <SingleSelect style={{ flexGrow: 1 }} loading={contentLoading} disabled={!defaultContentType} value={enforceTemplateShape} onChange={(e: "true" | "false") => setEnforceTemplateShape(e === "true")}>
                        <SingleSelectOption value={"true"}>True</SingleSelectOption>
                        <SingleSelectOption value={"false"}>False</SingleSelectOption>
                      </SingleSelect>
                    </Field.Root>
                  </Box>
                </Flex>
                <Flex paddingTop={6} direction="column" gap={2} alignItems="start">
                  <Button
                    variant={(saved && 'success-light') || (!!errorMessage && 'danger-light') || 'default'}
                    disabled={!apiKey}
                    loading={loading}
                    endIcon={(saved && (<Check />)) || (!!errorMessage && (<Cross />)) || null}
                    onClick={saveSettings}
                  >
                    Save and check the connection
                  </Button>
                  {errorMessage ? <Typography variant="omega" style={{ color: "rgb(238, 94, 82)" }}>{errorMessage}</Typography> : null}
                </Flex>
              </div>
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Layouts.Content>
    </Layouts.Root>

  );
};

export default function SettingsPage() {
  const isDarkMode = useMemo(() => window?.localStorage?.STRAPI_THEME === "dark", [window?.localStorage?.STRAPI_THEME]);

  return <DesignSystemProvider theme={isDarkMode ? darkTheme : lightTheme}>
    <SettingsPageInner />
  </DesignSystemProvider>
}

// export { SettingsPage };
