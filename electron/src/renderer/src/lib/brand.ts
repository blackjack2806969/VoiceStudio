// Canonical Electron assets; Vite bundles them locally for desktop and web.
import defaultIcon from '../../../../public/favicon.svg';
import cantoneseIcon from '../../../../public/favicon-can.svg';
import { isCantoneseStudio } from './cantonese-studio';

export const brandIcon = isCantoneseStudio() ? cantoneseIcon : defaultIcon;
export { default as brandArtwork } from '../../../../public/signal-field.webp';
