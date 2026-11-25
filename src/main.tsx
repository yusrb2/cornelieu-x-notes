import { render } from 'preact';
import './styles/base.css';
import { App } from './app';
import { initMobileViewport } from './platform/mobileViewport';

initMobileViewport();

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
