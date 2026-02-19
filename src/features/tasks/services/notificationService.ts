import notifee, {
  TimestampTrigger,
  TriggerType,
  AndroidImportance,
} from '@notifee/react-native';

const CHANNEL_ID = 'aureus-tasks';

export async function createNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Tareas',
    importance: AndroidImportance.HIGH,
  });
}

export async function scheduleTaskReminder(params: {
  taskId: number;
  title: string;
  date: string;
  time: string;
  reminderMinutes: number;
}): Promise<string> {
  const {taskId, title, date, time, reminderMinutes} = params;

  // Parse date + time
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const triggerDate = new Date(year, month - 1, day, hours, minutes);
  triggerDate.setMinutes(triggerDate.getMinutes() - reminderMinutes);

  // Don't schedule if in the past
  if (triggerDate.getTime() <= Date.now()) {
    return '';
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
  };

  const notificationId = await notifee.createTriggerNotification(
    {
      id: `task-${taskId}`,
      title: 'Recordatorio de tarea',
      body: title,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: {id: 'default'},
      },
    },
    trigger,
  );

  return notificationId;
}

export async function cancelTaskReminder(
  notificationId: string,
): Promise<void> {
  if (notificationId) {
    await notifee.cancelNotification(notificationId);
  }
}
