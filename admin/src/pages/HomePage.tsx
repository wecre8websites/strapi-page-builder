import { Button, DesignSystemProvider, Dialog, Field, Flex, Grid, IconButton, JSONInput, Link, Loader, Main, Modal, SingleSelect, SingleSelectOption, TextInput, Typography } from '@strapi/design-system';
import { Code, PaperPlane, Question, WarningCircle } from '@strapi/icons';
import { useAuth, useFetchClient } from '@strapi/strapi/admin';
import { File, FileAudio, FileImage, FileVideo, Package } from 'lucide-react';
import { ChangeEvent, FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
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

const HomePage = () => {
  const { formatMessage } = useIntl();
  const { t } = useTranslation();

  const permissions = useAuth('HomePage', (state) => state.permissions);
  const editorPermissions = useMemo(() => ({
    read: !!permissions.find(p => p.action === `plugin::${PLUGIN_ID}.editor.read`),
    edit: !!permissions.find(p => p.action === `plugin::${PLUGIN_ID}.editor.edit`),
    modify: !!permissions.find(p => p.action === `plugin::${PLUGIN_ID}.editor.modify`),
  }), [permissions])
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [childReady, setChildReady] = useState<boolean>(false);
  const [licenceToken, setLicenceToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentTypes, setContentTypes] = useState<SimplifiedContentType[]>([]);
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState<{ target: string, value?: string, type: MediaType } | null>(null);
  const [modalMessage, setModalMessage] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<DialogType>();
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const dialogAcceptAction = useRef<() => void>(() => { });

  //Use for Nav
  const [contentType, setContentType] = useState("");
  const [availableLocales, setAvailableLocales] = useState<GetEditorDataResponse["locales"]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<GetEditorDataResponse["templateDocuments"]>([]);
  const [availableContent, setAvailableContent] = useState<GetEditorDataResponse["contentDocuments"]>([]);
  const [locale, setLocale] = useState<string | undefined>();
  const isDefaultLocale = useMemo(() => locale && (availableLocales || [])?.find(l => l.isDefault)?.code === locale, [locale, availableLocales])
  const [templateId, setTemplateId] = useState<string>("___default");
  const [contentId, setContentId] = useState<string>();
  const tokenUrl = useMemo(() => {
    if (!url || !licenceToken) return '';
    const updatedUrl = new URL(url);
    const queryParams = updatedUrl.searchParams;
    queryParams.set('_pagebuilderToken', licenceToken);
    return updatedUrl.toString();
  }, [url, licenceToken]);

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

  const getEditorData = useCallback(async (data?: { contentType?: string, templateId?: string, contentId?: string, locale?: string }) => {
    const { data: editorData } = await post(`/${PLUGIN_ID}/editor`, data) as { data: GetEditorDataResponse };
    const { token, url, locales, contentTypes, contentType, contentId, contentData, templateId, templateJson, templateDocuments, contentDocuments, errors } = editorData
    if (errors.licenceError) {
      setError(errors.licenceError)
      return
    }
    if (token) setLicenceToken(token);
    if (url) setUrl(url);
    if (locales) {
      setAvailableLocales(locales);
      setLocale(locale => locale || locales.find(l => l.isDefault)?.code || locales[0].code);
    }
    if (contentTypes) setContentTypes(contentTypes);
    if (contentType) setContentType(contentType);
    if (contentId) setContentId(contentId);
    else setContentId(contentDocuments[0]?.documentId || "");
    if (templateId) setTemplateId(templateId);
    else setTemplateId(defaultTemplateId);
    if (contentData) setContentData(contentData);
    if (templateJson) setTemplateJson(templateJson);
    else setTemplateJson(defaultTemplateJson);
    if (templateDocuments) setAvailableTemplates(templateDocuments);
    else setAvailableTemplates([]);
    if (contentDocuments) setAvailableContent(contentDocuments);
    else setAvailableContent([]);
    setLoading(false);
  }, []);

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
    setSaving(true);
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.SAVE_REQUESTED, data: {} });
  }, [])


  // useEffect(() => {
  //   if (!templateJson || !childReady) return
  //   iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.POPULATE, data: { templateJson, contentData, isDefaultLocale } });
  // }, [contentData, templateJson, childReady])

  const handleChange = useCallback(async ({ target, value }: { target: "contentType" | "templateId" | "contentId" | "locale", value: string }) => {
    setChildReady(false);
    switch (target) {
      case "contentType":
        setContentType(value);
        await getEditorData({ contentType: value, locale });
        break;
      case "templateId":
        setTemplateId(value);
        await getEditorData({ contentType, templateId: value, locale });
        break;
      case "contentId":
        setContentId(value);
        await getEditorData({ contentType, templateId, contentId: value, locale });
        break;
      case "locale":
        setLocale(value);
        await getEditorData({ contentType, templateId, contentId, locale: value });
        break;
    }
  }, [contentType, templateId, contentId, locale,])

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
      const { data: result } = await post(`/${PLUGIN_ID}/editor/templates`, { contentType, templateName: isDefault ? "Default" : templateName, duplicateId, locale } as SaveTemplateRequest);
      const { templateId, templateJson, templateDocuments } = result;
      if (templateId) setTemplateId(templateId);
      if (templateJson) setTemplateJson(templateJson);
      if (templateDocuments) setAvailableTemplates(templateDocuments);
      setDuplicateId("");
      setTemplateName("___default");
      setIsDirty(false);
    } catch (error) {
      console.error(`[Page Builder] Error creating template`, (error as Error).message);
    }
  }, [contentType, templateName, duplicateId, locale])

  const handleSave = useCallback(async (data: any) => {
    const { templateJson } = data;
    if (!editorPermissions.edit && !editorPermissions.modify) {
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
      const { data: result } = await put(`/${PLUGIN_ID}/editor/templates/${templateId}`, { templateJson, locale } as SaveTemplateRequest);
      const { templateId: savedTemplateId, templateJson: savedTemplateJson, templateDocuments } = result;
      if (savedTemplateId) setTemplateId(savedTemplateId);
      if (savedTemplateJson) setTemplateJson(savedTemplateJson);
      if (templateDocuments) setAvailableTemplates(templateDocuments);
      setIsDirty(false);
    } catch (error) {
      console.error(`[Page Builder] Error saving page`, (error as Error).message);
      return
    } finally {
      setSaving(false);
    }
  }, [editorPermissions, templateId, handleCreateTemplate, locale]);

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
    iframeRef.current && sendIframeMessage(iframeRef.current, { type: ParentMessageType.POPULATE, data: { templateJson, contentData, isDefaultLocale, permissions: editorPermissions } });
    setTimeout(() => { setChildReady(true) }, 300);
  }, [editorPermissions, templateJson, contentData, isDefaultLocale])

  const handleRequestContent = useCallback(async (target: string, contentType: string, searchQuery?: string) => {
    if (!iframeRef.current) return;
    const { data } = await post(`/${PLUGIN_ID}/editor/content/${contentType}`, { searchQuery, locale });
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
          setIsDirty(message.data.dirty);
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
          const { target, contentType, searchQuery } = message.data;
          handleRequestContent(target, contentType, searchQuery);
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
    getEditorData();
  }, [])

  return (
    <Main>
      <DesignSystemProvider>
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <Flex direction="row" alignItems="center" justifyContent="space-between" paddingTop={2} paddingBottom={4} paddingLeft={2} paddingRight={3}>
            <Flex direction="row" alignItems="center" gap={0}>
              <IconButton label={t("editor.header.toggle_components")} onClick={requestToggleLeftSidebar} variant="ghost"><LeftSidebar style={{ fill: "#ffffff" }} /></IconButton>
              <IconButton label={t("editor.header.toggle_settings")} onClick={requestToggleRightSidebar} variant="ghost"><RightSidebar style={{ fill: "#ffffff" }} /></IconButton>
            </Flex>
            <Flex direction="row" alignItems="center" justifyContent="center" gap={4}>
              <Field.Root name="contentType">
                <Field.Label>
                  <Flex direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ width: "100%" }}>
                    {t("editor.header.content_type")}
                    <IconButton onClick={() => openDialog("contentTypes")} label={<span>{t("editor.header.content_type_info")} <span onClick={() => setDialogOpen("contentTypes")} style={{ textDecoration: "underline", cursor: "pointer" }}>{t("editor.header.learn_more")}.</span></span>} variant="ghost" size={6}><Question style={{ fill: "##202020" }} /></IconButton>
                  </Flex>
                </Field.Label>
                <SingleSelect placeholder={t("editor.header.select_content_type")} value={contentType || ""} onChange={(value: string) => confirmChange(() => handleChange({ target: "contentType", value }))}>
                  {(contentTypes || []).map((contentType) => (<SingleSelectOption key={contentType.uid} value={contentType.uid}>{contentType.globalId}</SingleSelectOption>))}
                </SingleSelect>
              </Field.Root>
              <Field.Root name="contentType">
                <Field.Label>
                  {t("editor.header.template")}
                </Field.Label>
                <SingleSelect placeholder={t("editor.header.select_template")} value={!templateId ? "___default" : templateId} onChange={(value: string) => {
                  if (value === "___new") confirmChange(() => openDialog("createNewTemplate"))
                  else confirmChange(() => handleChange({ target: "templateId", value }))
                }}>
                  {availableTemplates.length === 0 ? <SingleSelectOption value="___default">{t("editor.header.default")}</SingleSelectOption> : null}
                  {(availableTemplates || []).map((template) => (<SingleSelectOption key={template.documentId} value={template.documentId}>{template.shortName}</SingleSelectOption>))}
                  <hr />
                  <SingleSelectOption value="___new">{t("editor.header.create_new")}</SingleSelectOption>
                </SingleSelect>
              </Field.Root>
              <Field.Root name="contentType">
                <Field.Label>
                  <Flex direction="row" alignItems="center" justifyContent="space-between" gap={2} style={{ width: "100%" }}>
                    {t("editor.header.preview_content")}
                    <IconButton onClick={() => openModal("contentJson", JSON.stringify(contentData || {}, null, 2))} label={t("editor.header.show_content_data")} variant="ghost" size={6}><Code /></IconButton>
                  </Flex>
                </Field.Label>
                <SingleSelect placeholder={t("editor.header.select_content")} value={contentId || ""} onChange={(value: string) => confirmChange(() => handleChange({ target: "contentId", value }))}>
                  {(availableContent || []).map((content) => (<SingleSelectOption key={content.documentId} value={content.documentId}>{content.title}</SingleSelectOption>))}
                </SingleSelect>
              </Field.Root>
              <Field.Root name="contentType">
                <Field.Label>
                  {t("editor.header.locale")}
                </Field.Label>
                <SingleSelect placeholder={t("editor.header.select_locale")} value={locale || ""} onChange={(value: string) => confirmChange(() => handleChange({ target: "locale", value }))}>
                  {(availableLocales || []).map((locale) => (<SingleSelectOption key={locale.code} value={locale.code}>{locale.name}</SingleSelectOption>))}
                </SingleSelect>
              </Field.Root>

            </Flex>
            <Flex direction="row" alignItems="end" gap={4}>
              <Flex direction="row" alignItems="end" gap={0}>
                <IconButton label={t("editor.header.undo")} onClick={requestUndo} variant="ghost"><Undo enabled={hasUndo} /></IconButton>
                <IconButton label={t("editor.header.redo")} onClick={requestRedo} variant="ghost"><Redo enabled={hasRedo} /></IconButton>
              </Flex>
              <Button
                variant={'default'}
                loading={loading}
                endIcon={<PaperPlane />}
                onClick={requestSave}
                disabled={loading || saving || !isDirty || (!editorPermissions.edit && !editorPermissions.modify)}
              >
                {t("editor.header.save")}
              </Button>
            </Flex>
          </Flex>
          <div style={{ width: "100%", height: "100%", flexGrow: 1, position: "relative", display: "flex" }}>
            <div style={{ width: "100%", height: "100%", flexGrow: 1, position: "absolute", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#32324d33", transition: "opacity", opacity: (childReady ? 0 : 1), pointerEvents: (childReady ? "none" : "all"), cursor: (childReady ? "default" : "wait") }}>
              {error ? <div>{error}</div> : <Loader />}
            </div>
            {tokenUrl ? <iframe ref={iframeRef} src={tokenUrl} style={{ width: "100%", height: "100%", borderWidth: 0, flexGrow: 1 }} /> : null}
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
          <Dialog.Content>
            <>
              <Dialog.Header>{t("editor.modals.template.header")}</Dialog.Header>
              <Dialog.Body>
                <div style={{ width: "100%" }}>
                  <Flex direction="column" gap={4} style={{ width: "100%" }}>
                    <Typography variant="omega">
                      <p>{t("editor.modals.template.body", { content_type: contentTypes.find(ct => ct.uid === contentType)?.globalId || "" })}</p>
                    </Typography>
                    <Field.Root name="templateName" style={{ width: "100%" }} error={(availableTemplates || []).some(template => template.shortName.toLowerCase() === templateName.toLowerCase()) ? "Template name already exists" : undefined}>
                      <Field.Label>
                        {t("editor.modals.template.template_name")}
                      </Field.Label>
                      <TextInput
                        type="text"
                        value={templateName === "___default" ? "" : templateName}
                        placeholder={t("editor.modals.template.template_name_placeholder")}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value.trim())}
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
              <Dialog.Footer>
                <Dialog.Cancel>
                  <Button variant="tertiary" onClick={() => setTemplateName("___default")}>{t("editor.modals.template.cancel")}</Button>
                </Dialog.Cancel>
                <Dialog.Action>
                  <Button variant="default" onClick={() => handleCreateTemplate()} disabled={!templateName || (availableTemplates || []).some(template => template.shortName.toLowerCase() === templateName.toLowerCase())}>{t("editor.modals.template.accept")}</Button>
                </Dialog.Action>
              </Dialog.Footer>
            </>
          </Dialog.Content>
        </Dialog.Root>
      </DesignSystemProvider>
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
  return <Dialog.Root open={open} onOpenChange={onClose}>
    <Dialog.Content>
      {header ? <Dialog.Header>{header}</Dialog.Header> : null}
      {body ? <Dialog.Body icon={icon}>{body}</Dialog.Body> : null}
      <Dialog.Footer>
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
  const { t } = useTranslation();
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
  const [page, setPage] = useState<number>(1);
  const [images, setImages] = useState<StrapiImageResponse["results"]>([]);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(src || null);
  const [pagination, setPagination] = useState<StrapiImageResponse["pagination"]>({
    page: 0,
    pageSize: 0,
    pageCount: 0,
    total: 0
  })
  const requestMedia = useCallback(async (page: number) => {
    const { data } = await get(`/upload/files?pageSize=12&sort=createdAt:DESC${filter}&page=${page}`)
    const { results, pagination } = data as StrapiImageResponse
    setImages(results || []);
    setPagination(pagination);
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
    requestMedia(page);
  }, [page, requestMedia])

  return <Modal.Root open={open} onOpenChange={onClose}>
    <Modal.Content>
      <Modal.Header>
        <Modal.Title>{t("editor.modals.media.header")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Grid.Root gap={4}>
          {images.map(i => {
            const smallestImage = Object.values(i.formats || {}).sort((a, b) => a.size - b.size)[0];
            return (<Grid.Item key={i.documentId} xs={4} style={{ minWidth: "100%" }}>
              <button style={{ minWidth: "100%", width: "100%", height: "100%", border: i.url === selectedImageSrc ? "3px solid #4945ff" : "1px solid #dcdcdc", borderRadius: "5px", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={() => setSelectedImageSrc(i.url)}>
                <div style={{ minWidth: "100%", width: "100%", height: "100%", background: "repeating-conic-gradient(#f6f6f9 0% 25%, transparent 0% 50%) 50%/20px 20px" }}>
                  {smallestImage ? <div style={{ minWidth: "100%", width: "100%", height: "100px", minHeight: "100px", maxHeight: "100px", backgroundImage: `url(${smallestImage?.url || i.url})`, backgroundPosition: "center", backgroundSize: "contain", backgroundRepeat: "no-repeat" }} /> : null}
                </div>
                <Flex gap={1} padding={2} paddingBottom={3} style={{ borderTop: "1px solid #dcdcdc", textAlign: "left", whiteSpace: "nowrap", width: "100%", maxWidth: "100%" }}>
                  {i.mime.includes("image") ? <FileImage stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                  {i.mime.includes("video") ? <FileVideo stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                  {i.mime.includes("audio") ? <FileAudio stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                  {i.mime.includes("text") ? <File stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
                  {!i.mime.includes("image") && !i.mime.includes("video") && !i.mime.includes("audio") && !i.mime.includes("text") ? <Package stroke="#ababab" size={16} style={{ flexShrink: 0 }} /> : null}
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
      <Modal.Footer>
        <Modal.Close>
          <Button variant="tertiary">{t("editor.modals.template.cancel")}</Button>
        </Modal.Close>
        <Button variant="default" disabled={!selectedImageSrc} onClick={() => { selectedImageSrc && onAccept(target, selectedImageSrc) }}>{t("editor.modals.template.accept")}</Button>
      </Modal.Footer>
    </Modal.Content >
  </Modal.Root >
}

const ModalContent: FC<{ content: string | null, message?: string }> = ({ content, message }) => {
  const { t } = useTranslation();
  switch (content) {
    case "contentJson": return <Modal.Content>
      <Modal.Header>
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
      <Modal.Footer>
        <span />
        <Modal.Close>
          <Button variant="tertiary">{t("editor.modals.content.accept")}</Button>
        </Modal.Close>
      </Modal.Footer>
    </Modal.Content>
    default: return <div>{message}</div>
  }

}

export { HomePage };
