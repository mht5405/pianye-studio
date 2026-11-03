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
import './styles/studio.css';
import './styles/proofroom.css';
import './styles/reading-room.css';
import { App } from './app/App';

render(<App />, document.getElementById('app')!);
