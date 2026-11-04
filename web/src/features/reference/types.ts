export type ReferenceControl = {
  key: string;
  kind: string;
  label: string;
  initial: string;
  classes: string;
  checked: boolean;
  disabled: boolean;
  multiline: boolean;
  select: boolean;
  placeholder?: boolean;
  icon?: boolean;
};
export type ReferenceNode =
  | string
  | {
      tag: string;
      key: string;
      attrs: Record<string, string>;
      style: Record<string, string>;
      control?: ReferenceControl;
      children: ReferenceNode[];
    };
export type ReferenceBlueprint = {
  id: string;
  title: string;
  kind: string;
  tree: ReferenceNode;
  controls: ReferenceControl[];
  width: number;
  height: number;
};
