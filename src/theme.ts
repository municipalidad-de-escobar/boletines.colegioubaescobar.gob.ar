import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Institutional palette: UBA-inspired indigo + Cereijo accent.
const indigo: MantineColorsTuple = [
  '#eef2ff',
  '#e0e7ff',
  '#c7d2fe',
  '#a5b4fc',
  '#818cf8',
  '#6366f1',
  '#4f46e5',
  '#4338ca',
  '#3730a3',
  '#312e81',
];

export const theme = createTheme({
  primaryColor: 'brand',
  defaultRadius: 'md',
  fontFamily:
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily:
      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontWeight: '600',
  },
  colors: {
    brand: indigo,
  },
  components: {
    Button: {
      defaultProps: { radius: 'md' },
    },
    Paper: {
      defaultProps: { radius: 'lg' },
    },
    Card: {
      defaultProps: { radius: 'lg' },
    },
    Modal: {
      defaultProps: { radius: 'lg', centered: true },
    },
    TextInput: {
      defaultProps: { radius: 'md' },
    },
    Select: {
      defaultProps: { radius: 'md' },
    },
    NumberInput: {
      defaultProps: { radius: 'md' },
    },
  },
});
