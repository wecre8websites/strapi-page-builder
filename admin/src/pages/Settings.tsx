import { Box, Button, DesignSystemProvider, Field, Flex, Grid, LinkButton, SingleSelect, SingleSelectOption, Tooltip, Typography } from '@strapi/design-system';
import { ArrowClockwise, Check, Cross, ExternalLink } from '@strapi/icons';
import {
  Layouts,
  Page,
  useAuth,
  useFetchClient
} from '@strapi/strapi/admin';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import SimplifiedContentType from '../../../shared/types/SimplifiedContentType';
import useTranslation from '../hooks/useTranslation';
import Logo from '../icons/Logo';
import { PLUGIN_ID } from '../pluginId';

const SIGN_UP_URL = "https://pagebuilder.wc8.io?utm_source=strapi_plugin"


const styles = {
  terminal: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "10px",
    paddingLeft: "20px",
    width: "100%",
    borderRadius: "5px",
    fontFamily: '"Lucida Console", "Courier New", monospace',
    fontSize: "1.6rem",
    lineHeight: "1.5",
    display: "flex",
    alignItems: "center",
    gap: 5
  },
  darkmode: {
    backgroundColor: "#000",
    color: "#fff"
  }
}

const TerminalCommand: FC<{ command: string }> = ({ command }) => {
  const isDarkMode = window.localStorage.getItem('STRAPI_THEME') === 'dark';
  return <div style={{ ...styles.terminal, ...(isDarkMode ? styles.darkmode : {}) }}>
    {/* <span>&gt;</span> */}
    <span>{command}</span>
  </div>
}

const SettingsPage = () => {
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
  const [availableContent, setAvailableContent] = useState<{ documentId: string, title: string }[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  const saveSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSaved(false);
      const { data } = await post(`/${PLUGIN_ID}/settings`, {
        apiKey,
        url: previewUrl || undefined,
        defaultContentType,
        defaultContentId
      });
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.url) setPreviewUrl(data.url);
        if (data.defaultContentType) setDefaultContentType(defaultContentType);
        if (data.defaultContentId) setDefaultContentId(defaultContentId);
        setSaved(true);
      }
    } catch (error) {
      console.error("[saveSettings]", error);
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, previewUrl, defaultContentType, defaultContentId]);

  const getSettings = useCallback(async () => {
    try {
      const { data } = await get(`/${PLUGIN_ID}/settings`);
      const { apiKey, url, defaultContentType, defaultContentId } = data;
      if (apiKey) setApiKey(apiKey);
      if (url) setPreviewUrl(url);
      if (defaultContentType) setDefaultContentType(defaultContentType);
      if (defaultContentId) setDefaultContentId(defaultContentId);
    } catch (error) {
      console.error("[getSettings]", error);
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
  }, [defaultContentType])

  const permissions = useAuth('Settings', (state) => state.permissions);
  const settingsPermission = useMemo(() => !!permissions.find(p => p.action === `plugin::${PLUGIN_ID}.settings.modify`), [permissions])

  if (!settingsPermission) return <Page.NoPermissions />

  return (
    <DesignSystemProvider>
      <Layouts.Header
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
        <Box padding={6} paddingLeft={8} paddingRight={8} shadow="filterShadow" background="neutral0" marginBottom={6}>
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
                        {contentTypes.map((contentType) => (<SingleSelectOption key={contentType.uid} value={contentType.uid}>{contentType.globalId}</SingleSelectOption>))}
                      </SingleSelect>
                    </Field.Root>
                  </Box>
                  <Box paddingRight={6}>
                    <Field.Root name="contentId" style={{ flexGrow: 1 }}>
                      <Field.Label>
                        {t("settings.card.default_content")}
                      </Field.Label>
                      <SingleSelect style={{ flexGrow: 1 }} loading={contentLoading} disabled={!defaultContentType} value={defaultContentId} onChange={(e: string) => setDefaultContentId(e)}>
                        {availableContent.map((content) => (<SingleSelectOption key={content.documentId} value={content.documentId}>{content.title}</SingleSelectOption>))}
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
    </DesignSystemProvider>
  );
};

export { SettingsPage };
