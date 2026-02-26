// Mock the widget bridge used in tasks store
jest.mock('./src/features/tasks/services/widgetBridge', () => ({
  updateTasksWidget: jest.fn(),
}));
