import { render } from 'preact';
import './styles/base.css';
import { App } from './app';
import { initMobileViewport } from './platform/mobileViewport';
import { initPwa } from './platform/pwa';

initMobileViewport();
initPwa();

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
