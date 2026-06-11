// Next 16 removed `next lint`; lint with the ESLint CLI + flat config instead.
// eslint-config-next 16 ships a native flat-config array, so no FlatCompat shim.
import next from 'eslint-config-next';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'dist/**'] },
  ...next,
];

export default config;
