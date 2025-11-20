export type ComponentType = 
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'form_field'
  | 'spacer'
  | 'divider'
  | 'card'
  | 'custom_editor'; // Para os editores existentes (FrontEditor, etc)

export interface BaseComponent {
  id: string;
  type: ComponentType;
  order: number;
}

export interface HeadingComponent extends BaseComponent {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  align: 'left' | 'center' | 'right';
  color?: string;
  className?: string;
}

export interface TextComponent extends BaseComponent {
  type: 'text';
  content: string;
  align: 'left' | 'center' | 'right';
  color?: string;
  fontSize?: string;
  className?: string;
}

export interface ImageComponent extends BaseComponent {
  type: 'image';
  src: string;
  alt: string;
  width?: string;
  height?: string;
  align: 'left' | 'center' | 'right';
  className?: string;
}

export interface ButtonComponent extends BaseComponent {
  type: 'button';
  text: string;
  variant: 'default' | 'outline' | 'secondary' | 'ghost';
  size: 'sm' | 'default' | 'lg';
  align: 'left' | 'center' | 'right';
  onClick?: string; // action identifier
  className?: string;
}

export interface FormFieldComponent extends BaseComponent {
  type: 'form_field';
  fieldType: 'text' | 'email' | 'tel' | 'number' | 'select';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select
  dataKey: string; // key to bind to form data
  className?: string;
}

export interface SpacerComponent extends BaseComponent {
  type: 'spacer';
  height: string; // e.g. "20px", "2rem"
}

export interface DividerComponent extends BaseComponent {
  type: 'divider';
  color?: string;
  thickness?: string;
  className?: string;
}

export interface CardComponent extends BaseComponent {
  type: 'card';
  children: PageComponent[];
  className?: string;
}

export interface CustomEditorComponent extends BaseComponent {
  type: 'custom_editor';
  editorType: 'front' | 'back' | 'sleeve_right' | 'sleeve_left';
}

export type PageComponent =
  | HeadingComponent
  | TextComponent
  | ImageComponent
  | ButtonComponent
  | FormFieldComponent
  | SpacerComponent
  | DividerComponent
  | CardComponent
  | CustomEditorComponent;

export interface PageLayout {
  components: PageComponent[];
  backgroundColor?: string;
  containerWidth?: string;
  padding?: string;
}
