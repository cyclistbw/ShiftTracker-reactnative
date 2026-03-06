// 🚩 FLAG: Web version sets document.title. In React Native there is no document.
// Replacement: no-op. Screen titles are set via React Navigation screen options.

export const usePageTitle = (_title: string) => {
  // No-op in React Native — use navigation options for screen titles.
};
