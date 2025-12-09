import { Box, Button, Combobox, ComboboxOption, DesignSystemProvider, Dialog, Field, Flex, Grid, IconButton, JSONInput, Link, Loader, Main, Modal, SingleSelect, SingleSelectOption, Switch, TextInput, Typography, darkTheme, lightTheme } from '@strapi/design-system';
import { Code, CrossCircle, Question, Search, WarningCircle } from '@strapi/icons';
import { Page, useFetchClient, useRBAC } from '@strapi/strapi/admin';
import debounce from 'lodash.debounce';
import { ArrowLeft, ArrowRight, File, FileAudio, FileImage, FileVideo, Package, Save } from 'lucide-react';
import { ChangeEvent, FC, JSX, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GetEditorDataResponse from '../../../shared/types/GetEditorDataResponse';
import SaveTemplateRequest from "../../../shared/types/SaveTemplateRequest";
import SimplifiedContentType from '../../../shared/types/SimplifiedContentType';
import StrapiImageResponse from '../../../shared/types/StrapiImageResponse';
import useTranslation from '../hooks/useTranslation';
import LeftSidebar from '../icons/LeftSidebar';
import Redo from '../icons/Redo';
import RightSidebar from '../icons/RightSidebar';
import Undo from '../icons/Undo';
import { PLUGIN_ID } from '../pluginId';

/**
 * 
 * Order of operations:
 * 1 Create Message Listeners
 * 2 Get Editor Data
 * 3 Polulate Nav
 * 4 Wait for CHILD_READY message
 * 5 Send Editor Data to iFrame
 * 
 */

enum ParentMessageType {
  POPULATE = 'populate',
  SAVE_REQUESTED = 'save_requested',
  UNDO_REQUESTED = 'undo_requested',
  REDO_REQUESTED = 'redo_requested',
  TOGGLE_LEFT_REQUESTED = 'toggle_left_requested',
  TOGGLE_RIGHT_REQUESTED = 'toggle_right_requested',
  RETURN_MEDIA = "return_media",
  RETURN_CONTENT = "return_content"
}

interface ParentMessageEvent {
  type: ParentMessageType;
  data: { [key: string]: any };
}

enum ChildMessageType {
  CHILD_READY = 'child_ready',
  SAVE_TEMPLATE = 'save_template',
  TEMPLATE_DIRTY = 'template_dirty',
  REQUEST_MEDIA = "request_media",
  REQUEST_CONTENT = "request_content"
}

interface ChildMessageEvent {
  type: ChildMessageType;
  data: { [key: string]: any };
}

type ModalType = "contentJson" | null;
type DialogType = "contentTypes" | "unsavedChanges" | "licenceError" | "createNewTemplate" | null;

enum MediaType {
  AUDIO = "audio",
  FILE = "file",
  IMAGE = "image",
  VIDEO = "video",
  ALL = "all"
}

const defaultTemplateId = "___default";
const defaultTemplateJson = { content: [], root: {}, zones: {} };

const sendIframeMessage = (iframe: HTMLIFrameElement, message: ParentMessageEvent) => {
  if (!iframe) return;
  iframe?.contentWindow?.postMessage(message, '*');
}

const HomePageInner = () => {
  const isDarkMode = window.localStorage?.STRAPI_THEME === "dark";
  const [availableLocales, setAvailableLocales] = useState<GetEditorDataResponse["locales"]>([]);
  const { contentType, templateId, contentId, locale } = useMemo(() => {
    const searchParams = new URLSearchParams(window.location?.search)
    // if (!availableLocales || availableLocales.length === 0) return { contentType: null, templateId: null, contentId: null, locale: null, availableLocales: null };
    const contentType = searchParams.get('_contentType') ?? undefined;
    const templateId = searchParams.get('_templateId') ?? undefined;
    // if (templateId !== "" && templateId !== null && templateId !== "i4504elrenii3m63c08eb8zp") {
    //   throw new Error("Invalid template ID - useMemo searchParams");
    // }
    const contentId = searchParams.get('_contentId') ?? undefined;
    const locale = searchParams.get('_locale') || availableLocales?.find(l => l.isDefault)?.code || undefined;
    return { contentType, templateId, contentId, locale, availableLocales };
  }, [window?.location?.search]);

  const { t } = useTranslation();
  const { allowedActions, isLoading, error: rbacError } = useRBAC([
    { action: `plugin::${PLUGIN_ID}.editor.read`, subject: null },
    { action: `plugin::${PLUGIN_ID}.editor.edit`, subject: null },
    { action: `plugin::${PLUGIN_ID}.editor.modify`, subject: null },
  ])

  const permissions = useMemo(() => ({
    read: allowedActions.canRead,
    edit: allowedActions.canEdit,
    modify: allowedActions.canModify,
  }), [allowedActions])

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string>("");
  const [childReady, setChildReady] = useState<boolean>(false);
  const [licenceToken, setLicenceToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [enforceTemplateShape, setEnforceTemplateShape] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentTypes, setContentTypes] = useState<SimplifiedContentType[]>([]);
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState<{ target: string, value?: string, type: MediaType } | null>(null);
  const [modalMessage, setModalMessage] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<DialogType>();
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const dialogAcceptAction = useRef<() => void>(() => { });

  const [devMode, setDevMode] = useState<boolean>(window.localStorage.getItem("STRAPI_PAGEBUILDER_DEV_MODE") === "1" ? true : false);
  const [devProtocol, setDevProtocol] = useState<"http" | "https">(window.localStorage.getItem("STRAPI_PAGEBUILDER_DEV_PROTOCOL") === "https" ? "https" : "http");
  const [devHost, setDevHost] = useState<"localhost" | "127.0.0.1">(window.localStorage.getItem("STRAPI_PAGEBUILDER_DEV_HOST") === "127.0.0.1" ? "127.0.0.1" : "localhost");
  const [devPort, setDevPort] = useState<number | undefined>(window.localStorage.getItem("STRAPI_PAGEBUILDER_DEV_PORT") ? parseInt(window.localStorage?.STRAPI_PAGEBUILDER_DEV_PORT) : 3000);
  const [devPath, setDevPath] = useState<string | undefined>(window.localStorage.getItem("STRAPI_PAGEBUILDER_DEV_PATH") || "/editor");
  const devUrl = useMemo(() => `${devProtocol}://${devHost}${devPort ? `:${devPort}` : ""}${devPath ? devPath : ""}`, [devProtocol, devHost, devPort, devPath]);
  useEffect(() => {
    if (devMode) window.localStorage.setItem("STRAPI_PAGEBUILDER_DEV_MODE", "1")
    else {
      window.localStorage.removeItem("STRAPI_PAGEBUILDER_DEV_MODE");
      return
    }
    if (devProtocol === "https") window.localStorage.setItem("STRAPI_PAGEBUILDER_DEV_PROTOCOL", "https");
    else window.localStorage.removeItem("STRAPI_PAGEBUILDER_DEV_PROTOCOL")
    if (devHost === "127.0.0.1") window.localStorage.setItem("STRAPI_PAGEBUILDER_DEV_HOST", "127.0.0.1");
    else window.localStorage.removeItem("STRAPI_PAGEBUILDER_DEV_HOST")
    if (devPort) window.localStorage.setItem("STRAPI_PAGEBUILDER_DEV_PORT", devPort?.toString())
    else window.localStorage.setremoveItemItem("STRAPI_PAGEBUILDER_DEV_PORT");
    if (devPath) window.localStorage.setItem("STRAPI_PAGEBUILDER_DEV_PATH", devPath)
    else window.localStorage.setremoveItemItem("STRAPI_PAGEBUILDER_DEV_PATH");
  }, [devMode, devProtocol, devHost, devPort, devPath])

  //Use for Nav
  // const [contentType, setContentType] = useState(contentType ?? "");
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


  // const [locale, setLocale] = useState<string | undefined>(locale ?? undefined);
  const isDefaultLocale = useMemo(() => locale && (availableLocales || [])?.find(l => l.isDefault)?.code === locale, [locale, availableLocales])
  // const [templateId, setTemplateId] = useState<string>(templateId ?? "___default");
  // const [contentId, setContentId] = useState<string | undefined>(contentId ?? undefined);
  const tokenUrl = useMemo(() => {
    if (!url || !licenceToken) return '';
    let updatedUrl = new URL(url);
    updatedUrl.searchParams.set('_pagebuilderToken', licenceToken);
    if (contentType) updatedUrl.searchParams.set('_contentType', contentType);
    if (templateId) updatedUrl.searchParams.set('_templateId', templateId);
    if (contentId) updatedUrl.searchParams.set('_contentId', contentId);
    if (locale) updatedUrl.searchParams.set('_locale', locale);
    return updatedUrl.toString();
  }, [url, licenceToken, contentId, contentType, templateId]);

  const devTokenUrl = useMemo(() => {
    if (!devUrl || !licenceToken) return '';
    let updatedUrl = new URL(devUrl);
    updatedUrl.searchParams.set('_pagebuilderToken', licenceToken);
    if (contentType) updatedUrl.searchParams.set('_contentType', contentType);
    if (templateId) updatedUrl.searchParams.set('_templateId', templateId);
    if (contentId) updatedUrl.searchParams.set('_contentId', contentId);
    if (locale) updatedUrl.searchParams.set('_locale', locale);
    return updatedUrl.toString();
  }, [devUrl, licenceToken, contentId, contentType, templateId]);


  //Send to Iframe
  const [templateJson, setTemplateJson] = useState<{ [key: string]: any }>({});
  const [contentData, setContentData] = useState<{ [key: string]: any }>({});

  //Receive from Iframe
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [hasUndo, setHasUndo] = useState<boolean>(false);
  const [hasRedo, setHasRedo] = useState<boolean>(false);

  //For template creation
  const [templateName, setTemplateName] = useState<string>("___default");
  const [duplicateId, setDuplicateId] = useState<string>("");

  const { post, put, get } = useFetchClient();

  const searchContentType = useCallback(async (searchQuery?: string, titleField?: string) => {
    const { data } = await post<{ documentId: string; title: any; }[]>(`/${PLUGIN_ID}/editor/content/${contentType}`, { searchQuery, titleField, locale });
    return data
  }, [locale, contentType]);

  const searchForTemplate = useCallback(async (searchQuery?: string) => {
    const { data } = await post<{ documentId: string; shortName: any; }[]>(`/${PLUGIN_ID}/editor/content/${contentType}/templates`, { searchQuery, locale });
    return data
  }, [locale, contentType]);

  const getEditorData = useCallback(async (data?: { contentType?: string, templateId?: string, contentId?: string, locale?: string, searchQuery?: string }) => {
    // if (data?.templateId !== "" && data?.templateId !== null && data?.templateId !== "i4504elrenii3m63c08eb8zp") throw new Error("Invalid template ID - getEditorData function - function params");

    const { data: editorData } = await post(`/${PLUGIN_ID}/editor`, data) as { data: GetEditorDataResponse };
    if (editorData?.errors.licenceError) {
      setError(editorData.errors.licenceError)
      return
    }
    if (editorData.token) setLicenceToken(editorData.token);
    setEnforceTemplateShape(editorData.enforceTemplateShape ?? true);
    if (editorData.url) setUrl(editorData.url);
    if (editorData.locales) {
      setAvailableLocales(editorData.locales);
      // setLocale(locale => locale || locales.find(l => l.isDefault)?.code || locales[0].code);
    }
    if (editorData.contentTypes) setContentTypes(editorData.contentTypes);
    // if (contentType) setContentType(contentType);
    // if (templateId) setTemplateId(templateId);
    // else setTemplateId(defaultTemplateId);
    // if (contentData?.documentId) setContentId(contentData?.documentId);
    // else setContentId(contentDocuments[0]?.documentId || "");
    if (editorData.contentData) setContentData(editorData.contentData);
    if (editorData.templateJson) setTemplateJson(editorData.templateJson);
    else setTemplateJson(defaultTemplateJson);
    if (editorData.templateDocuments) setAvailableTemplates(editorData.templateDocuments);
    else setAvailableTemplates([]);
    if (editorData.contentDocuments) setAvailableContent(editorData.contentDocuments);
    else setAvailableContent([]);
    const windowUrl = new URL(window.location?.href);
    let contentChanged = false;
    if (!locale && editorData.locales?.length > 0) {
      const defaultLocale = editorData.locales.find(l => l.isDefault)?.code || editorData.locales[0].code;
      windowUrl.searchParams.set('_locale', defaultLocale);
      contentChanged = true;
    }
    if (editorData.contentType && editorData.contentType !== data?.contentType) {
      windowUrl.searchParams.set('_contentType', editorData.contentType);
      contentChanged = true
    }
    if (editorData.templateId && editorData.templateId !== data?.templateId) {
      windowUrl.searchParams.set('_templateId', editorData.templateId);
      contentChanged = true
    }
    if (editorData.contentId && editorData.contentId !== data?.contentId) {
      windowUrl.searchParams.set('_contentId', editorData.contentId);
      contentChanged = true
    }

    if (contentChanged) {
      // window.location.href = windowUrl.toString();
      window.history.replaceState({}, 'Page Builder', windowUrl.toString());
    } else {
      setLoading(false);
    }
  }, [window.location?.href]);

  const requestUndo = useCallback(() => {
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.UNDO_REQUESTED, data: {} });
  }, []);

  const requestRedo = useCallback(() => {
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.REDO_REQUESTED, data: {} });
  }, []);

  const requestToggleLeftSidebar = useCallback(() => {
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.TOGGLE_LEFT_REQUESTED, data: {} });
  }, []);

  const requestToggleRightSidebar = useCallback(() => {
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.TOGGLE_RIGHT_REQUESTED, data: {} });
  }, []);

  const requestSave = useCallback(() => {
    // if (isDemo) return;
    setSaving(true);
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.SAVE_REQUESTED, data: {} });
    // }, [isDemo])
  }, [])


  // useEffect(() => {
  //   if (!templateJson || !childReady) return
  //   iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.POPULATE, data: { templateJson, contentData, isDefaultLocale } });
  // }, [contentData, templateJson, childReady])

  const handleChange = useCallback(async ({ target, value }: { target: "contentType" | "templateId" | "contentId" | "locale", value: string }) => {
    setChildReady(false);
    const searchParams = new URLSearchParams(window.location?.search)
    const windowUrl = new URL(window.location.href);

    switch (target) {
      case "contentType":
        // setContentType(value);
        windowUrl.searchParams.set('_contentType', value);
        windowUrl.searchParams.delete('_templateId');
        windowUrl.searchParams.delete('_contentId');
        // await getEditorData({ contentType: value, locale });
        break;
      case "templateId":
        // setTemplateId(value);
        windowUrl.searchParams.set('_templateId', value);
        windowUrl.searchParams.delete('_contentId');
        // await getEditorData({ contentType, templateId: value, locale });
        break;
      case "contentId":
        // setContentId(value);
        windowUrl.searchParams.set('_contentId', value);
        // await getEditorData({ contentType, templateId, contentId: value, locale, searchQuery: debouncedSearchQuery });
        break;
      case "locale":
        // setLocale(value);
        windowUrl.searchParams.set('_locale', value);
        // await getEditorData({ contentType, templateId, contentId, locale: value, searchQuery: debouncedSearchQuery });
        break;
    }
    if (searchParams.toString() !== windowUrl.searchParams.toString()) {

      // window.location.href = newUrl.toString();
      window.history.replaceState({}, 'Page Builder', windowUrl.toString());

    }
  }, [contentType, templateId, contentId, locale, debouncedContentSearchQuery, availableContent])

  const confirmChange = useCallback(async (callback: () => any) => {
    if (isDirty) {
      dialogAcceptAction.current = () => setTimeout(callback, 100);
      openDialog("unsavedChanges");
    } else {
      callback();
    }
  }, [isDirty])

  const handleCreateTemplate = useCallback(async (isDefault: boolean = false) => {
    try {
      const { data: result } = await post(`/${PLUGIN_ID}/editor/templates`, { contentType, templateName: isDefault ? "Default" : templateName?.trim(), duplicateId, locale } as SaveTemplateRequest);
      const { templateId, templateJson, templateDocuments } = result;
      const windowUrl = new URL(window.location.href);

      if (templateId) windowUrl.searchParams.set('_templateId', templateId);
      // if (templateJson) setTemplateJson(templateJson);
      // if (templateDocuments) setAvailableTemplates(templateDocuments);
      // setDuplicateId("");
      // setTemplateName("___default");
      // setIsDirty(false);
    } catch (error) {
      console.error(`[Page Builder] Error creating template`, (error as Error).message);
    }
  }, [contentType, templateName, duplicateId, locale])

  const handleSave = useCallback(async (data: any) => {
    // if (isDemo) return;
    const { templateJson, config } = data;
    if (!allowedActions.canEdit && !allowedActions.canModify) {
      console.error(`[Page Builder] Error saving page: insufficient permissions`);
      return
    }
    if (!templateId) {
      console.error(`[Page Builder] Error saving page: templateId is required`);
      return
    };
    try {
      if (templateId === "___default") {
        return await handleCreateTemplate(true);
      }
      const { data: result } = await put(`/${PLUGIN_ID}/editor/templates/${templateId}`, { templateJson, config, locale } as SaveTemplateRequest);
      const { templateId: savedTemplateId, templateJson: savedTemplateJson, templateDocuments } = result;
      const windowUrl = new URL(window.location.href);

      if (savedTemplateId !== templateId) {
        windowUrl.searchParams.set('_templateId', savedTemplateId);
        // window.location.href = windowUrl.toString();
        window.history.replaceState({}, 'Page Builder', windowUrl.toString());
      } else {
        if (savedTemplateJson) setTemplateJson(savedTemplateJson);
        if (templateDocuments) setAvailableTemplates(templateDocuments);
        setIsDirty(false);
      }
    } catch (error) {
      console.error(`[Page Builder] Error saving page`, (error as Error).message);
      return
    } finally {
      setSaving(false);
    }
  }, [allowedActions, templateId, handleCreateTemplate, locale, /*isDemo*/]);

  const openModal = useCallback((type: ModalType, message: string = "") => {
    setModalOpen(type);
    setModalMessage(message);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(null);
    setModalMessage("");
  }, []);

  const openMediaModal = useCallback((data: { target: string, value?: string, type: MediaType }) => {
    setMediaModalOpen(data);
  }, []);

  const closeModalMedia = useCallback(() => {
    setMediaModalOpen(null);
  }, []);

  const openDialog = useCallback((type: DialogType, message: string = "") => {
    setDialogOpen(type);
    setDialogMessage(message);
  }, []);
  const closeDialog = useCallback(() => {
    setDialogOpen(null);
    setDialogMessage("");
    // dialogAcceptAction.current = () => { };
  }, []);

  const handlePopulate = useCallback(() => {
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.POPULATE, data: { contentId, templateJson, contentData, isDefaultLocale, permissions, locale, enforceTemplateShape, darkMode: isDarkMode } });
    setTimeout(() => { setChildReady(true) }, 300);
  }, [permissions, templateJson, contentId, contentData, isDefaultLocale, locale, enforceTemplateShape, isDarkMode])

  const handleRequestContent = useCallback(async (target: string, contentType: string, searchQuery?: string, titleField?: string) => {
    if (!iframeRef.current) return;
    const { data } = await post(`/${PLUGIN_ID}/editor/content/${contentType}`, { searchQuery, locale, titleField });
    sendIframeMessage(iframeRef.current, { type: ParentMessageType.RETURN_CONTENT, data: { target, content: data } });
  }, [locale])

  useEffect(() => {
    const messageHandler = (event: MessageEvent<ChildMessageEvent>) => {
      const message = event.data;
      switch (message.type) {
        case ChildMessageType.CHILD_READY: {
          handlePopulate();
          break;
        }
        case ChildMessageType.TEMPLATE_DIRTY: {
          setIsDirty(message.data.undo && message.data.dirty);
          setHasUndo(message.data.undo);
          setHasRedo(message.data.redo);
          break;
        }
        case ChildMessageType.SAVE_TEMPLATE: {
          handleSave(message.data);
          break;
        }
        case ChildMessageType.REQUEST_MEDIA: {
          openMediaModal(message.data as { target: string, value?: string, type: MediaType });
          break;
        }
        case ChildMessageType.REQUEST_CONTENT: {
          const { target, contentType, searchQuery, titleField } = message.data;
          handleRequestContent(target, contentType, searchQuery, titleField);
          break;
        }
      }
    };
    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
      // iframeRef.current && iframeRef.current.addEventListener('load', loadListener);
    }
  }, [handleSave, handlePopulate]);

  useEffect(() => {
    if (isLoading) return;
    getEditorData({ contentType, templateId, contentId, locale });
  }, [contentType, templateId, contentId, locale, isLoading]);

  if (isLoading) return <Page.Loading />
  if (rbacError) return <Page.Error />;
  // if (!allowedActions.canRead && !allowedActions.canEdit && !allowedActions.canModify) return <Page.NoPermissions />

  return (
    <Main>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: isDarkMode ? "#212134" : "#f5f5f5" }}>
        <Flex direction="row" alignItems="center" justifyContent="space-between" paddingTop={1} paddingBottom={1} paddingLeft={2} paddingRight={3}>
          <Flex direction="row" alignItems="center" gap={0}>
            <IconButton label={t("editor.header.toggle_components")} onClick={requestToggleLeftSidebar} variant="ghost"><LeftSidebar style={!isDarkMode ? { fill: "#ffffff" } : undefined} /></IconButton>
            <IconButton label={t("editor.header.toggle_settings")} onClick={requestToggleRightSidebar} variant="ghost"><RightSidebar style={!isDarkMode ? { fill: "#ffffff" } : undefined} /></IconButton>
          </Flex>
          <Flex direction="row" alignItems="center" justifyContent="center" gap={4}>
            <Field.Root name="contentType">
              <Field.Label style={isDarkMode ? { color: "#c0c0cf" } : {}}>
                <Flex direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ width: "100%" }}>
                  {t("editor.header.content_type")}
                  <IconButton onClick={() => openDialog("contentTypes")} label={<span>{t("editor.header.content_type_info")} <span onClick={() => setDialogOpen("contentTypes")} style={{ textDecoration: "underline", cursor: "pointer" }}>{t("editor.header.learn_more")}.</span></span>} variant="ghost" size={6}><Question height={12} style={{ fill: "#202020" }} /></IconButton>
                </Flex>
              </Field.Label>
              <SingleSelect style={isDarkMode ? { backgroundColor: "#444", color: "#c0c0cf" } : {}} size="S" placeholder={t("editor.header.select_content_type")} value={contentType || ""} onChange={(value: string) => confirmChange(() => handleChange({ target: "contentType", value }))}>
                {(contentTypes || []).map((contentType) => (<SingleSelectOption key={contentType.uid} value={contentType.uid}>{contentType.displayName}</SingleSelectOption>))}
              </SingleSelect>
            </Field.Root>
            <Field.Root name="contentType">
              <Field.Label style={isDarkMode ? { color: "#c0c0cf" } : {}}>
                {t("editor.header.template")}
              </Field.Label>
              {/*<SingleSelect size="S" placeholder={t("editor.header.select_template")} value={!templateId ? "___default" : templateId} onChange={(value: string) => {
                if (value === "___new") confirmChange(() => openDialog("createNewTemplate"))
                else confirmChange(() => handleChange({ target: "templateId", value }))
              }}>
                {availableTemplates.length === 0 ? <SingleSelectOption value="___default">{t("editor.header.default")}</SingleSelectOption> : null}
                {(availableTemplates || []).map((template) => (<SingleSelectOption key={template.documentId} value={template.documentId}>{template.shortName}</SingleSelectOption>))}
                <hr />
                <SingleSelectOption value="___new">{t("editor.header.create_new")}</SingleSelectOption>
              </SingleSelect>*/}
              <Combobox
                autocomplete="none"
                onTextValueChange={(value: string) => searchTemplates(value)}
                textValue={templateSearchQuery || availableTemplates?.find(t => t.documentId === templateId)?.shortName || ""}
                defaultTextValue={availableTemplates?.find(t => t.documentId === templateId)?.shortName || ""}
                onChange={(value: string) => {
                  if (value === "___new") confirmChange(() => openDialog("createNewTemplate"))
                  else confirmChange(() => {
                    setTemplateSearchQuery("")
                    setDebouncedTemplateSearchQuery("")
                    handleChange({ target: "templateId", value })
                  })
                }}
                value={templateId || ""}
                placeholder={t("editor.header.search_template")}
                // createDisabled={true}
                size="S"
                onClear={() => {
                  setTemplateSearchQuery("");
                  setDebouncedTemplateSearchQuery("")
                }}>
                {availableTemplates?.map(template => (<ComboboxOption key={template.documentId} value={template.documentId} textValue={template.shortName} selected={template.documentId === templateId}
                  style={isDarkMode ? { color: "#fff" } : undefined}
                >{template.shortName}</ComboboxOption>))}
                <ComboboxOption key="___new" value="___new" textValue={t("editor.header.create_new")}
                  style={isDarkMode ? { color: "#fff" } : undefined}
                >{t("editor.header.create_new")}</ComboboxOption>
              </Combobox>
            </Field.Root>
            <Field.Root name="contentType">
              <Field.Label style={isDarkMode ? { color: "#c0c0cf" } : {}}>
                <Flex direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ width: "100%" }}>
                  {t("editor.header.preview_content")}
                  <IconButton onClick={() => openModal("contentJson", JSON.stringify(contentData || {}, null, 2))} label={t("editor.header.show_content_data")} variant="ghost" size={6}><Code height={12} /></IconButton>
                </Flex>
              </Field.Label>
              <Combobox
                autocomplete="none"
                onTextValueChange={(value: string) => searchContent(value)}
                textValue={contentSearchQuery || availableContent?.find(c => c.documentId === contentId)?.title || ""}
                defaultTextValue={availableContent?.find(c => c.documentId === contentId)?.title || ""}
                onChange={(value: string) => confirmChange(() => {
                  setContentSearchQuery("")
                  setDebouncedContentSearchQuery("")
                  handleChange({ target: "contentId", value })
                })}
                value={contentId || ""}
                placeholder={t("editor.header.search_content")}
                // createDisabled={true}
                size="S"
                onClear={() => {
                  setContentSearchQuery("");
                  setDebouncedContentSearchQuery("")
                }}>
                {availableContent?.map(content => (<ComboboxOption key={content.documentId} value={content.documentId} textValue={content.title} selected={content.documentId === contentId}
                  style={isDarkMode ? { color: "#fff" } : undefined}
                >{content.title}</ComboboxOption>))}
              </Combobox>
              {/* <SingleSelect size="S" placeholder={t("editor.header.select_content")} value={contentId || ""} onChange={(value: string) => confirmChange(() => handleChange({ target: "contentId", value }))}>
                {(availableContent || []).map((content) => (<SingleSelectOption key={content.documentId} value={content.documentId}>{content.title}</SingleSelectOption>))}
              </SingleSelect> */}
            </Field.Root>
            <Field.Root name="contentType">
              <Field.Label style={isDarkMode ? { color: "#fff" } : {}}>
                {t("editor.header.locale")}
              </Field.Label>
              <SingleSelect style={isDarkMode ? { backgroundColor: "#444", color: "#fff" } : {}} size="S" placeholder={t("editor.header.select_locale")} value={locale || ""} onChange={(value: string) => confirmChange(() => handleChange({ target: "locale", value }))}>
                {(availableLocales || []).map((locale) => (<SingleSelectOption key={locale.code} value={locale.code}>{locale.name}</SingleSelectOption>))}
              </SingleSelect>
            </Field.Root>
            <Box paddingTop={2.5} paddingBottom={2.5}>
              <Field.Root name="contentType">
                <Switch visibleLabels checked={devMode} offLabel={t("editor.header.dev")} onLabel={t("editor.header.dev")} onCheckedChange={(checked: boolean) => { setDevMode(checked); }} />
              </Field.Root>
            </Box>          </Flex>
          <Flex direction="row" alignItems="end" gap={4}>
            {devMode
              ? <Flex direction="row" alignItems="center" gap={1}>
                <Field.Root name="contentType">
                  <Field.Label style={isDarkMode ? { color: "#fff" } : {}}>
                    {t("editor.header.protocol")}
                  </Field.Label>
                  <SingleSelect style={isDarkMode ? { backgroundColor: "#444", color: "#fff" } : {}} size="S" placeholder={t("editor.header.protocol")} value={devProtocol} onChange={(value: "http" | "https") => confirmChange(() => setDevProtocol(value))}>
                    <SingleSelectOption value={"http"}>http</SingleSelectOption>
                    <SingleSelectOption value={"https"}>https</SingleSelectOption>
                  </SingleSelect>
                </Field.Root>
                <Field.Root name="contentType">
                  <Field.Label style={isDarkMode ? { color: "#fff" } : {}}>
                    {t("editor.header.host")}
                  </Field.Label>
                  <SingleSelect style={isDarkMode ? { backgroundColor: "#444", color: "#fff" } : {}} size="S" placeholder={t("editor.header.host")} value={devHost} onChange={(value: "localhost" | "127.0.0.1") => confirmChange(() => setDevHost(value))}>
                    <SingleSelectOption value={"localhost"}>localhost</SingleSelectOption>
                    <SingleSelectOption value={"127.0.0.1"}>127.0.0.1</SingleSelectOption>
                  </SingleSelect>
                </Field.Root>
                <Field.Root name="contentType">
                  <Field.Label style={isDarkMode ? { color: "#fff" } : {}}>
                    {t("editor.header.port")}
                  </Field.Label>
                  <TextInput
                    size="S"
                    type="number"
                    value={devPort || ""}
                    placeholder={t("editor.header.port")}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => confirmChange(() => setDevPort(e.target.value ? parseInt(e.target.value, 10) : undefined))}
                    style={isDarkMode ? { backgroundColor: "#444", color: "#fff" } : {}}
                  />
                </Field.Root>
                <Field.Root name="contentType">
                  <Field.Label style={isDarkMode ? { color: "#fff" } : {}}>
                    {t("editor.header.path")}
                  </Field.Label>
                  <TextInput
                    size="S"
                    type="text"
                    value={devPath || ""}
                    placeholder={t("editor.header.path")}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => confirmChange(() => setDevPath(e.target.value || undefined))}
                    style={isDarkMode ? { backgroundColor: "#444", color: "#fff" } : {}}
                  />
                </Field.Root>
              </Flex>
              : null}
            <Flex direction="row" alignItems="end" gap={0}>
              <IconButton label={t("editor.header.undo")} onClick={requestUndo} variant="ghost"><Undo enabled={hasUndo} /></IconButton>
              <IconButton label={t("editor.header.redo")} onClick={requestRedo} variant="ghost"><Redo enabled={hasRedo} /></IconButton>
            </Flex>
            <Button
              variant={'default'}
              loading={loading}
              endIcon={<Save size={16} />}
              onClick={requestSave}
              disabled={loading || saving || !isDirty || (!allowedActions.canEdit && !allowedActions.canModify)}
            >
              {t("editor.header.save")}
            </Button>
          </Flex>
        </Flex>
        <div style={{ width: "100%", height: "100%", flexGrow: 1, position: "relative", display: "flex" }}>
          <div style={{ width: "100%", height: "100%", flexGrow: 1, position: "absolute", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#32324d33", transition: "opacity", opacity: (childReady ? 0 : 1), pointerEvents: (childReady ? "none" : "all"), cursor: (childReady ? "default" : "wait") }}>
            {error ? <div>{error}</div> : <Loader />}
          </div>
          {!!(devMode ? devTokenUrl : tokenUrl) ? <iframe ref={iframeRef} src={devMode ? devTokenUrl : tokenUrl} style={{ width: "100%", height: "100%", borderWidth: 0, flexGrow: 1 }} /> : null}
        </div>
      </div>

      <Modal.Root open={!!modalOpen} onOpenChange={closeModal}>
        <ModalContent content={modalOpen} message={modalMessage} />
      </Modal.Root>
      <MediaSelectModal
        open={!!mediaModalOpen}
        onClose={closeModalMedia}
        target={mediaModalOpen?.target || ""}
        src={mediaModalOpen?.value}
        type={mediaModalOpen?.type || MediaType.ALL}
        onAccept={(target, src) => {
          iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.RETURN_MEDIA, data: { target, src } });
          closeModalMedia();
        }} />
      <SimpleDialog
        open={dialogOpen === "unsavedChanges"}
        onClose={closeDialog}
        header={t("editor.modals.unsaved_changes.header")}
        icon={<WarningCircle fill="danger600" />}
        body={<Typography variant="omega">{t("editor.modals.unsaved_changes.body")}</Typography>}
        hasCancel
        cancelMessage={t("editor.modals.unsaved_changes.cancel")}
        hasAccept
        acceptMessage={t("editor.modals.unsaved_changes.accept")}
        acceptVariant='danger-light'
        onAccept={dialogAcceptAction.current}
      />
      <SimpleDialog
        open={dialogOpen === "contentTypes"}
        onClose={closeDialog}
        header={t("editor.modals.content_types.header")}
        icon={<Question fill="primary600" />}
        body={<><Typography variant="omega">
          <p>{t("editor.modals.content_types.body")}</p>
          <p>{t("editor.modals.content_types.learn_more")} <Link href={t("editor.modals.content_types.learn_more_link")} target="_blank" rel="noopener">{t("editor.modals.content_types.learn_more_link_label")}</Link>.</p>
        </Typography></>}
        hasCancel={false}
        hasAccept
        acceptMessage={t("editor.modals.content_types.accept")}
        acceptVariant='default'
        onAccept={closeDialog}
      />
      <Dialog.Root open={dialogOpen === "createNewTemplate"} onOpenChange={closeDialog}>
        <Dialog.Content style={isDarkMode ? { background: "#242439" } : undefined}>
          <>
            <Dialog.Header style={isDarkMode ? { background: "#181826" } : undefined}>{t("editor.modals.template.header")}</Dialog.Header>
            <Dialog.Body>
              <div style={{ width: "100%" }}>
                <Flex direction="column" gap={4} style={{ width: "100%" }}>
                  <Typography variant="omega">
                    <p>{t("editor.modals.template.body", { content_type: contentTypes.find(ct => ct.uid === contentType)?.displayName || "" })}</p>
                  </Typography>
                  <Field.Root name="templateName" style={{ width: "100%" }} error={(availableTemplates || []).some(template => template.shortName.toLowerCase() === templateName.toLowerCase()) ? "Template name already exists" : undefined}>
                    <Field.Label>
                      {t("editor.modals.template.template_name")}
                    </Field.Label>
                    <TextInput
                      type="text"
                      value={templateName === "___default" ? "" : templateName}
                      placeholder={t("editor.modals.template.template_name_placeholder")}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value)}
                      error={(availableTemplates || []).some(template => template.shortName.toLowerCase() === templateName.toLowerCase())}
                    />
                    <Field.Error message={t("editor.modals.template.template_name_already_exists")}>
                      {t("editor.modals.template.template_name_already_exists")}
                    </Field.Error>
                    <Field.Hint>
                      {t("editor.modals.template.template_name_already_exists")}
                    </Field.Hint>
                  </Field.Root>
                  <Field.Root name="duplicateId" style={{ width: "100%" }}>
                    <Field.Label>
                      {t("editor.modals.template.duplicate_existing")}
                    </Field.Label>
                    <SingleSelect placeholder={t("editor.modals.template.available_templates")} value={duplicateId || "none"} onChange={(value: string) => setDuplicateId(value === "none" ? "" : value)}>
                      <SingleSelectOption value="none">{t("editor.modals.template.blank")}</SingleSelectOption>
                      {(availableTemplates || []).map((template) => (<SingleSelectOption key={template.documentId} value={template.documentId}>{template.shortName}</SingleSelectOption>))}
                    </SingleSelect>
                  </Field.Root>
                </Flex>
              </div>
            </Dialog.Body>
            <Dialog.Footer style={isDarkMode ? { background: "#181826" } : undefined}>
              <Dialog.Cancel>
                <Button variant="tertiary" onClick={() => setTemplateName("___default")}>{t("editor.modals.template.cancel")}</Button>
              </Dialog.Cancel>
              <Dialog.Action>
                <Button variant="default" onClick={() => handleCreateTemplate()} disabled={!templateName?.trim() || (availableTemplates || []).some(template => template.shortName.toLowerCase() === templateName.toLowerCase())}>{t("editor.modals.template.accept")}</Button>
              </Dialog.Action>
            </Dialog.Footer>
          </>
        </Dialog.Content>
      </Dialog.Root>
    </Main >
  );
};

