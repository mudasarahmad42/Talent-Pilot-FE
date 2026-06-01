import { Notification } from '../models';

export interface NotificationDateGroup {
  key: string;
  label: string;
  items: Notification[];
}
