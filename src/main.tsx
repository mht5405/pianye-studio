import { render } from 'preact';
import '@fontsource-variable/noto-sans-sc/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import 'katex/dist/katex.min.css';
import './styles/app.css';
import './styles/cards/base.css';
import './styles/cards/themes/minimal.css';
import './styles/cards/themes/elsewhere.css';
import './styles/cards/code-appearance.css';
import './styles/cards/theme-picker.css';
import './styles/workbench.css';
import studioStyles from './styles/studio.css?inline';
import proofroomStyles from './styles/proofroom.css?inline';
import readingRoomStyles from './styles/reading-room.css?inline';
import { App } from './app/App';

// Shared CSS can be emitted before app.css by Vite. Keep all workspace
// overrides after the base styles and in the same order in both builds.
for (const css of [studioStyles, proofroomStyles, readingRoomStyles]) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

render(<App />, document.getElementById('app')!);
