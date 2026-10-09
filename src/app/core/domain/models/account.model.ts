import { IconRef } from './category.model';

export interface Account {
  id: string;
  label: string;
  icon: IconRef;
  color: string;
  group: string;
}