const SimpleDialog: FC<{ open: boolean, onClose: () => void, onAccept: () => void, header?: string, icon?: JSX.Element, body: ReactNode, hasCancel?: boolean, cancelMessage?: string, acceptMessage?: string, hasAccept?: boolean, acceptVariant?: string }> = ({
  open,
  onClose,
  onAccept,
  header,
  icon,
  body,
  hasCancel = true,
  cancelMessage = "Cancel",
  hasAccept = true,
  acceptMessage = "Accept",
  acceptVariant = "default"
}) => {
  const isDarkMode = window.localStorage?.STRAPI_THEME === "dark";
  return <Dialog.Root open={open} onOpenChange={onClose}>
    <Dialog.Content style={isDarkMode ? { background: "#242439" } : undefined}>
      {header ? <Dialog.Header style={isDarkMode ? { background: "#181826" } : undefined}>{header}</Dialog.Header> : null}
      {body ? <Dialog.Body icon={icon}>{body}</Dialog.Body> : null}
      <Dialog.Footer style={isDarkMode ? { background: "#181826" } : undefined}>
        {hasCancel
          ? <>
            {!hasAccept ? <span /> : null}
            <Dialog.Cancel>
              <Button fullWidth variant={hasAccept ? "tertiary" : "default"}>
                {cancelMessage}
              </Button>
            </Dialog.Cancel>
          </>
          : null}
        {hasAccept && onAccept
          ? <Dialog.Action>
            <Button fullWidth variant={acceptVariant} onClick={onAccept}>
              {acceptMessage}
            </Button>
          </Dialog.Action>
          : null}
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
}

