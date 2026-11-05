export type Story = {
  id: string;
  template: string;
  title: string[];
  value: string;
  unit: string;
  caption: string;
  health: boolean;
  promotional: boolean;
  chapterId: string;
  chart?: any;
  [key: string]: any;
};
export type Presentation = {
  version: 1;
  generation: string;
  year: number;
  exampleOnly: boolean;
  notice: string;
  stories: Story[];
};
export type ExportRequest = {
  version: 1;
  generation: string;
  id: string;
  requestId: string;
  colorway: string;
  card: any;
};
export type ExportPacket = {
  version: 1;
  generation: string;
  id: string;
  requestId: string;
  index: number;
  data: string;
  final: boolean;
};
