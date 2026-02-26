export default {
  createChannel: jest.fn().mockResolvedValue('channel-id'),
  displayNotification: jest.fn().mockResolvedValue('notification-id'),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  getNotificationSettings: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  createTriggerNotification: jest.fn().mockResolvedValue('trigger-id'),
};

export const AndroidImportance = {
  HIGH: 4,
  DEFAULT: 3,
  LOW: 2,
  MIN: 1,
  NONE: 0,
};

export const TriggerType = {
  TIMESTAMP: 0,
  INTERVAL: 1,
};

export const EventType = {
  DISMISSED: 0,
  DELIVERED: 1,
  PRESS: 2,
  ACTION_PRESS: 3,
  APP_BLOCKED: 4,
  CHANNEL_BLOCKED: 5,
  CHANNEL_GROUP_BLOCKED: 6,
};