const MediaSelectModal: FC<{
  open: boolean,
  target: string,
  src?: string,
  type: MediaType,
  onClose: () => void,
  onAccept: (target: string, src: string) => void
}> = ({ open, target, src, type, onClose, onAccept }) => {
  const isDarkMode = window.localStorage?.STRAPI_THEME === "dark";
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const debounceSearch = useCallback(debounce(query => setDebouncedSearchQuery(query), 1000), [setDebouncedSearchQuery])
  const search = useCallback((query: string) => {
    setLoading(true);
    setSearchQuery(query);
    debounceSearch(query);
  }, [debounceSearch]);

  const filter = useMemo(() => {
    switch (type) {
      case MediaType.AUDIO: return "&filters[$and][0][mime][$contains]=audio";
      case MediaType.FILE: return "&filters[$and][0][mime][$not][$contains][[0]]=image&filters[$and][0][mime][$not][$contains][[1]]=video";
      case MediaType.IMAGE: return "&filters[$and][0][mime][$contains]=image";
      case MediaType.VIDEO: return "&filters[$and][0][mime][$contains]=video";
      default: return "";
    }
  }, [type])
  const { get } = useFetchClient();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<StrapiImageResponse["results"]>([]);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(src || null);
  const [pagination, setPagination] = useState<StrapiImageResponse["pagination"]>({
    page: 0,
    pageSize: 0,
    pageCount: 0,
    total: 0
  })
  const requestMedia = useCallback(async (page: number, query?: string) => {
    const { data } = await get(`/upload/files?pageSize=12&sort=createdAt:DESC${filter}&page=${page}${query ? `&_q=${encodeURIComponent(query)}` : ""}`);
    const { results, pagination } = data as StrapiImageResponse
    setImages(results || []);
    setPagination(pagination);
    setLoading(false);
  }, [filter]);

  const nextPage = useCallback(() => {
    if (page < pagination.pageCount) setPage(page + 1);
  }, [pagination])

  const prevPage = useCallback(() => {
    if (page > 1) setPage(page - 1);
  }, [pagination])

  const goToPage = useCallback((page: number) => {
    if (page > 0 && page <= pagination.pageCount) setPage(page);
  }, [])

  useEffect(() => {
    requestMedia(page, debouncedSearchQuery);
  }, [page, debouncedSearchQuery, requestMedia])

  return <Modal.Root open={open} onOpenChange={onClose}>
    <Modal.Content style={isDarkMode ? { background: "#242439" } : undefined}>
      <Modal.Header style={isDarkMode ? { background: "#181826" } : undefined}>
        <Modal.Title>{t("editor.modals.media.header")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Grid.Root gap={4}>
          <Grid.Item xs={12} style={{ minWidth: "100%" }}>
            <Field.Root>
              <Field.Input
                value={searchQuery || ""}
                onstyle={{ marginBottom: "16px" }}
                startAction={<Search />}
                onChange={(e: ChangeEvent<HTMLInputElement>) => search(e.target.value)}
                endAction={searchQuery ? <IconButton variant="ghost" onClick={() => { search("") }}><CrossCircle /></IconButton> : null}
              />
            </Field.Root>
          </Grid.Item>
          {!images.length && !loading ? <Grid.Item xs={12} style={{ minWidth: "100%", textAlign: "center" }}>{t("editor.modals.media.no_results")}</Grid.Item> : null}
          {!!loading
            ? <Grid.Item xs={12} style={{ minWidth: "100%", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center" }}><Loader /></Grid.Item>
            : images.map(i => {
              const smallestImage = Object.values(i.formats || {}).sort((a, b) => a.size - b.size)[0];
              return (<Grid.Item key={i.documentId} xs={4} style={{ minWidth: "100%" }}>
                <button style={{ minWidth: "100%", width: "100%", height: "100%", border: i.url === selectedImageSrc ? "3px solid #4945ff" : "1px solid #dcdcdc", borderRadius: "5px", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={() => setSelectedImageSrc(i.url)}>
                  <div style={{ minWidth: "100%", width: "100%", height: "100%", background: "repeating-conic-gradient(#f6f6f9 0% 25%, transparent 0% 50%) 50%/20px 20px" }}>
                    {smallestImage ? <div style={{ minWidth: "100%", width: "100%", height: "100px", minHeight: "100px", maxHeight: "100px", backgroundImage: `url(${smallestImage?.url || i.url})`, backgroundPosition: "center", backgroundSize: "contain", backgroundRepeat: "no-repeat" }} /> : null}
                  </div>
                  <Flex gap={1} padding={2} paddingBottom={3} style={{ borderTop: "1px solid #dcdcdc", textAlign: "left", whiteSpace: "nowrap", width: "100%", maxWidth: "100%" }}>
                    {i.mime?.includes("image") ? <FileImage stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                    {i.mime?.includes("video") ? <FileVideo stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                    {i.mime?.includes("audio") ? <FileAudio stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                    {i.mime?.includes("text") ? <File stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                    {!i.mime?.includes("image") && !i.mime?.includes("video") && !i.mime?.includes("audio") && !i.mime?.includes("text") ? <Package stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                    <Typography variant="omega" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexGrow: 0 }}>
                      {i.name}
                    </Typography>
                  </Flex>
                </button>
              </Grid.Item>
              )
            })}
        </Grid.Root>
      </Modal.Body>
      <Modal.Footer style={isDarkMode ? { background: "#181826" } : undefined}>
        <Modal.Close>
          <Button variant="tertiary">{t("editor.modals.media.cancel")}</Button>
        </Modal.Close>
        <Flex gap={2}>
          <Button variant="secondary" disabled={(pagination?.page || 0) <= 1} onClick={prevPage}><ArrowLeft /></Button>
          <Button variant="secondary" disabled={(pagination?.page || 0) >= pagination?.pageCount} onClick={nextPage}><ArrowRight /></Button>
        </Flex>
        <Button variant="default" disabled={!selectedImageSrc} onClick={() => { selectedImageSrc && onAccept(target, selectedImageSrc) }}>{t("editor.modals.media.accept")}</Button>
      </Modal.Footer>
    </Modal.Content >
  </Modal.Root >
}

const ModalContent: FC<{ content: string | null, message?: string }> = ({ content, message }) => {
  const { t } = useTranslation();
  const isDarkMode = window.localStorage?.STRAPI_THEME === "dark";

  switch (content) {
    case "contentJson": return <Modal.Content style={isDarkMode ? { background: "#242439" } : undefined}>
      <Modal.Header style={isDarkMode ? { background: "#181826" } : undefined}>
        <Modal.Title>{t("editor.modals.content.header")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Typography variant="omega" paddingBottom={4}>
            <p>{t("editor.modals.content.body")}</p>
            <p>{t("editor.modals.content.learn_more")} <Link href={t("editor.modals.content.learn_more_link")} target="_blank" rel="noopener">{t("editor.modals.content.learn_more_link_label")}</Link>.</p>
          </Typography>
          <JSONInput value={message} disabled={true} style={{ maxHeight: "50vh" }} />
        </div>
      </Modal.Body>
      <Modal.Footer style={isDarkMode ? { background: "#181826" } : undefined}>
        <span />
        <Modal.Close>
          <Button variant="tertiary">{t("editor.modals.content.accept")}</Button>
        </Modal.Close>
      </Modal.Footer>
    </Modal.Content>
    default: return <div>{message}</div>
  }
}

function HomePage() {
  const isDarkMode = useMemo(() => window?.localStorage?.STRAPI_THEME === "dark", [window?.localStorage?.STRAPI_THEME]);

  return <DesignSystemProvider theme={isDarkMode ? darkTheme : lightTheme}>
    <HomePageInner />
  </DesignSystemProvider>
}

export { HomePage };
