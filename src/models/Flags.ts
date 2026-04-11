export type Flags = {
  repos: string[];
  interval: number;
  notify: boolean;
  mentioned: boolean;
  labels?: string[];
  reviewed: boolean;
  hideChecks: boolean;
  showLabels: boolean;
  debug: boolean;
};
