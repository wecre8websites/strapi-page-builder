import { ReactElement } from 'react';

export type TemplateComponentType = {
  type: string,
  props: {
    [key: string]: any
  }
}

export type PBTemplateConfig = {
  root: Omit<TemplateComponentType, "type">,
  zones: { [key: string]: TemplateComponentType[] },
  content: TemplateComponentType[]
}

export type PBConfig = {
  root: Omit<ConfigComponentType, "type">,
  components: { [key: string]: ConfigComponentType }
}


export type ConfigComponentType = {
  type: string;
  fields?: {
    [key: string]: Field;
  }
}

type EnforcedField = {
  enforcedHide?: boolean;
  enforcedSync?: boolean;
};

export type Field<Props extends any = any> = EnforcedField & (
  | TextField
  | NumberField
  | TextareaField
  | SelectField
  | RadioField
  | SlotField
  | ArrayField<Props extends { [key: string]: any } ? Props : any>
  | ObjectField<Props extends { [key: string]: any } ? Props : any>
  | ExternalField<Props extends { [key: string]: any } ? Props : any>
  | ExternalFieldWithAdaptor<Props extends { [key: string]: any } ? Props : any>
  | CustomField<Props>
  | MediaField
  | ColorField
  | SliderField
  | RichTextField
  | StrapiField
);

type Metadata = {
  [key: string]: any;
};

type BaseField = {
  label?: string;
  labelIcon?: ReactElement;
  metadata?: Metadata;
  visible?: boolean;
};

type TextField = BaseField & {
  type: "text";
  placeholder?: string;
  contentEditable?: boolean;
};

type NumberField = BaseField & {
  type: "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};
type TextareaField = BaseField & {
  type: "textarea";
  placeholder?: string;
  contentEditable?: boolean;
};

type FieldOption = {
  label: string;
  value: string | number | boolean | undefined | null | object;
};
type FieldOptions = Array<FieldOption> | ReadonlyArray<FieldOption>;

type SelectField = BaseField & {
  type: "select";
  options: FieldOptions;
};
type RadioField = BaseField & {
  type: "radio";
  options: FieldOptions;
};
type SlotField = BaseField & {
  type: "slot";
  allow?: string[];
  disallow?: string[];
};
type ArrayField<
  Props extends { [key: string]: any } = { [key: string]: any }
> = BaseField & {
  type: "array";
  arrayFields: {
    [SubPropName in keyof Props[0]]: Field<Props[0][SubPropName]>;
  };
  defaultItemProps?: Props[0];
  getItemSummary?: (item: Props[0], index?: number) => string;
  max?: number;
  min?: number;
};
type ObjectField<
  Props extends { [key: string]: any } = { [key: string]: any }
> = BaseField & {
  type: "object";
  objectFields: Props extends any[]
  ? never
  : {
    [SubPropName in keyof Props]: Field<Props[SubPropName]>;
  };
};

type NotUndefined<T> = T extends undefined ? never : T;

type ExternalField<Props extends any = {
  [key: string]: any;
}> = BaseField & {
  type: "external";
  placeholder?: string;
  fetchList: (params: {
    query: string;
    filters: Record<string, any>;
  }) => Promise<any[] | null>;
  mapProp?: (value: any) => Props;
  mapRow?: (value: any) => Record<string, string | number | ReactElement>;
  getItemSummary?: (item: NotUndefined<Props>, index?: number) => string;
  showSearch?: boolean;
  renderFooter?: (props: {
    items: any[];
  }) => ReactElement;
  initialQuery?: string;
  filterFields?: Record<string, Field>;
  initialFilters?: Record<string, any>;
};
type Adaptor<AdaptorParams = {}, TableShape extends Record<string, any> = {}, PropShape = TableShape> = {
  name: string;
  fetchList: (adaptorParams?: AdaptorParams) => Promise<TableShape[] | null>;
  mapProp?: (value: TableShape) => PropShape;
};
type ExternalFieldWithAdaptor<Props extends any = {
  [key: string]: any;
}> = BaseField & {
  type: "external";
  placeholder?: string;
  adaptor: Adaptor<any, any, Props>;
  adaptorParams?: object;
  getItemSummary: (item: NotUndefined<Props>, index?: number) => string;
};
type CustomField<Value extends any> = BaseField & {
  type: "custom";
  render: CustomFieldRender<Value>;
  contentEditable?: boolean;
};
type CustomFieldRender<Value extends any> = (props: {
  field: CustomField<Value>;
  name: string;
  id: string;
  value: Value;
  onChange: (value: Value) => void;
  readOnly?: boolean;
}) => ReactElement;
type MediaField = BaseField & {
  type: "media";
  mediaType: "audio" | "file" | "image" | "video" | "all";
};
type ColorField = BaseField & {
  type: "color";
}
type SliderField = BaseField & {
  type: "slider";
  min?: number;
  max?: number;
  step?: number;
};
type RichTextField = BaseField & {
  type: "richtext";
}
type StrapiField = BaseField & {
  type: "strapi";
  contentType: string;
  populate?: string | string[]; //LHS Bracket Notation
  titleField?: string;
}