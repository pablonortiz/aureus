import {NativeModules} from 'react-native';

const {TasksWidget} = NativeModules;

export function updateTasksWidget(): void {
  try {
    TasksWidget?.updateWidget();
  } catch {
    // Widget module not available — ignore
  }
}
